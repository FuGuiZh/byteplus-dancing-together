import { NextResponse } from "next/server";

import {
  getErrorStatus,
  parseJsonBody,
  toErrorPayload,
} from "@/lib/api-request";
import {
  getBytePlusConfig,
  shouldUseLocalBytePlusFallback,
} from "@/lib/byteplus-config";
import { visualValidateResultRequestSchema } from "@/lib/byteplus-contracts";
import { getBytePlusVisualValidateResult } from "@/lib/byteplus-openapi-client";
import { createLocalFallbackVisualValidateResult } from "@/lib/byteplus-local-fallback";

export async function POST(request: Request) {
  try {
    const config = getBytePlusConfig();
    const input = await parseJsonBody(
      request,
      visualValidateResultRequestSchema
    );

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(
        createLocalFallbackVisualValidateResult(input.bytedToken, config)
      );
    }

    return NextResponse.json(
      await getBytePlusVisualValidateResult(input.bytedToken, config)
    );
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function GET(request: Request) {
  try {
    const config = getBytePlusConfig();
    const bytedToken = new URL(request.url).searchParams.get("byted_token");

    if (!bytedToken) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "缺少 byted_token 查询参数。",
        },
        { status: 400 }
      );
    }

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(
        createLocalFallbackVisualValidateResult(bytedToken, config)
      );
    }

    return NextResponse.json(
      await getBytePlusVisualValidateResult(bytedToken, config)
    );
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
