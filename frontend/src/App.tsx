import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Graphics, Text, type Ticker } from 'pixi.js';
import type { Puppet } from './types/puppet';
import type { Project } from './types/project';
import type { AssetScanResult, StudioAsset } from './types/asset';
import { isError } from './types/wails';
import {
  chooseDirectory,
  newProject,
  openProject,
  openProjectDialog,
  saveProject,
  saveProjectDialog,
  scanAssets,
} from './ipc/ipc';
import { buildDemoPuppet, demoAssetsById, withExpression, withViseme } from './samples/demoPuppet';
import { StudioStage, useStudioStage } from './engine/StudioStage';
import { PuppetRenderer } from './engine/puppetRenderer';
import { Toolbar } from './components/Toolbar';
import { AssetLibraryPanel } from './components/AssetLibraryPanel';
import { PuppetPanel } from './components/PuppetPanel';
import { StatusBar } from './components/StatusBar';
import { NoticeBanner, type Notice } from './components/NoticeBanner';
import './App.css';

function useWailsRuntimeAvailable(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if ((window as unknown as { go?: unknown }).go) setOk(true);
  }, []);
  return ok;
}

function dirName(path: string): string {
  const index = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return index >= 0 ? path.slice(0, index) : '';
}

function App() {
  const runtimeReady = useWailsRuntimeAvailable();
  const [project, setProject] = useState<Project | null>(null);
  const [puppet, setPuppet] = useState<Puppet>(() => buildDemoPuppet());
  const [library, setLibrary] = useState<AssetScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const assetsById = useMemo(() => {
    const map = demoAssetsById();
    for (const asset of library?.assets ?? []) map.set(asset.id, asset);
    return map;
  }, [library]);

  const flash = useCallback((notice: Notice, timeoutMs = 5000) => {
    setNotice(notice);
    window.setTimeout(() => setNotice((current) => (current === notice ? null : current)), timeoutMs);
  }, []);

  const requireRuntime = useCallback((): boolean => {
    if (runtimeReady) return true;
    flash({ kind: 'error', title: 'Go backend not available', detail: 'Run the app with `wails dev` or `wails build`.' });
    return false;
  }, [flash, runtimeReady]);

  const handleNew = useCallback(async () => {
    if (!requireRuntime()) return;
    const result = await newProject('Untitled Project');
    if (isError(result)) {
      flash({ kind: 'error', title: 'Could not create project', detail: result.error.message });
      return;
    }
    setProject(result.data);
    setPuppet(buildDemoPuppet());
    flash({ kind: 'success', title: 'New project created' });
  }, [flash, requireRuntime]);

  const handleOpen = useCallback(async () => {
    if (!requireRuntime()) return;
    const picked = await openProjectDialog();
    if (isError(picked)) {
      if (picked.error.code === 'CANCELED') return;
      flash({ kind: 'error', title: picked.error.message });
      return;
    }
    const result = await openProject(picked.data);
    if (isError(result)) {
      flash({ kind: 'error', title: 'Could not open project', detail: result.error.message });
      return;
    }
    setProject(result.data);
    setPuppet(result.data.puppets[0] ?? buildDemoPuppet());
    flash({ kind: 'success', title: `Opened ${result.data.name}` });
  }, [flash, requireRuntime]);

  /** Embeds the current editor puppet as the first project puppet. */
  const withEditorPuppet = useCallback(
    (target: Project): Project => {
      const puppets = target.puppets.length > 0 ? [puppet, ...target.puppets.slice(1)] : [puppet];
      return { ...target, puppets };
    },
    [puppet],
  );

  const persist = useCallback(
    async (target: Project, message: string, kind: Notice['kind'] = 'success') => {
      const result = await saveProject(target);
      if (isError(result)) {
        flash({ kind: 'error', title: 'Save failed', detail: result.error.message });
        return false;
      }
      setProject(result.data);
      flash({ kind, title: message });
      return true;
    },
    [flash],
  );

  const handleSaveAs = useCallback(async () => {
    if (!requireRuntime()) return;
    if (!project) {
      flash({ kind: 'error', title: 'Nothing to save' });
      return;
    }
    const picked = await saveProjectDialog(project.name, dirName(project.filePath));
    if (isError(picked)) {
      if (picked.error.code === 'CANCELED') return;
      flash({ kind: 'error', title: picked.error.message });
      return;
    }
    const next = withEditorPuppet(project);
    if (next.filePath !== picked.data) next.filePath = picked.data;
    await persist(next, `Project saved to ${picked.data}`);
  }, [flash, persist, project, requireRuntime, withEditorPuppet]);

  const handleSave = useCallback(async () => {
    if (!requireRuntime()) return;
    if (!project) {
      flash({ kind: 'error', title: 'Nothing to save' });
      return;
    }
    if (!project.filePath) {
      await handleSaveAs();
      return;
    }
    await persist(withEditorPuppet(project), 'Project saved');
  }, [flash, handleSaveAs, persist, project, requireRuntime, withEditorPuppet]);

  const handleScan = useCallback(async () => {
    if (!requireRuntime()) return;
    const picked = await chooseDirectory();
    if (isError(picked)) {
      if (picked.error.code === 'CANCELED') return;
      flash({ kind: 'error', title: picked.error.message });
      return;
    }
    setScanning(true);
    try {
      const result = await scanAssets(picked.data);
      if (isError(result)) {
        flash({ kind: 'error', title: 'Scan failed', detail: result.error.message });
        return;
      }
      setLibrary(result.data);
      flash({
        kind: 'success',
        title: `Scanned ${result.data.assets.length} assets`,
        detail: `${result.data.imageCount} images, ${result.data.audioCount} audio files`,
      });
    } finally {
      setScanning(false);
    }
  }, [flash, requireRuntime]);

  const openFolder = useCallback(async () => {
    if (!requireRuntime()) return;
    const picked = await chooseDirectory();
    if (isError(picked)) {
      if (picked.error.code === 'CANCELED') return;
      flash({ kind: 'error', title: picked.error.message });
    }
  }, [flash, requireRuntime]);

  return (
    <div className="app">
      <Toolbar
        project={project}
        ready={runtimeReady}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
      />
      <div className="app-body">
        <AssetLibraryPanel library={library} scanning={scanning} onScan={handleScan} onOpenFolder={openFolder} />
        <main className="stage-host">
          {notice ? <NoticeBanner notice={notice} onDismiss={() => setNotice(null)} /> : null}
          <StudioStage className="stage">
            <DemoScene puppet={puppet} assetsById={assetsById} background={project?.background.color} />
          </StudioStage>
        </main>
        <PuppetPanel
          puppet={puppet}
          assetsById={assetsById}
          onVisemeChange={(viseme) => setPuppet((p) => withViseme(p, viseme))}
          onExpressionChange={(expression) => setPuppet((p) => withExpression(p, expression))}
        />
      </div>
      <StatusBar
        project={project}
        assetCount={library?.imageCount ?? 0}
        audioCount={library?.audioCount ?? 0}
        runtimeReady={runtimeReady}
      />
    </div>
  );
}

interface DemoSceneProps {
  puppet: Puppet;
  assetsById: ReadonlyMap<string, StudioAsset>;
  background?: string;
}

/**
 * Hosts the demo puppet inside the stage layers. Owns a PuppetRenderer for
 * the puppets layer, a background panel + frame for the background layer and
 * a ticker-driven HUD label in the screen-space UI layer. Every resource the
 * renderer or the UI acquires is released in the matching effect cleanup.
 */
function DemoScene({ puppet, assetsById, background }: DemoSceneProps) {
  const stage = useStudioStage();
  const rendererRef = useRef<PuppetRenderer | null>(null);

  const paintQueue = useRef(Promise.resolve());
  const enqueuePaint = useCallback((p: Puppet) => {
    paintQueue.current = paintQueue.current.then(() => rendererRef.current?.paint(p));
  }, []);

  // Create/tear-down the puppet renderer once per stage.
  useEffect(() => {
    const renderer = new PuppetRenderer({
      store: stage.store,
      assets: assetsById,
      puppetId: puppet.id,
    });
    stage.layers.puppets.addChild(renderer.root);
    rendererRef.current = renderer;
    void renderer.paint(puppet);

    return () => {
      renderer.destroy();
      if (renderer.root.parent) renderer.root.parent.removeChild(renderer.root);
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Repaint whenever puppet state (viseme/expression) changes.
  useEffect(() => {
    if (rendererRef.current) enqueuePaint(puppet);
  }, [puppet, enqueuePaint]);

  // Background panel + border, plus a screen-space HUD driven by the ticker.
  useEffect(() => {
    const stageW = stage.stageWidth;
    const stageH = stage.stageHeight;

    const backdrop = new Graphics();
    backdrop
      .rect(0, 0, stageW, stageH)
      .fill({ color: parseHex(background ?? '#111318') })
      .stroke({ width: 2, color: 0x9aa3b2, alpha: 0.6 });
    stage.layers.background.addChild(backdrop);

    const hud = new Text({
      text: '',
      style: { fontFamily: 'ui-monospace, monospace', fontSize: 13, fill: 0xa6e3a1 },
    });
    hud.position.set(8, 6);
    stage.layers.ui.addChild(hud);

    const onTick = (ticker: Ticker) => {
      hud.text = `${Math.round(1000 / Math.max(ticker.deltaMS, 0.001))} fps · ${stage.camera.zoom.toFixed(2)}×`;
    };
    stage.app.ticker.add(onTick);

    return () => {
      stage.app.ticker.remove(onTick);
      hud.destroy({ children: true });
      backdrop.destroy({ children: true });
    };
  }, [stage, background]);

  return null;
}

function parseHex(color: string): number {
  const clean = color.replace(/^#/, '');
  const parsed = Number.parseInt(clean, 16);
  return Number.isNaN(parsed) ? 0x111318 : parsed;
}

export default App;