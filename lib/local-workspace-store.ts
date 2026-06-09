import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, join } from "node:path";

import type {
  ConversationMessage,
  TextToVideoSessionRecord,
} from "@/components/text-to-video/types";
import { getUserDataDirectory, getUserDataFilePath } from "@/lib/user-data-directory";

export type TextToVideoSessionState = {
  version: 1;
  activeSessionId: string;
  sessions: TextToVideoSessionRecord[];
};

export type GeneratedContentAssetDownloadStatus =
  | "pending"
  | "downloaded"
  | "failed"
  | "remote_missing";

export type GeneratedContentAsset = {
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

export type GeneratedContentAssetState = {
  version: 1;
  assets: GeneratedContentAsset[];
};

export type GeneratedContentAssetSyncSummary = {
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

export type GeneratedContentAssetSyncOptions = {
  downloadLimit?: number;
  downloadTimeoutMs?: number;
};

const legacySessionsFileName = "text-to-video-sessions.json";
const sessionsDirectoryName = "text-to-video-sessions";
const sessionFilesDirectoryName = "text-to-video-sessions/sessions";
const sessionIndexFileName = "text-to-video-sessions/index.json";
const generatedAssetsFileName = "generated-content-assets.json";
const generatedVideosDirectoryName = "generated-content-assets/videos";

function createEmptySessionState(): TextToVideoSessionState {
  return {
    version: 1,
    activeSessionId: "",
    sessions: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isConversationMessage(value: unknown): value is ConversationMessage {
  return isRecord(value) && typeof value.type === "string";
}

function isSessionRecord(value: unknown): value is TextToVideoSessionRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every(isConversationMessage)
  );
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "boolean" ? value : undefined;
}

function orderSessionsByCreatedAt(sessions: TextToVideoSessionRecord[]) {
  return [...sessions].sort((first, second) => second.createdAt - first.createdAt);
}

function hasSessionContent(session: TextToVideoSessionRecord) {
  return (
    session.messages.length > 0 ||
    Boolean(session.taskId) ||
    session.taskStatus !== "idle"
  );
}

function orderAssetsByCreatedAt(assets: GeneratedContentAsset[]) {
  return [...assets].sort(
    (first, second) =>
      (second.providerCreatedAt ?? second.createdAt) -
      (first.providerCreatedAt ?? first.createdAt)
  );
}

function normalizeSessionState(value: unknown): TextToVideoSessionState {
  if (!isRecord(value) || !Array.isArray(value.sessions)) {
    return createEmptySessionState();
  }

  const now = Date.now();
  const sessions = orderSessionsByCreatedAt(
    value.sessions
      .filter(isSessionRecord)
      .map((session) => ({
        ...session,
        createdAt: Number(session.createdAt) || now,
        updatedAt: Number(session.updatedAt) || now,
        titleCustomized: Boolean(session.titleCustomized),
        taskStatus: session.taskStatus ?? "idle",
        taskId: session.taskId ?? null,
        pollIntervalMs: session.pollIntervalMs ?? 5000,
      }))
      .filter(hasSessionContent)
  );

  if (sessions.length === 0) {
    return createEmptySessionState();
  }

  const activeSessionId =
    typeof value.activeSessionId === "string" &&
    sessions.some((session) => session.id === value.activeSessionId)
      ? value.activeSessionId
      : sessions[0].id;

  return {
    version: 1,
    activeSessionId,
    sessions,
  };
}

function isDownloadStatus(
  value: unknown
): value is GeneratedContentAssetDownloadStatus {
  return (
    value === "pending" ||
    value === "downloaded" ||
    value === "failed" ||
    value === "remote_missing"
  );
}

function getLocalAssetVideoUrl(assetId: string) {
  return `/api/local/generated-content-assets/${encodeURIComponent(assetId)}/video`;
}

function hydrateGeneratedAsset(asset: GeneratedContentAsset) {
  return {
    ...asset,
    localVideoUrl:
      asset.downloadStatus === "downloaded" && asset.localVideoPath
        ? getLocalAssetVideoUrl(asset.id)
        : undefined,
  };
}

function normalizeGeneratedAsset(value: unknown): GeneratedContentAsset | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  const legacyVideoUrl = readString(value, "videoUrl");
  const remoteVideoUrl = readString(value, "remoteVideoUrl") ?? legacyVideoUrl;
  const taskId =
    readString(value, "taskId") ??
    value.id.replace(/^seedance-task-/, "").replace(/^seedance-video-/, "");

  if (!taskId) {
    return null;
  }

  const localVideoPath = readString(value, "localVideoPath");
  const downloadStatus = isDownloadStatus(value.downloadStatus)
    ? value.downloadStatus
    : localVideoPath
      ? "downloaded"
      : remoteVideoUrl
        ? "pending"
        : "remote_missing";

  return hydrateGeneratedAsset({
    id: value.id,
    taskId,
    createdAt: Number(value.createdAt) || Date.now(),
    updatedAt: Number(value.updatedAt) || Date.now(),
    source:
      value.source === "text-to-video-session"
        ? "text-to-video-session"
        : "modelark-task-list",
    sourceSessionId: readString(value, "sourceSessionId"),
    sessionTitle: readString(value, "sessionTitle"),
    prompt: readString(value, "prompt"),
    request: value.request,
    model: readString(value, "model"),
    status: readString(value, "status"),
    error: value.error,
    usage: value.usage,
    ratio: readString(value, "ratio"),
    duration: readNumber(value, "duration"),
    resolution: readString(value, "resolution"),
    generateAudio:
      readBoolean(value, "generateAudio") ?? readBoolean(value, "generate_audio"),
    seed: readNumber(value, "seed"),
    providerCreatedAt: readNumber(value, "providerCreatedAt"),
    providerUpdatedAt: readNumber(value, "providerUpdatedAt"),
    remoteVideoUrl,
    remoteLastFrameUrl:
      readString(value, "remoteLastFrameUrl") ?? readString(value, "lastFrameUrl"),
    localVideoPath,
    downloadStatus,
    downloadedAt: readNumber(value, "downloadedAt"),
    fileSizeBytes: readNumber(value, "fileSizeBytes"),
    downloadError: readString(value, "downloadError"),
    provider: value.provider,
  });
}

function normalizeGeneratedAssetState(value: unknown): GeneratedContentAssetState {
  if (!isRecord(value) || !Array.isArray(value.assets)) {
    return {
      version: 1,
      assets: [],
    };
  }

  return {
    version: 1,
    assets: orderAssetsByCreatedAt(
      value.assets
        .map(normalizeGeneratedAsset)
        .filter((asset): asset is GeneratedContentAsset => Boolean(asset))
    ),
  };
}

async function readJsonFile(filePath: string) {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await mkdir(dirname(filePath), { recursive: true });

  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFilePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempFilePath, filePath);
}

function sanitizeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140);
}

export function getTextToVideoSessionFilePath(sessionId: string) {
  return join(
    getUserDataDirectory(),
    sessionFilesDirectoryName,
    `${sanitizeFilePart(sessionId)}.json`
  );
}

function getTextToVideoSessionIndexFilePath() {
  return getUserDataFilePath(sessionIndexFileName);
}

function getTextToVideoSessionFilesDirectory() {
  return join(getUserDataDirectory(), sessionFilesDirectoryName);
}

function normalizeSessionIndex(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.sessionIds)) {
    return {
      version: 1,
      activeSessionId: "",
      sessionIds: [] as string[],
    };
  }

  return {
    version: 1,
    activeSessionId: readString(value, "activeSessionId") ?? "",
    sessionIds: value.sessionIds.filter(
      (sessionId): sessionId is string =>
        typeof sessionId === "string" && Boolean(sessionId.trim())
    ),
  };
}

function normalizeSessionFile(value: unknown) {
  if (isRecord(value) && isSessionRecord(value.session)) {
    return normalizeSessionState({
      sessions: [value.session],
      activeSessionId: value.session.id,
    }).sessions[0];
  }

  if (isSessionRecord(value)) {
    return normalizeSessionState({
      sessions: [value],
      activeSessionId: value.id,
    }).sessions[0];
  }

  return undefined;
}

async function readSessionFile(sessionId: string) {
  return normalizeSessionFile(
    await readJsonFile(getTextToVideoSessionFilePath(sessionId))
  );
}

async function readLegacySessionState() {
  return normalizeSessionState(
    await readJsonFile(getUserDataFilePath(legacySessionsFileName))
  );
}

async function removeDeletedSessionFiles(sessionIds: Set<string>) {
  try {
    const entries = await readdir(getTextToVideoSessionFilesDirectory(), {
      withFileTypes: true,
    });

    await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
        .map(async (entry) => {
          const sessionId = entry.name.slice(0, -".json".length);
          if (sessionIds.has(sessionId)) {
            return;
          }

          await rm(join(getTextToVideoSessionFilesDirectory(), entry.name), {
            force: true,
          });
        })
    );
  } catch {
    return;
  }
}

function findPromptBefore(
  messages: ConversationMessage[],
  statusMessageIndex: number
) {
  for (let index = statusMessageIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.type === "user") {
      return message.text;
    }
  }

  return "";
}

function readTaskIdFromResponse(response: unknown) {
  if (!isRecord(response)) {
    return undefined;
  }

  const directTaskId = readString(response, "taskId") ?? readString(response, "id");
  if (directTaskId) {
    return directTaskId;
  }

  const provider = response.provider;
  if (isRecord(provider)) {
    return readString(provider, "taskId") ?? readString(provider, "id");
  }

  return undefined;
}

type SessionTaskContext = {
  sourceSessionId: string;
  sessionTitle: string;
  prompt?: string;
  request?: unknown;
};

function extractTaskContextsFromSessions(state: TextToVideoSessionState) {
  const contexts = new Map<string, SessionTaskContext>();

  for (const session of state.sessions) {
    session.messages.forEach((message, index) => {
      const context = {
        sourceSessionId: session.id,
        sessionTitle: session.title,
        prompt: findPromptBefore(session.messages, index),
      } satisfies SessionTaskContext;

      if (message.type === "api") {
        const taskId = readTaskIdFromResponse(message.response);
        if (taskId) {
          contexts.set(taskId, {
            ...context,
            request: message.request,
          });
        }
      }

      if (message.type === "status" && message.taskId) {
        contexts.set(message.taskId, context);
      }
    });
  }

  return contexts;
}

function convertProviderTimestamp(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value > 1_000_000_000_000 ? value : value * 1000;
}

function getGeneratedAssetId(taskId: string, videoUrl: string | undefined) {
  if (taskId) {
    return `seedance-task-${taskId}`;
  }

  const digest = createHash("sha256")
    .update(videoUrl ?? String(Date.now()))
    .digest("hex")
    .slice(0, 16);
  return `seedance-video-${digest}`;
}

function normalizeProviderTaskToAsset(
  task: unknown,
  contexts: Map<string, SessionTaskContext>
) {
  if (!isRecord(task)) {
    return null;
  }

  const content = isRecord(task.content) ? task.content : {};
  const taskId = readString(task, "id") ?? readString(task, "taskId");
  const remoteVideoUrl = readString(content, "video_url");

  if (!taskId || !remoteVideoUrl) {
    return null;
  }

  const now = Date.now();
  const providerCreatedAt = convertProviderTimestamp(task.created_at);
  const providerUpdatedAt = convertProviderTimestamp(task.updated_at);
  const context = contexts.get(taskId);

  return {
    id: getGeneratedAssetId(taskId, remoteVideoUrl),
    taskId,
    createdAt: providerCreatedAt ?? now,
    updatedAt: now,
    source: "modelark-task-list" as const,
    sourceSessionId: context?.sourceSessionId,
    sessionTitle: context?.sessionTitle,
    prompt: context?.prompt,
    request: context?.request,
    model: readString(task, "model"),
    status: readString(task, "status"),
    error: task.error,
    usage: task.usage,
    ratio: readString(task, "ratio"),
    duration: readNumber(task, "duration"),
    resolution: readString(task, "resolution"),
    generateAudio:
      readBoolean(task, "generate_audio") ?? readBoolean(task, "generateAudio"),
    seed: readNumber(task, "seed"),
    providerCreatedAt,
    providerUpdatedAt,
    remoteVideoUrl,
    remoteLastFrameUrl: readString(content, "last_frame_url"),
    downloadStatus: "pending" as const,
    provider: task,
  } satisfies GeneratedContentAsset;
}

function serializeGeneratedAssetForStorage(asset: GeneratedContentAsset) {
  const storedAsset = { ...asset };
  delete storedAsset.localVideoUrl;

  return storedAsset;
}

function getVideoFileExtension(remoteVideoUrl: string) {
  try {
    const extension = extname(new URL(remoteVideoUrl).pathname).toLowerCase();
    if (extension === ".mp4" || extension === ".webm" || extension === ".mov") {
      return extension;
    }
  } catch {
    return ".mp4";
  }

  return ".mp4";
}

function getGeneratedVideoFilePath(asset: GeneratedContentAsset) {
  return join(
    getUserDataDirectory(),
    generatedVideosDirectoryName,
    `${sanitizeFilePart(asset.id)}${getVideoFileExtension(asset.remoteVideoUrl ?? "")}`
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function getExistingFileSize(filePath: string | undefined) {
  if (!filePath) {
    return undefined;
  }

  try {
    const fileStat = await stat(filePath);
    return fileStat.size > 0 ? fileStat.size : undefined;
  } catch {
    return undefined;
  }
}

function createPendingDownloadAsset(asset: GeneratedContentAsset, reason: string) {
  return hydrateGeneratedAsset({
    ...asset,
    downloadStatus: "pending",
    downloadError: reason,
  });
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: abortController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function ensureLocalVideoDownloaded(
  asset: GeneratedContentAsset,
  downloadTimeoutMs: number
) {
  if (!asset.remoteVideoUrl) {
    return hydrateGeneratedAsset({
      ...asset,
      downloadStatus: "remote_missing",
      downloadError: "任务记录没有返回 content.video_url。",
    });
  }

  if (!isHttpUrl(asset.remoteVideoUrl)) {
    return hydrateGeneratedAsset({
      ...asset,
      downloadStatus: "failed",
      downloadError: "content.video_url 不是可下载的 HTTP/HTTPS URL。",
    });
  }

  const localVideoPath = asset.localVideoPath ?? getGeneratedVideoFilePath(asset);
  const existingFileSize = await getExistingFileSize(localVideoPath);

  if (existingFileSize) {
    return hydrateGeneratedAsset({
      ...asset,
      localVideoPath,
      downloadStatus: "downloaded",
      fileSizeBytes: existingFileSize,
      downloadError: undefined,
    });
  }

  try {
    const response = await fetchWithTimeout(asset.remoteVideoUrl, downloadTimeoutMs);
    if (!response.ok) {
      throw new Error(
        `视频下载失败：HTTP ${response.status} ${response.statusText}`.trim()
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error("视频下载失败：远端返回空文件。");
    }

    await mkdir(dirname(localVideoPath), { recursive: true });
    await writeFile(localVideoPath, buffer);

    return hydrateGeneratedAsset({
      ...asset,
      localVideoPath,
      downloadStatus: "downloaded",
      downloadedAt: Date.now(),
      fileSizeBytes: buffer.length,
      downloadError: undefined,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    return hydrateGeneratedAsset({
      ...asset,
      localVideoPath,
      downloadStatus: "failed",
      downloadError:
        message === "This operation was aborted"
          ? `视频下载超时：超过 ${downloadTimeoutMs}ms 未完成。`
          : message,
    });
  }
}

async function writeGeneratedContentAssetState(state: GeneratedContentAssetState) {
  await writeJsonFile(getUserDataFilePath(generatedAssetsFileName), {
    version: 1,
    assets: orderAssetsByCreatedAt(state.assets).map(serializeGeneratedAssetForStorage),
  } satisfies GeneratedContentAssetState);
}

export function getLocalWorkspaceStorageInfo() {
  return {
    directory: getUserDataDirectory(),
    files: {
      textToVideoSessions: getTextToVideoSessionIndexFilePath(),
      legacyTextToVideoSessions: getUserDataFilePath(legacySessionsFileName),
      generatedContentAssets: getUserDataFilePath(generatedAssetsFileName),
    },
    directories: {
      textToVideoSessions: join(getUserDataDirectory(), sessionsDirectoryName),
      textToVideoSessionFiles: getTextToVideoSessionFilesDirectory(),
      generatedContentVideos: join(
        getUserDataDirectory(),
        generatedVideosDirectoryName
      ),
    },
  };
}

export async function readTextToVideoSessionState() {
  const index = normalizeSessionIndex(
    await readJsonFile(getTextToVideoSessionIndexFilePath())
  );

  if (index.sessionIds.length > 0) {
    const sessions = (
      await Promise.all(index.sessionIds.map((sessionId) => readSessionFile(sessionId)))
    ).filter((session): session is TextToVideoSessionRecord => Boolean(session));

    return normalizeSessionState({
      version: 1,
      activeSessionId: index.activeSessionId,
      sessions,
    });
  }

  return readLegacySessionState();
}

export async function writeTextToVideoSessionState(
  state: TextToVideoSessionState
) {
  const normalized = normalizeSessionState(state);
  const sessionIds = normalized.sessions.map((session) => session.id);

  await Promise.all(
    normalized.sessions.map((session) =>
      writeJsonFile(getTextToVideoSessionFilePath(session.id), {
        version: 1,
        session,
      })
    )
  );
  await writeJsonFile(getTextToVideoSessionIndexFilePath(), {
    version: 1,
    activeSessionId: normalized.activeSessionId,
    sessionIds,
    sessions: normalized.sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      taskStatus: session.taskStatus,
      taskId: session.taskId,
    })),
  });
  await removeDeletedSessionFiles(new Set(sessionIds.map(sanitizeFilePart)));

  return normalized;
}

export async function readGeneratedContentAssetState() {
  const state = normalizeGeneratedAssetState(
    await readJsonFile(getUserDataFilePath(generatedAssetsFileName))
  );

  return {
    ...state,
    assets: state.assets.map(hydrateGeneratedAsset),
  };
}

export async function readGeneratedContentAssetById(assetId: string) {
  const state = await readGeneratedContentAssetState();
  return state.assets.find((asset) => asset.id === assetId);
}

export async function syncGeneratedContentAssetsFromTasks(
  tasks: unknown[],
  options: GeneratedContentAssetSyncOptions = {}
) {
  const startedAt = new Date();
  const downloadLimit = Math.max(0, options.downloadLimit ?? 8);
  const downloadTimeoutMs = Math.max(1000, options.downloadTimeoutMs ?? 12000);
  const currentState = await readGeneratedContentAssetState();
  const sessionState = await readTextToVideoSessionState();
  const contexts = extractTaskContextsFromSessions(sessionState);
  const currentAssets = new Map(
    currentState.assets.map((asset) => [asset.id, asset])
  );
  const summary = {
    startedAt: startedAt.toISOString(),
    completedAt: "",
    receivedTasks: tasks.length,
    importedAssets: 0,
    downloadedAssets: 0,
    failedDownloads: 0,
    remoteMissing: 0,
    pendingDownloads: 0,
    skippedTasks: 0,
    downloadLimit,
    downloadTimeoutMs,
  } satisfies GeneratedContentAssetSyncSummary;
  let attemptedDownloads = 0;

  for (const task of tasks) {
    const importedAsset = normalizeProviderTaskToAsset(task, contexts);

    if (!importedAsset) {
      summary.skippedTasks += 1;
      continue;
    }

    const current = currentAssets.get(importedAsset.id);
    const mergedAsset = {
      ...current,
      ...importedAsset,
      createdAt: current?.createdAt ?? importedAsset.createdAt,
      prompt: importedAsset.prompt ?? current?.prompt,
      request: importedAsset.request ?? current?.request,
      sourceSessionId:
        importedAsset.sourceSessionId ?? current?.sourceSessionId,
      sessionTitle: importedAsset.sessionTitle ?? current?.sessionTitle,
      localVideoPath: current?.localVideoPath,
      downloadedAt: current?.downloadedAt,
      fileSizeBytes: current?.fileSizeBytes,
      updatedAt: Date.now(),
    } satisfies GeneratedContentAsset;
    const existingFileSize = await getExistingFileSize(mergedAsset.localVideoPath);
    const downloadedAsset = existingFileSize
      ? hydrateGeneratedAsset({
          ...mergedAsset,
          downloadStatus: "downloaded",
          fileSizeBytes: existingFileSize,
          downloadError: undefined,
        })
      : !mergedAsset.remoteVideoUrl
        ? await ensureLocalVideoDownloaded(mergedAsset, downloadTimeoutMs)
        : attemptedDownloads < downloadLimit
          ? await (async () => {
              attemptedDownloads += 1;
              return ensureLocalVideoDownloaded(mergedAsset, downloadTimeoutMs);
            })()
          : createPendingDownloadAsset(
              mergedAsset,
              `本次同步已达到下载上限 ${downloadLimit} 个视频；再次点击同步会继续尝试未下载项。`
            );

    if (!current) {
      summary.importedAssets += 1;
    }

    if (downloadedAsset.downloadStatus === "downloaded") {
      summary.downloadedAssets += 1;
    } else if (downloadedAsset.downloadStatus === "failed") {
      summary.failedDownloads += 1;
    } else if (downloadedAsset.downloadStatus === "remote_missing") {
      summary.remoteMissing += 1;
    } else if (downloadedAsset.downloadStatus === "pending") {
      summary.pendingDownloads += 1;
    }

    currentAssets.set(downloadedAsset.id, downloadedAsset);
  }

  const nextState = {
    version: 1,
    assets: orderAssetsByCreatedAt([...currentAssets.values()]),
  } satisfies GeneratedContentAssetState;

  await writeGeneratedContentAssetState(nextState);
  summary.completedAt = new Date().toISOString();

  return {
    state: {
      ...nextState,
      assets: nextState.assets.map(hydrateGeneratedAsset),
    },
    summary,
  };
}
