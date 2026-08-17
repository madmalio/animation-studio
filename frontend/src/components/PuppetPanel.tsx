import type { Expression, Puppet, Viseme } from '../types/puppet';
import { EXPRESSIONS, VISEMES } from '../types/puppet';
import type { StudioAsset } from '../types/asset';

interface PuppetPanelProps {
  puppet: Puppet | null;
  assetsById: ReadonlyMap<string, StudioAsset>;
  onVisemeChange: (viseme: Viseme) => void;
  onExpressionChange: (expression: Expression) => void;
}

export function PuppetPanel({ puppet, assetsById, onVisemeChange, onExpressionChange }: PuppetPanelProps) {
  if (!puppet) {
    return (
      <aside className="panel">
        <div className="panel-header">Puppet</div>
        <div className="panel-empty">No puppet in the scene.</div>
      </aside>
    );
  }

  const assetName = (id?: string): string => {
    if (!id) return '—';
    return assetsById.get(id)?.name ?? id;
  };

  return (
    <aside className="panel">
      <div className="panel-header">
        <span>Puppet · {puppet.name}</span>
      </div>

      <section className="panel-section">
        <label className="field">
          <span className="field-label">Viseme</span>
          <select value={puppet.activeViseme} onChange={(e) => onVisemeChange(e.target.value as Viseme)}>
            {VISEMES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Expression</span>
          <select value={puppet.activeExpression} onChange={(e) => onExpressionChange(e.target.value as Expression)}>
            {EXPRESSIONS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel-section">
        <h4 className="section-title">Layers ({puppet.layers.length})</h4>
        <ul className="inspector-list">
          {puppet.layers.map((layer) => (
            <li key={layer.id} className="inspector-row" title={`${layer.kind} · z=${layer.zIndex}`}>
              <span className={`dot dot-${layer.kind}`} />
              <span className="inspector-name">{layer.name}</span>
              <span className="inspector-value">
                {layer.kind === 'image' ? assetName(layer.assetId) : 'group'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-section">
        <h4 className="section-title">Slots ({puppet.slots.length})</h4>
        <ul className="inspector-list">
          {puppet.slots.map((slot) => (
            <li key={slot.id} className="inspector-row" title={`active: ${slot.activeAssetId}`}>
              <span className="dot dot-slot" />
              <span className="inspector-name">{slot.name}</span>
              <span className="inspector-value">{assetName(slot.activeAssetId)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-section">
        <h4 className="section-title">Rig</h4>
        <ul className="inspector-list">
          {puppet.bones.map((bone) => (
            <li key={bone.id} className="inspector-row">
              <span className="dot dot-bone" />
              <span className="inspector-name">{bone.name}</span>
              <span className="inspector-value">{bone.parentId ? 'child' : 'root'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel-section">
        <div className="field">
          <span className="field-label">Position</span>
          <span className="field-static">
            {Math.round(puppet.position.x)}, {Math.round(puppet.position.y)}
          </span>
        </div>
        <div className="field">
          <span className="field-label">Scale</span>
          <span className="field-static">
            {puppet.scale.x.toFixed(2)}×
          </span>
        </div>
      </section>
    </aside>
  );
}