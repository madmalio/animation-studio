import type { Container } from 'pixi.js';

/**
 * Describes how the fixed 1920x1080 virtual canvas is letterboxed into the
 * actual WebGL canvas (Fit-Center). The fitRoot container is positioned at
 * (x, y) and scaled by `scale`.
 */
export interface FitViewport {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Interactive camera handling pan and zoom over the virtual stage.
 *
 * The transform is applied to the cameraRoot container, which lives inside
 * the fitRoot (the letterbox). worldToLocal / localToWorld convert between
 * screen pixels and coordinates in the 1920x1080 content space.
 */
export class ViewportCamera {
  /** Camera translation in fitRoot-local pixels. */
  panX = 0;
  panY = 0;
  /** Camera zoom relative to the fitted stage. */
  zoom = 1;

  minZoom = 0.02;
  maxZoom = 16;

  /** Current fit computed from the last resize. */
  fit: FitViewport = { scale: 1, x: 0, y: 0, width: 0, height: 0 };

  /** Applies pan/zoom + fit to the camera-root container. */
  applyTo(cameraRoot: Container): void {
    cameraRoot.position.set(this.panX, this.panY);
    cameraRoot.scale.set(this.zoom, this.zoom);
  }

  /** Translates the camera by screen pixels. */
  panBy(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
  }

  /**
   * Zooms the camera by `factor` (multiplicative), keeping the world point
   * under the given screen position anchored under the cursor. screenX/Y are
   * CSS pixels relative to the canvas element.
   */
  zoomAt(factor: number, screenX: number, screenY: number): void {
    const target = clamp(this.zoom * factor, this.minZoom, this.maxZoom);
    if (target === this.zoom) return;

    // Point in fitRoot space that the cursor sits on.
    const sx = (screenX - this.fit.x) / this.fit.scale;
    const sy = (screenY - this.fit.y) / this.fit.scale;

    // Content coordinates under that point at the current zoom.
    const cx = (sx - this.panX) / this.zoom;
    const cy = (sy - this.panY) / this.zoom;

    this.zoom = target;
    this.panX = sx - cx * this.zoom;
    this.panY = sy - cy * this.zoom;
  }

  /** Resets to default framing: full stage, centered, no pan. */
  resetView(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1;
  }

  /** Converts a screen position (CSS px) into content (world) coordinates. */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const sx = (screenX - this.fit.x) / this.fit.scale;
    return {
      x: (sx - this.panX) / this.zoom,
      y: ((screenY - this.fit.y) / this.fit.scale - this.panY) / this.zoom,
    };
  }

  /** Whether the given screen position falls inside the fitted stage area. */
  isInsideStage(screenX: number, screenY: number): boolean {
    const left = this.fit.x;
    const top = this.fit.y;
    return screenX >= left && screenY >= top && screenX <= left + this.fit.width && screenY <= top + this.fit.height;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Computes the Fit-Center letterbox for the given canvas size. */
export function computeFit(canvasWidth: number, canvasHeight: number, stageWidth: number, stageHeight: number): FitViewport {
  const scale = Math.min(canvasWidth / stageWidth, canvasHeight / stageHeight);
  return {
    scale,
    x: (canvasWidth - stageWidth * scale) / 2,
    y: (canvasHeight - stageHeight * scale) / 2,
    width: stageWidth * scale,
    height: stageHeight * scale,
  };
}