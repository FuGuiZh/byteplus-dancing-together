import * as React from "react";
import {
  CheckCircle2,
  CircleAlert,
  Clock,
  Image as ImageIcon,
  Music,
  Video,
} from "lucide-react";

import type {
  AssetStatus,
  AssetType,
  StudioAsset,
  TaskStatus,
} from "@/lib/studio-fixtures";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const statusMeta: Record<
  AssetStatus,
  {
    label: string;
    tone: "success" | "warning" | "destructive";
    icon: React.ElementType;
  }
> = {
  Active: { label: "可用", tone: "success", icon: CheckCircle2 },
  Processing: { label: "处理中", tone: "warning", icon: Clock },
  Failed: { label: "未通过", tone: "destructive", icon: CircleAlert },
};

export const taskMeta: Record<
  TaskStatus,
  {
    label: string;
    detail: string;
    badge: "secondary" | "info" | "success" | "destructive" | "warning";
    progress: number;
  }
> = {
  idle: {
    label: "未创建",
    detail: "填写 prompt 并选择素材后创建 Seedance 任务。",
    badge: "secondary",
    progress: 0,
  },
  queued: {
    label: "排队中",
    detail: "任务已提交，等待模型调度。",
    badge: "info",
    progress: 30,
  },
  running: {
    label: "生成中",
    detail: "Seedance 正在处理素材与 prompt。",
    badge: "warning",
    progress: 68,
  },
  cancelled: {
    label: "已停止",
    detail: "你已让系统停止这条回答。",
    badge: "secondary",
    progress: 100,
  },
  succeeded: {
    label: "已生成",
    detail: "任务成功，等待成片转存。",
    badge: "success",
    progress: 100,
  },
  failed: {
    label: "失败",
    detail: "检查素材状态或 BytePlus 返回错误。",
    badge: "destructive",
    progress: 100,
  },
  expired: {
    label: "已过期",
    detail: "任务或结果 URL 已过期，需要重新提交。",
    badge: "destructive",
    progress: 100,
  },
};

export const assetIcon: Record<AssetType, React.ElementType> = {
  Image: ImageIcon,
  Video,
  Audio: Music,
};

export function DataLine({
  label,
  value,
  align = "right",
}: {
  label: string;
  value: string;
  align?: "right" | "left";
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <code
        className={cn(
          "truncate font-mono text-[11px] text-foreground",
          align === "right" && "text-right"
        )}
      >
        {value}
      </code>
    </div>
  );
}

export function CodeBlock({ value }: { value: string }) {
  return (
    <div className="min-h-[260px] overflow-auto rounded-[var(--ui-radius)] border-border bg-[oklch(0.17_0.012_250)] [border-width:var(--ui-border-width)]">
      <pre className="min-w-max p-4 font-mono text-[11px] leading-5 text-[oklch(0.94_0.012_88)]">
        {value}
      </pre>
    </div>
  );
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <Badge variant={meta.tone}>
      <Icon className="mr-1 size-3" />
      {meta.label}
    </Badge>
  );
}

export function AssetCard({
  asset,
  compact = false,
}: {
  asset: StudioAsset;
  compact?: boolean;
}) {
  const TypeIcon = assetIcon[asset.type];

  return (
    <div className="min-w-0 rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ui-radius)] bg-secondary text-secondary-foreground">
            <TypeIcon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{asset.name}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{asset.use}</span>
              <span className="font-mono">{asset.type}</span>
            </div>
          </div>
        </div>
        <AssetStatusBadge status={asset.status} />
      </div>

      {!compact ? (
        <div className="mt-4 space-y-2">
          <DataLine label="AssetId" value={asset.assetId} />
          <DataLine label="GroupId" value={asset.groupId} />
          <DataLine label="来源" value={asset.source} />
        </div>
      ) : null}

      {asset.failureReason ? (
        <div className="mt-3 rounded-[var(--ui-radius)] border-border bg-destructive px-3 py-2 text-xs text-destructive-foreground [border-width:var(--ui-border-width)]">
          {asset.failureReason}
        </div>
      ) : null}
    </div>
  );
}

export function FieldLabel({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-bold">{label}</span>
      {description ? (
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      ) : null}
    </label>
  );
}

export const inputClassName =
  "min-h-10 w-full rounded-[var(--ui-radius)] border-border bg-background px-3 py-2 text-sm outline-none [border-width:var(--ui-border-width)] focus:ring-2 focus:ring-ring";

export const textareaClassName =
  "min-h-32 w-full resize-y rounded-[var(--ui-radius)] border-border bg-background px-3 py-2 text-sm leading-6 outline-none [border-width:var(--ui-border-width)] focus:ring-2 focus:ring-ring";
