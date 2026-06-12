"use client";

import * as React from "react";
import {
  ExternalLink,
  Folder,
  FolderPlus,
  Grid2X2,
  ImageUp,
  Info,
  List as ListIcon,
  MoreHorizontal,
  RefreshCcw,
  Trash2,
  Wand2,
  XCircle,
} from "lucide-react";

import { AssetPreview } from "@/components/assets/asset-preview";
import type {
  AssetGroupItem,
  AssetItem,
  AssetScope,
  AssetSelection,
  AssetViewMode,
} from "@/components/assets/assets-types";
import {
  formatAssetTime,
  getAssetKindLabel,
  getAssetStatusLabel,
  getGroupTypeLabel,
} from "@/components/assets/assets-utils";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function AssetsBrowser({
  assets,
  groups,
  loading,
  onClearSelection,
  onCreateAsset,
  onCreateGroup,
  onDelete,
  onDetail,
  onDropRejected,
  onOpenAsset,
  onRename,
  onRefresh,
  onScopeChange,
  onSelect,
  onUploadFiles,
  onUploadFilesPicker,
  onViewModeChange,
  scope,
  selection,
  viewMode,
}: {
  assets: AssetItem[];
  groups: AssetGroupItem[];
  loading: boolean;
  onClearSelection: () => void;
  onCreateAsset: () => void;
  onCreateGroup: () => void;
  onDelete: () => void;
  onDetail: () => void;
  onDropRejected: (message: string) => void;
  onOpenAsset: (asset: AssetItem) => void;
  onRename: () => void;
  onRefresh: () => void;
  onScopeChange: (scope: AssetScope) => void;
  onSelect: (selection: AssetSelection) => void;
  onUploadFiles: (files: File[], groupId: string) => void;
  onUploadFilesPicker: () => void;
  onViewModeChange: (value: AssetViewMode) => void;
  scope: AssetScope;
  selection: AssetSelection;
  viewMode: AssetViewMode;
}) {
  const [dragDepth, setDragDepth] = React.useState(0);
  const showGroups = scope.type === "root" || scope.type === "group-type";
  const isEmpty = groups.length === 0 && assets.length === 0;
  const canDropFiles = scope.type === "group";
  const isDraggingFiles = dragDepth > 0;
  const dropTargetGroupId = scope.type === "group" ? scope.groupId : "";

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (!hasFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();

    if (canDropFiles) {
      setDragDepth((current) => current + 1);
    }
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!hasFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = canDropFiles ? "copy" : "none";
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!hasFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();

    if (canDropFiles) {
      setDragDepth((current) => Math.max(0, current - 1));
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!hasFileTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    setDragDepth(0);

    if (!canDropFiles || !dropTargetGroupId) {
      onDropRejected("请先打开一个素材组，再把本地素材文件拖拽到素材文件区入库。");
      return;
    }

    const assetFiles = getSupportedAssetFilesFromDataTransfer(event.dataTransfer);

    if (assetFiles.length === 0) {
      onDropRejected("拖拽内容里没有可入库的图片、视频或音频文件。");
      return;
    }

    onUploadFiles(assetFiles, dropTargetGroupId);
  }

  return (
    <div className="grid h-full min-w-0 max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <div className="flex min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden border-b border-border px-5 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">
            {showGroups ? "素材组文件夹" : "素材文件"}
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {showGroups
              ? "打开素材组后管理组内素材；真人认证组一般来自 H5 活体认证流程。"
              : "只有 Active 素材才适合进入 Seedance 生成请求。"}
          </div>
        </div>
        {loading ? <Badge variant="warning">读取中</Badge> : null}
      </div>

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              "relative min-h-0 min-w-0 max-w-full overflow-hidden transition-colors",
              canDropFiles && isDraggingFiles && "bg-primary/5"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <ScrollArea className="h-full min-h-0 min-w-0 max-w-full overflow-hidden">
              {isEmpty ? (
                <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
                  <div>
                    <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--ui-radius)] bg-secondary text-secondary-foreground">
                      <Folder className="size-7" />
                    </div>
                    <div className="mt-4 text-base font-bold">
                      还没有可展示的素材资源
                    </div>
                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                      可以先创建 AIGC 素材组，再用 BytePlus 可访问的 URL
                      或本地文件入库素材。
                    </p>
                    {canDropFiles ? (
                      <p className="mt-3 text-xs font-bold text-primary">
                        也可以直接拖拽本地图片、视频或音频到这里，入库到当前素材组。
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid min-w-0 max-w-full grid-cols-[repeat(auto-fill,minmax(min(150px,100%),1fr))] gap-x-6 gap-y-7 p-7">
                  {showGroups
                    ? groups.map((group) => (
                        <AssetGroupTile
                          group={group}
                          key={group.id}
                          onDelete={onDelete}
                          onDetail={onDetail}
                          onOpen={() =>
                            onScopeChange({ type: "group", groupId: group.id })
                          }
                          onRename={onRename}
                          onSelect={() =>
                            onSelect({ type: "group", id: group.id })
                          }
                          selected={
                            selection?.type === "group" &&
                            selection.id === group.id
                          }
                        />
                      ))
                    : null}
                  {assets.map((asset) => (
                    <AssetTile
                      asset={asset}
                      key={asset.id}
                      onDelete={onDelete}
                      onDetail={onDetail}
                      onOpen={() => onOpenAsset(asset)}
                      onRename={onRename}
                      onSelect={() => onSelect({ type: "asset", id: asset.id })}
                      selected={
                        selection?.type === "asset" && selection.id === asset.id
                      }
                    />
                  ))}
                </div>
              ) : (
                <AssetsListView
                  assets={assets}
                  groups={showGroups ? groups : []}
                  onDelete={onDelete}
                  onDetail={onDetail}
                  onOpenAsset={onOpenAsset}
                  onRename={onRename}
                  onScopeChange={onScopeChange}
                  onSelect={onSelect}
                  selection={selection}
                />
              )}
            </ScrollArea>
            {canDropFiles ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-5 z-20 flex items-center justify-center rounded-[var(--ui-radius)] border-2 border-dashed border-primary bg-background/85 text-center shadow-lg backdrop-blur-sm transition-opacity",
                  isDraggingFiles ? "opacity-100" : "opacity-0"
                )}
              >
                <div className="max-w-sm px-6">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--ui-radius)] bg-primary text-primary-foreground">
                    <ImageUp className="size-7" />
                  </div>
                  <div className="mt-4 text-base font-bold">松手后文件入库</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    目标是当前打开的素材组；只会提交 BytePlus 支持的图片、视频或音频文件。
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </ContextMenuTrigger>
        <BrowserContextMenu
          hasSelection={Boolean(selection)}
          onClearSelection={onClearSelection}
          onCreateAsset={onCreateAsset}
          onCreateGroup={onCreateGroup}
          onRefresh={onRefresh}
          onToggleViewMode={() =>
            onViewModeChange(viewMode === "grid" ? "list" : "grid")
          }
          onUploadFiles={onUploadFilesPicker}
          viewMode={viewMode}
        />
      </ContextMenu>
    </div>
  );
}

function hasFileTransfer(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes("Files");
}

function isLikelySupportedAssetFile(file: File) {
  const supportedMimeTypes = new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "image/bmp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
    "image/webp",
    "video/mp4",
    "video/quicktime",
  ]);

  if (supportedMimeTypes.has(file.type.toLowerCase())) {
    return true;
  }

  return /\.(bmp|gif|heic|heif|jpe?g|mov|mp3|mp4|png|tiff?|wav|webp)$/i.test(
    file.name
  );
}

function getSupportedAssetFilesFromDataTransfer(dataTransfer: DataTransfer) {
  const itemFiles = Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));
  const files = itemFiles.length > 0 ? itemFiles : Array.from(dataTransfer.files);

  return files.filter(isLikelySupportedAssetFile);
}

function BrowserContextMenu({
  hasSelection,
  onClearSelection,
  onCreateAsset,
  onCreateGroup,
  onRefresh,
  onToggleViewMode,
  onUploadFiles,
  viewMode,
}: {
  hasSelection: boolean;
  onClearSelection: () => void;
  onCreateAsset: () => void;
  onCreateGroup: () => void;
  onRefresh: () => void;
  onToggleViewMode: () => void;
  onUploadFiles: () => void;
  viewMode: AssetViewMode;
}) {
  return (
    <ContextMenuContent className="w-56">
      <ContextMenuItem onClick={onUploadFiles}>
        <ImageUp className="size-4" />
        本地文件入库
      </ContextMenuItem>
      <ContextMenuItem onClick={onCreateAsset}>
        <ExternalLink className="size-4" />
        提交 URL 入库
      </ContextMenuItem>
      <ContextMenuItem onClick={onCreateGroup}>
        <FolderPlus className="size-4" />
        新建 AIGC 素材组
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onRefresh}>
        <RefreshCcw className="size-4" />
        刷新素材库
      </ContextMenuItem>
      <ContextMenuItem onClick={onToggleViewMode}>
        {viewMode === "grid" ? (
          <ListIcon className="size-4" />
        ) : (
          <Grid2X2 className="size-4" />
        )}
        {viewMode === "grid" ? "切换为列表" : "切换为网格"}
      </ContextMenuItem>
      <ContextMenuItem disabled={!hasSelection} onClick={onClearSelection}>
        <XCircle className="size-4" />
        清除选择
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

function AssetGroupTile({
  group,
  onDelete,
  onDetail,
  onOpen,
  onRename,
  onSelect,
  selected,
}: {
  group: AssetGroupItem;
  onDelete: () => void;
  onDetail: () => void;
  onOpen: () => void;
  onRename: () => void;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          className={cn(
            "group flex min-w-0 cursor-default flex-col items-center rounded-[var(--ui-radius)] border-border px-4 py-5 text-center hover:bg-muted [border-width:var(--ui-border-width)]",
            selected && "bg-secondary ring-2 ring-ring/40"
          )}
          onClick={onSelect}
          onContextMenu={onSelect}
          onDoubleClick={onOpen}
          type="button"
        >
          <div className="relative mb-4 flex h-20 w-24 items-center justify-center">
            <div className="absolute left-3 top-2 h-4 w-11 rounded-t-md bg-blue-300" />
            <div className="relative mt-3 flex h-14 w-20 items-center justify-center rounded-md bg-blue-500 text-white shadow-sm">
              <Folder className="size-9" fill="currentColor" strokeWidth={1.4} />
            </div>
          </div>
          <span className="line-clamp-2 min-h-10 max-w-full text-sm font-bold">
            {group.name}
          </span>
          <span className="mt-1 truncate text-xs text-muted-foreground">
            {getGroupTypeLabel(group.groupType)}
          </span>
        </button>
      </ContextMenuTrigger>
      <ResourceContextMenu
        onDelete={onDelete}
        onDetail={onDetail}
        onOpen={onOpen}
        onRename={onRename}
        openLabel="打开素材组"
      />
    </ContextMenu>
  );
}

function AssetTile({
  asset,
  onDelete,
  onDetail,
  onOpen,
  onRename,
  onSelect,
  selected,
}: {
  asset: AssetItem;
  onDelete: () => void;
  onDetail: () => void;
  onOpen: () => void;
  onRename: () => void;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          className={cn(
            "group flex min-w-0 cursor-default flex-col items-center rounded-[var(--ui-radius)] border-border px-4 py-5 text-center hover:bg-muted [border-width:var(--ui-border-width)]",
            selected && "bg-secondary ring-2 ring-ring/40"
          )}
          onClick={onSelect}
          onContextMenu={onSelect}
          onDoubleClick={onOpen}
          type="button"
        >
          <AssetPreview
            asset={asset}
            className="mb-4 size-24 border-border text-foreground [border-width:var(--ui-border-width)]"
            iconClassName="size-9"
          />
          <span className="line-clamp-2 min-h-10 max-w-full text-sm font-bold">
            {asset.name}
          </span>
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {getAssetKindLabel(asset.assetKind)}
            <span aria-hidden="true">/</span>
            {getAssetStatusLabel(asset.status)}
          </span>
        </button>
      </ContextMenuTrigger>
      <ResourceContextMenu
        onDelete={onDelete}
        onDetail={onDetail}
        onOpen={onOpen}
        onRename={onRename}
        openLabel="打开素材 URL"
      />
    </ContextMenu>
  );
}

function AssetsListView({
  assets,
  groups,
  onDelete,
  onDetail,
  onOpenAsset,
  onRename,
  onScopeChange,
  onSelect,
  selection,
}: {
  assets: AssetItem[];
  groups: AssetGroupItem[];
  onDelete: () => void;
  onDetail: () => void;
  onOpenAsset: (asset: AssetItem) => void;
  onRename: () => void;
  onScopeChange: (scope: AssetScope) => void;
  onSelect: (selection: AssetSelection) => void;
  selection: AssetSelection;
}) {
  const listGridClass =
    "grid w-full min-w-0 grid-cols-[minmax(0,1fr)_72px_36px] gap-2 md:grid-cols-[minmax(0,1fr)_96px_96px_128px_36px] lg:grid-cols-[minmax(0,1fr)_110px_110px_140px_40px]";

  return (
    <div className="min-w-0 max-w-full overflow-hidden p-5">
      <div className="min-w-0 max-w-full overflow-hidden rounded-[var(--ui-radius)] border-border bg-card [border-width:var(--ui-border-width)]">
        <div
          className={cn(
            listGridClass,
            "border-b border-border px-3 py-2 text-xs font-bold text-muted-foreground"
          )}
        >
          <span className="min-w-0 truncate">名称</span>
          <span className="min-w-0 truncate">类型</span>
          <span className="hidden min-w-0 truncate md:block">状态</span>
          <span className="hidden min-w-0 truncate md:block">更新时间</span>
          <span />
        </div>
        {groups.map((group) => (
          <ContextMenu key={group.id}>
            <ContextMenuTrigger asChild>
              <button
                className={cn(
                  listGridClass,
                  "items-center border-b border-border px-3 py-2 text-left hover:bg-muted",
                  selection?.type === "group" &&
                    selection.id === group.id &&
                    "bg-secondary"
                )}
                onClick={() => onSelect({ type: "group", id: group.id })}
                onContextMenu={() =>
                  onSelect({ type: "group", id: group.id })
                }
                onDoubleClick={() =>
                  onScopeChange({ type: "group", groupId: group.id })
                }
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Folder className="size-4 shrink-0 text-blue-500" />
                  <span className="truncate font-bold">{group.name}</span>
                </span>
                <span className="min-w-0 truncate text-sm">
                  {getGroupTypeLabel(group.groupType)}
                </span>
                <span className="hidden min-w-0 md:block">
                  <Badge className="max-w-full truncate" variant="outline">
                    文件夹
                  </Badge>
                </span>
                <span className="hidden min-w-0 truncate text-sm text-muted-foreground md:block">
                  {formatAssetTime(group.updateTime)}
                </span>
                <MoreHorizontal className="size-4 justify-self-end text-muted-foreground" />
              </button>
            </ContextMenuTrigger>
            <ResourceContextMenu
              onDelete={onDelete}
              onDetail={onDetail}
              onOpen={() => onScopeChange({ type: "group", groupId: group.id })}
              onRename={onRename}
              openLabel="打开素材组"
            />
          </ContextMenu>
        ))}
        {assets.map((asset) => (
          <ContextMenu key={asset.id}>
            <ContextMenuTrigger asChild>
              <button
                className={cn(
                  listGridClass,
                  "items-center border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted",
                  selection?.type === "asset" &&
                    selection.id === asset.id &&
                    "bg-secondary"
                )}
                onClick={() => onSelect({ type: "asset", id: asset.id })}
                onContextMenu={() =>
                  onSelect({ type: "asset", id: asset.id })
                }
                onDoubleClick={() => onOpenAsset(asset)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <AssetPreview
                    asset={asset}
                    className="size-9 border-border [border-width:var(--ui-border-width)]"
                    iconClassName="size-4"
                  />
                  <span className="truncate font-bold">{asset.name}</span>
                </span>
                <span className="min-w-0 truncate text-sm">
                  {getAssetKindLabel(asset.assetKind)}
                </span>
                <span className="hidden min-w-0 md:block">
                  <StatusBadge asset={asset} />
                </span>
                <span className="hidden min-w-0 truncate text-sm text-muted-foreground md:block">
                  {formatAssetTime(asset.updateTime)}
                </span>
                <MoreHorizontal className="size-4 justify-self-end text-muted-foreground" />
              </button>
            </ContextMenuTrigger>
            <ResourceContextMenu
              onDelete={onDelete}
              onDetail={onDetail}
              onOpen={() => onOpenAsset(asset)}
              onRename={onRename}
              openLabel="打开素材 URL"
            />
          </ContextMenu>
        ))}
      </div>
    </div>
  );
}

function ResourceContextMenu({
  onDelete,
  onDetail,
  onOpen,
  onRename,
  openLabel,
}: {
  onDelete: () => void;
  onDetail: () => void;
  onOpen: () => void;
  onRename: () => void;
  openLabel: string;
}) {
  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem onClick={onOpen}>
        <ExternalLink className="size-4" />
        {openLabel}
      </ContextMenuItem>
      <ContextMenuItem onClick={onDetail}>
        <Info className="size-4" />
        获取详情
      </ContextMenuItem>
      <ContextMenuItem onClick={onRename}>
        <Wand2 className="size-4" />
        重命名
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onDelete} variant="destructive">
        <Trash2 className="size-4" />
        删除
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

function StatusBadge({ asset }: { asset: AssetItem }) {
  return (
    <Badge
      className="w-fit"
      variant={
        asset.status === "Active"
          ? "success"
          : asset.status === "Failed"
            ? "destructive"
            : "warning"
      }
    >
      {getAssetStatusLabel(asset.status)}
    </Badge>
  );
}
