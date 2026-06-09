"use client";

import { Copy, ExternalLink } from "lucide-react";

import {
  buildAssetCopyText,
  formatAssetTime,
  formatFileSize,
  getAssetTitle,
  getDownloadStatusLabel,
  getDownloadStatusVariant,
  getPlayableVideoUrl,
} from "@/components/generated-content-assets/asset-formatting";
import { copyText } from "@/components/generated-content-assets/clipboard";
import type { GeneratedContentAssetView } from "@/components/generated-content-assets/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function GeneratedContentAssetCard({
  asset,
  copied,
  onCopied,
}: {
  asset: GeneratedContentAssetView;
  copied: boolean;
  onCopied: (assetId: string) => void;
}) {
  const playableVideoUrl = getPlayableVideoUrl(asset);

  async function handleCopy() {
    await copyText(buildAssetCopyText(asset));
    onCopied(asset.id);
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-[calc(var(--ui-radius)*1.2)] border-border bg-card [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
      <div className="aspect-video bg-[oklch(0.17_0.012_250)]">
        {playableVideoUrl ? (
          <video
            className="h-full w-full object-cover"
            controls
            preload="metadata"
            src={playableVideoUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            没有可播放的视频地址
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 truncate text-base font-bold">
              {getAssetTitle(asset)}
            </h2>
            <Badge variant={getDownloadStatusVariant(asset.downloadStatus)}>
              {getDownloadStatusLabel(asset.downloadStatus)}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatAssetTime(asset.providerCreatedAt ?? asset.createdAt)}
          </div>
        </div>

        {asset.prompt ? (
          <p className="line-clamp-3 text-sm leading-6 text-foreground">
            {asset.prompt}
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            List/Retrieve 文档未承诺返回原始 prompt；这里没有匹配到本地会话上下文。
          </p>
        )}

        <dl className="grid gap-2 text-xs">
          <AssetField label="TaskId" value={asset.taskId} />
          <AssetField label="Model" value={asset.model} />
          <AssetField label="规格" value={getSpecText(asset)} />
          <AssetField label="本地文件" value={asset.localVideoPath} />
          <AssetField label="远端 URL" value={asset.remoteVideoUrl} />
          <AssetField label="文件大小" value={formatFileSize(asset.fileSizeBytes)} />
        </dl>

        {asset.downloadError ? (
          <div className="rounded-[var(--ui-radius)] border-border bg-destructive px-3 py-2 text-xs leading-5 text-destructive-foreground [border-width:var(--ui-border-width)]">
            {asset.downloadError}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void handleCopy()} size="sm" variant="outline">
            <Copy className="mr-2 size-4" />
            {copied ? "已复制" : "复制完整信息"}
          </Button>
          {playableVideoUrl ? (
            <Button asChild size="sm" variant="outline">
              <a href={playableVideoUrl} rel="noreferrer" target="_blank">
                <ExternalLink className="mr-2 size-4" />
                打开
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AssetField({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-mono">{value}</dd>
    </div>
  );
}

function getSpecText(asset: GeneratedContentAssetView) {
  return [asset.ratio, asset.duration ? `${asset.duration}s` : undefined, asset.resolution]
    .filter(Boolean)
    .join(" / ");
}
