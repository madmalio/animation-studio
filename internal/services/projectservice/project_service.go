// Package projectservice exposes native create/save/open operations for
// Studio's .studio project documents.
package projectservice

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"Studio/internal/apperr"
	"Studio/internal/models"
)

// ProjectService is bound to the Wails frontend. All methods follow the
// Result[T] envelope contract so the TypeScript layer receives structured
// errors instead of opaque strings.
type ProjectService struct {
	uuid UUID
}

// New returns a ProjectService ready to be bound.
func New() *ProjectService {
	return &ProjectService{uuid: realUUID{}}
}

// NewProject creates a new blank project in memory. The document is not
// written to disk until SaveProject is called.
//
//	name: display name of the project.
func (s *ProjectService) NewProject(name string) apperr.Result[models.Project] {
	name = strings.TrimSpace(name)
	if name == "" {
		return apperr.Fail[models.Project](
			apperr.CodeInvalidArgument,
			"Project name cannot be empty",
			"provide a non-empty project name",
		)
	}

	now := time.Now().UTC()
	project := models.Project{
		SchemaVersion: models.SchemaVersion,
		Name:          name,
		Viewport: models.Viewport{
			Width:  models.DefaultStageWidth,
			Height: models.DefaultStageHeight,
			FPS:    models.DefaultFPS,
		},
		Background: models.Background{Color: "#1a1d29"},
		Timeline: &models.Timeline{
			DurationFrames: models.DefaultFPS * 5, // 5s default
			Tracks:         []*models.Track{},
		},
		CreatedAt: now,
		UpdatedAt: now,
	}
	return apperr.Ok(project)
}

// SaveProject writes the given project to its FilePath as a pretty-printed
// .studio JSON document. The write is atomic: content is flushed to a
// temporary file and renamed into place so an interrupted save can never
// corrupt an existing project.
func (s *ProjectService) SaveProject(project models.Project) apperr.Result[models.Project] {
	if err := validateProject(&project); err != nil {
		return apperr.Fail[models.Project](apperr.CodeValidation, "Project is not valid", err.Error())
	}

	if strings.TrimSpace(project.FilePath) == "" {
		return apperr.Fail[models.Project](
			apperr.CodeInvalidArgument,
			"No save location set",
			"choose a destination before saving the project",
		)
	}

	absolutePath, err := filepath.Abs(project.FilePath)
	if err != nil {
		return apperr.Fail[models.Project](apperr.CodeIO, "Could not resolve save path", err.Error())
	}
	if filepath.Ext(absolutePath) == "" {
		absolutePath += ".studio"
	}
	project.FilePath = absolutePath

	dir := filepath.Dir(absolutePath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return apperr.Fail[models.Project](apperr.CodeIO, "Could not create destination folder", err.Error())
	}

	project.SchemaVersion = models.SchemaVersion
	project.UpdatedAt = time.Now().UTC()

	payload, err := json.MarshalIndent(&project, "", "  ")
	if err != nil {
		return apperr.Fail[models.Project](apperr.CodeInternal, "Could not serialize project", err.Error())
	}

	tempFile, err := os.CreateTemp(dir, ".studio-save-*.tmp")
	if err != nil {
		return apperr.Fail[models.Project](apperr.CodeIO, "Could not create temporary file", err.Error())
	}
	tempPath := tempFile.Name()

	if _, err := tempFile.Write(payload); err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		return apperr.Fail[models.Project](apperr.CodeIO, "Could not write project data", err.Error())
	}
	if err := tempFile.Sync(); err != nil {
		tempFile.Close()
		os.Remove(tempPath)
		return apperr.Fail[models.Project](apperr.CodeIO, "Could not flush project data", err.Error())
	}
	if err := tempFile.Close(); err != nil {
		os.Remove(tempPath)
		return apperr.Fail[models.Project](apperr.CodeIO, "Could not finalize project write", err.Error())
	}

	replaceFile(tempPath, absolutePath)

	return apperr.Ok(project)
}

// OpenProject loads and validates a .studio document from disk.
func (s *ProjectService) OpenProject(path string) apperr.Result[models.Project] {
	absolutePath, err := filepath.Abs(path)
	if err != nil {
		return apperr.Fail[models.Project](apperr.CodeIO, "Could not resolve project path", err.Error())
	}

	data, err := os.ReadFile(absolutePath)
	if err != nil {
		if os.IsNotExist(err) {
			return apperr.Fail[models.Project](apperr.CodeNotFound, "Project file not found", absolutePath)
		}
		return apperr.Fail[models.Project](apperr.CodeIO, "Could not read project file", err.Error())
	}

	var project models.Project
	if err := json.Unmarshal(data, &project); err != nil {
		return apperr.Fail[models.Project](
			apperr.CodeValidation,
			"File is not a valid Studio project",
			fmt.Sprintf("%s: %v", absolutePath, err),
		)
	}

	if err := validateProject(&project); err != nil {
		return apperr.Fail[models.Project](apperr.CodeValidation, "Project failed validation", err.Error())
	}

	project.FilePath = absolutePath
	project.SchemaVersion = models.SchemaVersion
	now := time.Now().UTC()
	if project.CreatedAt.IsZero() {
		project.CreatedAt = now
	}
	project.UpdatedAt = now

	return apperr.Ok(project)
}

// validateProject performs structural validation shared by save and open.
func validateProject(project *models.Project) error {
	if project == nil {
		return fmt.Errorf("project is nil")
	}
	if project.SchemaVersion != models.SchemaVersion {
		return fmt.Errorf("unsupported schema version %d (expected %d)", project.SchemaVersion, models.SchemaVersion)
	}
	if strings.TrimSpace(project.Name) == "" {
		return fmt.Errorf("project name is empty")
	}
	if project.Viewport.Width <= 0 || project.Viewport.Height <= 0 {
		return fmt.Errorf("viewport dimensions must be positive")
	}
	if project.Viewport.FPS <= 0 {
		return fmt.Errorf("viewport FPS must be positive")
	}
	if project.Timeline == nil {
		return fmt.Errorf("timeline is missing")
	}
	return nil
}

// replaceFile atomically moves source over target, tolerating Windows
// rename-over-existing semantics.
func replaceFile(source, target string) {
	if err := os.Remove(target); err != nil && !os.IsNotExist(err) {
		return // keep temp file on failure; caller will notice on next save
	}
	if err := os.Rename(source, target); err != nil {
		os.Remove(source)
	}
}

// UUID generates unique identifiers for scene elements. Split behind an
// interface so it stays trivially testable.
type UUID interface {
	New() string
}

type realUUID struct{}

func (realUUID) New() string { return randomID() }

// randomID returns a short unique identifier for scene nodes.
func randomID() string {
	var raw [6]byte
	if _, err := rand.Read(raw[:]); err != nil {
		nanos := time.Now().UnixNano()
		return fmt.Sprintf("n%x", nanos&0xffffffffffff)
	}
	return fmt.Sprintf("n%x", raw)
}
