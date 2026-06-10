"use client";

import type { ApiSnapshot, AssetCounts } from "@/components/assets/assets-types";
import { Badge } from "@/components/ui/badge";

export function AssetsStatusBar({
  apiSnapshot,
  busy,
  counts,
  visibleAssetCount,
  visibleGroupCount,
}: {
  apiSnapshot: ApiSnapshot | null;
  busy: boolean;
  counts: AssetCounts;
  visibleAssetCount: number;
  visibleGroupCount: number;
}) {
  const state = apiSnapshot?.error
    ? "异常"
    : busy
      ? "请求中"
      : "就绪";

  return (
    <div className="flex min-h-11 min-w-0 flex-wrap items-center gap-2 py-2 text-xs">
      <Badge variant={apiSnapshot?.error ? "destructive" : busy ? "warning" : "secondary"}>
        {state}
      </Badge>
      <Badge variant="outline">素材组 {counts.groups}</Badge>
      <Badge variant="outline">素材 {counts.assets}</Badge>
      <Badge variant="success">Active {counts.active}</Badge>
      <Badge variant="warning">Processing {counts.processing}</Badge>
      {counts.failed > 0 ? (
        <Badge variant="destructive">Failed {counts.failed}</Badge>
      ) : null}
      <Badge variant="secondary">
        当前显示 {visibleGroupCount} 组 / {visibleAssetCount} 素材
      </Badge>
      {apiSnapshot ? (
        <>
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
          <Badge variant="outline">{apiSnapshot.method}</Badge>
          <span className="max-w-[420px] truncate font-mono text-muted-foreground">
            {apiSnapshot.path}
          </span>
          {typeof apiSnapshot.status === "number" ? (
            <Badge
              variant={apiSnapshot.status >= 400 ? "destructive" : "success"}
            >
              HTTP {apiSnapshot.status}
            </Badge>
          ) : null}
          {typeof apiSnapshot.elapsedMs === "number" ? (
            <Badge variant="secondary">{apiSnapshot.elapsedMs}ms</Badge>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
