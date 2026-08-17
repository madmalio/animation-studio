package models

import (
	"time"
)

// SchemaVersion is the version carried by every .studio document. All
// documents written by this build use version 1.
const SchemaVersion = 1

// Default stage dimensions for the fixed-aspect virtual canvas.
const (
	DefaultStageWidth  = 1920
	DefaultStageHeight = 1080
	DefaultFPS         = 24
)

// Project is the root document persisted to .studio files. It round-trips
// verbatim through save/open so nothing the editor knows is ever lost.
type Project struct {
	SchemaVersion int        `json:"schemaVersion"`
	Name          string     `json:"name"`
	FilePath      string     `json:"filePath"`
	Viewport      Viewport   `json:"viewport"`
	Background    Background `json:"background"`
	Puppets       []*Puppet  `json:"puppets"`
	Props         []*Prop    `json:"props"`
	Timeline      *Timeline  `json:"timeline"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

// Viewport describes the fixed virtual canvas the stage renders into.
type Viewport struct {
	Width  int `json:"width"`
	Height int `json:"height"`
	FPS    int `json:"fps"`
}

// BackgroundImage is an optional image rendered behind the puppets.
type BackgroundImage struct {
	AssetID string  `json:"assetId"`
	Fit     string  `json:"fit"` // none | contain | cover | stretch
	Opacity float64 `json:"opacity"`
}

// Background is the scene backdrop: a color and/or an image.
type Background struct {
	Color string           `json:"color"` // hex "#RRGGBB"
	Image *BackgroundImage `json:"image,omitempty"`
}

// Timeline is the animation timeline. Tracks reference scene targets
// (puppets/props) and hold position/rotation path keyframes; audio tracks
// reference library audio assets.
type Timeline struct {
	DurationFrames int      `json:"durationFrames"`
	Tracks         []*Track `json:"tracks"`
}

// Track is one animation lane bound to a scene target.
type Track struct {
	ID        string     `json:"id"`
	Kind      string     `json:"kind"` // puppet | prop | audio
	TargetID  string     `json:"targetId"`
	Keyframes []Keyframe `json:"keyframes"`
}

// Keyframe is a single timing point on a track. Value is a JSON object
// mapping property names to their animated values.
type Keyframe struct {
	Frame int            `json:"frame"`
	Value map[string]any `json:"value"`
}

// Prop is a scene object placed independently of puppets (props layer).
type Prop struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	AssetID  string  `json:"assetId"`
	Position Point   `json:"position"`
	Scale    Scale   `json:"scale"`
	Rotation float64 `json:"rotation"` // degrees
	Visible  bool    `json:"visible"`
	Opacity  float64 `json:"opacity"` // 0..1
	ZIndex   int     `json:"zIndex"`
}
