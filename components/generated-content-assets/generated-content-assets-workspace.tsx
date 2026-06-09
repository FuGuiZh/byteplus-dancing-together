"use client";

import { DatabaseZap, Film, RefreshCw } from "lucide-react";
import * as React from "react";

import { GeneratedContentAssetCard } from "@/components/generated-content-assets/asset-card";
import { JsonPanel } from "@/components/generated-content-assets/json-panel";
import type {
  GeneratedContentAssetsResponse,
  GeneratedContentAssetView,
} from "@/components/generated-content-assets/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function GeneratedContentAssetsWorkspace() {
  const [assets, setAssets] = React.useState<GeneratedContentAssetView[]>([]);
  const [storagePath, setStoragePath] = React.useState("");
  const [videoDirectoryPath, setVideoDirectoryPath] = React.useState("");
  const [syncSummary, setSyncSummary] =
    React.useState<GeneratedContentAssetsResponse["sync"]>();
  const [lastSyncPayload, setLastSyncPayload] = React.useState<unknown>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const syncRequestPath =
    "/api/local/generated-content-assets?page_size=50&max_pages=5&download_limit=8&download_timeout_ms=12000";

  const applyPayload = React.useCallback((payload: GeneratedContentAssetsResponse) => {
    setAssets(Array.isArray(payload.assets) ? payload.assets : []);
    setStoragePath(payload.storage?.files?.generatedContentAssets ?? "");
    setVideoDirectoryPath(payload.storage?.directories?.generatedContentVideos ?? "");
    setSyncSummary(payload.sync);
  }, []);

  const loadAssets = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/local/generated-content-assets", {
        cache: "no-store",
      });
      const payload = (await response.json()) as GeneratedContentAssetsResponse;

      if (!response.ok) {
        throw new Error("生成内容资产读取失败。");
      }

      applyPayload(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "生成内容资产读取失败。"
      );
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  const syncAssets = React.useCallback(async () => {
    setSyncing(true);
    setError(null);
    setLastSyncPayload({
      state: "syncing",
      message:
        "正在查询 ModelArk 最近 7 天 succeeded 任务，并下载本批可用视频。",
      request: {
        method: "POST",
        path: syncRequestPath,
      },
    });
    let receivedPayload = false;
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => abortController.abort(), 150000);

    try {
      const response = await fetch(syncRequestPath, {
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

      setError(
        message
      );
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
  }, [applyPayload, syncRequestPath]);

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

  return (
    <div className="min-h-[calc(100dvh-40px)] px-5 py-5 lg:px-8 lg:py-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border-border bg-background px-3 py-1 text-xs font-bold [border-width:var(--ui-border-width)]">
            <Film className="size-3.5" />
            生成内容资产库
          </div>
          <h1 className="text-2xl font-bold leading-tight lg:text-3xl">
            Seedance 生成视频归档
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            通过 ModelArk 最近 7 天任务列表同步成功视频；远端 video_url 通常 24 小时有效，能下载的结果会立刻保存到本机用户目录。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void loadAssets()} variant="outline">
            <RefreshCw className="mr-2 size-4" />
            读取本地
          </Button>
          <Button disabled={syncing} onClick={() => void syncAssets()}>
            <DatabaseZap className="mr-2 size-4" />
            {syncing ? "同步中" : "同步最近 7 天"}
          </Button>
        </div>
      </div>

      <StorageSummary
        storagePath={storagePath}
        videoDirectoryPath={videoDirectoryPath}
      />

      {syncSummary?.summary ? (
        <SyncSummary summary={syncSummary.summary} />
      ) : null}

      {syncing ? <SyncingNotice /> : null}

      {error ? (
        <div className="mt-5 rounded-[var(--ui-radius)] border-border bg-destructive px-4 py-3 text-sm text-destructive-foreground [border-width:var(--ui-border-width)]">
          {error}
        </div>
      ) : null}

      <JsonPanel title="最近一次同步响应" value={lastSyncPayload} />

      {loading ? (
        <div className="mt-12 text-sm text-muted-foreground">正在读取资产库...</div>
      ) : null}

      {!loading && assets.length === 0 ? (
        <EmptyAssetsState syncing={syncing} onSync={() => void syncAssets()} />
      ) : null}

      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <GeneratedContentAssetCard
            asset={asset}
            copied={copiedId === asset.id}
            key={asset.id}
            onCopied={handleCopied}
          />
        ))}
      </div>
    </div>
  );
}

function StorageSummary({
  storagePath,
  videoDirectoryPath,
}: {
  storagePath: string;
  videoDirectoryPath: string;
}) {
  if (!storagePath && !videoDirectoryPath) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-3 rounded-[var(--ui-radius)] border-border bg-card px-4 py-3 text-xs [border-width:var(--ui-border-width)] lg:grid-cols-2">
      {storagePath ? (
        <div className="min-w-0">
          <span className="text-muted-foreground">资产索引：</span>
          <code className="break-all font-mono">{storagePath}</code>
        </div>
      ) : null}
      {videoDirectoryPath ? (
        <div className="min-w-0">
          <span className="text-muted-foreground">视频目录：</span>
          <code className="break-all font-mono">{videoDirectoryPath}</code>
        </div>
      ) : null}
    </div>
  );
}

function SyncSummary({
  summary,
}: {
  summary: NonNullable<GeneratedContentAssetsResponse["sync"]>["summary"];
}) {
  if (!summary) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <Badge variant="outline">任务 {summary.receivedTasks}</Badge>
      <Badge variant="success">已下载 {summary.downloadedAssets}</Badge>
      {summary.pendingDownloads > 0 ? (
        <Badge variant="warning">待下载 {summary.pendingDownloads}</Badge>
      ) : null}
      <Badge variant="secondary">新增 {summary.importedAssets}</Badge>
      <Badge variant="warning">跳过 {summary.skippedTasks}</Badge>
      {summary.failedDownloads > 0 ? (
        <Badge variant="destructive">失败 {summary.failedDownloads}</Badge>
      ) : null}
      {summary.remoteMissing > 0 ? (
        <Badge variant="destructive">缺少 URL {summary.remoteMissing}</Badge>
      ) : null}
      <Badge variant="outline">本次下载上限 {summary.downloadLimit}</Badge>
    </div>
  );
}

function SyncingNotice() {
  return (
    <div className="mt-5 rounded-[var(--ui-radius)] border-border bg-card px-4 py-3 text-sm [border-width:var(--ui-border-width)]">
      <div className="font-bold">正在同步最近 7 天任务...</div>
      <div className="mt-1 text-muted-foreground">
        已发起真实 API 查询；本次会限制下载数量并给每个视频下载设置超时，避免页面长时间无响应。
      </div>
    </div>
  );
}

function EmptyAssetsState({
  syncing,
  onSync,
}: {
  syncing: boolean;
  onSync: () => void;
}) {
  return (
    <div className="mt-12 rounded-[calc(var(--ui-radius)*1.4)] border-border bg-card p-8 [border-width:var(--ui-border-width)]">
      <div className="text-lg font-bold">还没有本地生成视频</div>
      <div className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        点击同步会查询 ModelArk 最近 7 天 succeeded 任务；如果任务还带有有效 video_url，服务端会先下载本批视频到本机用户目录，剩余结果会保留为待下载。
      </div>
      <Button className="mt-5" disabled={syncing} onClick={onSync}>
        <DatabaseZap className="mr-2 size-4" />
        {syncing ? "同步中" : "同步最近 7 天任务"}
      </Button>
    </div>
  );
}
