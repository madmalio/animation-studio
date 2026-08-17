import { isExpression, isViseme, type Expression, type Puppet, type Viseme } from '../types/puppet';
import type { Keyframe, Timeline, Track, TrackKind } from '../types/project';
import { readNum, type EvaluatedPuppetState } from './timelineModel';
import type { PuppetRenderer } from './puppetRenderer';

export interface EvaluatedPoint {
  x: number;
  y: number;
}

export interface PlaybackSnapshot {
  /** Integer playhead position in [0, durationFrames). */
  currentFrame: number;
  durationFrames: number;
  playing: boolean;
  looping: boolean;
  fps: number;
}

export interface PlaybackEngineOptions {
  fps?: number;
  durationFrames?: number;
}

const DEG_360 = 360;

function findTrack(timeline: Timeline, kind: TrackKind, targetId: string): Track | undefined {
  return timeline.tracks.find((t) => t.kind === kind && t.targetId === targetId);
}

/**
 * Returns the keyframe at or before `frame` (prev) and the first keyframe
 * strictly after it (next). `keyframes` must be sorted by frame ascending.
 */
function findSpan(
  keyframes: readonly Keyframe[],
  frame: number,
): { prev: Keyframe | undefined; next: Keyframe | undefined } {
  let prev: Keyframe | undefined;
  let next: Keyframe | undefined;
  for (const keyframe of keyframes) {
    if (keyframe.frame <= frame) prev = keyframe;
    else {
      next = keyframe;
      break;
    }
  }
  return { prev, next };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolates angles in degrees along the shortest arc. */
function lerpAngle(a: number, b: number, t: number): number {
  let delta = (b - a) % DEG_360;
  if (delta > 180) delta -= DEG_360;
  else if (delta < -180) delta += DEG_360;
  return a + delta * t;
}

function clampFrame(frame: number, durationFrames: number): number {
  return Math.min(Math.max(0, Math.round(frame)), Math.max(0, durationFrames - 1));
}

/**
 * Drives timeline playback and keeps an attached PuppetRenderer in sync.
 *
 * The clock is a requestAnimationFrame loop that advances an accumulator in
 * whole-frame steps at the project FPS (24 by default), so playback speed is
 * immune to display refresh-rate drift. Every evaluated frame is pushed to
 * the renderer directly — scrubbing and playback never touch React state,
 * which keeps heavy canvas subtrees from re-rendering.
 *
 * React consumers subscribe through getSnapshot/subscribe (useSyncExternalStore)
 * and receive a cached snapshot object (stable between emissions).
 */
export class PlaybackEngine {
  private fps: number;
  private durationFrames: number;
  private currentFrame = 0;
  private playing = false;
  private looping = false;

  private puppet: Puppet | null = null;
  private timeline: Timeline | null = null;
  private renderers = new Map<string, PuppetRenderer>();

  private readonly listeners = new Set<() => void>();
  private snapshot: PlaybackSnapshot;

  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;

  constructor(options: PlaybackEngineOptions = {}) {
    this.fps = clamp(Math.round(options.fps ?? 24), 1, 480);
    this.durationFrames = Math.max(1, Math.round(options.durationFrames ?? 120));
    this.snapshot = this.buildSnapshot();
  }

  // --- external store (useSyncExternalStore) ---

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PlaybackSnapshot => this.snapshot;

  private buildSnapshot(): PlaybackSnapshot {
    return {
      currentFrame: this.currentFrame,
      durationFrames: this.durationFrames,
      playing: this.playing,
      looping: this.looping,
      fps: this.fps,
    };
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  // --- configuration ---

  /** Supplies the schema puppet the engine overrides with evaluated state. */
  setPuppet(puppet: Puppet | null): void {
    this.puppet = puppet;
    this.renderEvaluated();
  }

  /** Supplies the timeline that drives evaluation. Renders the new result. */
  setTimeline(timeline: Timeline | null): void {
    if (this.timeline === timeline) return;
    this.timeline = timeline;
    this.renderEvaluated();
  }

  setDuration(durationFrames: number): void {
    const next = Math.max(1, Math.round(durationFrames));
    if (next === this.durationFrames) return;
    this.durationFrames = next;
    this.currentFrame = clampFrame(this.currentFrame, this.durationFrames);
    this.accumulator = 0;
    this.emit();
    this.renderEvaluated();
  }

  setFps(fps: number): void {
    const next = clamp(Math.round(fps), 1, 480);
    if (next === this.fps) return;
    this.fps = next;
    this.accumulator = 0;
    this.emit();
  }

  /** Binds (or unbinds, with null) the renderer for a given puppet id. */
  attachRenderer(puppetId: string, renderer: PuppetRenderer | null): void {
    if (renderer) this.renderers.set(puppetId, renderer);
    else this.renderers.delete(puppetId);
    if (renderer && this.puppet?.id === puppetId) this.renderEvaluated();
  }

  // --- playback API ---

  play(): void {
    if (!this.playing) {
      this.playing = true;
      this.emit();
    }
    if (this.currentFrame >= this.durationFrames - 1) this.currentFrame = 0;
    this.lastTime = 0;
    this.accumulator = 0;
    this.startRaf();
    this.renderEvaluated();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.cancelLoop();
    this.emit();
  }

  togglePlay(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  /** Pauses and rewinds to frame 0. */
  stop(): void {
    this.pause();
    this.setFrame(0);
  }

  setLooping(looping: boolean): void {
    if (this.looping === looping) return;
    this.looping = looping;
    this.emit();
  }

  /** Seeks the playhead (clamped) and re-evaluates the canvas immediately. */
  setFrame(frame: number): void {
    const next = clampFrame(frame, this.durationFrames);
    this.currentFrame = next;
    this.accumulator = 0;
    this.emit();
    this.renderEvaluated();
  }

  /** Pure evaluation of the puppet state at a frame (used to author keyframes). */
  sampleAt(frame: number): EvaluatedPuppetState {
    return this.evaluateState(clampFrame(frame, this.durationFrames));
  }

  // --- internals ---

  cancelLoop(): void {
    if (this.rafId !== 0) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private startRaf(): void {
    if (this.rafId !== 0) return;
    this.rafId = requestAnimationFrame(this.onRaf);
  }

  private onRaf = (time: number): void => {
    if (!this.playing) return;
    // Ignore the first timestamp so the initial delta is never a huge jump.
    if (this.lastTime === 0) {
      this.lastTime = time;
      this.rafId = requestAnimationFrame(this.onRaf);
      return;
    }
    const delta = Math.min(time - this.lastTime, 250);
    this.lastTime = time;
    this.accumulator += delta;

    const stepMs = 1000 / this.fps;
    while (this.playing && this.accumulator >= stepMs) {
      this.accumulator -= stepMs;
      this.advanceFrame();
    }

    if (this.playing) {
      this.rafId = requestAnimationFrame(this.onRaf);
    }
    this.renderEvaluated();
  };

  private advanceFrame(): void {
    const next = this.currentFrame + 1;
    if (next >= this.durationFrames) {
      if (this.looping) {
        this.currentFrame = 0;
      } else {
        this.currentFrame = this.durationFrames - 1;
        this.playing = false;
        this.cancelLoop();
      }
    } else {
      this.currentFrame = next;
    }
    this.emit();
  }

  /** Evaluates the current frame and pushes the result to the renderer. */
  private renderEvaluated(): void {
    if (!this.puppet) return;
    const renderer = this.renderers.get(this.puppet.id);
    if (!renderer) return;
    const state = this.evaluateState(this.currentFrame);
    const patched: Puppet = {
      ...this.puppet,
      position: { x: state.position.x, y: state.position.y },
      rotation: state.rotation,
      activeViseme: state.viseme,
      activeExpression: state.expression,
    };
    void renderer.paint(patched);
  }

  /**
   * Evaluates all tracks at `frame`. Transform values lerp between the
   * surrounding keyframes (holding base values before the first keyframe);
   * viseme/expression tracks hold the closest preceding keyframe's value.
   */
  private evaluateState(frame: number): EvaluatedPuppetState {
    const puppet = this.puppet;
    const base: EvaluatedPuppetState = puppet
      ? {
          position: { x: puppet.position.x, y: puppet.position.y },
          rotation: puppet.rotation % DEG_360,
          viseme: puppet.activeViseme as Viseme,
          expression: puppet.activeExpression as Expression,
        }
      : { position: { x: 0, y: 0 }, rotation: 0, viseme: 'Rest', expression: 'neutral' };
    if (!puppet || !this.timeline) return base;

    const transform = findTrack(this.timeline, 'puppet', puppet.id);
    if (transform && transform.keyframes.length > 0) {
      const { prev, next } = findSpan(transform.keyframes, frame);
      if (prev && next) {
        const t = next.frame === prev.frame ? 0 : (frame - prev.frame) / (next.frame - prev.frame);
        base.position.x = lerp(readNum(prev.value, 'x', base.position.x), readNum(next.value, 'x', base.position.x), t);
        base.position.y = lerp(readNum(prev.value, 'y', base.position.y), readNum(next.value, 'y', base.position.y), t);
        base.rotation = lerpAngle(
          readNum(prev.value, 'rotation', base.rotation),
          readNum(next.value, 'rotation', base.rotation),
          t,
        );
      } else if (prev) {
        base.position.x = readNum(prev.value, 'x', base.position.x);
        base.position.y = readNum(prev.value, 'y', base.position.y);
        base.rotation = readNum(prev.value, 'rotation', base.rotation);
      }
    }

    const visemeTrack = findTrack(this.timeline, 'viseme', puppet.id);
    if (visemeTrack && visemeTrack.keyframes.length > 0) {
      const held = findSpan(visemeTrack.keyframes, frame).prev;
      if (held) {
        const candidate = held.value['viseme'];
        if (typeof candidate === 'string' && isViseme(candidate)) base.viseme = candidate;
      }
    }

    const expressionTrack = findTrack(this.timeline, 'expression', puppet.id);
    if (expressionTrack && expressionTrack.keyframes.length > 0) {
      const held = findSpan(expressionTrack.keyframes, frame).prev;
      if (held) {
        const candidate = held.value['expression'];
        if (typeof candidate === 'string' && isExpression(candidate)) base.expression = candidate;
      }
    }

    return base;
  }

  /** Tears down the rAF loop and releases references. */
  destroy(): void {
    this.cancelLoop();
    this.playing = false;
    this.listeners.clear();
    this.renderers.clear();
    this.puppet = null;
    this.timeline = null;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}