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
import { assetGroupRequestSchema } from "@/lib/byteplus-contracts";
import {
  createBytePlusAssetGroup,
  listBytePlusAssetGroups,
} from "@/lib/byteplus-openapi-client";
import {
  createLocalFallbackAssetGroup,
  createLocalFallbackAssetGroupList,
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
    const input = await parseJsonBody(request, assetGroupRequestSchema);

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(createLocalFallbackAssetGroup(input, config));
    }

    return NextResponse.json(await createBytePlusAssetGroup(input, config));
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

    if (shouldUseLocalBytePlusFallback(config)) {
      return NextResponse.json(createLocalFallbackAssetGroupList(config));
    }

    return NextResponse.json(
      await listBytePlusAssetGroups(config, {
        groupId: searchParams.get("group_id") ?? undefined,
        name: searchParams.get("name") ?? undefined,
        groupType: searchParams.get("group_type") ?? undefined,
        pageNumber: readPositiveInteger(searchParams.get("page_number")),
        pageSize: readPositiveInteger(searchParams.get("page_size")),
        sortBy: searchParams.get("sort_by") ?? undefined,
        sortOrder: searchParams.get("sort_order") ?? undefined,
      })
    );
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
