import { Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import type { Puppet } from '../types/puppet';
import type { StudioAsset } from '../types/asset';
import { degToRad } from '../types/puppet';
import { PuppetTextureBudget, resolveSpriteSet } from './puppetSpriteResolver';
import type { TextureStore } from './textureStore';

/**
 * Renders a single puppet into a Pixi layer container. The composite is a
 * plain scene graph: a root Container holding child sprites/containers for
 * each static layer and each slot.
 *
 * Re-rendering is idempotent and cheap: paint() is called whenever the puppet
 * state changes and rebuilds the small sprite set, reusing the cached
 * textures from the store with zero texture re-decodes.
 */
export class PuppetRenderer {
  /** Root container; add this to a stage layer. */
  readonly root = new Container();
  readonly puppetId: string;

  private slotRoots = new Map<string, Container>();
  private sprites = new Map<string, Sprite>();
  private budget: PuppetTextureBudget;
  private assets: ReadonlyMap<string, StudioAsset>;
  private lastKey = '';

  constructor(opts: { store: TextureStore; assets: ReadonlyMap<string, StudioAsset>; puppetId?: string }) {
    this.puppetId = opts.puppetId ?? 'puppet';
    this.assets = opts.assets;
    this.budget = new PuppetTextureBudget(opts.store);
  }

  /**
   * Builds the full scene graph for the given puppet state from scratch.
   * Any previously-held textures are released first, so rapid viseme/expression
   * changes cannot leak.
   */
  async paint(puppet: Puppet): Promise<void> {
    const key = `${puppet.activeViseme}:${puppet.activeExpression}`;
    if (this.lastKey === key && this.root.children.length > 0) {
      this.applyTransform(puppet);
      return;
    }
    this.lastKey = key;

    this.clearChildren();
    this.budget.release();

    const { layers, slots } = resolveSpriteSet(puppet);
    const neededIds = new Set<string>([...layers.values(), ...slots.values()]);
    const textures = await this.budget.ensure(this.assets, neededIds);

    const layerById = new Map(puppet.layers.map((l) => [l.id, l]));
    const groups = new Map<string, Container>();

    const getParent = (layerId?: string): Container => {
      if (!layerId) return this.root;
      const group = groups.get(layerId);
      return group ?? this.root;
    };

    const orderedLayers = [...puppet.layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of orderedLayers) {
      if (layer.kind === 'group') {
        const group = new Container();
        group.position.set(layer.position.x, layer.position.y);
        group.rotation = degToRad(layer.rotation);
        group.scale.set(layer.scale.x, layer.scale.y);
        group.visible = layer.visible;
        group.alpha = layer.opacity;
        group.zIndex = layer.zIndex;
        groups.set(layer.id, group);
        getParent(layer.parentId).addChild(group);
        continue;
      }

      const assetId = layers.get(layer.id);
      const texture = assetId ? textures.get(assetId) : undefined;
      if (!texture) continue;

      const sprite = new Sprite(texture);
      sprite.anchor.set(layer.anchor.x, layer.anchor.y);
      sprite.position.set(layer.position.x, layer.position.y);
      sprite.rotation = degToRad(layer.rotation);
      sprite.scale.set(layer.scale.x, layer.scale.y);
      sprite.alpha = layer.opacity * (puppet.opacity ?? 1);
      sprite.visible = layer.visible;
      sprite.zIndex = layer.zIndex;
      getParent(layer.parentId).addChild(sprite);
      this.sprites.set(`layer:${layer.id}`, sprite);
    }

    const orderedSlots = [...puppet.slots].sort((a, b) => a.zIndex - b.zIndex);
    for (const slot of orderedSlots) {
      const parent = slot.layerId ? groups.get(slot.layerId) : this.root;
      if (!parent) continue;

      const slotRoot = new Container();
      slotRoot.position.set(slot.position.x, slot.position.y);
      slotRoot.rotation = degToRad(slot.rotation);
      slotRoot.scale.set(slot.scale.x, slot.scale.y);
      slotRoot.visible = slot.visible;
      slotRoot.alpha = slot.opacity;
      slotRoot.zIndex = slot.zIndex;
      parent.addChild(slotRoot);
      this.slotRoots.set(`slot:${slot.id}`, slotRoot);

      const assetId = slots.get(slot.id);
      const texture = assetId ? textures.get(assetId) : undefined;
      if (!texture) continue;

      const sprite = new Sprite(texture);
      sprite.anchor.set(slot.anchor.x, slot.anchor.y);
      sprite.alpha = slot.opacity;
      sprite.visible = slot.visible;
      slotRoot.addChild(sprite);
      this.sprites.set(`slot:${slot.id}`, sprite);
    }

    this.applyTransform(puppet);
  }

  /** Applies the puppet-level transform without touching the sprite set. */
  applyTransform(puppet: Puppet): void {
    this.root.position.set(puppet.position.x, puppet.position.y);
    this.root.scale.set(puppet.scale.x, puppet.scale.y);
    this.root.rotation = degToRad(puppet.rotation);
    this.root.visible = puppet.visible;
    this.root.alpha = puppet.opacity ?? 1;
    this.root.zIndex = puppet.zIndex;
  }

  /** Removes every child and releases all textures. Safe to call multiple times. */
  destroy(): void {
    this.clearChildren();
    this.budget.release();
    this.sprites.clear();
    this.slotRoots.clear();
    this.lastKey = '';
  }

  private clearChildren(): void {
    this.root.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.sprites.clear();
    this.slotRoots.clear();
  }
}