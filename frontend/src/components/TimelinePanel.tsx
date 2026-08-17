import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { StudioAsset } from '../types/asset';
import type { Keyframe, Project, Timeline, Track } from '../types/project';
import type { PlaybackEngine, PlaybackSnapshot } from '../engine/playbackEngine';
import {
  TL_LANES,
  addKeyframeOp,
  createKeyframeFor,
  findTrack,
  findTrackById,
  moveKeyframeOp,
  nextFreeFrame,
  readNum,
  readStr,
  removeKeyframeOp,
  type LaneDefinition,
} from '../engine/timelineModel';

interface TimelinePanelProps {
  engine: PlaybackEngine;
  project: Project | null;
  puppetId: string;
  audioAssets: readonly StudioAsset[];
  onTimelineChange: (timeline: Timeline) => void;
}

type DragMode = 'scrub' | 'keyframe-move';

interface DragState {
  mode: DragMode;
  trackId?: string;
  keyframeId?: string;
  lastFrame: number;
}

const MIN_ZOOM = 2;
const MAX_ZOOM = 48;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function niceStep(pxPerFrame: number): number {
  const raw = 60 / pxPerFrame;
  const table = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  return table.find((s) => s >= raw) ?? 1000;
}

function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds >= 0 ? totalSeconds : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
}

function keyframeTitle(def: LaneDefinition, k: Keyframe): string {
  switch (def.kind) {
    case 'puppet':
      return `Transform @ f${k.frame} · x=${readNum(k.value, 'x', 0)} y=${readNum(k.value, 'y', 0)} rot=${readNum(k.value, 'rotation', 0)}°`;
    case 'viseme':
      return `Viseme @ f${k.frame} · ${readStr(k.value, 'viseme', '?')}`;
    case 'expression':
      return `Expression @ f${k.frame} · ${readStr(k.value, 'expression', '?')}`;
    default:
      return `Audio @ f${k.frame} · ${readStr(k.value, 'assetId', 'no asset')} (${readNum(k.value, 'durationMs', 1000)}ms)`;
  }
}

function keyframeShortLabel(def: LaneDefinition, k: Keyframe): string {
  switch (def.kind) {
    case 'puppet':
      return `${Math.round(readNum(k.value, 'x', 0))},${Math.round(readNum(k.value, 'y', 0))}`;
    case 'viseme':
      return readStr(k.value, 'viseme', '?');
    case 'expression':
      return readStr(k.value, 'expression', '?');
    default:
      return '';
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;
}

/**
 * Multi-lane timeline with a scrubbable ruler, play/pause/stop/loop
 * transport, zoom controls and drag-based keyframe editing.
 *
 * Heavy canvas elements never re-render here: transport and scrubbing go
 * straight to the PlaybackEngine (which pushes evaluated frames into the
 * PuppetRenderer), and keyframe edits only change the lightweight `Project`
 * document — the Pixi stage is never part of this component's render tree.
 */
export function TimelinePanel({ engine, project, puppetId, audioAssets, onTimelineChange }: TimelinePanelProps) {
  const snapshot = useSyncExternalStore<PlaybackSnapshot>(engine.subscribe, engine.getSnapshot);
  const fps = project?.viewport.fps ?? 24;
  const timeline = project?.timeline ?? null;
  const enabled = timeline !== null;

  const [zoom, setZoomState] = useState(8);
  const [selected, setSelected] = useState<{ trackId: string; keyframeId: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const liveRef = useRef({
    zoom,
    fps,
    durationFrames: snapshot.durationFrames,
    timeline,
    onTimelineChange,
    audioAssetId: audioAssets[0]?.id ?? '',
  });
  liveRef.current = {
    zoom,
    fps,
    durationFrames: snapshot.durationFrames,
    timeline,
    onTimelineChange,
    audioAssetId: audioAssets[0]?.id ?? '',
  };

  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  /** Maps a screen X coordinate to an integer frame within the timeline. */
  const frameFromClientX = useCallback((clientX: number): number => {
    const live = liveRef.current;
    const body = bodyRef.current;
    const scroll = scrollRef.current;
    if (!body || !scroll || live.durationFrames <= 1) return 0;
    const rect = body.getBoundingClientRect();
    const x = clientX - rect.left + scroll.scrollLeft;
    return Math.max(0, Math.min(live.durationFrames - 1, Math.round(x / live.zoom)));
  }, []);

  /** Keeps the frame at `x` (content px) centered-ish in the scroll window. */
  const scrollToContentX = useCallback((x: number): void => {
    const scroll = scrollRef.current;
    const body = bodyRef.current;
    if (!scroll || !body) return;
    const maxScroll = Math.max(0, body.scrollWidth - scroll.clientWidth);
    const target = Math.max(0, Math.min(maxScroll, x - scroll.clientWidth / 2));
    if (Math.abs(scroll.scrollLeft - target) > 1) scroll.scrollLeft = target;
  }, []);

  const ensureFrameVisible = useCallback(
    (frame: number): void => {
      scrollToContentX(frame * liveRef.current.zoom);
    },
    [scrollToContentX],
  );

  // Follow the playhead while the transport is running.
  useEffect(() => {
    return engine.subscribe(() => {
      const state = engine.getSnapshot();
      if (state.playing) ensureFrameVisible(state.currentFrame);
    });
  }, [engine, ensureFrameVisible]);

  const zoomIn = useCallback(() => setZoomState((z) => clampZoom(z * 1.4)), []);
  const zoomOut = useCallback(() => setZoomState((z) => clampZoom(z / 1.4)), []);
  const zoomFit = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const available = Math.max(40, scroll.clientWidth - 200);
    setZoomState(clampZoom(Math.floor(available / liveRef.current.durationFrames)));
  }, []);

  const toggleLoop = useCallback(() => {
    if (!enabled) return;
    engine.setLooping(!engine.getSnapshot().looping);
  }, [enabled, engine]);

  const handleTogglePlay = useCallback(() => {
    if (!enabled) return;
    engine.togglePlay();
  }, [enabled, engine]);

  const handleStop = useCallback(() => {
    if (!enabled) return;
    engine.stop();
    ensureFrameVisible(0);
  }, [enabled, engine, ensureFrameVisible]);

  const beginDrag = useCallback((state: DragState) => {
    dragRef.current = state;
    setDragActive(true);
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    setDragActive(false);
  }, []);

  const startScrub = useCallback(
    (clientX: number): void => {
      if (!enabled) return;
      const frame = frameFromClientX(clientX);
      if (engine.getSnapshot().playing) engine.pause();
      engine.setFrame(frame);
      setSelected(null);
      beginDrag({ mode: 'scrub', lastFrame: frame });
      ensureFrameVisible(frame);
    },
    [beginDrag, enabled, engine, ensureFrameVisible, frameFromClientX],
  );

  const startKeyframeDrag = useCallback(
    (trackId: string, keyframeId: string, clientX: number): void => {
      if (!enabled) return;
      setSelected({ trackId, keyframeId });
      beginDrag({ mode: 'keyframe-move', trackId, keyframeId, lastFrame: frameFromClientX(clientX) });
    },
    [beginDrag, enabled, frameFromClientX],
  );

  // Window-level pointer tracking while a drag is in progress.
  useEffect(() => {
    if (!dragActive) return;
    const onMove = (event: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;
      const live = liveRef.current;
      const body = bodyRef.current;
      const scroll = scrollRef.current;
      if (!body || !scroll) return;
      const rect = body.getBoundingClientRect();
      const x = event.clientX - rect.left + scroll.scrollLeft;
      const frame = Math.max(0, Math.min(live.durationFrames - 1, Math.round(x / live.zoom)));

      if (drag.mode === 'scrub') {
        engine.setFrame(frame);
        drag.lastFrame = frame;
        ensureFrameVisible(frame);
        return;
      }

      if (!drag.trackId || !drag.keyframeId || !live.timeline) return;
      const track = findTrackById(live.timeline, drag.trackId);
      if (!track) return;
      const maxFrame = live.durationFrames - 1;
      const target = nextFreeFrame(track, frame, maxFrame, drag.keyframeId);
      const current = track.keyframes.find((k) => k.id === drag.keyframeId);
      if (current && current.frame !== target) {
        live.onTimelineChange(moveKeyframeOp(live.timeline, drag.trackId, drag.keyframeId, target, maxFrame));
        drag.lastFrame = target;
      }
    };
    const onUp = (): void => endDrag();
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragActive, endDrag, engine, ensureFrameVisible]);

  const deleteSelected = useCallback((): void => {
    const live = liveRef.current;
    const sel = selectedRef.current;
    if (!live.timeline || !sel) return;
    const track = findTrackById(live.timeline, sel.trackId);
    if (!track || !track.keyframes.some((k) => k.id === sel.keyframeId)) {
      setSelected(null);
      return;
    }
    live.onTimelineChange(removeKeyframeOp(live.timeline, sel.trackId, sel.keyframeId));
    setSelected(null);
  }, []);

  const addKeyframeOnLane = useCallback(
    (def: LaneDefinition, frame: number): void => {
      const live = liveRef.current;
      if (!live.timeline) return;
      const target = Math.max(0, Math.min(live.durationFrames - 1, Math.round(frame)));
      const track = findTrack(live.timeline, def.kind, def.targetIdFor(puppetId));
      if (!track) return;
      const sample = engine.sampleAt(target);
      const keyframe = createKeyframeFor(def, target, sample, live.audioAssetId);
      engine.setFrame(target);
      live.onTimelineChange(addKeyframeOp(live.timeline, track.id, keyframe, live.durationFrames - 1));
      setSelected({ trackId: track.id, keyframeId: keyframe.id });
      ensureFrameVisible(target);
    },
    [engine, ensureFrameVisible, puppetId],
  );

  // Keyboard transport + editing (grid keeps focus while the timeline is used).
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target)) return;
      if (event.code === 'Space') {
        event.preventDefault();
        event.stopPropagation();
        handleTogglePlay();
      } else if (event.code === 'Home') {
        event.preventDefault();
        engine.setFrame(0);
        ensureFrameVisible(0);
      } else if ((event.code === 'Delete' || event.code === 'Backspace') && selectedRef.current) {
        event.preventDefault();
        deleteSelected();
      } else if (event.code === 'Equal' || event.code === 'NumpadAdd') {
        event.preventDefault();
        zoomIn();
      } else if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
        event.preventDefault();
        zoomOut();
      } else if (event.code === 'KeyF') {
        event.preventDefault();
        zoomFit();
      }
    };
    grid.addEventListener('keydown', onKeyDown);
    return () => grid.removeEventListener('keydown', onKeyDown);
  }, [deleteSelected, engine, ensureFrameVisible, handleTogglePlay, zoomFit, zoomIn, zoomOut]);

  const lanes = useMemo(() => {
    if (!timeline) return [];
    return TL_LANES.map((def) => {
      const track = findTrack(timeline, def.kind, def.targetIdFor(puppetId));
      return track ? { def, track } : null;
    }).filter((lane): lane is { def: LaneDefinition; track: Track } => lane !== null);
  }, [timeline, puppetId]);

  const laneContent = useMemo(() => lanes, [lanes]);

  const ticks = useMemo(() => {
    const step = niceStep(zoom);
    const major: number[] = [];
    for (let f = 0; f < snapshot.durationFrames; f += step) major.push(f);
    const minor: number[] = [];
    if (zoom >= 8 && snapshot.durationFrames <= 600 && step > 1) {
      for (let f = 0; f < snapshot.durationFrames; f++) if (f % step !== 0) minor.push(f);
    }
    return { major, minor, step };
  }, [snapshot.durationFrames, zoom]);

  const contentWidth = Math.max(1, snapshot.durationFrames * zoom);
  const timeLabel = useMemo(() => formatTime(snapshot.currentFrame / fps), [snapshot.currentFrame, fps]);

  const preventButtonFocus = useCallback((event: React.MouseEvent) => event.preventDefault(), []);
  const handleLaneDoubleClick = useCallback(
    (event: React.MouseEvent, def: LaneDefinition): void => {
      addKeyframeOnLane(def, frameFromClientX(event.clientX));
    },
    [addKeyframeOnLane, frameFromClientX],
  );
  const handleScrubPointerDown = useCallback(
    (event: React.PointerEvent): void => {
      startScrub(event.clientX);
    },
    [startScrub],
  );
  const handleKeyPointerDown = useCallback(
    (event: React.PointerEvent, trackId: string, keyframeId: string): void => {
      event.stopPropagation();
      startKeyframeDrag(trackId, keyframeId, event.clientX);
    },
    [startKeyframeDrag],
  );

  return (
    <section className="timeline" data-testid="timeline" onPointerDownCapture={() => gridRef.current?.focus({ preventScroll: true })}>
      <div className="timeline-toolbar">
        <div className="timeline-cluster">
          <button className="btn btn-small" title="Play / Pause (Space)" onClick={handleTogglePlay} onMouseDown={preventButtonFocus}>
            {snapshot.playing ? 'Pause' : 'Play'}
          </button>
          <button className="btn btn-small" title="Stop (rewind to frame 0)" onClick={handleStop} onMouseDown={preventButtonFocus}>
            Stop
          </button>
          <button
            className={snapshot.looping ? 'btn btn-small tl-btn-active' : 'btn btn-small'}
            title="Loop playback"
            onClick={toggleLoop}
            onMouseDown={preventButtonFocus}
          >
            Loop
          </button>
        </div>
        <div className="timeline-cluster tl-readout" title="current / total frames">
          <span className="tl-frame">{snapshot.currentFrame}</span>
          <span className="tl-frame-sep">/</span>
          <span className="tl-frame">{snapshot.durationFrames}</span>
          <span className="tl-time">{timeLabel}</span>
        </div>
        <div className="timeline-spacer" />
        <button className="btn btn-small" title="Zoom out (−)" onClick={zoomOut} onMouseDown={preventButtonFocus}>
          −
        </button>
        <button className="btn btn-small" title="Zoom to fit timeline (F)" onClick={zoomFit} onMouseDown={preventButtonFocus}>
          Fit
        </button>
        <button className="btn btn-small" title="Zoom in (+)" onClick={zoomIn} onMouseDown={preventButtonFocus}>
          +
        </button>
        <button className="btn btn-small" title="Delete selected keyframe (Del)" disabled={!selected} onClick={deleteSelected} onMouseDown={preventButtonFocus}>
          Delete
        </button>
      </div>

      {enabled ? (
        <div className="timeline-scroll" ref={scrollRef} tabIndex={0} aria-label="Timeline">
          <div className="timeline-body" ref={bodyRef} style={{ width: contentWidth }} data-testid="timeline-body">
            <div className="timeline-ruler" onPointerDown={handleScrubPointerDown}>
              {ticks.minor.map((f) => (
                <span key={`m${f}`} className="timeline-tick timeline-tick-minor" style={{ left: f * zoom }} />
              ))}
              {ticks.major.map((frame) => (
                <span key={frame} className="timeline-tick" style={{ left: frame * zoom }}>
                  <span className="timeline-tick-label">{frame}</span>
                </span>
              ))}
            </div>

            <div className="timeline-lanes">
              {laneContent.map(({ def, track }) => (
                <div key={track.id} className="timeline-lane" data-track-kind={def.kind}>
                  <div className="timeline-lane-label">
                    <span className="timeline-lane-dot" style={{ background: def.color }} />
                    <span className="timeline-lane-name" title={def.name}>
                      {def.short}
                    </span>
                    <button
                      className="timeline-lane-add"
                      title="Add keyframe at playhead"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={preventButtonFocus}
                      onClick={() => addKeyframeOnLane(def, engine.getSnapshot().currentFrame)}
                    >
                      ＋
                    </button>
                  </div>
                  <div
                    className="timeline-lane-tracks"
                    onPointerDown={handleScrubPointerDown}
                    onDoubleClick={(event) => handleLaneDoubleClick(event, def)}
                  >
                    {track.keyframes.map((k) => {
                      const isSelected = selected?.trackId === track.id && selected?.keyframeId === k.id;
                      const className = isSelected ? 'tl-key is-selected' : 'tl-key';
                      if (def.kind === 'audio') {
                        const durationFrames = Math.max(1, Math.round((readNum(k.value, 'durationMs', 1000) / 1000) * fps));
                        return (
                          <div
                            key={k.id}
                            className={isSelected ? 'tl-clip is-selected' : 'tl-clip'}
                            style={{ left: k.frame * zoom, width: durationFrames * zoom, background: def.color, borderColor: def.color }}
                            title={keyframeTitle(def, k)}
                            onPointerDown={(e) => handleKeyPointerDown(e, track.id, k.id)}
                            onDoubleClick={(e) => e.stopPropagation()}
                          />
                        );
                      }
                      return (
                        <div
                          key={k.id}
                          className={className}
                          style={{ left: k.frame * zoom, background: def.color, borderColor: def.color }}
                          title={keyframeTitle(def, k)}
                          onPointerDown={(e) => handleKeyPointerDown(e, track.id, k.id)}
                          onDoubleClick={(e) => e.stopPropagation()}
                        >
                          {isSelected ? <span className="tl-key-label">{keyframeShortLabel(def, k)}</span> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="timeline-playhead" data-testid="timeline-playhead" style={{ left: snapshot.currentFrame * zoom }} />
          </div>
        </div>
      ) : (
        <div className="timeline-empty">Open or create a project to edit the timeline.</div>
      )}
    </section>
  );
}