import { useMemo, useState } from 'react';
import type { AssetScanResult, StudioAsset } from '../types/asset';

type Filter = 'all' | 'image' | 'audio';

interface AssetLibraryPanelProps {
  library: AssetScanResult | null;
  scanning: boolean;
  onScan: () => void;
  onOpenFolder: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetLibraryPanel({ library, scanning, onScan, onOpenFolder }: AssetLibraryPanelProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const assets: StudioAsset[] = useMemo(() => library?.assets ?? [], [library]);
  const filtered = useMemo(
    () => (filter === 'all' ? assets : assets.filter((a) => a.kind === filter)),
    [assets, filter],
  );

  return (
    <aside className="panel">
      <div className="panel-header">
        <span>Asset Library</span>
        <button className="btn btn-small" onClick={onScan} disabled={scanning}>
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
        <button className="btn btn-small" onClick={onOpenFolder} disabled={scanning}>
          Folder
        </button>
      </div>

      {library ? (
        <div className="panel-sub" title={library.library.dir}>
          <span className="panel-sub-label">Folder</span>
          <span className="panel-sub-value">{library.library.name}</span>
          <span className="panel-sub-meta">
            {library.imageCount} image{library.imageCount === 1 ? '' : 's'} · {library.audioCount} audio
          </span>
        </div>
      ) : (
        <div className="panel-empty">No folder scanned yet.</div>
      )}

      <div className="panel-filters">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={assets.length} />
        <FilterChip active={filter === 'image'} onClick={() => setFilter('image')} label="Images" count={library?.imageCount ?? 0} />
        <FilterChip active={filter === 'audio'} onClick={() => setFilter('audio')} label="Audio" count={library?.audioCount ?? 0} />
      </div>

      <div className="asset-grid">
        {filtered.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
      {filtered.length === 0 ? <div className="panel-empty">No matching assets.</div> : null}
    </aside>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}

function FilterChip({ active, onClick, label, count }: FilterChipProps) {
  return (
    <button className={active ? 'chip chip-active' : 'chip'} onClick={onClick}>
      {label} <span className="chip-count">{count}</span>
    </button>
  );
}

function AssetCard({ asset }: { asset: StudioAsset }) {
  return (
    <div className="asset-card" title={`${asset.absolutePath}`}>
      <div className="asset-preview">
        {asset.kind === 'image' ? (
          <img src={asset.url} alt={asset.name} loading="lazy" draggable={false} />
        ) : (
          <audio controls preload="none" src={asset.url} style={{ width: '100%' }} />
        )}
      </div>
      <div className="asset-meta">
        <span className="asset-name" title={asset.name}>
          {asset.name}
        </span>
        <span className="asset-info">
          {asset.format.toUpperCase()} · {formatBytes(asset.size)}
        </span>
      </div>
    </div>
  );
}