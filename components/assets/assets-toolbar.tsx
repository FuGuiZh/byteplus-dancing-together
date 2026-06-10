"use client";

import {
  FolderPlus,
  Grid2X2,
  ImageUp,
  List,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";

import type {
  AssetKind,
  AssetStatus,
  AssetViewMode,
} from "@/components/assets/assets-types";
import {
  assetKindOptions,
  assetStatusOptions,
  getAssetKindLabel,
  getAssetStatusLabel,
} from "@/components/assets/assets-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function AssetsToolbar({
  assetKindFilter,
  busy,
  onAssetKindFilterChange,
  onCreateAsset,
  onCreateGroup,
  onDeleteSelection,
  onPermissionCheck,
  onRefresh,
  onRenameSelection,
  onSearchChange,
  onStatusFilterChange,
  onUploadImages,
  onViewModeChange,
  searchQuery,
  selected,
  statusFilter,
  viewMode,
}: {
  assetKindFilter: "all" | AssetKind;
  busy: boolean;
  onAssetKindFilterChange: (value: "all" | AssetKind) => void;
  onCreateAsset: () => void;
  onCreateGroup: () => void;
  onDeleteSelection: () => void;
  onPermissionCheck: () => void;
  onRefresh: () => void;
  onRenameSelection: () => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: "all" | AssetStatus) => void;
  onUploadImages: () => void;
  onViewModeChange: (value: AssetViewMode) => void;
  searchQuery: string;
  selected: boolean;
  statusFilter: "all" | AssetStatus;
  viewMode: AssetViewMode;
}) {
  return (
    <div className="flex w-full min-w-0 max-w-full flex-wrap items-center gap-3 overflow-hidden">
      <div className="flex min-w-[min(240px,100%)] max-w-full flex-[1_1_360px] items-center gap-2 rounded-[var(--ui-radius)] border-border bg-background px-3 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Input
          className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索素材组、AssetId、名称、状态、URL"
          value={searchQuery}
        />
      </div>

      <Select
        onValueChange={(value) =>
          onStatusFilterChange(value as "all" | AssetStatus)
        }
        value={statusFilter}
      >
        <SelectTrigger className="h-10 w-[132px] max-w-full" iconDirection="down">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          {assetStatusOptions.map((status) => (
            <SelectItem key={status} value={status}>
              {getAssetStatusLabel(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        onValueChange={(value) =>
          onAssetKindFilterChange(value as "all" | AssetKind)
        }
        value={assetKindFilter}
      >
        <SelectTrigger className="h-10 w-[132px] max-w-full" iconDirection="down">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部类型</SelectItem>
          {assetKindOptions.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {getAssetKindLabel(kind)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Button disabled={busy} onClick={onRefresh} type="button" variant="outline">
          <RefreshCcw className={cn("size-4", busy && "animate-spin")} />
          刷新
        </Button>
        <Button
          disabled={busy}
          onClick={onPermissionCheck}
          type="button"
          variant="outline"
        >
          <ShieldCheck className="size-4" />
          链路自检
        </Button>
        <Button onClick={onCreateGroup} type="button" variant="outline">
          <FolderPlus className="size-4" />
          新建组
        </Button>
        <Button onClick={onCreateAsset} type="button">
          <Upload className="size-4" />
          URL 入库
        </Button>
        <Button onClick={onUploadImages} type="button" variant="outline">
          <ImageUp className="size-4" />
          图片入库
        </Button>
        <Button
          disabled={!selected}
          onClick={onRenameSelection}
          type="button"
          variant="outline"
        >
          <Wand2 className="size-4" />
          重命名
        </Button>
        <Button
          disabled={!selected}
          onClick={onDeleteSelection}
          type="button"
          variant="destructive"
        >
          <Trash2 className="size-4" />
          删除
        </Button>
      </div>

      <button
        aria-label={viewMode === "grid" ? "切换为列表视图" : "切换为网格视图"}
        className="relative flex h-10 w-[78px] shrink-0 items-center overflow-hidden rounded-full border-border bg-background p-1 text-xs font-bold [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]"
        onClick={() => onViewModeChange(viewMode === "grid" ? "list" : "grid")}
        title={viewMode === "grid" ? "切换为列表视图" : "切换为网格视图"}
        type="button"
      >
        <span
          className={cn(
            "absolute inset-y-1 w-[32px] rounded-full bg-primary transition-transform",
            viewMode === "list" ? "translate-x-[36px]" : "translate-x-0"
          )}
        />
        <span
          className={cn(
            "relative z-10 flex w-1/2 items-center justify-center",
            viewMode === "grid" && "text-primary-foreground"
          )}
        >
          <Grid2X2 className="size-4" />
        </span>
        <span
          className={cn(
            "relative z-10 flex w-1/2 items-center justify-center",
            viewMode === "list" && "text-primary-foreground"
          )}
        >
          <List className="size-4" />
        </span>
      </button>
    </div>
  );
}
