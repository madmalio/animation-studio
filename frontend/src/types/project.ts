import type { Puppet } from './puppet';

export interface Point {
  x: number;
  y: number;
}

export interface Scale {
  x: number;
  y: number;
}

/** Fixed virtual canvas the stage renders into. */
export interface Viewport {
  width: number;
  height: number;
  fps: number;
}

export interface BackgroundImage {
  assetId: string;
  fit: 'none' | 'contain' | 'cover' | 'stretch';
  opacity: number;
}

export interface Background {
  color: string; // hex "#RRGGBB"
  image?: BackgroundImage;
}

export interface Keyframe {
  frame: number;
  value: Record<string, unknown>;
}

export type TrackKind = 'puppet' | 'prop' | 'audio';

export interface Track {
  id: string;
  kind: TrackKind;
  targetId: string;
  keyframes: Keyframe[];
}

export interface Timeline {
  durationFrames: number;
  tracks: Track[];
}

/** A scene object placed independently of puppets (props layer). */
export interface Prop {
  id: string;
  name: string;
  assetId: string;
  position: Point;
  scale: Scale;
  rotation: number; // degrees
  visible: boolean;
  opacity: number; // 0..1
  zIndex: number;
}

export interface Project {
  schemaVersion: number;
  name: string;
  filePath: string;
  viewport: Viewport;
  background: Background;
  puppets: Puppet[];
  props: Prop[];
  timeline: Timeline | null;
  createdAt: string;
  updatedAt: string;
}