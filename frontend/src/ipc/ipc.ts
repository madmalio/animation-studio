// Typed wrappers over the generated Wails bindings.
//
// The generator produces rich model classes (wailsjs/go/models.ts) that wrap
// the JSON payloads Go sends. Those classes are structurally identical to the
// plain data types the app uses internally, so the two are bridged through an
// explicit cast. Each bound method returns a Result<T> envelope; failures
// surface as structured ErrorInfo values instead of opaque strings.

import * as App from '../../wailsjs/go/main/App';
import * as ProjectService from '../../wailsjs/go/projectservice/ProjectService';
import * as AssetsService from '../../wailsjs/go/assetsservice/AssetsService';
import type { models } from '../../wailsjs/go/models';
import type { Project } from '../types/project';
import type { AssetScanResult, LibraryRoot } from '../types/asset';
import type { ErrorInfo, Result } from '../types/wails';

function toResult<T>(data: unknown, error: ErrorInfo | undefined): Result<T> {
  return { data: data as T, error: error ?? null };
}

/** Native folder picker; a clean Result with code CANCELED when dismissed. */
export async function chooseDirectory(): Promise<Result<string>> {
  const res = await App.ChooseDirectory();
  return { data: res.data, error: res.error ?? null };
}

/** Native open-file picker for .studio files. */
export async function openProjectDialog(): Promise<Result<string>> {
  const res = await App.OpenProjectDialog();
  return { data: res.data, error: res.error ?? null };
}

/** Native save-as picker for .studio files, pre-filled with a suggested name. */
export async function saveProjectDialog(suggestedName: string, startDir: string): Promise<Result<string>> {
  const res = await App.SaveProjectDialog(suggestedName, startDir);
  return { data: res.data, error: res.error ?? null };
}

/** Creates a blank in-memory project. */
export async function newProject(name: string): Promise<Result<Project>> {
  const res = await ProjectService.NewProject(name);
  return toResult<Project>(res.data, res.error);
}

/** Persists a project to disk at project.filePath. */
export async function saveProject(project: Project): Promise<Result<Project>> {
  const res = await ProjectService.SaveProject(project as unknown as models.Project);
  return toResult<Project>(res.data, res.error);
}

/** Loads and validates a .studio document. */
export async function openProject(path: string): Promise<Result<Project>> {
  const res = await ProjectService.OpenProject(path);
  return toResult<Project>(res.data, res.error);
}

/** Recursively scans a folder for PNG/SVG/MP3/WAV assets. */
export async function scanAssets(directory: string): Promise<Result<AssetScanResult>> {
  const res = await AssetsService.ScanAssets(directory);
  return toResult<AssetScanResult>(res.data, res.error);
}

/** Registered asset libraries in registration order. */
export async function libraries(): Promise<LibraryRoot[]> {
  const roots = await AssetsService.Libraries();
  return roots as unknown as LibraryRoot[];
}