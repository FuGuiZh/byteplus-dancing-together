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
import { assetUploadRequestSchema } from "@/lib/byteplus-contracts";
import {
  createBytePlusAsset,
  getBytePlusAsset,
  listBytePlusAssets,
} from "@/lib/byteplus-openapi-client";
import {
  createLocalFallbackAsset,
  createLocalFallbackAssetDetail,
  createLocalFallbackAssetList,
} from "@/lib/byteplus-local-fallback";

function readPositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
}

export async function POST(request: Request) {
  try {
    const config = getBytePlusConfig();
    const input = await parseJsonBody(request, assetUploadRequestSchema);

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(createLocalFallbackAsset(input, config));
    }

    return NextResponse.json(await createBytePlusAsset(input, config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function GET(request: Request) {
  try {
    const config = getBytePlusConfig();
    const searchParams = new URL(request.url).searchParams;
    const assetId = searchParams.get("asset_id");

    if (!shouldUseLocalBytePlusFallback(config)) {
      if (assetId) {
        return NextResponse.json(await getBytePlusAsset(assetId, config));
      }

      return NextResponse.json(
        await listBytePlusAssets(config, {
          groupId: searchParams.get("group_id") ?? undefined,
          groupType: searchParams.get("group_type") ?? undefined,
          assetKind: searchParams.get("asset_kind") ?? undefined,
          name: searchParams.get("name") ?? undefined,
          status: searchParams.get("status") ?? undefined,
          pageNumber: readPositiveInteger(searchParams.get("page_number")),
          pageSize: readPositiveInteger(searchParams.get("page_size")),
          sortBy: searchParams.get("sort_by") ?? undefined,
          sortOrder: searchParams.get("sort_order") ?? undefined,
        })
      );
    }

    if (assetId) {
      return NextResponse.json(createLocalFallbackAssetDetail(assetId, config));
    }

    return NextResponse.json(createLocalFallbackAssetList(config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
