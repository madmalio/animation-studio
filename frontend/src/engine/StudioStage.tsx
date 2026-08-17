import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Application, Container } from 'pixi.js';
import { TextureStore } from './textureStore';
import { computeFit, ViewportCamera } from './camera';

export interface StageLayers {
  /** World-space background layer (under the camera so it pans with the scene). */
  background: Container;
  /** World-space character puppet layer. */
  puppets: Container;
  /** World-space props layer. */
  props: Container;
  /** World-space overlay layer (annotations, on-canvas UI). */
  overlay: Container;
  /** Screen-space UI layer (fixed HUD, unaffected by pan/zoom). */
  ui: Container;
}

/** Imperative handle into the live Pixi stage. */
export interface StageHandle {
  app: Application;
  camera: ViewportCamera;
  fitRoot: Container;
  cameraRoot: Container;
  layers: StageLayers;
  store: TextureStore;
  stageWidth: number;
  stageHeight: number;
  /** Re-applies fit + camera transforms to the scene graph. */
  updateTransforms(): void;
  /** Resizes the renderer and recomputes the letterbox. */
  resize(width: number, height: number): void;
}

const StageContext = createContext<StageHandle | null>(null);

/** Access the imperative stage handle; throws when rendered outside <StudioStage>. */
export function useStudioStage(): StageHandle {
  const handle = useContext(StageContext);
  if (!handle) {
    throw new Error('useStudioStage must be used inside <StudioStage>');
  }
  return handle;
}

interface StudioStageProps {
  stageWidth?: number;
  stageHeight?: number;
  className?: string;
  onReady?: (handle: StageHandle) => void;
  children?: ReactNode;
}

/**
 * React wrapper around a PixiJS Application with a fixed-aspect virtual
 * canvas (1920x1080 by default) fitted into the host element (Fit-Center),
 * a pannable/zoomable camera and a layered world root:
 *
 *   app.stage
 *   ├─ fitRoot            (letterbox offset + scale)
 *   │   └─ cameraRoot     (pan + zoom)
 *   │       ├─ background
 *   │       ├─ puppets
 *   │       ├─ props
 *   │       └─ overlay
 *   └─ ui                 (screen-space HUD)
 *
 * The Pixi application is created exactly once per mount and fully destroyed
 * on unmount; both event listeners and the texture store are torn down in the
 * same effect cleanup, so hot-reloads and StrictMode double-mounts leak nothing.
 */
export function StudioStage({
  stageWidth = 1920,
  stageHeight = 1080,
  className,
  onReady,
  children,
}: StudioStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [handle, setHandle] = useState<StageHandle | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let app: Application | null = null;
    const store = new TextureStore();
    const camera = new ViewportCamera();

    const fitRoot = new Container();
    const cameraRoot = new Container();
    const layers: StageLayers = {
      background: new Container(),
      puppets: new Container(),
      props: new Container(),
      overlay: new Container(),
      ui: new Container(),
    };

    let handleRef: StageHandle | null = null;

    const applyTransforms = (): void => {
      if (!handleRef) return;
      fitRoot.position.set(camera.fit.x, camera.fit.y);
      fitRoot.scale.set(camera.fit.scale, camera.fit.scale);
      camera.applyTo(cameraRoot);
    };

    const resize = (width: number, height: number): void => {
      if (!app || width <= 0 || height <= 0) return;
      app.renderer.resize(width, height);
      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      camera.fit = computeFit(width, height, stageWidth, stageHeight);
      applyTransforms();
    };

    let detach: () => void = () => {};

    void (async () => {
      try {
        const created = new Application();
        await created.init({
          width: host.clientWidth || 640,
          height: host.clientHeight || 360,
          background: '#111318',
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          preference: 'webgl',
        });

        if (disposed) {
          created.destroy(true, { children: true });
          return;
        }
        app = created;

        const canvas = created.canvas as HTMLCanvasElement;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        canvas.style.touchAction = 'none';
        host.appendChild(canvas);

        // Assemble the scene graph.
        cameraRoot.addChild(layers.background, layers.puppets, layers.props, layers.overlay);
        fitRoot.addChild(cameraRoot);
        created.stage.addChild(fitRoot, layers.ui);

        const buildHandle = (): StageHandle => ({
          app: created,
          camera,
          fitRoot,
          cameraRoot,
          layers,
          store,
          stageWidth,
          stageHeight,
          updateTransforms: applyTransforms,
          resize,
        });
        handleRef = buildHandle();

        const onChange = (): void => handleRef?.updateTransforms();
        detach = attachInput(canvas, handleRef, onChange, () => {
          if (!panning) canvas.style.cursor = '';
        });

        resize(host.clientWidth || 640, host.clientHeight || 360);

        const observer = new ResizeObserver(() => {
          const w = host.clientWidth;
          const h = host.clientHeight;
          if (w > 0 && h > 0) resize(w, h);
        });
        observer.observe(host);
        const baseDetach = detach;
        detach = () => {
          observer.disconnect();
          baseDetach();
        };

        if (disposed) return;
        setHandle(handleRef);
        onReadyRef.current?.(handleRef);
      } catch (err) {
        if (!disposed) {
          setFatalError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      disposed = true;
      detach();
      store.disposeAll();
      if (app) {
        app.destroy(true, { children: true });
        app = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hostRefCallback = useCallback((node: HTMLDivElement | null) => {
    hostRef.current = node;
  }, []);

  return (
    <StageContext.Provider value={handle}>
      <div ref={hostRefCallback} className={className} data-testid="studio-stage" style={{ position: 'relative', overflow: 'hidden' }}>
        {fatalError !== null ? (
          <div style={{ padding: 12, color: '#ff9d9d' }}>Failed to start renderer: {fatalError}</div>
        ) : null}
        {handle !== null && children}
      </div>
    </StageContext.Provider>
  );
}

// Tracked by attachInput so the cleanup closure can read the live value.
let panning = false;

/** Attaches pan (middle-mouse / space+drag) and wheel-zoom listeners. */
function attachInput(
  canvas: HTMLCanvasElement,
  handle: StageHandle,
  onChange: () => void,
  clearCursor: () => void,
): () => void {
  let pointerId = -1;
  let lastX = 0;
  let lastY = 0;
  let space = false;

  const rect = () => canvas.getBoundingClientRect();

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const r = rect();
    const sx = event.clientX - r.left;
    const sy = event.clientY - r.top;
    const factor = Math.exp(-event.deltaY * 0.0016);
    handle.camera.zoomAt(factor, sx, sy);
    onChange();
  };

  const onPointerDown = (event: PointerEvent) => {
    const middle = event.button === 1;
    const left = event.button === 0 && space;
    if (!middle && !left) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    panning = true;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.style.cursor = 'grabbing';
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!panning || event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    handle.camera.panBy(dx, dy);
    onChange();
  };

  const endPan = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    panning = false;
    pointerId = -1;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    clearCursor();
  };

  const onPointerUp = (event: PointerEvent) => endPan(event);
  const onPointerCancel = (event: PointerEvent) => endPan(event);

  const onMouseDown = (event: MouseEvent): void => {
    if (event.button === 1) event.preventDefault();
  };

  const onContextMenu = (event: Event) => event.preventDefault();

  const onWindowKeyDown = (event: KeyboardEvent) => {
    if (event.code !== 'Space') return;
    if (isEditableTarget(event.target)) return;
    space = true;
    canvas.style.cursor = 'grab';
    event.preventDefault();
  };
  const onWindowKeyUp = (event: KeyboardEvent) => {
    if (event.code !== 'Space') return;
    space = false;
    clearCursor();
  };
  const onWindowBlur = (): void => {
    space = false;
    panning = false;
    clearCursor();
  };

  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onWindowKeyDown);
  window.addEventListener('keyup', onWindowKeyUp);
  window.addEventListener('blur', onWindowBlur);

  return () => {
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('keydown', onWindowKeyDown);
    window.removeEventListener('keyup', onWindowKeyUp);
    window.removeEventListener('blur', onWindowBlur);
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  );
}