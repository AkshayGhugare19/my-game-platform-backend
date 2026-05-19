export class AppError extends Error {
  statusCode: number;
  errors?: unknown;

  constructor(message: string, statusCode = 400, errors: unknown = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}
