package main

import (
	"context"
	"path/filepath"
	"strings"

	"Studio/internal/apperr"
	"Studio/internal/services/assetsservice"
	"Studio/internal/services/projectservice"

	"github.com/sqweek/dialog"
)

// App is the root Wails application structure. It owns the context every
// bounded service needs and exposes native dialog helpers to the frontend.
type App struct {
	ctx     context.Context
	project *projectservice.ProjectService
	assets  *assetsservice.AssetsService
}

// NewApp creates the application with its services wired in.
func NewApp() *App {
	return &App{
		project: projectservice.New(),
		assets:  assetsservice.New(),
	}
}

// startup stores the runtime context and exposes the services to the App.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// projectService returns the project service bound to the frontend.
func (a *App) projectService() *projectservice.ProjectService { return a.project }

// assetsService returns the assets service bound to the frontend.
func (a *App) assetsService() *assetsservice.AssetsService { return a.assets }

// ChooseDirectory opens a native folder picker and returns the selected
// folder. The returned Result carries CodeCanceled when the user dismisses
// the dialog.
func (a *App) ChooseDirectory() apperr.Result[string] {
	builder := dialog.Directory().
		Title("Choose an asset folder")

	selected, err := builder.Browse()
	if err != nil {
		if err == dialog.ErrCancelled {
			return apperr.Fail[string](apperr.CodeCanceled, "Folder selection cancelled", "")
		}
		return apperr.Fail[string](apperr.CodeIO, "Could not open folder picker", err.Error())
	}
	return apperr.Ok(selected)
}

// OpenProjectDialog opens a native file picker for .studio files and returns
// the chosen path (or CodeCanceled when dismissed).
func (a *App) OpenProjectDialog() apperr.Result[string] {
	builder := dialog.File().
		Title("Open Studio project").
		Filter("Studio Project", "studio").
		Filter("All files", "*")

	selected, err := builder.Load()
	if err != nil {
		if err == dialog.ErrCancelled {
			return apperr.Fail[string](apperr.CodeCanceled, "Open dialog cancelled", "")
		}
		return apperr.Fail[string](apperr.CodeIO, "Could not open file picker", err.Error())
	}
	return apperr.Ok(selected)
}

// SaveProjectDialog opens a native save-as dialog pre-filled with the
// suggested name and returns the chosen path (or CodeCanceled when
// dismissed). The .studio suffix is appended when the user omits it.
func (a *App) SaveProjectDialog(suggestedName string, startDir string) apperr.Result[string] {
	name := strings.TrimSpace(suggestedName)
	if name == "" {
		name = "Untitled"
	}
	if !strings.HasSuffix(strings.ToLower(name), ".studio") {
		name += ".studio"
	}

	builder := dialog.File().
		Title("Save Studio project").
		Filter("Studio Project", "studio").
		SetStartFile(name)
	if dir := strings.TrimSpace(startDir); dir != "" {
		abs, err := filepath.Abs(dir)
		if err == nil {
			builder = builder.SetStartDir(abs)
		}
	}

	selected, err := builder.Save()
	if err != nil {
		if err == dialog.ErrCancelled {
			return apperr.Fail[string](apperr.CodeCanceled, "Save dialog cancelled", "")
		}
		return apperr.Fail[string](apperr.CodeIO, "Could not open save dialog", err.Error())
	}
	if !strings.HasSuffix(strings.ToLower(selected), ".studio") {
		selected += ".studio"
	}
	return apperr.Ok(selected)
}
