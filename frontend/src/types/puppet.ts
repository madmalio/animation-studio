// Canonical viseme (mouth flap) state identifiers. Keep in sync with
// internal/models/puppet.go.
export const VISEMES = ['Rest', 'AI', 'E', 'O', 'U', 'M', 'F', 'W', 'L'] as const;
export type Viseme = (typeof VISEMES)[number];

export const EXPRESSIONS = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'blink'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

export interface Point {
  x: number;
  y: number;
}

export interface Scale {
  x: number;
  y: number;
}

/** A single deformation bone in a puppet's rig. Bones form a tree via parentId. */
export interface Bone {
  id: string;
  name: string;
  parentId?: string;
  position: Point;
  rotation: number; // degrees
  length: number;
}

export type LayerKind = 'image' | 'group';

/**
 * A single drawable element: either an image pinned to the rig or a named
 * group container that parent layers attach to.
 */
export interface Layer {
  id: string;
  name: string;
  kind: LayerKind;
  assetId?: string; // texture asset shown for image layers
  textureId?: string; // alias of assetId, used for viseme/expression swaps
  boneId?: string; // bone this layer is pinned to
  parentId?: string; // parent group layer id
  slotId?: string; // optional slot that owns this layer
  position: Point;
  rotation: number; // degrees
  scale: Scale;
  anchor: Point; // normalized pivot (0..1)
  visible: boolean;
  opacity: number; // 0..1
  zIndex: number;
}

/**
 * An attach point that can display one of several interchangeable assets at
 * a time. Slots drive mouth flap (viseme) states, blinking and expressions.
 */
export interface Slot {
  id: string;
  name: string;
  layerId?: string; // optional parent group layer
  assetIDs: string[];
  activeAssetId: string;
  position: Point;
  rotation: number; // degrees
  scale: Scale;
  anchor: Point; // normalized pivot (0..1)
  visible: boolean;
  opacity: number; // 0..1
  zIndex: number;
}

/**
 * One atomic texture change applied when a viseme or expression activates.
 * Exactly one target must be set:
 *   slotId  -> sets the Slot's activeAssetId to assetId
 *   layerId -> sets the Layer's texture to assetId
 */
export interface TextureSwap {
  slotId?: string;
  layerId?: string;
  assetId: string;
}

/** Binds a viseme to the texture swaps that produce that mouth shape. */
export interface VisemeMapping {
  viseme: Viseme;
  /** Hold time in ms when the mouth is flapped automatically. */
  durationMs: number;
  swaps: TextureSwap[];
}

/** Binds an expression to the texture swaps that produce it. */
export interface ExpressionState {
  expression: Expression;
  swaps: TextureSwap[];
}

/** Full character schema: rig, drawable layers, interchangeable slots and
 * the viseme/expression state machine that drives them. */
export interface Puppet {
  id: string;
  name: string;
  assetId: string;
  layers: Layer[];
  bones: Bone[];
  slots: Slot[];
  visemeMappings: VisemeMapping[];
  expressionStates: ExpressionState[];
  activeViseme: Viseme;
  activeExpression: Expression;
  position: Point;
  scale: Scale;
  rotation: number; // degrees
  anchoredToStage: boolean;
  zIndex: number;
  visible: boolean;
  opacity: number; // 0..1
}

export function isViseme(value: string): value is Viseme {
  return (VISEMES as readonly string[]).includes(value);
}

export function isExpression(value: string): value is Expression {
  return (EXPRESSIONS as readonly string[]).includes(value);
}

export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}