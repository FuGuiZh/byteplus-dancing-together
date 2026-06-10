export type GeneratedContentAssetDownloadStatus =
  | "pending"
  | "downloaded"
  | "failed"
  | "remote_missing";

export type GeneratedContentAssetView = {
  id: string;
  taskId: string;
  createdAt: number;
  updatedAt: number;
  source: "modelark-task-list" | "text-to-video-session";
  sourceSessionId?: string;
  sessionTitle?: string;
  prompt?: string;
  request?: unknown;
  model?: string;
  status?: string;
  error?: unknown;
  usage?: unknown;
  ratio?: string;
  duration?: number;
  resolution?: string;
  generateAudio?: boolean;
  seed?: number;
  providerCreatedAt?: number;
  providerUpdatedAt?: number;
  remoteVideoUrl?: string;
  remoteLastFrameUrl?: string;
  localVideoPath?: string;
  localVideoUrl?: string;
  downloadStatus: GeneratedContentAssetDownloadStatus;
  downloadedAt?: number;
  fileSizeBytes?: number;
  downloadError?: string;
  provider?: unknown;
};

export type GeneratedVideoTaskListItem = {
  id: string;
  status?: string;
  model?: string;
  createdAt?: number;
  updatedAt?: number;
  ratio?: string;
  duration?: number;
  resolution?: string;
  hasVideoUrl: boolean;
  error?: unknown;
  usage?: unknown;
};

export type GeneratedVideoTaskList = {
  total: number | null;
  loaded: number;
  statusFilter?: string;
  pageSize?: number;
  maxPages?: number;
  items: GeneratedVideoTaskListItem[];
};

export type GeneratedContentAssetsResponse = {
  assets: GeneratedContentAssetView[];
  storage?: {
    directory?: string;
    files?: {
      generatedContentAssets?: string;
    };
    directories?: {
      generatedContentVideos?: string;
    };
  };
  sync?: {
    mode?: string;
    summary?: {
      startedAt: string;
      completedAt: string;
      receivedTasks: number;
      importedAssets: number;
      downloadedAssets: number;
      failedDownloads: number;
      remoteMissing: number;
      pendingDownloads: number;
      skippedTasks: number;
      downloadLimit: number;
      downloadTimeoutMs: number;
    };
    options?: {
      pageSize?: number;
      maxPages?: number;
      downloadLimit?: number;
      downloadTimeoutMs?: number;
    };
    taskList?: GeneratedVideoTaskList;
    provider?: unknown;
  };
};
