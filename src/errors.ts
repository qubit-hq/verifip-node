export class VerifIPError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly retryAfter?: number;

  constructor(
    message: string,
    statusCode: number = 0,
    errorCode: string = "",
    retryAfter?: number
  ) {
    super(message);
    this.name = "VerifIPError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.retryAfter = retryAfter;
  }
}

export class AuthenticationError extends VerifIPError {
  constructor(message: string, statusCode: number, errorCode: string) {
    super(message, statusCode, errorCode);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends VerifIPError {
  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    retryAfter?: number
  ) {
    super(message, statusCode, errorCode, retryAfter);
    this.name = "RateLimitError";
  }
}

export class InvalidRequestError extends VerifIPError {
  constructor(message: string, statusCode: number, errorCode: string) {
    super(message, statusCode, errorCode);
    this.name = "InvalidRequestError";
  }
}

export class ServerError extends VerifIPError {
  constructor(message: string, statusCode: number, errorCode: string) {
    super(message, statusCode, errorCode);
    this.name = "ServerError";
  }
}

export function makeError(
  status: number,
  code: string,
  message: string,
  retryAfter?: number
): VerifIPError {
  if (status === 400)
    return new InvalidRequestError(message, status, code);
  if (status === 401 || status === 403)
    return new AuthenticationError(message, status, code);
  if (status === 429)
    return new RateLimitError(message, status, code, retryAfter);
  if (status >= 500)
    return new ServerError(message, status, code);
  return new VerifIPError(message, status, code, retryAfter);
}
