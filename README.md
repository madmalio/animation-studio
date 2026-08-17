# Studio

A desktop 2D animation suite and puppet editor built with **Wails v2** (Go),
**React + TypeScript**, and **PixiJS v8**.

## Features (initial engine)

- **Go backend** (`internal/services`) exposed to the frontend over typed IPC:
  - `ProjectService` — create, save and open `.studio` project JSON documents
    (atomic writes, schema validation, round-trip fidelity).
  - `AssetsService` — recursively scans local folders for PNG / SVG / MP3 / WAV
    and serves the files to the Pixi engine over a `/studio-assets/` route with
    path-traversal protection.
  - Native dialogs (folder / open / save-as) via `app.go`.
  - Every backend call returns a structured `Result<T>` envelope so errors
    arrive as machine-readable codes, not opaque strings.
- **React + PixiJS viewport** (`src/engine`):
  - Fixed 1920×1080 virtual canvas, Fit-Center letterboxed into the window.
  - Smooth panning (middle mouse or Space+drag) and cursor-anchored wheel zoom.
  - Layered world root: Background, Puppets, Props, Overlay, plus a screen-space
    UI layer.
  - The application, event listeners, texture cache and ticker callbacks are
    all disposed in React `useEffect` cleanup — StrictMode double-mounts and
    hot reloads leak nothing.
- **Puppet schema** (`src/types/puppet.ts`, mirrored by `internal/models`):
  - `Puppet`, `Layer`, `Bone`, `Slot`, `VisemeMapping`, `ExpressionState`,
    `TextureSwap`.
  - Slots drive interchangeable textures (mouth flap states: Rest, AI, E, O,
    U, M, F, W, L; expressions: neutral, happy, sad, angry, surprised, blink).
  - `PuppetRenderer` swaps textures on the fly based on the active viseme /
    expression, with a reference-counted `TextureStore` (SVGs rasterized to
    canvas, PNGs through the Pixi pipeline).
  - A fully-featured demo puppet and its bundled SVG parts are in
    `src/samples/demoPuppet.ts`.

## Layout

```
app.go                       Root app + native dialog methods
main.go                      Wails options + AssetsHandler wiring
internal/
  apperr/                    Result[T] envelope + error codes (IPC contract)
  models/                    .studio document models (Project, Puppet, ...)
  services/
    projectservice/          create / save / open .studio documents
    assetsservice/           library scanning + /studio-assets HTTP handler
frontend/
  src/
    types/                   strict TS mirrors of the Go models + unions
    ipc/                     typed wrappers over the generated bindings
    engine/                  TextureStore, camera, StudioStage, PuppetRenderer
    samples/                 demo puppet + sample SVG parts
    components/              Toolbar, Asset Library, Puppet inspector, ...
  wailsjs/                   generated Go<=>TS bindings (regenerated on build)
```

## Development

```bash
wails dev      # live-reload development (Go + Vite + WebView2)
```

For frontend-only work the Vite server also runs standalone (`cd frontend && npm run dev`),
but the Go service methods and native dialogs require the Wails runtime.

## Building

```bash
wails build
```

This regenerates the TypeScript bindings from the Go services, compiles the
frontend, embeds it, and produces `build/bin/animate.exe`.

**Note:** `go build ./...` and the embedded frontend bundle require the
frontend to be built first (`cd frontend && npm run build`) because the Go
binary embeds `frontend/dist`.