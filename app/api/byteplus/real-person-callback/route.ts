import { NextResponse } from "next/server";

import {
  getErrorStatus,
  parseCallbackBody,
  toErrorPayload,
} from "@/lib/api-request";
import {
  getBytePlusConfig,
  shouldUseLocalBytePlusFallback,
} from "@/lib/byteplus-config";
import { getBytePlusVisualValidateResult } from "@/lib/byteplus-openapi-client";

function readString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

async function handleCallback(request: Request) {
  try {
    const config = getBytePlusConfig();
    const payload = (await parseCallbackBody(request)) as Record<string, unknown>;
    const bytedToken = readString(payload, ["bytedToken", "BytedToken"]);
    const resultCode = readString(payload, ["resultCode", "ResultCode"]);
    const shouldExchangeGroupId =
      bytedToken && resultCode === "10000" && !shouldUseLocalBytePlusFallback(config);

    return NextResponse.json({
      received: true,
      type: "real-person-callback",
      mode: shouldUseLocalBytePlusFallback(config) ? "local" : "live",
      payload,
      verification: shouldExchangeGroupId
        ? await getBytePlusVisualValidateResult(bytedToken, config)
        : undefined,
    });
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function GET(request: Request) {
  return handleCallback(request);
}

export async function POST(request: Request) {
  return handleCallback(request);
}
