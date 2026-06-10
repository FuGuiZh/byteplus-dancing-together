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
import { assetUpdateRequestSchema } from "@/lib/byteplus-contracts";
import {
  createLocalFallbackAssetDelete,
  createLocalFallbackAssetDetail,
  createLocalFallbackAssetUpdate,
} from "@/lib/byteplus-local-fallback";
import {
  deleteBytePlusAsset,
  getBytePlusAsset,
  updateBytePlusAsset,
} from "@/lib/byteplus-openapi-client";

type RouteContext = {
  params: Promise<{
    assetId: string;
  }>;
};

async function readAssetId(context: RouteContext) {
  const params = await context.params;
  return decodeURIComponent(params.assetId);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const config = getBytePlusConfig();
    const assetId = await readAssetId(context);

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(createLocalFallbackAssetDetail(assetId, config));
    }

    return NextResponse.json(await getBytePlusAsset(assetId, config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const config = getBytePlusConfig();
    const assetId = await readAssetId(context);
    const input = await parseJsonBody(request, assetUpdateRequestSchema);

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(
        createLocalFallbackAssetUpdate(assetId, input, config)
      );
    }

    return NextResponse.json(await updateBytePlusAsset(assetId, input, config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const config = getBytePlusConfig();
    const assetId = await readAssetId(context);

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(createLocalFallbackAssetDelete(assetId, config));
    }

    return NextResponse.json(await deleteBytePlusAsset(assetId, config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
