import { appUrl } from "@/lib/app-url";
import type { BytePlusConfig } from "@/lib/byteplus-config";
import { getSeedanceEndpoint } from "@/lib/byteplus-config";
import type { GenerationTaskRequest } from "@/lib/byteplus-contracts";
import { BytePlusServiceError } from "@/lib/byteplus-errors";

type GenerationContentItem =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: { url: string };
      role?: string;
    }
  | {
      type: "video_url";
      video_url: { url: string };
      role?: string;
    }
  | {
      type: "audio_url";
      audio_url: { url: string };
      role?: string;
    };

type CreateGenerationTaskPayload = {
  model: string;
  content: GenerationContentItem[];
  generate_audio: boolean;
  ratio: string;
  duration: number;
  resolution: string;
  watermark: boolean;
  callback_url?: string;
  safety_identifier?: string;
  seed?: number;
  priority?: number;
  return_last_frame?: boolean;
};

type GenerationTaskResponse = {
  id?: string;
  model?: string;
  status?: string;
  error?: {
    code?: string;
    message?: string;
  } | null;
  content?: {
    video_url?: string;
    last_frame_url?: string;
  };
  usage?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
  [key: string]: unknown;
};

type GenerationTaskListResponse = {
  data?: GenerationTaskResponse[];
  items?: GenerationTaskResponse[];
  has_more?: boolean;
  first_id?: string;
  last_id?: string;
  [key: string]: unknown;
};

const videoGenerationTaskActionDocs = {
  cancelOrDelete:
    "DELETE https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/{id}",
  response: "This API operation has no response parameters.",
  cancelRule: "Only queued video generation tasks can be cancelled.",
};

function requireModelArkApiKey(config: BytePlusConfig) {
  if (!config.BYTEPLUS_MODELARK_API_KEY) {
    throw new BytePlusServiceError({
      code: "BYTEPLUS_MODELARK_API_KEY_MISSING",
      message: "BYTEPLUS_MODELARK_API_KEY 未配置，无法调用视频生成 API。",
      status: 500,
    });
  }

  return config.BYTEPLUS_MODELARK_API_KEY;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function getModelArkUrl(config: BytePlusConfig, pathname: string) {
  return `${trimTrailingSlash(config.byteplus.modelArkBaseUrl)}${pathname}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function serializeError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error;
  }

  const cause = "cause" in error ? error.cause : undefined;

  return {
    name: error.name,
    message: error.message,
    stack:
      process.env.NODE_ENV === "production" ? undefined : error.stack,
    cause: cause ? serializeError(cause) : undefined,
  };
}

function redactForDiagnostics(value: unknown, depth = 0): unknown {
  if (depth > 8) {
    return "[max depth omitted]";
  }

  if (typeof value === "string") {
    if (value.startsWith("data:image/") && value.length > 180) {
      const [prefix] = value.split(",", 1);
      return `${prefix},[base64 omitted: ${value.length} chars]`;
    }

    if (value.length > 2000) {
      return `${value.slice(0, 2000)}...[truncated: ${value.length} chars]`;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactForDiagnostics(item, depth + 1));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        redactForDiagnostics(item, depth + 1),
      ])
    );
  }

  return value;
}

function parseRequestBodyForDiagnostics(body: BodyInit | null | undefined) {
  if (typeof body !== "string") {
    return undefined;
  }

  try {
    return redactForDiagnostics(JSON.parse(body));
  } catch {
    return redactForDiagnostics(body);
  }
}

function headersToRecord(headers: Headers) {
  return Object.fromEntries(headers.entries());
}

function getReachableCallbackUrl(callbackUrl: string) {
  try {
    const url = new URL(callbackUrl);
    const hostname = url.hostname.toLowerCase();

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return undefined;
    }

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) {
      return undefined;
    }

    return callbackUrl;
  } catch {
    return undefined;
  }
}

function containsCjkText(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

function getPromptTextFromPayload(request: unknown) {
  if (!isRecord(request) || !Array.isArray(request.content)) {
    return "";
  }

  return request.content
    .map((item) => {
      if (
        isRecord(item) &&
        item.type === "text" &&
        typeof item.text === "string"
      ) {
        return item.text;
      }

      return "";
    })
    .join("\n");
}

function buildGenerationDiagnostics(
  request: unknown,
  config: BytePlusConfig
) {
  const warnings: Array<{ code: string; message: string }> = [];
  const requestRecord = isRecord(request) ? request : {};

  if (!requestRecord.callback_url) {
    warnings.push({
      code: "LOCAL_CALLBACK_URL_OMITTED",
      message:
        "文档中的 callback_url 是可选项；当前配置是 localhost/内网地址，BytePlus 公网服务不可回调，因此真实请求已省略该字段并改用轮询查询任务状态。",
    });
  }

  if (containsCjkText(getPromptTextFromPayload(request))) {
    warnings.push({
      code: "PROMPT_LANGUAGE_NOT_LISTED_IN_EN_DOC",
      message:
        "当前英文文档列出的 Seedance 2.0 prompt 语言为英文，以及日语、印尼语、西班牙语、葡萄牙语；未列出中文。若上游拒绝，请先用英文 prompt 验证链路。",
    });
  }

  if (
    requestRecord.model === config.BYTEPLUS_SEEDANCE_2_FAST_ENDPOINT_ID &&
    requestRecord.resolution === "1080p"
  ) {
    warnings.push({
      code: "FAST_ENDPOINT_1080P_UNSUPPORTED",
      message: "文档说明 Seedance 2.0 Fast 不支持 1080p。",
    });
  }

  return {
    modelArkBaseUrl: config.byteplus.modelArkBaseUrl,
    callbackUrlIncluded: Boolean(requestRecord.callback_url),
    docs: {
      createTask:
        "POST https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks",
      promptLanguages:
        "English; Seedance 2.0/2.0 Fast additionally support Japanese, Indonesian, Spanish, Portuguese.",
      duration: "Seedance 2.0 series: integer [4,15] or -1.",
      ratio: "16:9, 4:3, 1:1, 3:4, 9:16, 21:9, adaptive.",
      resolution: "480p, 720p, 1080p; 1080p is not supported by Seedance 2.0 Fast.",
    },
    warnings,
  };
}

function assetRefToContent(
  assetRef: GenerationTaskRequest["assetRefs"][number]
): GenerationContentItem {
  const url = `asset://${assetRef.assetId}`;

  if (assetRef.assetKind === "Audio") {
    return {
      type: "audio_url",
      audio_url: { url },
      role: assetRef.role ?? "reference_audio",
    };
  }

  if (assetRef.assetKind === "Video") {
    return {
      type: "video_url",
      video_url: { url },
      role: assetRef.role ?? "reference_video",
    };
  }

  return {
    type: "image_url",
    image_url: { url },
    role: assetRef.role ?? "reference_image",
  };
}

function imageRefToContent(
  imageRef: GenerationTaskRequest["imageRefs"][number]
): GenerationContentItem {
  return {
    type: "image_url",
    image_url: { url: imageRef.url },
    role: imageRef.role ?? "reference_image",
  };
}

export function buildGenerationTaskPayload(
  input: GenerationTaskRequest,
  config: BytePlusConfig
): CreateGenerationTaskPayload {
  const useFastEndpoint =
    input.useFastEndpoint ?? config.generation.defaultUseFastEndpoint;
  const callbackUrl = getReachableCallbackUrl(
    config.BYTEPLUS_VIDEO_TASK_CALLBACK_URL
  );

  const payload: CreateGenerationTaskPayload = {
    model: getSeedanceEndpoint(config, useFastEndpoint),
    content: [
      {
        type: "text",
        text: input.prompt,
      },
      ...input.imageRefs.map(imageRefToContent),
      ...input.assetRefs.map(assetRefToContent),
    ],
    generate_audio:
      input.generateAudio ?? config.generation.defaultGenerateAudio,
    ratio: input.ratio ?? config.generation.defaultRatio,
    duration: input.duration ?? config.generation.defaultDuration,
    resolution: input.resolution ?? config.generation.defaultResolution,
    watermark: input.watermark ?? config.generation.defaultWatermark,
    safety_identifier: input.safetyIdentifier,
    seed: input.seed,
    priority: input.priority,
    return_last_frame: input.returnLastFrame,
  };

  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }

  return payload;
}

async function requestModelArk<T>(
  config: BytePlusConfig,
  pathname: string,
  init: RequestInit
) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${requireModelArkApiKey(config)}`);
  const upstreamUrl = getModelArkUrl(config, pathname);
  const startedAt = new Date();
  const request = parseRequestBodyForDiagnostics(init.body);

  let response: Response;

  try {
    response = await fetch(upstreamUrl, {
      ...init,
      headers,
    });
  } catch (error) {
    const endedAt = new Date();

    throw new BytePlusServiceError({
      code: "BYTEPLUS_MODELARK_FETCH_FAILED",
      message: `ModelArk 请求未收到响应：${getErrorMessage(error)}`,
      status: 502,
      provider: {
        phase: "modelark_fetch",
        upstream: {
          method: init.method ?? "GET",
          url: upstreamUrl,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMs: endedAt.getTime() - startedAt.getTime(),
          request,
        },
        diagnostics: buildGenerationDiagnostics(request, config),
        error: serializeError(error),
        diagnosis: [
          "后端 Next/Node 进程未能和 BytePlus ModelArk 建立 HTTPS 连接或等待上游响应超时。",
          "这类错误发生在上游返回 HTTP JSON 之前，因此不是 Seedance 任务状态。",
          "如本机浏览器/PowerShell 能通但 Node fetch 超时，优先检查 Node 进程是否能走代理或公网路由，例如 HTTPS_PROXY/系统代理/TUN 规则。",
        ],
      },
    });
  }

  const endedAt = new Date();
  const rawText = await response.text();
  const payload = (() => {
    if (!rawText) {
      return {};
    }

    try {
      return JSON.parse(rawText) as T & {
        error?: { code?: string; message?: string };
      };
    } catch {
      return { rawText };
    }
  })() as T & {
    code?: string;
    message?: string;
    error?: { code?: string; message?: string };
  };

  if (!response.ok) {
    throw new BytePlusServiceError({
      code:
        payload.error?.code ??
        ("code" in payload && typeof payload.code === "string"
          ? payload.code
          : undefined) ??
        `BYTEPLUS_MODELARK_HTTP_${String(response.status)}`,
      message:
        payload.error?.message ??
        ("message" in payload && typeof payload.message === "string"
          ? payload.message
          : undefined) ??
        `BytePlus ModelArk request failed with HTTP ${response.status}.`,
      status: response.status,
      provider: {
        phase: "modelark_response",
        upstream: {
          method: init.method ?? "GET",
          url: upstreamUrl,
          status: response.status,
          statusText: response.statusText,
          headers: headersToRecord(response.headers),
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMs: endedAt.getTime() - startedAt.getTime(),
          request,
        },
        diagnostics: buildGenerationDiagnostics(request, config),
        response: payload,
      },
    });
  }

  return payload as T;
}

export async function createBytePlusGenerationTask(
  input: GenerationTaskRequest,
  config: BytePlusConfig
) {
  const request = buildGenerationTaskPayload(input, config);
  const response = await requestModelArk<GenerationTaskResponse>(
    config,
    "/contents/generations/tasks",
    {
      method: "POST",
      body: JSON.stringify(request),
    }
  );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    taskId: response.id,
    status: response.status ?? "queued",
    request,
    diagnostics: buildGenerationDiagnostics(request, config),
    provider: response,
    pollAfterMs: config.polling.videoTaskPollIntervalMs,
    pollUrl: response.id
      ? appUrl(config, `/api/byteplus/generation-tasks/${response.id}`)
      : undefined,
  };
}

export async function listBytePlusGenerationTasks(
  config: BytePlusConfig,
  filters: {
    limit?: number;
    pageNum?: number;
    pageSize?: number;
    status?: string;
    model?: string;
    serviceTier?: string;
    after?: string;
    before?: string;
  } = {}
) {
  const searchParams = new URLSearchParams();

  if (filters.pageNum) {
    searchParams.set("page_num", String(filters.pageNum));
  }

  const pageSize = filters.pageSize ?? filters.limit;
  if (pageSize) {
    searchParams.set("page_size", String(pageSize));
  }

  if (filters.status) {
    searchParams.set("filter.status", filters.status);
  }

  if (filters.model) {
    searchParams.set("filter.model", filters.model);
  }

  if (filters.serviceTier) {
    searchParams.set("filter.service_tier", filters.serviceTier);
  }

  if (filters.after) {
    searchParams.set("after", filters.after);
  }

  if (filters.before) {
    searchParams.set("before", filters.before);
  }

  const query = searchParams.toString();
  const response = await requestModelArk<GenerationTaskListResponse>(
    config,
    `/contents/generations/tasks${query ? `?${query}` : ""}`,
    {
      method: "GET",
    }
  );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    items: response.data ?? response.items ?? [],
    hasMore: response.has_more,
    firstId: response.first_id,
    lastId: response.last_id,
    provider: response,
  };
}

export async function getBytePlusGenerationTaskStatus(
  taskId: string,
  config: BytePlusConfig
) {
  const response = await requestModelArk<GenerationTaskResponse>(
    config,
    `/contents/generations/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "GET",
    }
  );

  return {
    mode: "live",
    taskId: response.id ?? taskId,
    status: response.status,
    content: response.content,
    error: response.error,
    usage: response.usage,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
    provider: response,
  };
}

export async function cancelBytePlusGenerationTask(
  taskId: string,
  config: BytePlusConfig
) {
  const taskPath = `/contents/generations/tasks/${encodeURIComponent(taskId)}`;
  const currentTask = await getBytePlusGenerationTaskStatus(taskId, config);

  if (currentTask.status !== "queued") {
    return {
      mode: "live",
      taskId,
      action: "cancel",
      cancellable: false,
      httpStatus: 409,
      status: currentTask.status,
      message:
        `BytePlus 文档说明只有 queued 状态的视频生成任务可以取消；` +
        `当前任务状态是 ${currentTask.status ?? "unknown"}，未向上游发送 DELETE。`,
      provider: {
        docs: videoGenerationTaskActionDocs,
        preflight: {
          method: "GET",
          url: getModelArkUrl(config, taskPath),
          response: currentTask.provider,
        },
        cancelRequest: null,
      },
    };
  }

  const response = await requestModelArk<Record<string, unknown>>(
    config,
    taskPath,
    {
      method: "DELETE",
    }
  );

  return {
    mode: "live",
    taskId,
    action: "cancel",
    cancellable: true,
    httpStatus: 200,
    status: "cancelled",
    message: "queued 任务已按官方 DELETE 接口提交取消请求。",
    provider: {
      docs: videoGenerationTaskActionDocs,
      preflight: {
        method: "GET",
        url: getModelArkUrl(config, taskPath),
        response: currentTask.provider,
      },
      cancelRequest: {
        method: "DELETE",
        url: getModelArkUrl(config, taskPath),
        response,
        responseNote: videoGenerationTaskActionDocs.response,
      },
    },
  };
}

export async function deleteBytePlusGenerationTask(
  taskId: string,
  config: BytePlusConfig
) {
  const taskPath = `/contents/generations/tasks/${encodeURIComponent(taskId)}`;
  const response = await requestModelArk<GenerationTaskResponse>(
    config,
    taskPath,
    {
      method: "DELETE",
    }
  );

  return {
    mode: "live",
    taskId: response.id ?? taskId,
    action: "delete",
    status: response.status ?? "deleted",
    provider: {
      docs: videoGenerationTaskActionDocs,
      deleteRequest: {
        method: "DELETE",
        url: getModelArkUrl(config, taskPath),
        response,
        responseNote: videoGenerationTaskActionDocs.response,
      },
    },
  };
}
