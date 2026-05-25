import { NextResponse } from "next/server";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/api/errors";

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { error: error.message, fieldErrors: error.fieldErrors },
      { status: 422 }
    );
  }

  console.error("[API Error]", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
