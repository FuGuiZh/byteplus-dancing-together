import type { GeneratedContentAssetView } from "@/components/generated-content-assets/types";

export function formatAssetTime(value: number | undefined) {
  if (!value) {
    return "未知时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatFileSize(bytes: number | undefined) {
  if (!bytes || bytes <= 0) {
    return "未知大小";
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function getAssetTitle(asset: GeneratedContentAssetView) {
  const promptTitle = asset.prompt?.replace(/\s+/g, " ").trim();

  if (asset.sessionTitle && asset.sessionTitle !== "新视频生成") {
    return asset.sessionTitle;
  }

  if (promptTitle) {
    return promptTitle.length > 34 ? `${promptTitle.slice(0, 34)}...` : promptTitle;
  }

  return asset.taskId;
}

export function getDownloadStatusLabel(status: GeneratedContentAssetView["downloadStatus"]) {
  if (status === "downloaded") {
    return "已保存本地";
  }

  if (status === "failed") {
    return "下载失败";
  }

  if (status === "remote_missing") {
    return "远端缺失";
  }

  return "待下载";
}

export function getDownloadStatusVariant(
  status: GeneratedContentAssetView["downloadStatus"]
) {
  if (status === "downloaded") {
    return "success" as const;
  }

  if (status === "failed" || status === "remote_missing") {
    return "destructive" as const;
  }

  return "warning" as const;
}

export function getPlayableVideoUrl(asset: GeneratedContentAssetView) {
  return asset.localVideoUrl ?? asset.remoteVideoUrl;
}

export function buildAssetCopyText(asset: GeneratedContentAssetView) {
  return [
    `Title: ${getAssetTitle(asset)}`,
    `TaskId: ${asset.taskId}`,
    asset.status ? `Status: ${asset.status}` : undefined,
    asset.model ? `Model: ${asset.model}` : undefined,
    asset.resolution ? `Resolution: ${asset.resolution}` : undefined,
    asset.ratio ? `Ratio: ${asset.ratio}` : undefined,
    asset.duration ? `Duration: ${asset.duration}` : undefined,
    `DownloadStatus: ${asset.downloadStatus}`,
    asset.fileSizeBytes ? `FileSize: ${formatFileSize(asset.fileSizeBytes)}` : undefined,
    asset.localVideoPath ? `LocalVideoPath: ${asset.localVideoPath}` : undefined,
    asset.localVideoUrl ? `LocalVideoUrl: ${asset.localVideoUrl}` : undefined,
    asset.remoteVideoUrl ? `RemoteVideoUrl: ${asset.remoteVideoUrl}` : undefined,
    asset.remoteLastFrameUrl
      ? `RemoteLastFrameUrl: ${asset.remoteLastFrameUrl}`
      : undefined,
    asset.prompt ? `Prompt: ${asset.prompt}` : undefined,
    asset.downloadError ? `DownloadError: ${asset.downloadError}` : undefined,
    asset.request ? `Request JSON:\n${JSON.stringify(asset.request, null, 2)}` : undefined,
    asset.provider ? `Provider JSON:\n${JSON.stringify(asset.provider, null, 2)}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");
}
