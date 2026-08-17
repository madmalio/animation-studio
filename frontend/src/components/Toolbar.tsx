interface ToolbarProps {
  project: { name: string; filePath: string } | null;
  ready: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

export function Toolbar({ project, ready, onNew, onOpen, onSave, onSaveAs }: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-logo">Studio</span>
        <span className="toolbar-project" title={project?.filePath ?? ''}>
          {project ? project.name : 'No project'}
        </span>
        {project?.filePath ? <span className="toolbar-path">{project.filePath}</span> : null}
      </div>
      <div className="toolbar-actions">
        <button className="btn" onClick={onNew} disabled={!ready}>
          New
        </button>
        <button className="btn" onClick={onOpen} disabled={!ready}>
          Open
        </button>
        <button className="btn" onClick={onSave} disabled={!ready}>
          Save
        </button>
        <button className="btn" onClick={onSaveAs} disabled={!ready}>
          Save As
        </button>
      </div>
    </header>
  );
}