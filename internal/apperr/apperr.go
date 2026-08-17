// Package apperr provides structured error propagation between the Go
// backend and the TypeScript frontend.
//
// Wails serializes a Go `error` return value down to a plain string, which is
// lossy and hard to act on programmatically. Instead of returning errors,
// every bound service method returns a Result[T] envelope. The envelope
// carries either the payload (`Data`) or a structured ErrorInfo with a stable
// machine-readable code, a human message and optional details.
package apperr

import (
	"fmt"
)

// Stable, machine-readable error codes surfaced to the frontend via
// Result[T].Error.Code.
const (
	// CodeInvalidArgument: the caller passed data that cannot be used.
	CodeInvalidArgument = "INVALID_ARGUMENT"
	// CodeNotFound: a file, folder or project could not be found.
	CodeNotFound = "NOT_FOUND"
	// CodeAlreadyExists: a file/folder already exists where one must not.
	CodeAlreadyExists = "ALREADY_EXISTS"
	// CodeIO: a native file system operation failed.
	CodeIO = "IO"
	// CodeValidation: persisted data failed structural validation.
	CodeValidation = "VALIDATION"
	// CodeUnsupported: the requested operation is not supported here.
	CodeUnsupported = "UNSUPPORTED"
	// CodeInternal: an unexpected failure occurred.
	CodeInternal = "INTERNAL"
	// CodeCanceled: the user dismissed a native dialog.
	CodeCanceled = "CANCELED"
)

// Info is the structured error payload shipped to the frontend.
type Info struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

func (e *Info) Error() string {
	if e == nil {
		return ""
	}
	if e.Details != "" {
		return fmt.Sprintf("[%s] %s (%s)", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// Result is the envelope every bound service method returns. Exactly one side
// is meaningful: when Error is nil the caller should consume Data, otherwise
// it must surface Error.
type Result[T any] struct {
	Data  T     `json:"data"`
	Error *Info `json:"error"`
}

// Ok wraps a successful payload in a Result envelope.
func Ok[T any](data T) Result[T] {
	return Result[T]{Data: data}
}

// Fail builds an error Result with the given code, message and details.
func Fail[T any](code, message, details string) Result[T] {
	return Result[T]{Error: &Info{Code: code, Message: message, Details: details}}
}

// FailErr builds an error Result from a plain error, tagging it with a code.
func FailErr[T any](code string, err error) Result[T] {
	return Result[T]{Error: &Info{Code: code, Message: err.Error()}}
}
