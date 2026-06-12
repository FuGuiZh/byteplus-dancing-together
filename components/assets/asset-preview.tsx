"use client";

import * as React from "react";
import { AudioLines, FileImage, FileVideo, Music } from "lucide-react";

import type { AssetItem } from "@/components/assets/assets-types";
import { cn } from "@/lib/utils";

export function AssetPreview({
  asset,
  className,
  iconClassName,
  imageClassName,
  videoControls = false,
}: {
  asset: Pick<AssetItem, "assetKind" | "name" | "url">;
  className?: string;
  iconClassName?: string;
  imageClassName?: string;
  videoControls?: boolean;
}) {
  const [failedUrl, setFailedUrl] = React.useState<string | null>(null);
  const canPreviewImage =
    asset.assetKind === "Image" && asset.url && failedUrl !== asset.url;
  const canPreviewVideo =
    asset.assetKind === "Video" && asset.url && failedUrl !== asset.url;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--ui-radius)] bg-muted text-muted-foreground",
        className
      )}
    >
      {canPreviewImage ? (
        // BytePlus returns short-lived external URLs from changing hosts, so
        // next/image remotePatterns would be brittle here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={asset.name || "图片素材预览"}
          className={cn("h-full w-full object-cover", imageClassName)}
          loading="lazy"
          onError={() => setFailedUrl(asset.url)}
          referrerPolicy="no-referrer"
          src={asset.url}
        />
      ) : canPreviewVideo ? (
        <video
          aria-label={asset.name || "视频素材预览"}
          className={cn("h-full w-full object-cover", imageClassName)}
          controls={videoControls}
          muted={!videoControls}
          onError={() => setFailedUrl(asset.url)}
          playsInline
          preload="metadata"
          src={asset.url}
        />
      ) : (
        <AssetFallbackIcon
          assetKind={asset.assetKind}
          className={cn("size-8", iconClassName)}
        />
      )}
    </div>
  );
}

function AssetFallbackIcon({
  assetKind,
  className,
}: {
  assetKind: string;
  className?: string;
}) {
  if (assetKind === "Video") {
    return <FileVideo className={className} />;
  }

  if (assetKind === "Audio") {
    return <Music className={className} />;
  }

  if (assetKind === "Image") {
    return <FileImage className={className} />;
  }

  return <AudioLines className={className} />;
}
