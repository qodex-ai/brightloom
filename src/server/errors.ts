import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class ApiError extends Error {
  status: ContentfulStatusCode;
  code: string;

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message: string) => new ApiError(400, 'bad_request', message);
export const unauthorized = (message = 'Sign in to continue') =>
  new ApiError(401, 'unauthorized', message);
export const forbidden = (message = 'You do not have access to this') =>
  new ApiError(403, 'forbidden', message);
export const notFound = (message = 'Not found') => new ApiError(404, 'not_found', message);

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

export function sendError(c: Context, err: ApiError) {
  return c.json(errorBody(err.code, err.message), err.status);
}
