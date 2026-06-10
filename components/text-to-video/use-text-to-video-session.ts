"use client";

import * as React from "react";

import {
  defaultTextToVideoSettings,
  isTerminalVideoTaskStatus,
  isVideoTaskStatus,
  type LocalVideoTaskStatus,
  type VideoDuration,
  type VideoModelMode,
  type VideoRatio,
  type VideoResolution,
  type VideoTaskStatus,
} from "@/lib/video-generation";
import type {
  ApiResponseMessage,
  ConversationMessage,
  GenerationResponse,
  SelectedGenerationAsset,
  TextToVideoSessionRecord,
  UploadedImage,
} from "@/components/text-to-video/types";
import { normalizeAssets } from "@/components/assets/assets-utils";

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createBlankSession(): TextToVideoSessionRecord {
  const now = Date.now();

  return {
    id: createMessageId(),
    title: "新视频生成",
    titleCustomized: false,
    createdAt: now,
    updatedAt: now,
    messages: [],
    taskStatus: "idle",
    taskId: null,
    pollIntervalMs: 5000,
  };
}

function createInitialSessionState() {
  const session = createBlankSession();

  return {
    activeSessionId: session.id,
    sessions: [session],
  };
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

function isConversationMessage(value: unknown): value is ConversationMessage {
  return value !== null && typeof value === "object" && "type" in value;
}

function isSessionRecord(value: unknown): value is TextToVideoSessionRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<TextToVideoSessionRecord>;

  return (
    typeof session.id === "string" &&
    typeof session.title === "string" &&
    Array.isArray(session.messages) &&
    session.messages.every(isConversationMessage)
  );
}

function getSessionTitle(messages: ConversationMessage[]) {
  const userMessage = messages.find((message) => message.type === "user");
  if (!userMessage || userMessage.type !== "user") {
    return "新视频生成";
  }

  const title = userMessage.text.replace(/\s+/g, " ").trim();
  return title.length > 28 ? `${title.slice(0, 28)}...` : title;
}

async function readStoredSessions() {
  try {
    const response = await fetch("/api/local/text-to-video-sessions", {
      cache: "no-store",
    });

    if (!response.ok) {
      return undefined;
    }

    const parsed = (await response.json()) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }

    const candidate = parsed as {
      activeSessionId?: unknown;
      sessions?: unknown;
    };

    if (!Array.isArray(candidate.sessions)) {
      return undefined;
    }

    const sessions = candidate.sessions
      .filter(isSessionRecord)
      .map((session) => ({
        ...session,
        createdAt: Number(session.createdAt) || Date.now(),
        updatedAt: Number(session.updatedAt) || Date.now(),
        titleCustomized: Boolean(session.titleCustomized),
        taskStatus: session.taskStatus ?? "idle",
        taskId: session.taskId ?? null,
        pollIntervalMs: session.pollIntervalMs ?? 5000,
      }))
      .filter(hasSessionContent);
    const orderedSessions = orderSessionsByCreatedAt(sessions);

    if (orderedSessions.length === 0) {
      return undefined;
    }

    const activeSessionId =
      typeof candidate.activeSessionId === "string" &&
      orderedSessions.some((session) => session.id === candidate.activeSessionId)
        ? candidate.activeSessionId
        : orderedSessions[0].id;

    return {
      activeSessionId,
      sessions: orderedSessions,
    };
  } catch {
    return undefined;
  }
}

async function writeStoredSessions(
  state: {
    activeSessionId: string;
    sessions: TextToVideoSessionRecord[];
  },
  signal?: AbortSignal
) {
  try {
    const sessions = orderSessionsByCreatedAt(
      state.sessions.filter(hasSessionContent)
    );
    const activeSessionId = sessions.some(
      (session) => session.id === state.activeSessionId
    )
      ? state.activeSessionId
      : sessions[0]?.id ?? "";

    await fetch("/api/local/text-to-video-sessions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: 1,
        activeSessionId,
        sessions,
      }),
      signal,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      return;
    }

    console.warn("[text-to-video] session history could not be saved", error);
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("图片读取失败。"));
    reader.readAsDataURL(file);
  });
}

function getRequestPreview(body: BodyInit | null | undefined) {
  if (typeof body !== "string") {
    return undefined;
  }

  try {
    return JSON.parse(body, (_key, value: unknown) => {
      if (
        typeof value === "string" &&
        value.startsWith("data:image/") &&
        value.length > 180
      ) {
        const [prefix] = value.split(",", 1);
        return `${prefix},[base64 omitted: ${value.length} chars]`;
      }

      return value;
    });
  } catch {
    return body;
  }
}

async function requestJson(
  path: string,
  init?: RequestInit
): Promise<ApiResponseMessage> {
  const startedAt = performance.now();
  const method = init?.method ?? "GET";
  const response = await fetch(path, init);
  const payload = (await response.json().catch(() => ({
    message: "接口返回了非 JSON 响应。",
  }))) as unknown;
  const durationMs = Math.round(performance.now() - startedAt);

  return {
    action: method === "GET" ? "接口查询" : "接口调用",
    durationMs,
    method,
    ok: response.ok,
    path,
    request: getRequestPreview(init?.body),
    response: payload,
    responseHeaders: Object.fromEntries(response.headers.entries()),
    status: response.status,
  };
}

function createClientErrorApiResponse({
  action,
  error,
  method,
  path,
  request,
}: {
  action: string;
  error: unknown;
  method: string;
  path: string;
  request?: unknown;
}): ApiResponseMessage {
  const message =
    error instanceof Error ? error.message : "前端请求没有拿到响应。";

  return {
    action,
    durationMs: undefined,
    method,
    ok: false,
    path,
    request,
    response: {
      code: error instanceof DOMException ? error.name : "CLIENT_REQUEST_ERROR",
      message,
      client: {
        name: error instanceof Error ? error.name : undefined,
      },
    },
    responseHeaders: undefined,
    status: 0,
  };
}

function isClientAbortError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function getResponseMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  if (
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
  ) {
    return (payload as { message: string }).message;
  }

  const error = "error" in payload ? (payload as { error?: unknown }).error : undefined;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return undefined;
}

function getGenerationDetail(data: GenerationResponse) {
  return (
    data.error?.message ??
    data.message ??
    getResponseMessage(data.provider) ??
    undefined
  );
}

export function useTextToVideoSession() {
  const sessionStateRef = React.useRef(createInitialSessionState());
  const lastProviderStatusBySessionRef = React.useRef(
    new Map<string, VideoTaskStatus>()
  );
  const activeCreateRequestAbortControllersRef = React.useRef(
    new Map<string, AbortController>()
  );
  const generationRunIdsRef = React.useRef(new Map<string, number>());
  const pollingSessionsRef = React.useRef(new Set<string>());
  const [sessionState, setSessionState] = React.useState(
    createInitialSessionState
  );
  const [hasLoadedSessions, setHasLoadedSessions] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [ratio, setRatio] = React.useState<VideoRatio>(
    defaultTextToVideoSettings.ratio
  );
  const [modelMode, setModelMode] = React.useState<VideoModelMode>(
    defaultTextToVideoSettings.modelMode
  );
  const [duration, setDuration] = React.useState<VideoDuration>(
    defaultTextToVideoSettings.duration
  );
  const [resolution, setResolution] = React.useState<VideoResolution>(
    defaultTextToVideoSettings.resolution
  );
  const [uploadedImages, setUploadedImages] = React.useState<UploadedImage[]>(
    []
  );
  const [selectedAssets, setSelectedAssets] = React.useState<
    SelectedGenerationAsset[]
  >([]);
  const [assetLibraryImages, setAssetLibraryImages] = React.useState<
    SelectedGenerationAsset[]
  >([]);
  const [isLoadingAssetLibraryImages, setIsLoadingAssetLibraryImages] =
    React.useState(false);
  const [assetLibraryError, setAssetLibraryError] = React.useState<
    string | null
  >(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [inputError, setInputError] = React.useState<string | null>(null);

  const activeSession = sessionState.sessions.find(
    (session) => session.id === sessionState.activeSessionId
  );
  const messages = activeSession?.messages ?? [];
  const taskStatus = activeSession?.taskStatus ?? "idle";
  const taskId = activeSession?.taskId ?? null;
  const isBusy = taskStatus === "queued" || taskStatus === "running";
  const canSubmit = prompt.trim().length > 0 && !isBusy && !isUploading;

  React.useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadStoredSessions() {
      const stored = await readStoredSessions();

      if (cancelled) {
        return;
      }

      if (stored) {
        setSessionState(stored);
        for (const session of stored.sessions) {
          if (session.taskStatus && session.taskStatus !== "idle") {
            lastProviderStatusBySessionRef.current.set(
              session.id,
              session.taskStatus
            );
          }
        }
      }

      setHasLoadedSessions(true);
    }

    void loadStoredSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!hasLoadedSessions) {
      return;
    }

    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void writeStoredSessions(sessionState, abortController.signal);
    }, 250);

    return () => {
      abortController.abort();
      window.clearTimeout(timeoutId);
    };
  }, [hasLoadedSessions, sessionState]);

  const updateSessionRecord = React.useCallback(
    (
      sessionId: string,
      updater: (session: TextToVideoSessionRecord) => TextToVideoSessionRecord
    ) => {
      setSessionState((current) => ({
        ...current,
        sessions: current.sessions.map((session) =>
          session.id === sessionId ? updater(session) : session
        ),
      }));
    },
    []
  );

  const appendMessageToSession = React.useCallback(
    (sessionId: string, message: ConversationMessage) => {
      updateSessionRecord(sessionId, (session) => ({
        ...session,
        title:
          session.titleCustomized || message.type !== "user"
            ? session.title
            : getSessionTitle([...session.messages, message]),
        updatedAt: Date.now(),
        messages: [...session.messages, message],
      }));

    },
    [updateSessionRecord]
  );

  const updateSessionTaskState = React.useCallback(
    (
      sessionId: string,
      updates: {
        pollIntervalMs?: number;
        taskId?: string | null;
        taskStatus?: LocalVideoTaskStatus;
      }
    ) => {
      updateSessionRecord(sessionId, (session) => ({
        ...session,
        updatedAt: Date.now(),
        pollIntervalMs: updates.pollIntervalMs ?? session.pollIntervalMs,
        taskId:
          updates.taskId === undefined ? session.taskId : updates.taskId,
        taskStatus: updates.taskStatus ?? session.taskStatus,
      }));

    },
    [updateSessionRecord]
  );

  const appendNotice = React.useCallback(
    (sessionId: string, text: string) => {
      appendMessageToSession(sessionId, {
        id: createMessageId(),
        type: "notice",
        text,
      });
    },
    [appendMessageToSession]
  );

  const appendActivity = React.useCallback(
    (sessionId: string, title: string, detail?: string) => {
      appendMessageToSession(sessionId, {
        detail,
        id: createMessageId(),
        title,
        type: "activity",
      });
    },
    [appendMessageToSession]
  );

  const appendApiResponse = React.useCallback(
    (sessionId: string, api: ApiResponseMessage) => {
      appendMessageToSession(sessionId, {
        ...api,
        id: createMessageId(),
        type: "api",
      });
    },
    [appendMessageToSession]
  );

  const appendStatus = React.useCallback(
    (
      sessionId: string,
      status: VideoTaskStatus,
      data?: GenerationResponse,
      fallbackTaskId?: string | null
    ) => {
      appendMessageToSession(sessionId, {
        id: createMessageId(),
        type: "status",
        status,
        taskId: data?.taskId ?? fallbackTaskId ?? undefined,
        detail: data ? getGenerationDetail(data) : undefined,
        videoUrl: data?.content?.video_url,
        lastFrameUrl: data?.content?.last_frame_url,
      });
    },
    [appendMessageToSession]
  );

  const applyProviderStatusToSession = React.useCallback(
    (sessionId: string, status: VideoTaskStatus, data: GenerationResponse) => {
      const lastStatus = lastProviderStatusBySessionRef.current.get(sessionId);

      if (status !== lastStatus) {
        appendStatus(sessionId, status, data, data.taskId ?? null);
        lastProviderStatusBySessionRef.current.set(sessionId, status);
      }

      updateSessionTaskState(sessionId, {
        taskStatus: status,
        taskId: isTerminalVideoTaskStatus(status)
          ? null
          : data.taskId ?? sessionStateRef.current.sessions.find(
              (session) => session.id === sessionId
            )?.taskId ?? null,
      });
    },
    [appendStatus, updateSessionTaskState]
  );

  const startPollingSessionTask = React.useCallback(
    (sessionId: string, pollingTaskId: string, intervalMs: number) => {
      const pollingKey = `${sessionId}:${pollingTaskId}`;

      if (pollingSessionsRef.current.has(pollingKey)) {
        return;
      }

      pollingSessionsRef.current.add(pollingKey);

      async function pollTaskStatus(hasPolled = false) {
        const currentSession = sessionStateRef.current.sessions.find(
          (session) => session.id === sessionId
        );

        if (
          hasPolled &&
          (!currentSession ||
            currentSession.taskId !== pollingTaskId ||
            (currentSession.taskStatus !== "queued" &&
              currentSession.taskStatus !== "running"))
        ) {
          pollingSessionsRef.current.delete(pollingKey);
          return;
        }

        try {
          const path = `/api/byteplus/generation-tasks/${encodeURIComponent(
            pollingTaskId
          )}`;
          appendActivity(sessionId, "正在查询任务状态", `GET ${path}`);
          const api = await requestJson(path);
          const data = api.response as GenerationResponse;

          appendApiResponse(sessionId, {
            ...api,
            action: "查询任务状态",
          });

          if (!api.ok) {
            updateSessionTaskState(sessionId, {
              taskId: null,
              taskStatus: "failed",
            });
            appendStatus(
              sessionId,
              "failed",
              {
                message: getResponseMessage(data) ?? "任务状态查询失败。",
                provider: data,
              },
              pollingTaskId
            );
            pollingSessionsRef.current.delete(pollingKey);
            return;
          }

          if (!isVideoTaskStatus(data.status)) {
            appendNotice(sessionId, "API 返回了未识别的任务状态，请查看上方 JSON。");
            window.setTimeout(() => void pollTaskStatus(true), intervalMs);
            return;
          }

          applyProviderStatusToSession(sessionId, data.status, {
            ...data,
            taskId: data.taskId ?? pollingTaskId,
          });

          if (isTerminalVideoTaskStatus(data.status)) {
            pollingSessionsRef.current.delete(pollingKey);
            return;
          }

          window.setTimeout(() => void pollTaskStatus(true), intervalMs);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "暂时无法获取任务状态，稍后会继续轮询。";
          appendNotice(sessionId, message);
          window.setTimeout(() => void pollTaskStatus(true), intervalMs);
        }
      }

      window.setTimeout(() => void pollTaskStatus(false), 0);
    },
    [
      appendActivity,
      appendApiResponse,
      appendNotice,
      appendStatus,
      applyProviderStatusToSession,
      updateSessionTaskState,
    ]
  );

  React.useEffect(() => {
    if (!hasLoadedSessions) {
      return;
    }

    for (const session of sessionState.sessions) {
      if (
        session.taskId &&
        (session.taskStatus === "queued" || session.taskStatus === "running")
      ) {
        startPollingSessionTask(
          session.id,
          session.taskId,
          session.pollIntervalMs
        );
      }
    }
  }, [hasLoadedSessions, sessionState.sessions, startPollingSessionTask]);

  function changeModelMode(nextModelMode: VideoModelMode) {
    setModelMode(nextModelMode);

    if (nextModelMode === "flash" && resolution === "1080p") {
      setResolution("720p");
    }
  }

  async function uploadImageFiles(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length !== files.length) {
      setInputError("只支持上传图片。");
      return;
    }

    if (imageFiles.some((file) => file.size > 30 * 1024 * 1024)) {
      setInputError("单张图片不能超过 30 MB。");
      return;
    }

    setInputError(null);
    setIsUploading(true);

    try {
      const nextImages = await Promise.all(
        imageFiles.map(async (file) => ({
          dataUrl: await fileToDataUrl(file),
          id: createMessageId(),
          name: file.name,
        }))
      );

      setUploadedImages((current) => [...current, ...nextImages]);
    } catch (error) {
      setInputError(error instanceof Error ? error.message : "图片读取失败。");
    } finally {
      window.setTimeout(() => setIsUploading(false), 500);
    }
  }

  async function loadAssetLibraryImages() {
    setAssetLibraryError(null);
    setIsLoadingAssetLibraryImages(true);

    try {
      const groupTypes = ["AIGC", "LivenessFace"];
      const results = await Promise.allSettled(
        groupTypes.map(async (groupType) => {
          const params = new URLSearchParams({
            asset_kind: "Image",
            group_type: groupType,
            page_size: "100",
            sort_by: "UpdateTime",
            sort_order: "Desc",
            status: "Active",
          });
          const response = await fetch(
            `/api/byteplus/assets?${params.toString()}`,
            {
              cache: "no-store",
            }
          );
          const payload = (await response.json().catch(() => ({}))) as unknown;

          if (!response.ok) {
            const message =
              getResponseMessage(payload) ??
              `${groupType} 素材库图片加载失败。`;
            throw new Error(message);
          }

          return normalizeAssets(payload);
        })
      );
      const successfulAssets = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : []
      );
      const failures = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) =>
          result.reason instanceof Error ? result.reason.message : "素材查询失败。"
        );

      if (successfulAssets.length === 0 && failures.length > 0) {
        throw new Error(failures.join("；"));
      }

      const uniqueAssets = new Map(
        successfulAssets
        .filter(
          (asset) => asset.assetKind === "Image" && asset.status === "Active"
        )
        .map((asset) => [
          asset.id,
          {
            assetKind: asset.assetKind,
            groupId: asset.groupId,
            groupType: asset.groupType,
            id: asset.id,
            name: asset.name,
            status: asset.status,
            url: asset.url,
          },
        ])
      );

      setAssetLibraryImages([...uniqueAssets.values()]);
      setAssetLibraryError(failures.length > 0 ? failures.join("；") : null);
    } catch (error) {
      setAssetLibraryError(
        error instanceof Error ? error.message : "素材库图片加载失败。"
      );
    } finally {
      setIsLoadingAssetLibraryImages(false);
    }
  }

  function selectAssetImage(asset: SelectedGenerationAsset) {
    setInputError(null);
    setSelectedAssets((current) => {
      if (current.some((candidate) => candidate.id === asset.id)) {
        return current;
      }

      return [...current, asset];
    });
  }

  async function submitPrompt() {
    const nextPrompt = prompt.trim();
    if (!nextPrompt || isBusy || isUploading) {
      return;
    }

    const sourceSessionId = sessionState.activeSessionId;
    const imagePreviews = uploadedImages;
    const assetPreviews = selectedAssets;
    const imageName =
      imagePreviews.length === 1 ? imagePreviews[0].name : undefined;
    const imageDataUrl =
      imagePreviews.length === 1 ? imagePreviews[0].dataUrl : undefined;
    appendMessageToSession(sourceSessionId, {
      imageDataUrl,
      imagePreviews,
      id: createMessageId(),
      type: "user",
      text: nextPrompt,
      imageName,
      assetPreviews,
    });
    setPrompt("");
    updateSessionTaskState(sourceSessionId, {
      taskId: null,
      taskStatus: "queued",
    });
    lastProviderStatusBySessionRef.current.delete(sourceSessionId);
    setInputError(null);
    setUploadedImages([]);
    setSelectedAssets([]);
    appendActivity(
      sourceSessionId,
      "正在提交生成请求",
      "正在调用 /api/byteplus/generation-tasks"
    );

    const runId = (generationRunIdsRef.current.get(sourceSessionId) ?? 0) + 1;
    generationRunIdsRef.current.set(sourceSessionId, runId);
    const abortController = new AbortController();
    activeCreateRequestAbortControllersRef.current.set(
      sourceSessionId,
      abortController
    );
    const requestBody = {
      assetRefs: assetPreviews.map((asset) => ({
        assetId: asset.id,
        assetKind: asset.assetKind,
        role: "reference_image",
      })),
      imageRefs: imagePreviews.map((image) => ({
        url: image.dataUrl,
        role: "reference_image",
      })),
      prompt: nextPrompt,
      ratio,
      duration: Number(duration),
      resolution,
      generateAudio: true,
      useFastEndpoint: modelMode === "flash",
      safetyIdentifier: "text_to_video_user",
    };

    try {
      const api = await requestJson("/api/byteplus/generation-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });
      const data = api.response as GenerationResponse;
      appendApiResponse(sourceSessionId, {
        ...api,
        action: "创建视频生成任务",
      });

      if (generationRunIdsRef.current.get(sourceSessionId) !== runId) {
        appendNotice(
          sourceSessionId,
          "创建请求返回时，本轮已经被用户停止；前端已保留响应 JSON，但不再进入轮询。"
        );
        updateSessionTaskState(sourceSessionId, {
          taskId: null,
          taskStatus: "idle",
        });
        return;
      }

      if (!api.ok) {
        const message = getResponseMessage(data) ?? "视频生成任务创建失败。";
        updateSessionTaskState(sourceSessionId, {
          taskId: null,
          taskStatus: "failed",
        });
        appendStatus(
          sourceSessionId,
          "failed",
          {
            message,
            provider: data,
          },
          null
        );
        return;
      }

      const nextTaskId = data.taskId ?? null;
      const nextPollIntervalMs = data.pollAfterMs ?? 5000;
      updateSessionTaskState(sourceSessionId, {
        taskId: nextTaskId,
        pollIntervalMs: nextPollIntervalMs,
      });

      if (isVideoTaskStatus(data.status)) {
        applyProviderStatusToSession(sourceSessionId, data.status, data);
      } else {
        appendStatus(sourceSessionId, "queued", {
          ...data,
          taskId: nextTaskId ?? undefined,
        });
        lastProviderStatusBySessionRef.current.set(sourceSessionId, "queued");
        updateSessionTaskState(sourceSessionId, {
          taskId: nextTaskId,
          taskStatus: "queued",
        });
      }

      if (
        nextTaskId &&
        (!isVideoTaskStatus(data.status) ||
          !isTerminalVideoTaskStatus(data.status))
      ) {
        startPollingSessionTask(
          sourceSessionId,
          nextTaskId,
          nextPollIntervalMs
        );
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "视频生成任务创建失败。";
      const wasAborted = isClientAbortError(requestError);
      updateSessionTaskState(sourceSessionId, {
        taskId: null,
        taskStatus: wasAborted ? "idle" : "failed",
      });
      appendApiResponse(
        sourceSessionId,
        createClientErrorApiResponse({
          action: "创建视频生成任务",
          error: requestError,
          method: "POST",
          path: "/api/byteplus/generation-tasks",
          request: getRequestPreview(JSON.stringify(requestBody)),
        })
      );
      if (wasAborted) {
        appendNotice(
          sourceSessionId,
          "本地已中止等待创建请求；如果请求已经到达 BytePlus，但 TaskId 没返回前端，就没有可用于取消的服务端任务编号。"
        );
      } else {
        appendStatus(
          sourceSessionId,
          "failed",
          {
            message,
            error: { message },
          },
          null
        );
      }
    } finally {
      if (
        activeCreateRequestAbortControllersRef.current.get(sourceSessionId) ===
        abortController
      ) {
        activeCreateRequestAbortControllersRef.current.delete(sourceSessionId);
      }
    }
  }

  function createSession() {
    const session = createBlankSession();

    setSessionState((current) => {
      const currentActiveSession = current.sessions.find(
        (candidate) => candidate.id === current.activeSessionId
      );

      if (currentActiveSession && !hasSessionContent(currentActiveSession)) {
        return {
          activeSessionId: currentActiveSession.id,
          sessions: [
            {
              ...currentActiveSession,
              messages: [],
              taskStatus: "idle",
              taskId: null,
              pollIntervalMs: 5000,
            },
            ...current.sessions.filter(
              (candidate) =>
                candidate.id !== currentActiveSession.id &&
                hasSessionContent(candidate)
            ),
          ],
        };
      }

      return {
        activeSessionId: session.id,
        sessions: [session, ...current.sessions.filter(hasSessionContent)],
      };
    });
    setPrompt("");
    setUploadedImages([]);
    setSelectedAssets([]);
    setInputError(null);
  }

  function deleteSession(sessionId: string) {
    generationRunIdsRef.current.set(
      sessionId,
      (generationRunIdsRef.current.get(sessionId) ?? 0) + 1
    );
    activeCreateRequestAbortControllersRef.current.get(sessionId)?.abort();
    activeCreateRequestAbortControllersRef.current.delete(sessionId);
    lastProviderStatusBySessionRef.current.delete(sessionId);

    const deletedIndex = sessionState.sessions.findIndex(
      (session) => session.id === sessionId
    );

    if (deletedIndex < 0) {
      return;
    }

    const remainingSessions = sessionState.sessions.filter(
      (session) => session.id !== sessionId && hasSessionContent(session)
    );

    if (sessionId !== sessionState.activeSessionId) {
      setSessionState((current) => ({
        ...current,
        sessions: current.sessions.filter(
          (session) => session.id !== sessionId && hasSessionContent(session)
        ),
      }));
      return;
    }

    const fallbackSession =
      remainingSessions[Math.min(deletedIndex, remainingSessions.length - 1)] ??
      createBlankSession();
    const nextSessions =
      remainingSessions.length > 0 ? remainingSessions : [fallbackSession];

    setSessionState({
      activeSessionId: fallbackSession.id,
      sessions: nextSessions,
    });
    setPrompt("");
    setUploadedImages([]);
    setSelectedAssets([]);
    setInputError(null);
  }

  function renameSession(sessionId: string, nextTitle: string) {
    const title = nextTitle.replace(/\s+/g, " ").trim();
    if (!title) {
      return;
    }

    setSessionState((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              title,
              titleCustomized: true,
              updatedAt: Date.now(),
            }
          : session
      ),
    }));
  }

  function selectSession(sessionId: string) {
    const session = sessionState.sessions.find(
      (candidate) => candidate.id === sessionId
    );

    if (!session) {
      return;
    }

    setSessionState((current) => ({
      ...current,
      activeSessionId: session.id,
    }));
    setPrompt("");
    setUploadedImages([]);
    setSelectedAssets([]);
    setInputError(null);
  }

  async function openSessionStorageDirectory(sessionId: string) {
    try {
      const response = await fetch("/api/local/open-storage-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "textToVideoSession",
          sessionId,
        }),
      });

      if (!response.ok) {
        console.warn(
          "[text-to-video] storage directory could not be opened",
          await response.json().catch(() => undefined)
        );
      }
    } catch (error) {
      console.warn("[text-to-video] storage directory could not be opened", error);
    }
  }

  async function stopCurrentTask() {
    const sourceSessionId = sessionState.activeSessionId;
    const sourceTaskId =
      sessionState.sessions.find((session) => session.id === sourceSessionId)
        ?.taskId ?? taskId;

    appendNotice(
      sourceSessionId,
      "你已发起终止动作。下面会保留本次动作产生的请求和响应。"
    );
    generationRunIdsRef.current.set(
      sourceSessionId,
      (generationRunIdsRef.current.get(sourceSessionId) ?? 0) + 1
    );
    activeCreateRequestAbortControllersRef.current
      .get(sourceSessionId)
      ?.abort();
    activeCreateRequestAbortControllersRef.current.delete(sourceSessionId);

    if (!sourceTaskId) {
      updateSessionTaskState(sourceSessionId, {
        taskId: null,
        taskStatus: "idle",
      });
      appendNotice(
        sourceSessionId,
        "当前前端还没有拿到 BytePlus TaskId，因此没有服务端生成任务可以取消；这次只停止了前端继续等待。"
      );
      return;
    }

    const path = `/api/byteplus/generation-tasks/${encodeURIComponent(sourceTaskId)}`;
    const requestBody = { action: "cancel" };

    try {
      appendActivity(sourceSessionId, "正在请求取消生成任务", `POST ${path}`);
      const api = await requestJson(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = api.response as GenerationResponse;
      appendApiResponse(sourceSessionId, {
        ...api,
        action: "取消视频生成任务",
      });

      if (isVideoTaskStatus(data.status)) {
        applyProviderStatusToSession(sourceSessionId, data.status, {
          ...data,
          taskId: data.taskId ?? sourceTaskId,
        });
        return;
      }

      if (!api.ok) {
        appendNotice(
          sourceSessionId,
          "取消请求返回失败；前端继续以后续任务查询结果为准。"
        );
      }
    } catch (requestError) {
      appendApiResponse(
        sourceSessionId,
        createClientErrorApiResponse({
          action: "取消视频生成任务",
          error: requestError,
          method: "POST",
          path,
          request: requestBody,
        })
      );
      appendNotice(
        sourceSessionId,
        "取消请求没有拿到响应；前端继续以任务查询结果为准。"
      );
    }
  }

  function removeUploadedImage(imageId: string) {
    setUploadedImages((current) =>
      current.filter((image) => image.id !== imageId)
    );
  }

  function removeSelectedAsset(assetId: string) {
    setSelectedAssets((current) =>
      current.filter((asset) => asset.id !== assetId)
    );
  }

  return {
    activeSessionId: activeSession?.id ?? sessionState.activeSessionId,
    assetLibraryError,
    assetLibraryImages,
    canSubmit,
    createSession,
    deleteSession,
    duration,
    inputError,
    isLoadingAssetLibraryImages,
    isBusy,
    isUploading,
    messages,
    modelMode,
    prompt,
    ratio,
    resolution,
    setDuration,
    setModelMode: changeModelMode,
    setPrompt,
    setRatio,
    setResolution,
    selectedAssets,
    selectAssetImage,
    renameSession,
    sessions: sessionState.sessions.filter(hasSessionContent),
    selectSession,
    stopCurrentTask,
    submitPrompt,
    taskStatus,
    uploadedImages,
    loadAssetLibraryImages,
    removeSelectedAsset,
    removeUploadedImage,
    uploadImageFiles,
    openSessionStorageDirectory,
  };
}
