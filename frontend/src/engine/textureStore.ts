import { Assets, ImageSource, Texture } from 'pixi.js';

interface CacheEntry {
  texture: Texture;
  refs: number;
  kind: 'assets' | 'raster';
}

/**
 * Reference-counted texture cache for the stage.
 *
 * - Every acquire() returns a cached Texture for the URL and bumps a refcount.
 * - Every release() drops a ref; the Texture (and its GPU source) are
 *   destroyed once the last ref is gone.
 * - Load failures are never cached, so a transient failure can be retried.
 *
 * PNGs are loaded through Pixi's asset pipeline (native decode + GPU upload);
 * SVGs are rasterized to an offscreen canvas by the browser and wrapped in an
 * ImageSource, since PixiJS v8 dropped first-class SVG texture loading.
 */
export class TextureStore {
  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<Texture>>();

  isSvgUrl(url: string): boolean {
    return /\.svg(?:[?#]|$)/i.test(url);
  }

  /** Loads the texture for `url`, caches it and takes a reference. */
  async acquire(url: string): Promise<Texture> {
    const hit = this.cache.get(url);
    if (hit) {
      hit.refs += 1;
      return hit.texture;
    }

    let pending = this.inflight.get(url);
    if (!pending) {
      pending = this.load(url).then((texture) => {
        this.cache.set(url, { texture, refs: 0, kind: this.isSvgUrl(url) ? 'raster' : 'assets' });
        return texture;
      });
      this.inflight.set(url, pending);
      pending.catch(() => this.inflight.delete(url));
    }

    const texture = await pending;
    const entry = this.cache.get(url);
    if (entry) entry.refs += 1;
    return texture;
  }

  /** Drops one reference to the texture at `url`, destroying it when empty. */
  release(url: string): void {
    const entry = this.cache.get(url);
    if (!entry) return;

    entry.refs -= 1;
    if (entry.refs > 0) return;

    this.cache.delete(url);
    if (entry.kind === 'raster') {
      entry.texture.destroy(true);
    } else {
      // Assets.load caches the texture internally too, so unload it from
      // Pixi's cache as well to fully free the GPU memory.
      void Assets.unload(url).catch(() => entry.texture.destroy(true));
    }
  }

  /** Releases every tracked texture. Call on stage teardown. */
  disposeAll(): void {
    for (const [url, entry] of this.cache) {
      if (entry.kind === 'raster') {
        entry.texture.destroy(true);
      } else {
        void Assets.unload(url).catch(() => entry.texture.destroy(true));
      }
    }
    this.cache.clear();
  }

  /** Number of distinct textures currently retained. */
  get size(): number {
    return this.cache.size;
  }

  private async load(url: string): Promise<Texture> {
    if (this.isSvgUrl(url)) {
      return this.rasterizeSvg(url);
    }
    return Assets.load<Texture>(url);
  }

  private async rasterizeSvg(url: string): Promise<Texture> {
    const img = await loadImage(url);
    const naturalWidth = img.naturalWidth || 300;
    const naturalHeight = img.naturalHeight || 150;

    // Rasterize at 2x the natural size so the texture stays crisp when the
    // sprite is scaled up on the 1920x1080 stage.
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(naturalHeight * scale));

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error(`Unable to create 2D context while rasterizing ${url}`);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const source = new ImageSource({ resource: canvas, label: url });
    const texture = new Texture({ source, label: url });
    source.update();
    return texture;
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to decode image: ${url}`));
    image.src = url;
  });
}