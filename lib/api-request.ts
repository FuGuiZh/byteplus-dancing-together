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

function getBytePlusServiceErrorHint(error: BytePlusServiceError) {
  if (error.code === "AccessDenied" || error.code === "Unauthorized") {
    return [
      "当前 IAM AK/SK 没有执行该 BytePlus Ark OpenAPI Action 的权限。",
      "请确认 BYTEPLUS_PROJECT_NAME 与控制台项目一致，并为该 IAM 用户授予 ArkFullAccess 或覆盖素材库的 ark:*Asset* 权限。",
      "如果是首次创建私域素材组，还需要先在 BytePlus 控制台完成对应授权书/能力开通。",
    ];
  }

  if (error.code === "InvalidAccessKeyId" || error.code === "SignatureDoesNotMatch") {
    return [
      "当前 IAM AK/SK 无效或签名校验失败。",
      "请检查 BYTEPLUS_IAM_ACCESS_KEY_ID、BYTEPLUS_IAM_SECRET_ACCESS_KEY、BYTEPLUS_REGION 是否对应同一个 BytePlus 账号和区域。",
    ];
  }

  return undefined;
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
      hint: getBytePlusServiceErrorHint(error),
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
