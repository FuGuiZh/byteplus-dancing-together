"use client";

import { DatabaseZap } from "lucide-react";

import { Button } from "@/components/ui/button";

export function GeneratedVideosStatus({
  error,
}: {
  error: string | null;
}) {
  return (
    <div className="grid min-w-0 gap-4">
      {error ? (
        <div className="rounded-[var(--ui-radius)] border-border bg-destructive px-4 py-3 text-sm text-destructive-foreground [border-width:var(--ui-border-width)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export function EmptyAssetsState({
  searchQuery,
  syncing,
  onSync,
}: {
  searchQuery: string;
  syncing: boolean;
  onSync: () => void;
}) {
  if (searchQuery.trim()) {
    return (
      <div className="mt-10 rounded-[calc(var(--ui-radius)*1.4)] border-border bg-card p-8 [border-width:var(--ui-border-width)]">
        <div className="text-lg font-bold">没有匹配的视频</div>
        <div className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          换一个 TaskId、模型、状态或规格关键词再试。
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-[calc(var(--ui-radius)*1.4)] border-border bg-card p-8 [border-width:var(--ui-border-width)]">
      <div className="text-lg font-bold">还没有本地生成视频</div>
      <div className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        点击加载会查询 ModelArk 最近 7 天 succeeded 任务；如果任务还带有有效 video_url，服务端会先建立占位卡片，再由后台队列下载视频。
      </div>
      <Button className="mt-5" disabled={syncing} onClick={onSync} type="button">
        <DatabaseZap className="mr-2 size-4" />
        {syncing ? "加载中" : "加载20个视频"}
      </Button>
    </div>
  );
}
