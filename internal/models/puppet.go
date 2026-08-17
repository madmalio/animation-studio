package models

// Canonical viseme (mouth flap) and expression state identifiers. These are
// the source of truth for both the TypeScript frontend unions and the stored
// .studio documents.
const (
	VisemeRest = "Rest"
	VisemeAI   = "AI"
	VisemeE    = "E"
	VisemeO    = "O"
	VisemeU    = "U"
	VisemeM    = "M"
	VisemeF    = "F"
	VisemeW    = "W"
	VisemeL    = "L"
)

// Visemes is the ordered list of supported visemes. Order is stable: it is
// used to build UI pickers and to sequence automatic mouth flap animation.
var Visemes = []string{VisemeRest, VisemeAI, VisemeE, VisemeO, VisemeU, VisemeM, VisemeF, VisemeW, VisemeL}

const (
	ExpressionNeutral   = "neutral"
	ExpressionHappy     = "happy"
	ExpressionSad       = "sad"
	ExpressionAngry     = "angry"
	ExpressionSurprised = "surprised"
	ExpressionBlink     = "blink"
)

// Expressions is the ordered list of supported expressions.
var Expressions = []string{ExpressionNeutral, ExpressionHappy, ExpressionSad, ExpressionAngry, ExpressionSurprised, ExpressionBlink}

// Point is a 2D position in puppet/world space.
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Scale is a 2D scale factor.
type Scale struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Bone defines a single deformation bone in a puppet's rig. Bones form a
// tree through ParentID and are used to parent layers/slots so limbs follow
// the rig when animated.
type Bone struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	ParentID string  `json:"parentId,omitempty"`
	Position Point   `json:"position"`
	Rotation float64 `json:"rotation"` // degrees
	Length   float64 `json:"length"`
}

// Layer is a single drawable element of a puppet: either a static image
// (Kind == "image") anchored to the rig or a named group container
// (Kind == "group") that groups child layers together.
type Layer struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Kind      string  `json:"kind"`
	AssetID   string  `json:"assetId,omitempty"`   // texture asset shown for image layers
	TextureID string  `json:"textureId,omitempty"` // alias of AssetID, used for viseme/expression swaps
	BoneID    string  `json:"boneId,omitempty"`    // bone this layer is pinned to
	ParentID  string  `json:"parentId,omitempty"`  // parent group layer id
	SlotID    string  `json:"slotId,omitempty"`    // optional slot that owns this layer
	Position  Point   `json:"position"`
	Rotation  float64 `json:"rotation"` // degrees
	Scale     Scale   `json:"scale"`
	Anchor    Point   `json:"anchor"` // normalized pivot (0..1)
	Visible   bool    `json:"visible"`
	Opacity   float64 `json:"opacity"` // 0..1
	ZIndex    int     `json:"zIndex"`
}

// Slot is an attach point that can display one of several interchangeable
// assets at a time. Slots are the mechanism behind mouth flap (viseme)
// states, blinking and expression changes: a viseme/expression mapping simply
// changes which asset a slot currently shows.
type Slot struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	LayerID       string   `json:"layerId,omitempty"` // optional parent group layer
	AssetIDs      []string `json:"assetIDs"`
	ActiveAssetID string   `json:"activeAssetId"`
	Position      Point    `json:"position"`
	Rotation      float64  `json:"rotation"` // degrees
	Scale         Scale    `json:"scale"`
	Anchor        Point    `json:"anchor"` // normalized pivot (0..1)
	Visible       bool     `json:"visible"`
	Opacity       float64  `json:"opacity"` // 0..1
	ZIndex        int      `json:"zIndex"`
}

// TextureSwap is one atomic texture change applied when a viseme or
// expression becomes active. Exactly one target must be set:
//
//	SlotID  -> sets the Slot's ActiveAssetID to AssetID
//	LayerID -> sets the Layer's texture (AssetID/TextureID) to AssetID
type TextureSwap struct {
	SlotID  string `json:"slotId,omitempty"`
	LayerID string `json:"layerId,omitempty"`
	AssetID string `json:"assetId"`
}

// VisemeMapping binds a viseme identifier to the set of texture swaps that
// produce that mouth shape. DurationMs is used when the mouth is flapped
// automatically to the beat of audio.
type VisemeMapping struct {
	Viseme     string         `json:"viseme"`
	DurationMs int            `json:"durationMs"`
	Swaps      []*TextureSwap `json:"swaps"`
}

// ExpressionState binds an expression identifier to the set of texture swaps
// that produce it (e.g. Blink swaps the eye slot assets).
type ExpressionState struct {
	Expression string         `json:"expression"`
	Swaps      []*TextureSwap `json:"swaps"`
}

// Puppet is a full character schema: rig, drawable layers, interchangeable
// slots and the viseme/expression state machine that drives them.
type Puppet struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	AssetID string   `json:"assetId"` // library asset this puppet is built from
	Layers  []*Layer `json:"layers"`
	Bones   []*Bone  `json:"bones"`
	Slots   []*Slot  `json:"slots"`

	VisemeMappings   []*VisemeMapping   `json:"visemeMappings"`
	ExpressionStates []*ExpressionState `json:"expressionStates"`

	ActiveViseme     string `json:"activeViseme"`
	ActiveExpression string `json:"activeExpression"`

	Position        Point   `json:"position"`
	Scale           Scale   `json:"scale"`
	Rotation        float64 `json:"rotation"` // degrees
	AnchoredToStage bool    `json:"anchoredToStage"`
	ZIndex          int     `json:"zIndex"`
	Visible         bool    `json:"visible"`
	Opacity         float64 `json:"opacity"` // 0..1
}

// Lookup returns the viseme mapping for the given viseme, or nil.
func (p *Puppet) LookupViseme(viseme string) *VisemeMapping {
	for _, m := range p.VisemeMappings {
		if m.Viseme == viseme {
			return m
		}
	}
	return nil
}

// LookupExpression returns the expression state for the given expression, or nil.
func (p *Puppet) LookupExpression(expression string) *ExpressionState {
	for _, e := range p.ExpressionStates {
		if e.Expression == expression {
			return e
		}
	}
	return nil
}
