package assetsservice

import (
	"net/http"
	"os"
	"strings"
)

// contentTypes maps the supported file extensions to the MIME type served to
// the WebView. These are set explicitly because http.ServeContent guesses
// from the file extension and lacks the SVG variant used by Chromium.
var contentTypes = map[string]string{
	"png": "image/png",
	"svg": "image/svg+xml",
	"mp3": "audio/mpeg",
	"wav": "audio/wav",
}

// Handler serves registered library assets. It is installed as the Wails
// AssetsHandler, so the embedded frontend bundles are served first and any
// request under RoutePrefix falls through to this handler.
type Handler struct {
	service *AssetsService
}

// NewHandler builds the asset HTTP handler backed by the given service.
func NewHandler(service *AssetsService) http.Handler {
	return &Handler{service: service}
}

// ServeHTTP implements http.Handler. Only GET/HEAD requests under
// RoutePrefix are served; everything else is passed through untouched so
// Wails can fall back to its default asset serving.
func (h *Handler) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	if !strings.HasPrefix(req.URL.EscapedPath(), RoutePrefix) {
		return
	}

	if req.Method != http.MethodGet && req.Method != http.MethodHead {
		http.Error(rw, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rest := strings.TrimPrefix(req.URL.EscapedPath(), RoutePrefix)
	segments := strings.Split(rest, "/")

	absolutePath, ok := h.service.resolvePath(segments)
	if !ok {
		http.NotFound(rw, req)
		return
	}

	file, err := os.Open(absolutePath)
	if err != nil {
		http.NotFound(rw, req)
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil || info.IsDir() {
		http.NotFound(rw, req)
		return
	}

	ext := strings.ToLower(extensionOf(absolutePath))
	if mime, ok := contentTypes[ext]; ok {
		rw.Header().Set("Content-Type", mime)
	}
	rw.Header().Set("X-Content-Type-Options", "nosniff")
	rw.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	http.ServeContent(rw, req, info.Name(), info.ModTime(), file)
}

// extensionOf returns the lowercase file extension without the dot.
func extensionOf(path string) string {
	base := path
	if idx := strings.LastIndexAny(path, `/\`); idx >= 0 {
		base = path[idx+1:]
	}
	if dot := strings.LastIndex(base, "."); dot >= 0 {
		return base[dot+1:]
	}
	return ""
}
