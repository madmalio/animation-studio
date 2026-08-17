import type { StudioAsset } from '../types/asset';
import type { Puppet } from '../types/puppet';

import bodyUrl from '../assets/samples/body.svg';
import headUrl from '../assets/samples/head.svg';
import eyeOpenUrl from '../assets/samples/eye-open.svg';
import eyeClosedUrl from '../assets/samples/eye-closed.svg';
import mouthRestUrl from '../assets/samples/mouth-rest.svg';
import mouthAiUrl from '../assets/samples/mouth-ai.svg';
import mouthEUri from '../assets/samples/mouth-e.svg';
import mouthOUri from '../assets/samples/mouth-o.svg';
import mouthUUri from '../assets/samples/mouth-u.svg';
import mouthMUrl from '../assets/samples/mouth-m.svg';

const ASSET_IDS = {
  body: 'sample:body',
  head: 'sample:head',
  eyeOpen: 'sample:eye-open',
  eyeClosed: 'sample:eye-closed',
  mouthRest: 'sample:mouth-rest',
  mouthAi: 'sample:mouth-ai',
  mouthE: 'sample:mouth-e',
  mouthO: 'sample:mouth-o',
  mouthU: 'sample:mouth-u',
  mouthM: 'sample:mouth-m',
} as const;

const now = new Date(0).toISOString();

const asset = (id: string, name: string, url: string): StudioAsset => ({
  id,
  libraryId: 'bundled-samples',
  libraryName: 'Bundled Samples',
  name,
  kind: 'image',
  format: 'svg',
  absolutePath: url,
  relativePath: name,
  url,
  size: 0,
  modifiedAt: now,
});

/** Assets shipped with the app so the puppet is fully usable with no scan. */
export const DEMO_ASSETS: StudioAsset[] = [
  asset(ASSET_IDS.body, 'body.svg', bodyUrl),
  asset(ASSET_IDS.head, 'head.svg', headUrl),
  asset(ASSET_IDS.eyeOpen, 'eye-open.svg', eyeOpenUrl),
  asset(ASSET_IDS.eyeClosed, 'eye-closed.svg', eyeClosedUrl),
  asset(ASSET_IDS.mouthRest, 'mouth-rest.svg', mouthRestUrl),
  asset(ASSET_IDS.mouthAi, 'mouth-ai.svg', mouthAiUrl),
  asset(ASSET_IDS.mouthE, 'mouth-e.svg', mouthEUri),
  asset(ASSET_IDS.mouthO, 'mouth-o.svg', mouthOUri),
  asset(ASSET_IDS.mouthU, 'mouth-u.svg', mouthUUri),
  asset(ASSET_IDS.mouthM, 'mouth-m.svg', mouthMUrl),
];

export function demoAssetsById(): Map<string, StudioAsset> {
  const map = new Map<string, StudioAsset>();
  for (const a of DEMO_ASSETS) map.set(a.id, a);
  return map;
}

const MOUTH_SLOT_ASSETS = [
  ASSET_IDS.mouthRest,
  ASSET_IDS.mouthAi,
  ASSET_IDS.mouthE,
  ASSET_IDS.mouthO,
  ASSET_IDS.mouthU,
  ASSET_IDS.mouthM,
];

const mouthSwap = (assetId: string) => ({ slotId: 'slot:mouth', assetId });

/**
 * Builds the demo puppet: a flat cartoon character with a swap-able mouth
 * slot driven by visemes and swap-able eye slots driven by expressions.
 */
export function buildDemoPuppet(): Puppet {
  return {
    id: 'puppet:demo',
    name: 'Demo Puppet',
    assetId: 'sample:head',
    layers: [
      {
        id: 'layer:body',
        name: 'Body',
        kind: 'image',
        assetId: ASSET_IDS.body,
        boneId: 'bone:neck',
        position: { x: 0, y: 480 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        anchor: { x: 0.5, y: 0.5 },
        visible: true,
        opacity: 1,
        zIndex: 0,
      },
      {
        id: 'layer:head',
        name: 'Head',
        kind: 'group',
        position: { x: 0, y: 40 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        anchor: { x: 0.5, y: 0.5 },
        visible: true,
        opacity: 1,
        zIndex: 10,
      },
      {
        id: 'layer:face',
        name: 'Face',
        kind: 'image',
        assetId: ASSET_IDS.head,
        parentId: 'layer:head',
        position: { x: 0, y: -95 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        anchor: { x: 0.5, y: 0.5 },
        visible: true,
        opacity: 1,
        zIndex: 1,
      },
    ],
    bones: [
      { id: 'bone:root', name: 'Root', position: { x: 0, y: 0 }, rotation: 0, length: 0 },
      { id: 'bone:neck', name: 'Neck', parentId: 'bone:root', position: { x: 0, y: 360 }, rotation: 0, length: 200 },
      { id: 'bone:head', name: 'Head', parentId: 'bone:neck', position: { x: 0, y: 200 }, rotation: 0, length: 0 },
    ],
    slots: [
      {
        id: 'slot:eyes-left',
        name: 'Left Eye',
        layerId: 'layer:head',
        assetIDs: [ASSET_IDS.eyeOpen, ASSET_IDS.eyeClosed],
        activeAssetId: ASSET_IDS.eyeOpen,
        position: { x: -62, y: -118 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        anchor: { x: 0.5, y: 0.5 },
        visible: true,
        opacity: 1,
        zIndex: 20,
      },
      {
        id: 'slot:eyes-right',
        name: 'Right Eye',
        layerId: 'layer:head',
        assetIDs: [ASSET_IDS.eyeOpen, ASSET_IDS.eyeClosed],
        activeAssetId: ASSET_IDS.eyeOpen,
        position: { x: 62, y: -118 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        anchor: { x: 0.5, y: 0.5 },
        visible: true,
        opacity: 1,
        zIndex: 20,
      },
      {
        id: 'slot:mouth',
        name: 'Mouth',
        layerId: 'layer:head',
        assetIDs: MOUTH_SLOT_ASSETS,
        activeAssetId: ASSET_IDS.mouthRest,
        position: { x: 0, y: -6 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        anchor: { x: 0.5, y: 0.5 },
        visible: true,
        opacity: 1,
        zIndex: 30,
      },
    ],
    visemeMappings: [
      { viseme: 'Rest', durationMs: 260, swaps: [mouthSwap(ASSET_IDS.mouthRest)] },
      { viseme: 'AI', durationMs: 160, swaps: [mouthSwap(ASSET_IDS.mouthAi)] },
      { viseme: 'E', durationMs: 150, swaps: [mouthSwap(ASSET_IDS.mouthE)] },
      { viseme: 'O', durationMs: 150, swaps: [mouthSwap(ASSET_IDS.mouthO)] },
      { viseme: 'U', durationMs: 150, swaps: [mouthSwap(ASSET_IDS.mouthU)] },
      { viseme: 'M', durationMs: 220, swaps: [mouthSwap(ASSET_IDS.mouthM)] },
      { viseme: 'F', durationMs: 130, swaps: [mouthSwap(ASSET_IDS.mouthM)] },
      { viseme: 'W', durationMs: 160, swaps: [mouthSwap(ASSET_IDS.mouthM)] },
      { viseme: 'L', durationMs: 180, swaps: [mouthSwap(ASSET_IDS.mouthM)] },
    ],
    expressionStates: [
      { expression: 'neutral', swaps: [] },
      { expression: 'happy', swaps: [mouthSwap(ASSET_IDS.mouthE)] },
      { expression: 'sad', swaps: [mouthSwap(ASSET_IDS.mouthU)] },
      { expression: 'angry', swaps: [mouthSwap(ASSET_IDS.mouthM)] },
      { expression: 'surprised', swaps: [mouthSwap(ASSET_IDS.mouthO)] },
      {
        expression: 'blink',
        swaps: [
          { slotId: 'slot:eyes-left', assetId: ASSET_IDS.eyeClosed },
          { slotId: 'slot:eyes-right', assetId: ASSET_IDS.eyeClosed },
        ],
      },
    ],
    activeViseme: 'Rest',
    activeExpression: 'neutral',
    position: { x: 0, y: -80 },
    scale: { x: 1.1, y: 1.1 },
    rotation: 0,
    anchoredToStage: true,
    zIndex: 10,
    visible: true,
    opacity: 1,
  };
}

/** Rebuilds the puppet with a new active viseme (immutable update). */
export function withViseme(puppet: Puppet, viseme: Puppet['activeViseme']): Puppet {
  return { ...puppet, activeViseme: viseme };
}

/** Rebuilds the puppet with a new active expression (immutable update). */
export function withExpression(puppet: Puppet, expression: Puppet['activeExpression']): Puppet {
  return { ...puppet, activeExpression: expression };
}