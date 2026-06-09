import { ZodError, type ZodType } from "zod";

import { BytePlusServiceError } from "@/lib/byteplus-errors";

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>) {
  const rawBody = await request.json().catch(() => ({}));
  return schema.parse(rawBody);
}

export async function parseCallbackBody(request: Request) {
  if (request.method === "GET") {
    return Object.fromEntries(new URL(request.url).searchParams.entries());
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json().catch(() => ({}));
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData().catch(() => undefined);
    if (!formData) {
      return {};
    }

    return Object.fromEntries(formData.entries());
  }

  return request.json().catch(() => ({}));
}

export function getErrorStatus(error: unknown) {
  if (error instanceof ZodError) {
    return 400;
  }

  if (error instanceof BytePlusServiceError) {
    return error.status;
  }

  return 500;
}

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  const cause = "cause" in error ? error.cause : undefined;

  return {
    name: error.name,
    message: error.message,
    stack:
      process.env.NODE_ENV === "production" ? undefined : error.stack,
    cause: cause ? serializeError(cause) : undefined,
  };
}

export function toErrorPayload(error: unknown) {
  if (error instanceof ZodError) {
    return {
      code: "VALIDATION_ERROR",
      message: "请求参数不符合工作台接口约定。",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  if (error instanceof BytePlusServiceError) {
    return {
      code: error.code,
      message: error.message,
      provider: error.provider,
      server: serializeError(error),
    };
  }

  if (error instanceof Error) {
    return {
      code: "REQUEST_ERROR",
      message: error.message || "请求无法处理。",
      server: serializeError(error),
    };
  }

  return {
    code: "REQUEST_ERROR",
    message: "请求无法处理。",
    server: serializeError(error),
  };
}

export const toValidationPayload = toErrorPayload;
