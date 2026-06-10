"use client";

import * as React from "react";

import { JsonPanel } from "@/components/generated-content-assets/json-panel";
import type {
  GeneratedContentAssetsResponse,
  GeneratedContentAssetView,
  GeneratedVideoTaskList,
} from "@/components/generated-content-assets/types";
import { GeneratedVideoGallery } from "@/components/generated-videos/generated-video-gallery";
import {
  GeneratedVideoTaskRail,
  GeneratedVideoTaskRailActions,
} from "@/components/generated-videos/generated-video-task-rail";
import { GeneratedVideosFrame } from "@/components/generated-videos/generated-videos-frame";
import { GeneratedVideosStatus } from "@/components/generated-videos/generated-videos-status";
import { GeneratedVideosStatusBar } from "@/components/generated-videos/generated-videos-status-bar";
import {
  GeneratedVideosToolbar,
  type GeneratedVideoCardDisplayMode,
} from "@/components/generated-videos/generated-videos-toolbar";

const VIDEOS_PER_PAGE = 15;
const SYNC_REQUEST_PATH =
  "/api/local/generated-content-assets?page_size=20&max_pages=1&download_limit=20&download_timeout_ms=12000";

export function GeneratedVideosWorkspace() {
  const [assets, setAssets] = React.useState<GeneratedContentAssetView[]>([]);
  const [syncSummary, setSyncSummary] =
    React.useState<GeneratedContentAssetsResponse["sync"]>();
  const [taskList, setTaskList] = React.useState<GeneratedVideoTaskList>();
  const [lastSyncPayload, setLastSyncPayload] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [displayMode, setDisplayMode] =
    React.useState<GeneratedVideoCardDisplayMode>("details");

  const applyPayload = React.useCallback(
    (
      payload: GeneratedContentAssetsResponse,
      options?: { preserveSync?: boolean }
    ) => {
      setAssets(Array.isArray(payload.assets) ? payload.assets : []);

      if (payload.sync || !options?.preserveSync) {
        setSyncSummary(payload.sync);
      }

      if (payload.sync?.taskList) {
        setTaskList(payload.sync.taskList);
      } else if (!options?.preserveSync) {
        setTaskList(undefined);
      }
    },
    []
  );

  const filteredAssets = React.useMemo(
    () => filterAssets(assets, searchQuery),
    [assets, searchQuery]
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredAssets.length / VIDEOS_PER_PAGE)
  );
  const displayedCurrentPage = Math.min(currentPage, pageCount);
  const visibleAssets = React.useMemo(() => {
    const startIndex = (displayedCurrentPage - 1) * VIDEOS_PER_PAGE;
    return filteredAssets.slice(startIndex, startIndex + VIDEOS_PER_PAGE);
  }, [displayedCurrentPage, filteredAssets]);
  const hasPendingDownloads = assets.some(
    (asset) => asset.downloadStatus === "pending"
  );

  const loadAssets = React.useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetch("/api/local/generated-content-assets", {
          cache: "no-store",
        });
        const payload = (await response.json()) as GeneratedContentAssetsResponse;

        if (!response.ok) {
          throw new Error("生成内容资产读取失败。");
        }

        applyPayload(payload, {
          preserveSync: options?.silent,
        });
      } catch (requestError) {
        if (!options?.silent) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "生成内容资产读取失败。"
          );
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [applyPayload]
  );

  const syncAssets = React.useCallback(async () => {
    setSyncing(true);
    setError(null);
    setLastSyncPayload({
      state: "syncing",
      message:
        "正在查询 ModelArk 最近 7 天 succeeded 任务，返回后会先渲染视频占位卡片，后台继续下载文件。",
      request: {
        method: "POST",
        path: SYNC_REQUEST_PATH,
      },
    });
    let receivedPayload = false;
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => abortController.abort(), 150000);

    try {
      const response = await fetch(SYNC_REQUEST_PATH, {
        cache: "no-store",
        method: "POST",
        signal: abortController.signal,
      });
      const payload = (await response.json()) as GeneratedContentAssetsResponse & {
        message?: string;
      };
      receivedPayload = true;
      setLastSyncPayload(payload);

      if (!response.ok) {
        throw new Error(payload.message ?? "ModelArk 任务同步失败。");
      }

      applyPayload(payload);
    } catch (requestError) {
      const message =
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "同步请求超过 150 秒未完成，前端已停止等待；后端可能仍在下载，请稍后点击读取本地。"
          : requestError instanceof Error
            ? requestError.message
            : "ModelArk 任务同步失败。";

      setError(message);
      if (!receivedPayload) {
        setLastSyncPayload({
          code: "CLIENT_SYNC_ERROR",
          message,
        });
      }
    } finally {
      window.clearTimeout(timeoutId);
      setSyncing(false);
      setLoading(false);
    }
  }, [applyPayload]);

  React.useEffect(() => {
    if (loading || syncing || !hasPendingDownloads) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadAssets({ silent: true });
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasPendingDownloads, loadAssets, loading, syncing]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadInitialAssets() {
      try {
        const response = await fetch("/api/local/generated-content-assets", {
          cache: "no-store",
        });
        const payload = (await response.json()) as GeneratedContentAssetsResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error("生成内容资产读取失败。");
        }

        applyPayload(payload);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "生成内容资产读取失败。"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialAssets();

    return () => {
      cancelled = true;
    };
  }, [applyPayload]);

  function handleCopied(assetId: string) {
    setCopiedId(assetId);
    window.setTimeout(() => setCopiedId(null), 1200);
  }

  function handleSearchQueryChange(value: string) {
    setSearchQuery(value);
    setCurrentPage(1);
  }

  return (
    <GeneratedVideosFrame
      toolbar={
        <GeneratedVideosToolbar
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          onSearchQueryChange={handleSearchQueryChange}
          searchQuery={searchQuery}
        />
      }
      main={
        <>
          <GeneratedVideosStatus error={error} />
          <JsonPanel title="最近一次同步响应" value={lastSyncPayload} />
          <GeneratedVideoGallery
            copiedId={copiedId}
            currentPage={displayedCurrentPage}
            displayMode={displayMode}
            loading={loading}
            onCopied={handleCopied}
            onPageChange={setCurrentPage}
            onSync={() => void syncAssets()}
            pageCount={pageCount}
            pageSize={VIDEOS_PER_PAGE}
            searchQuery={searchQuery}
            syncing={syncing}
            totalCount={filteredAssets.length}
            visibleAssets={visibleAssets}
          />
        </>
      }
      rail={<GeneratedVideoTaskRail syncing={syncing} taskList={taskList} />}
      railToolbar={
        <GeneratedVideoTaskRailActions
          loading={loading}
          onLoadLocal={() => void loadAssets()}
          onSync={() => void syncAssets()}
          syncing={syncing}
        />
      }
      statusBar={
        <GeneratedVideosStatusBar
          assets={assets}
          currentPage={displayedCurrentPage}
          displayMode={displayMode}
          error={error}
          filteredCount={filteredAssets.length}
          loading={loading}
          pageCount={pageCount}
          searchQuery={searchQuery}
          syncSummary={syncSummary}
          syncing={syncing}
        />
      }
    />
  );
}

function filterAssets(
  assets: GeneratedContentAssetView[],
  searchQuery: string
) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return assets;
  }

  return assets.filter((asset) => {
    const searchableText = [
      asset.id,
      asset.taskId,
      asset.model,
      asset.status,
      asset.sessionTitle,
      asset.prompt,
      asset.ratio,
      asset.resolution,
      asset.duration ? `${asset.duration}s` : undefined,
      asset.downloadStatus,
      asset.source,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}
