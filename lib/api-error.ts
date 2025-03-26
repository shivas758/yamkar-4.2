export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string

  constructor(message: string, statusCode: number, code: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    Error.captureStackTrace(this, this.constructor)
  }

  static BadRequest(message: string) {
    return new ApiError(message, 400, "BAD_REQUEST")
  }

  static Unauthorized(message = "Unauthorized") {
    return new ApiError(message, 401, "UNAUTHORIZED")
  }

  static Forbidden(message = "Forbidden") {
    return new ApiError(message, 403, "FORBIDDEN")
  }

  static NotFound(message = "Resource not found") {
    return new ApiError(message, 404, "NOT_FOUND")
  }

  static InternalServer(message = "Internal server error") {
    return new ApiError(message, 500, "INTERNAL_SERVER")
  }
}

