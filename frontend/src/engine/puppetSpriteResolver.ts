import type { Texture } from 'pixi.js';
import type { Puppet, TextureSwap } from '../types/puppet';
import type { StudioAsset } from '../types/asset';
import { TextureStore } from './textureStore';

/**
 * The resolved texture assignment for a single puppet: which asset each
 * layer/slot currently displays, after layering the active viseme and
 * expression mappings on top of the static schema.
 */
export interface ResolvedSpriteSet {
  /** layerId -> assetId for image layers (only layers that have a texture). */
  layers: Map<string, string>;
  /** slotId -> assetId (the slot's active asset after swap resolution). */
  slots: Map<string, string>;
}

/**
 * Pure function deriving the effective asset per layer/slot from the puppet
 * schema and its active viseme/expression. Expression swaps are applied on
 * top of viseme swaps so a smirk on top of an open mouth wins.
 */
export function resolveSpriteSet(puppet: Puppet): ResolvedSpriteSet {
  const layers = new Map<string, string>();
  const slots = new Map<string, string>();

  for (const layer of puppet.layers) {
    if (layer.kind === 'image' && layer.assetId) {
      layers.set(layer.id, layer.assetId);
    }
  }
  for (const slot of puppet.slots) {
    if (slot.activeAssetId && slot.assetIDs.includes(slot.activeAssetId)) {
      slots.set(slot.id, slot.activeAssetId);
    }
  }

  const viseme = puppet.visemeMappings.find((m) => m.viseme === puppet.activeViseme);
  if (viseme) applySwaps(viseme.swaps, layers, slots);

  const expression = puppet.expressionStates.find((e) => e.expression === puppet.activeExpression);
  if (expression) applySwaps(expression.swaps, layers, slots);

  return { layers, slots };
}

function applySwaps(swaps: readonly TextureSwap[], layers: Map<string, string>, slots: Map<string, string>): void {
  for (const swap of swaps) {
    if (!swap.assetId) continue;
    if (swap.slotId) slots.set(swap.slotId, swap.assetId);
    else if (swap.layerId) layers.set(swap.layerId, swap.assetId);
  }
}

/**
 * Tracks the textures a single puppet renderer has acquired from the store,
 * so they can be released in one call whenever the puppet is re-rendered or
 * removed. Idempotent: calling release() twice is safe.
 */
export class PuppetTextureBudget {
  private held = new Map<string, Texture>();

  constructor(private readonly store: TextureStore) {}

  /** Acquires the texture for an asset, remembering it for later release. */
  async acquire(assetUrl: string): Promise<Texture> {
    if (this.held.has(assetUrl)) {
      return this.held.get(assetUrl) as Texture;
    }
    const texture = await this.store.acquire(assetUrl);
    this.held.set(assetUrl, texture);
    return texture;
  }

  /** Re-acquires every texture referenced by the given asset ids. */
  async ensure(
    assets: ReadonlyMap<string, StudioAsset>,
    assetIds: Iterable<string>,
  ): Promise<Map<string, Texture>> {
    const byAsset = new Map<string, Texture>();
    for (const assetId of assetIds) {
      const asset = assets.get(assetId);
      if (!asset || asset.kind !== 'image') continue;
      try {
        byAsset.set(assetId, await this.acquire(asset.url));
      } catch {
        // A single asset failing to load must not take the whole puppet down.
      }
    }
    return byAsset;
  }

  /** Un-acquires every texture this budget holds. Safe to call repeatedly. */
  release(): void {
    if (this.held.size === 0) return;
    for (const url of this.held.keys()) {
      this.store.release(url);
    }
    this.held.clear();
  }

  get size(): number {
    return this.held.size;
  }
}