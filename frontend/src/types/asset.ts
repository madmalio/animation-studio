export type AssetKind = 'image' | 'audio';

export interface LibraryRoot {
  id: string;
  name: string;
  dir: string;
}

export interface StudioAsset {
  id: string;
  libraryId: string;
  libraryName: string;
  name: string;
  kind: AssetKind;
  format: 'png' | 'svg' | 'mp3' | 'wav';
  absolutePath: string;
  relativePath: string;
  /** Route the Pixi engine loads this asset from, e.g. `/studio-assets/<lib>/<path>`. */
  url: string;
  size: number;
  modifiedAt: string;
}

export interface AssetScanResult {
  library: LibraryRoot;
  assets: StudioAsset[];
  imageCount: number;
  audioCount: number;
}