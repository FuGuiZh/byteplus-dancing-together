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
import { realPersonSessionRequestSchema } from "@/lib/byteplus-contracts";
import { createBytePlusRealPersonSession } from "@/lib/byteplus-openapi-client";
import { createLocalFallbackRealPersonSession } from "@/lib/byteplus-local-fallback";

export async function POST(request: Request) {
  try {
    const config = getBytePlusConfig();
    const input = await parseJsonBody(request, realPersonSessionRequestSchema);

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(createLocalFallbackRealPersonSession(input, config));
    }

    return NextResponse.json(
      await createBytePlusRealPersonSession(input, config)
    );
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
