interface StatusBarProps {
  project: { viewport: { width: number; height: number; fps: number } } | null;
  assetCount: number;
  audioCount: number;
  runtimeReady: boolean;
}

export function StatusBar({ project, assetCount, audioCount, runtimeReady }: StatusBarProps) {
  return (
    <footer className="statusbar">
      <span className="status-item">
        {project ? `${project.viewport.width}×${project.viewport.height} @ ${project.viewport.fps}fps` : 'no viewport'}
      </span>
      <span className="status-item">
        {assetCount} {assetCount === 1 ? 'image' : 'images'}
      </span>
      <span className="status-item">
        {audioCount} {audioCount === 1 ? 'audio file' : 'audio files'}
      </span>
      <span className="status-spacer" />
      <span className={`status-item status-runtime ${runtimeReady ? 'is-ready' : 'is-missing'}`}>
        {runtimeReady ? 'Go backend connected' : 'Go backend not detected'}
      </span>
    </footer>
  );
}