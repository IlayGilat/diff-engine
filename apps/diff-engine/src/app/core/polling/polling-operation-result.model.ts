import { Fail, Ok, Result } from 'rich-domain';

export type PollingErrorCode =
  | 'INVALID_TARGET'
  | 'UNSUPPORTED_DOMAIN'
  | 'START_CONFLICT'
  | 'START_FAILED'
  | 'POLL_FAILED';

export interface PollingOperationError {
  code: PollingErrorCode;
  message: string;
}

export interface PollingOperationMeta {
  streamId?: string;
  domain?: string;
  sourceKey?: string;
  reason?: string;
  phase?: string;
}

export type PollingOperationResult<T> = Result<
  T,
  PollingOperationError,
  PollingOperationMeta
>;

export function pollingOk<T>(
  payload: T,
  metaData: PollingOperationMeta = {},
): PollingOperationResult<T> {
  return Ok<T, PollingOperationMeta, PollingOperationError>(
    payload as never,
    metaData,
  ) as PollingOperationResult<T>;
}

export function pollingFail<T = void>(
  code: PollingErrorCode,
  message: string,
  metaData: PollingOperationMeta = {},
): PollingOperationResult<T> {
  return Fail<PollingOperationError, PollingOperationMeta, T>(
    {
      code,
      message,
    },
    metaData,
  ) as PollingOperationResult<T>;
}

export function getPollingOperationMessage(
  error: PollingOperationError | null,
  fallback: string,
): string {
  return error?.message ?? fallback;
}
