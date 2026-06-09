"use client";

import * as React from "react";
import { RefreshCcw, Search, Upload } from "lucide-react";

import {
  initialAssets,
  realPersonProfile,
  type AssetStatus,
  type AssetType,
  type StudioAsset,
} from "@/lib/studio-fixtures";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AssetCard,
  CodeBlock,
  DataLine,
  FieldLabel,
  inputClassName,
} from "@/components/workspace-primitives";

type AssetKindOption = "Image" | "Video" | "Audio";

const statusTabs: Array<{ value: AssetStatus | "All"; label: string }> = [
  { value: "All", label: "全部" },
  { value: "Active", label: "可用" },
  { value: "Processing", label: "处理中" },
  { value: "Failed", label: "未通过" },
];

export function AssetsWorkspace() {
  const [assets, setAssets] = React.useState<StudioAsset[]>(initialAssets);
  const [statusFilter, setStatusFilter] = React.useState<AssetStatus | "All">(
    "All"
  );
  const [assetKind, setAssetKind] = React.useState<AssetKindOption>("Image");
  const [sourceUrl, setSourceUrl] = React.useState(
    "https://cdn.example.com/uploads/new-portrait.png"
  );
  const [assetName, setAssetName] = React.useState("新素材");
  const [queryAssetId, setQueryAssetId] = React.useState(
    initialAssets[0]?.assetId ?? ""
  );
  const [apiResult, setApiResult] = React.useState<unknown>({
    message: "上传或查询素材后显示 API 返回。",
  });
  const [busy, setBusy] = React.useState(false);

  const filteredAssets = assets.filter((asset) =>
    statusFilter === "All" ? true : asset.status === statusFilter
  );
  const activeCount = assets.filter((asset) => asset.status === "Active").length;
  const blockedCount = assets.length - activeCount;

  async function createAsset() {
    setBusy(true);
    const temporaryAsset: StudioAsset = {
      id: `asset-local-${Date.now()}`,
      name: assetName,
      type: assetKind as AssetType,
      use: assetKind === "Audio" ? "音乐" : "参考素材",
      status: "Processing",
      assetId: `asset-local-${Date.now()}`,
      groupId: realPersonProfile.groupId,
      source: sourceUrl,
    };

    setAssets((current) => [temporaryAsset, ...current]);

    try {
      const response = await fetch("/api/byteplus/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetKind,
          name: assetName,
          fileName: assetName,
          url: sourceUrl,
          groupId: realPersonProfile.groupId,
          purpose: temporaryAsset.use,
        }),
      });
      const data = await response.json().catch(() => ({}));

      setApiResult(data);

      if (!response.ok) {
        throw new Error(data.message ?? "素材入库失败。");
      }

      const assetId = data.asset?.assetId ?? temporaryAsset.assetId;
      setAssets((current) =>
        current.map((asset) =>
          asset.id === temporaryAsset.id ? { ...asset, assetId } : asset
        )
      );

      window.setTimeout(() => {
        setAssets((current) =>
          current.map((asset) =>
            asset.id === temporaryAsset.id
              ? { ...asset, status: "Active" }
              : asset
          )
        );
      }, 1200);
    } catch (error) {
      setAssets((current) =>
        current.map((asset) =>
          asset.id === temporaryAsset.id
            ? {
                ...asset,
                status: "Failed",
                failureReason:
                  error instanceof Error ? error.message : "素材入库失败。",
              }
            : asset
        )
      );
      setApiResult({
        message: error instanceof Error ? error.message : "素材入库失败。",
      });
    } finally {
      setBusy(false);
    }
  }

  async function queryAsset() {
    setBusy(true);

    try {
      const response = await fetch(
        `/api/byteplus/assets?asset_id=${encodeURIComponent(queryAssetId)}`
      );
      const data = await response.json().catch(() => ({}));

      setApiResult(data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Metric label="总素材" value={String(assets.length)} />
          <Metric label="可用于生成" value={String(activeCount)} />
          <Metric label="待处理/未通过" value={String(blockedCount)} />
        </div>

        <div className="rounded-[var(--ui-radius)] border-border bg-card p-5 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow)]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold">素材库</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                只让 Active 素材进入首页生成流程。
              </p>
            </div>
            <Tabs
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as AssetStatus | "All")
              }
            >
              <TabsList>
                {statusTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filteredAssets.map((asset) => (
              <AssetCard asset={asset} key={asset.id} />
            ))}
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <div className="rounded-[var(--ui-radius)] border-border bg-card p-5 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">新增素材</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                真实模式下 URL 必须能被 BytePlus 访问。
              </p>
            </div>
            <Badge variant="outline">{assetKind}</Badge>
          </div>

          <div className="grid gap-4">
            <div>
              <FieldLabel label="素材类型" />
              <select
                className={`${inputClassName} mt-2`}
                value={assetKind}
                onChange={(event) =>
                  setAssetKind(event.target.value as AssetKindOption)
                }
              >
                <option value="Image">Image</option>
                <option value="Video">Video</option>
                <option value="Audio">Audio</option>
              </select>
            </div>
            <div>
              <FieldLabel label="名称" />
              <input
                className={`${inputClassName} mt-2`}
                value={assetName}
                onChange={(event) => setAssetName(event.target.value)}
              />
            </div>
            <div>
              <FieldLabel label="素材 URL" />
              <input
                className={`${inputClassName} mt-2`}
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
              />
            </div>
            <Button disabled={busy} onClick={createAsset}>
              <Upload className="size-4" />
              入库素材
            </Button>
          </div>
        </div>

        <div className="rounded-[var(--ui-radius)] border-border bg-card p-5 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
          <h2 className="text-base font-bold">查询素材</h2>
          <div className="mt-4 grid gap-3">
            <input
              className={inputClassName}
              value={queryAssetId}
              onChange={(event) => setQueryAssetId(event.target.value)}
            />
            <Button disabled={busy || queryAssetId.length === 0} onClick={queryAsset}>
              <Search className="size-4" />
              查询状态
            </Button>
          </div>
        </div>

        <div className="rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold">
              <RefreshCcw className="size-4" />
              API 返回
            </div>
            {busy ? <Badge variant="warning">请求中</Badge> : null}
          </div>
          <CodeBlock value={JSON.stringify(apiResult, null, 2)} />
        </div>

        <div className="rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
          <div className="mb-3 text-sm font-bold">档案绑定</div>
          <div className="space-y-2">
            <DataLine label="GroupId" value={realPersonProfile.groupId} />
            <DataLine label="Project" value={realPersonProfile.projectName} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
      <div className="font-mono text-2xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
