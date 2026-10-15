import { NextResponse } from "next/server";

/** Standard backend envelope used by every route handler in this app. */
export type ApiResponse<T> = {
  success: boolean;
  errorMessage: string;
  errorCode: number;
  payload: T | null;
};

export function ok<T>(payload: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, errorMessage: "", errorCode: 0, payload },
    { status },
  );
}

export function fail(errorMessage: string, errorCode = 500, status = errorCode) {
  return NextResponse.json<ApiResponse<never>>(
    { success: false, errorMessage, errorCode, payload: null },
    { status: status >= 400 && status <= 599 ? status : 500 },
  );
}

/** An expected failure whose message is safe to show the player. */
export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Runs a handler body: payload → ok(), ApiError → fail() with its message, anything else → logged 500. */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    return ok(await fn());
  } catch (error) {
    if (error instanceof ApiError) return fail(error.message, error.status);
    console.error(error);
    return fail("Something went wrong in the dark. Try again.", 500);
  }
}
