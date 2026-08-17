// Mirrors the Go apperr envelope so IPC results are strict and type-safe.
export type ErrorCode =
  | 'INVALID_ARGUMENT'
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'IO'
  | 'VALIDATION'
  | 'UNSUPPORTED'
  | 'INTERNAL'
  | 'CANCELED';

export interface ErrorInfo {
  code: ErrorCode | string;
  message: string;
  details?: string;
}

export interface Result<T> {
  data: T;
  error: ErrorInfo | null;
}

/** Type guard narrowing a Result to its failure half. */
export function isError<T>(result: Result<T>): result is Result<T> & { error: ErrorInfo } {
  return result.error !== null && result.error !== undefined;
}

/** Type guard narrowing a Result to its success half. */
export function isOk<T>(result: Result<T>): result is Result<T> & { error: null } {
  return !isError(result);
}

/** Extracts the payload, throwing a structured error otherwise. */
export function unwrap<T>(result: Result<T>): T {
  if (isError(result)) {
    throw new Error(result.error.details ? `${result.error.message} (${result.error.details})` : result.error.message);
  }
  return result.data;
}