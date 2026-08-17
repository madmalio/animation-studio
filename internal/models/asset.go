package models

import "time"

// Supported asset file formats and their canonical kinds.
const (
	// File extension (lowercase, without dot).
	ExtPNG = "png"
	ExtSVG = "svg"
	ExtMP3 = "mp3"
	ExtWAV = "wav"
)

// AssetKind classifies an asset for the frontend asset library UI.
type AssetKind string

const (
	AssetKindImage AssetKind = "image"
	AssetKindAudio AssetKind = "audio"
)

// LibraryRoot is a registered root folder of user assets. Scanned assets are
// served to the Pixi engine from this root through the /studio-assets route.
type LibraryRoot struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Dir  string `json:"dir"` // canonical absolute path
}

// Asset describes a single scanned file in an asset library.
type Asset struct {
	ID           string    `json:"id"`
	LibraryID    string    `json:"libraryId"`
	LibraryName  string    `json:"libraryName"`
	Name         string    `json:"name"`
	Kind         AssetKind `json:"kind"`
	Format       string    `json:"format"` // png | svg | mp3 | wav
	AbsolutePath string    `json:"absolutePath"`
	RelativePath string    `json:"relativePath"` // relative to the library root
	URL          string    `json:"url"`          // route the Pixi engine loads the texture/audio from
	Size         int64     `json:"size"`
	ModifiedAt   time.Time `json:"modifiedAt"`
}

// AssetScanResult is returned by the assets service after scanning a folder.
type AssetScanResult struct {
	Library    LibraryRoot `json:"library"`
	Assets     []*Asset    `json:"assets"`
	ImageCount int         `json:"imageCount"`
	AudioCount int         `json:"audioCount"`
}

// AssetLibrary is the aggregate view of the current project's registered
// asset libraries.
type AssetLibrary struct {
	Libraries []*LibraryRoot `json:"libraries"`
	Assets    []*Asset       `json:"assets"`
}
