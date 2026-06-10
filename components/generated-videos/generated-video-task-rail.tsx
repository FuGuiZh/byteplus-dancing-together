"use client";

import { DatabaseZap, RefreshCw } from "lucide-react";

import { formatAssetTime } from "@/components/generated-content-assets/asset-formatting";
import type { GeneratedVideoTaskList } from "@/components/generated-content-assets/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function GeneratedVideoTaskRail({
  syncing,
  taskList,
}: {
  syncing: boolean;
  taskList: GeneratedVideoTaskList | undefined;
}) {
  const totalText =
    typeof taskList?.total === "number" ? String(taskList.total) : "未查询";

  return (
    <aside className="min-h-0 min-w-0 overflow-hidden">
      <section className="grid h-full min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)] rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold">最近 7 天任务</div>
            <div className="mt-1 text-xs text-muted-foreground">
              ModelArk List 返回的任务列表
            </div>
          </div>
          <Badge variant={syncing ? "warning" : "secondary"}>
            {syncing ? "查询中" : `total ${totalText}`}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <TaskMetric label="API total" value={totalText} />
          <TaskMetric label="本次加载" value={taskList?.loaded ?? 0} />
          <TaskMetric label="筛选状态" value={taskList?.statusFilter ?? "succeeded"} />
          <TaskMetric label="Page size" value={taskList?.pageSize ?? 20} />
        </div>

        <ScrollArea className="mt-4 min-h-0">
          {!taskList ? (
            <div className="rounded-[var(--ui-radius)] border-border bg-background px-3 py-4 text-sm leading-6 text-muted-foreground [border-width:var(--ui-border-width)]">
              点击“加载20个视频”后，这里会显示最近 7 天任务总数和本次返回的任务列表。
            </div>
          ) : null}

          {taskList?.items.length === 0 ? (
            <div className="rounded-[var(--ui-radius)] border-border bg-background px-3 py-4 text-sm text-muted-foreground [border-width:var(--ui-border-width)]">
              本次查询没有返回任务。
            </div>
          ) : null}

          <div className="grid gap-2 pr-3">
            {taskList?.items.map((task) => (
              <div
                className="min-w-0 rounded-[var(--ui-radius)] border-border bg-background px-3 py-3 [border-width:var(--ui-border-width)]"
                key={task.id}
                title={task.id}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0 truncate font-mono text-xs font-bold">
                    {task.id}
                  </div>
                  <Badge variant={getTaskStatusVariant(task.status)}>
                    {task.status ?? "unknown"}
                  </Badge>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div className="min-w-0 truncate">
                    {task.model ?? "model unknown"}
                  </div>
                  <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                    <span>{getTaskSpecText(task)}</span>
                    <span>{task.hasVideoUrl ? "video_url" : "无 video_url"}</span>
                  </div>
                  <div>{formatAssetTime(task.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </section>
    </aside>
  );
}

export function GeneratedVideoTaskRailActions({
  loading,
  onLoadLocal,
  onSync,
  syncing,
}: {
  loading: boolean;
  onLoadLocal: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap justify-end gap-2">
      <Button
        disabled={loading || syncing}
        onClick={onLoadLocal}
        type="button"
        variant="outline"
      >
        <RefreshCw className="mr-2 size-4" />
        读取本地
      </Button>
      <Button disabled={syncing} onClick={onSync} type="button">
        <DatabaseZap className="mr-2 size-4" />
        {syncing ? "加载中" : "加载20个视频"}
      </Button>
    </div>
  );
}

function TaskMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-[var(--ui-radius)] border-border bg-background px-3 py-2 [border-width:var(--ui-border-width)]">
      <div className="truncate text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

function getTaskStatusVariant(status: string | undefined) {
  if (status === "succeeded") {
    return "success" as const;
  }

  if (status === "failed" || status === "cancelled") {
    return "destructive" as const;
  }

  if (status === "queued" || status === "running") {
    return "warning" as const;
  }

  return "secondary" as const;
}

function getTaskSpecText(task: GeneratedVideoTaskList["items"][number]) {
  const spec = [
    task.ratio,
    task.duration ? `${task.duration}s` : undefined,
    task.resolution,
  ]
    .filter(Boolean)
    .join(" / ");

  return spec || "规格未知";
}
