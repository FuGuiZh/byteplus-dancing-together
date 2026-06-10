"use client";

import {
  Database,
  ExternalLink,
  FileInput,
  FolderPlus,
  ImageUp,
  Info,
  Link2,
  Trash2,
  Wand2,
} from "lucide-react";

import { AssetPreview } from "@/components/assets/asset-preview";
import { AssetsCodePanel } from "@/components/assets/assets-code-panel";
import type {
  ApiSnapshot,
  AssetGroupItem,
  AssetItem,
  AssetKind,
} from "@/components/assets/assets-types";
import {
  assetKindOptions,
  buildAssetUri,
  copyAssetInfo,
  formatAssetTime,
  getAssetKindLabel,
  getAssetStatusLabel,
  getGroupTypeLabel,
} from "@/components/assets/assets-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface AssetGroupFormState {
  name: string;
  description: string;
}

export interface AssetCreateFormState {
  assetKind: AssetKind;
  groupId: string;
  name: string;
  url: string;
  moderationStrategy: "Default" | "Skip";
}

export function AssetsInspector({
  apiSnapshot,
  assetForm,
  busy,
  groupForm,
  groups,
  onAssetFormChange,
  onCreateAsset,
  onCreateGroup,
  onDeleteSelection,
  onFetchDetail,
  onGroupFormChange,
  onUploadImages,
  onOpenAsset,
  onRenameSelection,
  selectedAsset,
  selectedGroup,
}: {
  apiSnapshot: ApiSnapshot | null;
  assetForm: AssetCreateFormState;
  busy: boolean;
  groupForm: AssetGroupFormState;
  groups: AssetGroupItem[];
  onAssetFormChange: (next: AssetCreateFormState) => void;
  onCreateAsset: () => void;
  onCreateGroup: () => void;
  onDeleteSelection: () => void;
  onFetchDetail: () => void;
  onGroupFormChange: (next: AssetGroupFormState) => void;
  onUploadImages: () => void;
  onOpenAsset: (asset: AssetItem) => void;
  onRenameSelection: () => void;
  selectedAsset: AssetItem | null;
  selectedGroup: AssetGroupItem | null;
}) {
  const hasSelection = Boolean(selectedAsset || selectedGroup);

  return (
    <ScrollArea className="h-full w-full min-w-0 max-w-full">
      <div className="grid min-w-0 max-w-full gap-4 p-4 [overflow-wrap:anywhere]">
        <section className="min-w-0 max-w-full overflow-hidden rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold">所选资源</div>
              <div className="mt-1 text-xs text-muted-foreground">
                详情接口返回的 URL 通常只有短期有效。
              </div>
            </div>
            {hasSelection ? <Badge variant="outline">已选择</Badge> : null}
          </div>

          {selectedGroup ? <GroupDetail group={selectedGroup} /> : null}
          {selectedAsset ? (
            <AssetDetail asset={selectedAsset} onOpenAsset={onOpenAsset} />
          ) : null}
          {!hasSelection ? (
            <div className="rounded-[var(--ui-radius)] bg-muted/40 p-4 text-sm text-muted-foreground">
              在左侧资源区选择一个素材组或素材后，这里会显示 API 字段和快捷操作。
            </div>
          ) : null}

          {hasSelection ? (
            <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <Button disabled={busy} onClick={onFetchDetail} size="sm" type="button">
                <Info className="size-4" />
                详情
              </Button>
              <Button
                disabled={busy}
                onClick={onRenameSelection}
                size="sm"
                type="button"
                variant="outline"
              >
                <Wand2 className="size-4" />
                重命名
              </Button>
              <Button
                className="col-span-2"
                disabled={busy}
                onClick={onDeleteSelection}
                size="sm"
                type="button"
                variant="destructive"
              >
                <Trash2 className="size-4" />
                删除选中资源
              </Button>
            </div>
          ) : null}
        </section>

        <section className="min-w-0 max-w-full overflow-hidden rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <ImageUp className="size-4" />
            本地图片入库
          </div>
          <div className="grid gap-3">
            <Select
              onValueChange={(value) =>
                onAssetFormChange({ ...assetForm, groupId: value })
              }
              value={assetForm.groupId}
            >
              <SelectTrigger className="w-full min-w-0 max-w-full">
                <SelectValue placeholder="选择素材组" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              onValueChange={(value) =>
                onAssetFormChange({
                  ...assetForm,
                  moderationStrategy: value as "Default" | "Skip",
                })
              }
              value={assetForm.moderationStrategy}
            >
              <SelectTrigger className="w-full min-w-0 max-w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Default">默认审核</SelectItem>
                <SelectItem value="Skip">跳过审核</SelectItem>
              </SelectContent>
            </Select>
            <Button
              disabled={busy || (!assetForm.groupId && !selectedGroup)}
              onClick={onUploadImages}
              type="button"
              variant="outline"
            >
              <ImageUp className="size-4" />
              选择图片并提交
            </Button>
            <p className="break-words text-xs leading-5 text-muted-foreground">
              文件会先保存到本地用户目录，再通过 APP_PUBLIC_URL 暴露给 BytePlus
              拉取并执行 CreateAsset；localhost 地址通常不能被公网服务访问。
            </p>
          </div>
        </section>

        <section className="min-w-0 max-w-full overflow-hidden rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <FolderPlus className="size-4" />
            新建 AIGC 素材组
          </div>
          <div className="grid gap-3">
            <Input
              className="min-w-0 max-w-full"
              onChange={(event) =>
                onGroupFormChange({ ...groupForm, name: event.target.value })
              }
              placeholder="素材组名称"
              value={groupForm.name}
            />
            <Textarea
              className="min-h-20 min-w-0 max-w-full"
              onChange={(event) =>
                onGroupFormChange({
                  ...groupForm,
                  description: event.target.value,
                })
              }
              placeholder="描述，可留空"
              value={groupForm.description}
            />
            <Button disabled={busy || !groupForm.name.trim()} onClick={onCreateGroup}>
              <FolderPlus className="size-4" />
              创建素材组
            </Button>
            <p className="break-words text-xs leading-5 text-muted-foreground">
              文档里 CreateAssetGroup 当前只支持 GroupType=AIGC；LivenessFace
              通常由真人认证流程生成。
            </p>
          </div>
        </section>

        <section className="min-w-0 max-w-full overflow-hidden rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)]">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold">
            <FileInput className="size-4" />
            URL 入库素材
          </div>
          <div className="grid gap-3">
            <Select
              onValueChange={(value) =>
                onAssetFormChange({ ...assetForm, groupId: value })
              }
              value={assetForm.groupId}
            >
              <SelectTrigger className="w-full min-w-0 max-w-full">
                <SelectValue placeholder="选择素材组" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid min-w-0 grid-cols-1 gap-2 min-[1680px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Select
                onValueChange={(value) =>
                  onAssetFormChange({
                    ...assetForm,
                    assetKind: value as AssetKind,
                  })
                }
                value={assetForm.assetKind}
              >
                <SelectTrigger className="w-full min-w-0 max-w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetKindOptions.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {getAssetKindLabel(kind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                onValueChange={(value) =>
                  onAssetFormChange({
                    ...assetForm,
                    moderationStrategy: value as "Default" | "Skip",
                  })
                }
                value={assetForm.moderationStrategy}
              >
                <SelectTrigger className="w-full min-w-0 max-w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Default">默认审核</SelectItem>
                  <SelectItem value="Skip">跳过审核</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              className="min-w-0 max-w-full"
              onChange={(event) =>
                onAssetFormChange({ ...assetForm, name: event.target.value })
              }
              placeholder="素材名称"
              value={assetForm.name}
            />
            <Input
              className="min-w-0 max-w-full"
              onChange={(event) =>
                onAssetFormChange({ ...assetForm, url: event.target.value })
              }
              placeholder="https://..."
              value={assetForm.url}
            />
            <Button
              disabled={
                busy ||
                !assetForm.groupId ||
                !assetForm.name.trim() ||
                !assetForm.url.trim()
              }
              onClick={onCreateAsset}
            >
              <Link2 className="size-4" />
              CreateAsset
            </Button>
            <p className="break-words text-xs leading-5 text-muted-foreground">
              文档 CreateAsset 只接受 BytePlus 可访问 URL；入库是异步的，创建后应查询
              GetAsset 直到状态变为 Active 或 Failed。
            </p>
          </div>
        </section>

        <AssetsCodePanel snapshot={apiSnapshot} />
      </div>
    </ScrollArea>
  );
}

function GroupDetail({ group }: { group: AssetGroupItem }) {
  return (
    <div className="space-y-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ui-radius)] bg-blue-500 text-white">
          <Database className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{group.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {getGroupTypeLabel(group.groupType)}
          </div>
        </div>
      </div>
      <DetailLine label="GroupId" value={group.id} />
      <DetailLine label="Project" value={group.projectName || "-"} />
      <DetailLine label="创建时间" value={formatAssetTime(group.createTime)} />
      <DetailLine label="更新时间" value={formatAssetTime(group.updateTime)} />
      {group.description ? (
        <p className="break-words rounded-[var(--ui-radius)] bg-muted/40 p-3 text-xs leading-5">
          {group.description}
        </p>
      ) : null}
    </div>
  );
}

function AssetDetail({
  asset,
  onOpenAsset,
}: {
  asset: AssetItem;
  onOpenAsset: (asset: AssetItem) => void;
}) {
  return (
    <div className="space-y-3">
      <AssetPreview
        asset={asset}
        className="aspect-video w-full border-border [border-width:var(--ui-border-width)]"
        iconClassName="size-10"
      />
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{asset.name}</div>
          <div className="mt-1 flex gap-2">
            <Badge variant="outline">{getAssetKindLabel(asset.assetKind)}</Badge>
            <Badge
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
          </div>
        </div>
        {asset.url ? (
          <Button
            aria-label="打开素材 URL"
            onClick={() => onOpenAsset(asset)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ExternalLink className="size-4" />
          </Button>
        ) : null}
      </div>
      <DetailLine label="AssetId" value={asset.id} />
      <DetailLine label="asset URI" value={buildAssetUri(asset.id)} />
      <DetailLine label="GroupId" value={asset.groupId || "-"} />
      <DetailLine label="审核策略" value={asset.moderationStrategy} />
      <DetailLine label="创建时间" value={formatAssetTime(asset.createTime)} />
      <DetailLine label="更新时间" value={formatAssetTime(asset.updateTime)} />
      {asset.error ? (
        <div className="rounded-[var(--ui-radius)] bg-destructive p-3 text-xs leading-5 text-destructive-foreground">
          {asset.error}
        </div>
      ) : null}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <Button
          onClick={() => {
            void navigator.clipboard.writeText(buildAssetUri(asset.id));
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          复制 URI
        </Button>
        <Button
          onClick={() => {
            void navigator.clipboard.writeText(copyAssetInfo(asset));
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          复制字段
        </Button>
      </div>
    </div>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[78px_minmax(0,1fr)] gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <code className="truncate font-mono text-[11px]" title={value}>
        {value}
      </code>
    </div>
  );
}
