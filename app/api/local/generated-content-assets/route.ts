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
  queueGeneratedContentAssetDownloads,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }

  return undefined;
}

function readProviderTotalCount(provider: unknown, fallback: number) {
  if (!isRecord(provider)) {
    return fallback;
  }

  for (const key of ["total", "total_count", "totalCount", "Total", "TotalCount"]) {
    const value = readNumber(provider, key);
    if (typeof value === "number") {
      return value;
    }
  }

  return fallback;
}

function convertProviderTimestamp(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value > 1_000_000_000_000 ? value : value * 1000;
}

function buildGeneratedVideoTaskList({
  fallbackTotal,
  maxPages,
  pageSize,
  providers,
  statusFilter,
  tasks,
}: {
  fallbackTotal?: number;
  maxPages: number;
  pageSize: number;
  providers: unknown[];
  statusFilter?: string;
  tasks: unknown[];
}) {
  const providerTotal = providers
    .map((provider) => readProviderTotalCount(provider, Number.NaN))
    .find((total) => Number.isFinite(total));
  const total =
    typeof providerTotal === "number" && Number.isFinite(providerTotal)
      ? providerTotal
      : fallbackTotal ?? tasks.length;

  return {
    total,
    loaded: tasks.length,
    statusFilter,
    pageSize,
    maxPages,
    items: tasks
      .map((task) => {
        if (!isRecord(task)) {
          return null;
        }

        const content = isRecord(task.content) ? task.content : {};
        const id = readString(task, "id") ?? readString(task, "taskId");
        if (!id) {
          return null;
        }

        return {
          id,
          status: readString(task, "status"),
          model: readString(task, "model"),
          createdAt: convertProviderTimestamp(task.created_at),
          updatedAt: convertProviderTimestamp(task.updated_at),
          ratio: readString(task, "ratio"),
          duration: readNumber(task, "duration"),
          resolution: readString(task, "resolution"),
          hasVideoUrl: Boolean(readString(content, "video_url")),
          error: task.error,
          usage: task.usage,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  };
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
      void queueGeneratedContentAssetDownloads(syncOptions);

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
          taskList: buildGeneratedVideoTaskList({
            fallbackTotal: provider.total,
            maxPages,
            pageSize,
            providers: [provider],
            statusFilter: "succeeded",
            tasks: provider.items,
          }),
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
    void queueGeneratedContentAssetDownloads(syncOptions);

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
        taskList: buildGeneratedVideoTaskList({
          maxPages,
          pageSize,
          providers: pages,
          statusFilter: "succeeded",
          tasks,
        }),
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
