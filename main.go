package main

import (
	"embed"

	"Studio/internal/services/assetsservice"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	// The AssetsHandler serves registered library folders. Requests for
	// embedded frontend bundles hit the embedded FS first; anything under
	// /studio-assets/ falls through to the handler which resolves the file
	// from the scanned library roots.
	assetServer := assetserver.Options{
		Assets:  assets,
		Handler: assetsservice.NewHandler(app.assetsService()),
	}

	err := wails.Run(&options.App{
		Title:            "Studio",
		Width:            1440,
		Height:           900,
		MinWidth:         1024,
		MinHeight:        640,
		AssetServer:      &assetServer,
		BackgroundColour: &options.RGBA{R: 20, G: 22, B: 30, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
			app.projectService(),
			app.assetsService(),
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
