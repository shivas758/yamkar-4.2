import { NextResponse as NextApiResponse } from "next/server"
import { ApiError } from "./api-error"
import type { ApiResponse } from "@/types"

export function createResponse<T>(data: T, status = 200): NextApiResponse {
  return new NextApiResponse(
    JSON.stringify({
      data,
      status,
    } as ApiResponse<T>),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  )
}

export function createErrorResponse(error: unknown): NextApiResponse {
  if (error instanceof ApiError) {
    return new NextApiResponse(
      JSON.stringify({
        error: error.message,
        code: error.code,
        status: error.statusCode,
      } as ApiResponse<never>),
      {
        status: error.statusCode,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }

  const apiError = ApiError.InternalServer()
  return new NextApiResponse(
    JSON.stringify({
      error: apiError.message,
      code: apiError.code,
      status: apiError.statusCode,
    } as ApiResponse<never>),
    {
      status: apiError.statusCode,
      headers: {
        "Content-Type": "application/json",
      },
    },
  )
}

