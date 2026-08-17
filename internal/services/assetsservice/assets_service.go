// Package assetsservice manages the user's asset libraries: scanning folders
// for images (PNG, SVG) and audio (MP3, WAV) and serving those files to the
// Pixi engine through a dedicated HTTP route.
package assetsservice

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"Studio/internal/apperr"
	"Studio/internal/models"
)

// RoutePrefix is the URL prefix every scanned asset is served from. The
// App's AssetsHandler routes everything under this prefix to the files the
// service has registered in its libraries.
const RoutePrefix = "/studio-assets/"

// extensions maps a supported file extension (lowercase, no dot) to the
// canonical asset kind.
var extensions = map[string]models.AssetKind{
	models.ExtPNG: models.AssetKindImage,
	models.ExtSVG: models.AssetKindImage,
	models.ExtMP3: models.AssetKindAudio,
	models.ExtWAV: models.AssetKindAudio,
}

// AssetsService owns the set of registered libraries and coordinates scanning.
// It is safe for concurrent use.
type AssetsService struct {
	mu        sync.RWMutex
	libraries map[string]*models.LibraryRoot
	order     []string
}

// New returns an empty assets service.
func New() *AssetsService {
	return &AssetsService{libraries: map[string]*models.LibraryRoot{}}
}

// ScanAssets registers (or refreshes) a library rooted at directory and
// recursively scans it for supported asset files.
func (s *AssetsService) ScanAssets(directory string) apperr.Result[models.AssetScanResult] {
	dir := strings.TrimSpace(directory)
	if dir == "" {
		return apperr.Fail[models.AssetScanResult](
			apperr.CodeInvalidArgument,
			"Asset folder is empty",
			"choose a folder containing PNG, SVG, MP3 or WAV files",
		)
	}

	absolute, err := filepath.Abs(dir)
	if err != nil {
		return apperr.Fail[models.AssetScanResult](apperr.CodeIO, "Could not resolve folder", err.Error())
	}

	info, err := os.Stat(absolute)
	if err != nil {
		if os.IsNotExist(err) {
			return apperr.Fail[models.AssetScanResult](apperr.CodeNotFound, "Asset folder not found", absolute)
		}
		return apperr.Fail[models.AssetScanResult](apperr.CodeIO, "Could not read asset folder", err.Error())
	}
	if !info.IsDir() {
		return apperr.Fail[models.AssetScanResult](
			apperr.CodeInvalidArgument,
			"Not a folder",
			fmt.Sprintf("%s is not a directory", absolute),
		)
	}

	root := s.registerLibrary(absolute)

	assets := []*models.Asset{}
	imageCount := 0
	audioCount := 0

	err = filepath.WalkDir(absolute, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return nil // skip unreadable subtrees, never abort the whole scan
		}
		if d.IsDir() {
			name := d.Name()
			if strings.HasPrefix(name, ".") || name == "node_modules" {
				return fs.SkipDir
			}
			return nil
		}
		if d.Type()&fs.ModeSymlink != 0 {
			return nil // never follow symlinks
		}

		ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(d.Name()), "."))
		kind, supported := extensions[ext]
		if !supported {
			return nil
		}

		relPath, err := filepath.Rel(absolute, path)
		if err != nil {
			return nil
		}
		relPath = filepath.ToSlash(relPath)

		fileInfo, err := d.Info()
		if err != nil {
			return nil
		}

		asset := &models.Asset{
			ID:           assetID(root.ID, relPath),
			LibraryID:    root.ID,
			LibraryName:  root.Name,
			Name:         filepath.Base(path),
			Kind:         kind,
			Format:       ext,
			AbsolutePath: path,
			RelativePath: relPath,
			URL:          buildURL(root.ID, relPath),
			Size:         fileInfo.Size(),
			ModifiedAt:   fileInfo.ModTime(),
		}
		assets = append(assets, asset)
		if kind == models.AssetKindImage {
			imageCount++
		} else {
			audioCount++
		}
		return nil
	})
	if err != nil {
		return apperr.Fail[models.AssetScanResult](apperr.CodeIO, "Scan aborted", err.Error())
	}

	sort.Slice(assets, func(i, j int) bool {
		if assets[i].Kind != assets[j].Kind {
			return assets[i].Kind == models.AssetKindImage
		}
		return strings.ToLower(assets[i].Name) < strings.ToLower(assets[j].Name)
	})

	return apperr.Ok(models.AssetScanResult{
		Library:    *root,
		Assets:     assets,
		ImageCount: imageCount,
		AudioCount: audioCount,
	})
}

// ResolvePath resolves a /studio-assets/... request path to the absolute path
// of a registered asset. It reports whether the asset exists and is inside a
// registered library root.
//
// segments is the URL path split on "/" *after* the route prefix has been
// removed. The first segment is the library id; the rest identify the
// relative file path within that library.
func (s *AssetsService) resolvePath(segments []string) (string, bool) {
	if len(segments) < 2 {
		return "", false
	}

	libID, err := url.PathUnescape(segments[0])
	if err != nil || libID == "" || strings.ContainsAny(libID, `/\`) {
		return "", false
	}

	s.mu.RLock()
	root, ok := s.libraries[libID]
	s.mu.RUnlock()
	if !ok {
		return "", false
	}

	var relParts []string
	for _, seg := range segments[1:] {
		decoded, err := url.PathUnescape(seg)
		if err != nil {
			return "", false
		}
		relParts = append(relParts, decoded)
	}

	cleanRoot := filepath.Clean(root.Dir)
	combined := filepath.Join(append([]string{cleanRoot}, relParts...)...)
	clean := filepath.Clean(combined)

	if clean != cleanRoot && !strings.HasPrefix(clean, cleanRoot+string(filepath.Separator)) {
		return "", false // path traversal attempt
	}

	info, err := os.Stat(clean)
	if err != nil || info.IsDir() {
		return "", false
	}

	return clean, true
}

// LibraryID returns the registered library id for a canonical directory path,
// creating and registering the library on first use.
func (s *AssetsService) registerLibrary(absolute string) *models.LibraryRoot {
	id := libraryID(absolute)
	name := filepath.Base(absolute)
	if name == "." || name == string(filepath.Separator) {
		name = "Assets"
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if existing, ok := s.libraries[id]; ok {
		existing.Dir = absolute
		return existing
	}

	root := &models.LibraryRoot{ID: id, Name: name, Dir: absolute}
	s.libraries[id] = root
	s.order = append(s.order, id)
	return root
}

// Libraries returns the registered libraries in registration order.
func (s *AssetsService) Libraries() []*models.LibraryRoot {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]*models.LibraryRoot, 0, len(s.order))
	for _, id := range s.order {
		out = append(out, s.libraries[id])
	}
	return out
}

// libraryID derives a stable id from a canonical directory path so repeat
// scans of the same folder reuse the same id and therefore the same URLs.
func libraryID(absolute string) string {
	sum := sha256.Sum256([]byte(strings.ToLower(filepath.Clean(absolute))))
	short := hex.EncodeToString(sum[:8]) // 16 hex chars
	base := strings.ToLower(filepath.Base(absolute))
	base = strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9', r == '-', r == '_':
			return r
		default:
			return '-'
		}
	}, base)
	if base == "" {
		base = "lib"
	}
	return fmt.Sprintf("%s-%s", base, short[:12])
}

// assetID derives a deterministic asset id from the library and relative path.
func assetID(libID, relPath string) string {
	sum := sha256.Sum256([]byte(libID + ":" + relPath))
	return fmt.Sprintf("ast-%s", hex.EncodeToString(sum[:10]))
}

// buildURL produces the loadable URL for an asset inside a library.
func buildURL(libID, relPath string) string {
	parts := strings.Split(relPath, "/")
	escaped := make([]string, 0, len(parts)+1)
	escaped = append(escaped, url.PathEscape(libID))
	for _, part := range parts {
		escaped = append(escaped, url.PathEscape(part))
	}
	return RoutePrefix + strings.Join(escaped, "/")
}
