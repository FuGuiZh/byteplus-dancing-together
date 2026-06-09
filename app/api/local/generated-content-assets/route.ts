import { NextResponse } from "next/server";

import { getErrorStatus, toErrorPayload } from "@/lib/api-request";
import {
  getBytePlusConfig,
  shouldUseLocalModelArkFallback,
} from "@/lib/byteplus-config";
import { listBytePlusGenerationTasks } from "@/lib/byteplus-modelark-client";
import { createLocalFallbackGenerationTaskList } from "@/lib/byteplus-local-fallback";
import {
  getLocalWorkspaceStorageInfo,
  readGeneratedContentAssetState,
  syncGeneratedContentAssetsFromTasks,
} from "@/lib/local-workspace-store";

function readPositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
}

function readNonNegativeInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue >= 0
    ? numberValue
    : undefined;
}

export async function GET() {
  const state = await readGeneratedContentAssetState();

  return NextResponse.json({
    ...state,
    storage: getLocalWorkspaceStorageInfo(),
  });
}

export async function POST(request: Request) {
  try {
    const config = getBytePlusConfig();
    const searchParams = new URL(request.url).searchParams;
    const pageSize = readPositiveInteger(searchParams.get("page_size")) ?? 50;
    const maxPages = readPositiveInteger(searchParams.get("max_pages")) ?? 5;
    const downloadLimit =
      readNonNegativeInteger(searchParams.get("download_limit")) ?? 8;
    const downloadTimeoutMs =
      readPositiveInteger(searchParams.get("download_timeout_ms")) ?? 12000;
    const syncOptions = {
      downloadLimit,
      downloadTimeoutMs,
    };

    if (shouldUseLocalModelArkFallback(config)) {
      const provider = createLocalFallbackGenerationTaskList(config);
      const syncResult = await syncGeneratedContentAssetsFromTasks(
        provider.items,
        syncOptions
      );

      return NextResponse.json({
        ...syncResult.state,
        storage: getLocalWorkspaceStorageInfo(),
        sync: {
          mode: "local",
          options: {
            pageSize,
            maxPages,
            ...syncOptions,
          },
          summary: syncResult.summary,
          provider,
        },
      });
    }

    const tasks: unknown[] = [];
    const pages: unknown[] = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      const page = await listBytePlusGenerationTasks(config, {
        pageNum,
        pageSize,
        status: "succeeded",
      });

      tasks.push(...page.items);
      pages.push(page.provider);

      if (!page.hasMore || page.items.length === 0) {
        break;
      }
    }

    const syncResult = await syncGeneratedContentAssetsFromTasks(
      tasks,
      syncOptions
    );

    return NextResponse.json({
      ...syncResult.state,
      storage: getLocalWorkspaceStorageInfo(),
      sync: {
        mode: "live",
        options: {
          pageSize,
          maxPages,
          ...syncOptions,
        },
        summary: syncResult.summary,
        provider: {
          pages,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
