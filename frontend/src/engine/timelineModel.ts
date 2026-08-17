import type { Expression, Viseme } from '../types/puppet';
import type { Keyframe, Timeline, Track, TrackKind } from '../types/project';

/**
 * The canvas-facing puppet state derived from the timeline at a given frame.
 * Position/rotation are interpolated from the transform track; viseme and
 * expression are held from the closest preceding discrete keyframe.
 */
export interface EvaluatedPuppetState {
  position: { x: number; y: number };
  rotation: number; // degrees
  viseme: Viseme;
  expression: Expression;
}

/** How one lane maps onto the track data model. */
export interface LaneDefinition {
  kind: TrackKind;
  name: string;
  short: string;
  color: string;
  /** The targetId tracks of this lane are bound to. */
  targetIdFor: (puppetId: string) => string;
}

/** The canonical lane set rendered by the timeline panel. */
export const TL_LANES: readonly LaneDefinition[] = [
  { kind: 'puppet', name: 'Puppet Transform', short: 'Transform', color: '#e07a5f', targetIdFor: (p) => p },
  { kind: 'viseme', name: 'Viseme / Mouth', short: 'Viseme', color: '#81b29a', targetIdFor: (p) => p },
  { kind: 'expression', name: 'Expression', short: 'Expr', color: '#f2cc8f', targetIdFor: (p) => p },
  { kind: 'audio', name: 'Audio', short: 'Audio', color: '#6ba7d6', targetIdFor: () => '' },
];

/** Generates a short, collision-resistant id for timeline entities. */
export function uid(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.floor(Math.random() * 0x1fffffff).toString(36)}`;
  return `${prefix}_${random}`;
}

export function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Reads a finite numeric field from a keyframe value bag with a fallback. */
export function readNum(value: Record<string, unknown>, key: string, fallback: number): number {
  const raw = value[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

/** Reads a non-empty string field from a keyframe value bag with a fallback. */
export function readStr(value: Record<string, unknown>, key: string, fallback: string): string {
  const raw = value[key];
  return typeof raw === 'string' && raw.length > 0 ? raw : fallback;
}

/** Finds the first track matching a kind + target, or undefined. */
export function findTrack(timeline: Timeline, kind: TrackKind, targetId: string): Track | undefined {
  return timeline.tracks.find((t) => t.kind === kind && t.targetId === targetId);
}

/** Finds a track by its stable id, or undefined. */
export function findTrackById(timeline: Timeline, trackId: string): Track | undefined {
  return timeline.tracks.find((t) => t.id === trackId);
}

/**
 * Ensures the four canonical lanes exist, creating empty tracks for any that
 * are missing. Returns the same reference when nothing needed to change so
 * callers can detect a no-op cheaply.
 */
export function ensureTracks(timeline: Timeline, puppetId: string): Timeline {
  const missing: Track[] = [];
  for (const lane of TL_LANES) {
    const targetId = lane.targetIdFor(puppetId);
    if (!timeline.tracks.some((t) => t.kind === lane.kind && t.targetId === targetId)) {
      missing.push({ id: uid('trk'), kind: lane.kind, targetId, keyframes: [] });
    }
  }
  if (missing.length === 0) return timeline;
  return { ...timeline, tracks: [...timeline.tracks, ...missing] };
}

/**
 * Normalizes a freshly-loaded timeline: backfills the canonical lanes,
 * assigns ids to keyframes that predate stable ids, sorts keyframes by frame
 * and clamps stray frames back into range. Returns the same reference when
 * nothing changed, so callers can converge without render loops.
 */
export function normalizeTimeline(timeline: Timeline, puppetId: string): Timeline {
  const ensured = ensureTracks(timeline, puppetId);
  let changed = ensured !== timeline;
  const maxFrame = Math.max(0, timeline.durationFrames - 1);

  const tracks = ensured.tracks.map((track) => {
    let trackChanged = false;
    const withIds: Keyframe[] = track.keyframes.map((k) => {
      if (k.id) return k;
      trackChanged = true;
      return { ...k, id: uid('kf') };
    });
    const clamped: Keyframe[] = withIds.map((k) =>
      k.frame === clampInt(k.frame, 0, maxFrame) ? k : { ...k, frame: clampInt(k.frame, 0, maxFrame) },
    );
    if (clamped.some((k, i) => k !== withIds[i])) trackChanged = true;
    const sorted = clamped.slice().sort((a, b) => a.frame - b.frame);
    if (sorted.some((k, i) => k !== clamped[i])) trackChanged = true;
    if (!trackChanged) return track;
    return { ...track, keyframes: sorted };
  });

  if (tracks.some((t, i) => t !== ensured.tracks[i])) changed = true;
  return changed ? { ...timeline, tracks } : timeline;
}

function mapTrack(timeline: Timeline, trackId: string, fn: (track: Track) => Track): Timeline {
  const tracks = timeline.tracks.map((t) => (t.id === trackId ? fn(t) : t));
  return { ...timeline, tracks };
}

function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return keyframes.slice().sort((a, b) => a.frame - b.frame);
}

/** Inserts (or replaces, by id) a keyframe on a track, clamped to the range. */
export function addKeyframeOp(timeline: Timeline, trackId: string, keyframe: Keyframe, maxFrame: number): Timeline {
  return mapTrack(timeline, trackId, (track) => ({
    ...track,
    keyframes: sortKeyframes([...track.keyframes.filter((k) => k.id !== keyframe.id), { ...keyframe, frame: clampInt(keyframe.frame, 0, maxFrame) }]),
  }));
}

/** Moves a keyframe to a new frame, clamped to the range. */
export function moveKeyframeOp(timeline: Timeline, trackId: string, keyframeId: string, newFrame: number, maxFrame: number): Timeline {
  return mapTrack(timeline, trackId, (track) => {
    const frame = clampInt(newFrame, 0, maxFrame);
    const moved = track.keyframes.some((k) => k.id === keyframeId && k.frame === frame);
    if (moved) return track;
    return {
      ...track,
      keyframes: sortKeyframes(track.keyframes.map((k) => (k.id === keyframeId ? { ...k, frame } : k))),
    };
  });
}

/** Deletes a keyframe by id from a track. */
export function removeKeyframeOp(timeline: Timeline, trackId: string, keyframeId: string): Timeline {
  return mapTrack(timeline, trackId, (track) => ({
    ...track,
    keyframes: track.keyframes.filter((k) => k.id !== keyframeId),
  }));
}

/**
 * Finds the nearest unoccupied frame for a drag. Pushes right first, then
 * falls back left, so dragging a keyframe over a sibling never stacks them.
 * The moving keyframe itself is excluded from the occupancy test.
 */
export function nextFreeFrame(track: Track, preferred: number, maxFrame: number, excludeKeyframeId?: string): number {
  const used = new Set<number>();
  for (const k of track.keyframes) if (k.id !== excludeKeyframeId) used.add(k.frame);
  const preferredF = clampInt(preferred, 0, maxFrame);
  if (!used.has(preferredF)) return preferredF;
  for (let f = preferredF + 1; f <= maxFrame; f++) if (!used.has(f)) return f;
  for (let f = preferredF - 1; f >= 0; f--) if (!used.has(f)) return f;
  return preferredF;
}

/** Builds the value bag for a newly-added keyframe on a lane. */
export function createKeyframeFor(
  lane: LaneDefinition,
  frame: number,
  sample: EvaluatedPuppetState,
  audioAssetId: string,
  durationMs = 1000,
): Keyframe {
  switch (lane.kind) {
    case 'puppet':
      return {
        id: uid('kf'),
        frame,
        value: {
          x: Math.round(sample.position.x),
          y: Math.round(sample.position.y),
          rotation: Math.round(sample.rotation * 10) / 10,
        },
      };
    case 'viseme':
      return { id: uid('kf'), frame, value: { viseme: sample.viseme } };
    case 'expression':
      return { id: uid('kf'), frame, value: { expression: sample.expression } };
    default:
      return { id: uid('kf'), frame, value: { assetId: audioAssetId, durationMs } };
  }
}