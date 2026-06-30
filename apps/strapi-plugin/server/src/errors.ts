/** Typed server errors mapped to HTTP status codes by the controllers. */

export class NotConnectedError extends Error {
  readonly httpStatus = 409;
  constructor(message = 'No Sirv account is connected.') {
    super(message);
    this.name = 'NotConnectedError';
  }
}

export class AppCredentialsMissingError extends Error {
  readonly httpStatus = 501;
  constructor(
    message = 'Sirv app credentials are not configured. Set SIRV_APP_CLIENT_ID / SIRV_APP_CLIENT_SECRET, or connect with REST credentials.',
  ) {
    super(message);
    this.name = 'AppCredentialsMissingError';
  }
}

export class ConnectSessionExpiredError extends Error {
  readonly httpStatus = 410;
  constructor(message = 'Connect session expired. Please log in again.') {
    super(message);
    this.name = 'ConnectSessionExpiredError';
  }
}

export class InvalidRequestError extends Error {
  readonly httpStatus = 400;
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRequestError';
  }
}
