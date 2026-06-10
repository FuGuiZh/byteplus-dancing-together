"use client";

import type {
  GeneratedContentAssetsResponse,
  GeneratedContentAssetView,
} from "@/components/generated-content-assets/types";
import { Badge } from "@/components/ui/badge";
import type { GeneratedVideoCardDisplayMode } from "@/components/generated-videos/generated-videos-toolbar";

export function GeneratedVideosStatusBar({
  assets,
  currentPage,
  displayMode,
  error,
  filteredCount,
  loading,
  pageCount,
  searchQuery,
  syncSummary,
  syncing,
}: {
  assets: GeneratedContentAssetView[];
  currentPage: number;
  displayMode: GeneratedVideoCardDisplayMode;
  error: string | null;
  filteredCount: number;
  loading: boolean;
  pageCount: number;
  searchQuery: string;
  syncSummary: GeneratedContentAssetsResponse["sync"] | undefined;
  syncing: boolean;
}) {
  const localDownloaded = assets.filter(
    (asset) => asset.downloadStatus === "downloaded"
  ).length;
  const localPending = assets.filter(
    (asset) => asset.downloadStatus === "pending"
  ).length;
  const localFailed = assets.filter(
    (asset) => asset.downloadStatus === "failed"
  ).length;
  const localMissing = assets.filter(
    (asset) => asset.downloadStatus === "remote_missing"
  ).length;
  const summary = syncSummary?.summary;
  const stateLabel = error
    ? "异常"
    : syncing
      ? "同步中"
      : loading
        ? "读取中"
        : localPending > 0
          ? "后台下载中"
          : "就绪";

  return (
    <footer className="flex min-h-11 min-w-0 flex-wrap items-center gap-2 px-0 py-2 text-xs">
      <Badge variant={error ? "destructive" : syncing ? "warning" : "secondary"}>
        {stateLabel}
      </Badge>
      <Badge variant="outline">本地 {assets.length}</Badge>
      <Badge variant="success">已下载 {localDownloaded}</Badge>
      {localPending > 0 ? (
        <Badge variant="warning">待下载 {localPending}</Badge>
      ) : null}
      {localFailed > 0 ? (
        <Badge variant="destructive">下载失败 {localFailed}</Badge>
      ) : null}
      {localMissing > 0 ? (
        <Badge variant="destructive">缺少 URL {localMissing}</Badge>
      ) : null}
      <Badge variant="outline">
        {searchQuery.trim() ? `筛选 ${filteredCount}` : "未筛选"}
      </Badge>
      <Badge variant="secondary">
        第 {currentPage}/{pageCount} 页
      </Badge>
      <Badge variant="outline">
        视图 {displayMode === "details" ? "卡片" : "仅视频"}
      </Badge>

      {summary ? (
        <>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <Badge variant="outline">任务 {summary.receivedTasks}</Badge>
          <Badge variant="success">本次已下 {summary.downloadedAssets}</Badge>
          {summary.pendingDownloads > 0 ? (
            <Badge variant="warning">本次待下 {summary.pendingDownloads}</Badge>
          ) : null}
          <Badge variant="secondary">新增 {summary.importedAssets}</Badge>
          <Badge variant="warning">跳过 {summary.skippedTasks}</Badge>
          {summary.failedDownloads > 0 ? (
            <Badge variant="destructive">失败 {summary.failedDownloads}</Badge>
          ) : null}
          {summary.remoteMissing > 0 ? (
            <Badge variant="destructive">无 URL {summary.remoteMissing}</Badge>
          ) : null}
          <Badge variant="outline">上限 {summary.downloadLimit}</Badge>
        </>
      ) : null}

      {error ? (
        <div className="min-w-[180px] flex-1 truncate text-destructive">
          {error}
        </div>
      ) : null}
    </footer>
  );
}
