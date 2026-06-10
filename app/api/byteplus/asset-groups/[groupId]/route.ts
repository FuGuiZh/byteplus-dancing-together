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
import { assetGroupUpdateRequestSchema } from "@/lib/byteplus-contracts";
import {
  createLocalFallbackAssetGroupDelete,
  createLocalFallbackAssetGroupDetail,
  createLocalFallbackAssetGroupUpdate,
} from "@/lib/byteplus-local-fallback";
import {
  deleteBytePlusAssetGroup,
  getBytePlusAssetGroup,
  updateBytePlusAssetGroup,
} from "@/lib/byteplus-openapi-client";

type RouteContext = {
  params: Promise<{
    groupId: string;
  }>;
};

async function readGroupId(context: RouteContext) {
  const params = await context.params;
  return decodeURIComponent(params.groupId);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const config = getBytePlusConfig();
    const groupId = await readGroupId(context);

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(
        createLocalFallbackAssetGroupDetail(groupId, config)
      );
    }

    return NextResponse.json(await getBytePlusAssetGroup(groupId, config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const config = getBytePlusConfig();
    const groupId = await readGroupId(context);
    const input = await parseJsonBody(request, assetGroupUpdateRequestSchema);

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(
        createLocalFallbackAssetGroupUpdate(groupId, input, config)
      );
    }

    return NextResponse.json(
      await updateBytePlusAssetGroup(groupId, input, config)
    );
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const config = getBytePlusConfig();
    const groupId = await readGroupId(context);

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(
        createLocalFallbackAssetGroupDelete(groupId, config)
      );
    }

    return NextResponse.json(await deleteBytePlusAssetGroup(groupId, config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
