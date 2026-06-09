import { appUrl } from "@/lib/app-url";
import type { BytePlusConfig } from "@/lib/byteplus-config";
import { getSeedanceEndpoint } from "@/lib/byteplus-config";
import type {
  AssetGroupRequest,
  AssetUploadRequest,
  GenerationTaskRequest,
  RealPersonSessionRequest,
} from "@/lib/byteplus-contracts";

function compactTimestamp() {
  return new Date().toISOString().replace(/\D/g, "").slice(0, 14);
}

function addMinutes(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function normalizeIdPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function createLocalFallbackRealPersonSession(
  input: RealPersonSessionRequest,
  config: BytePlusConfig
) {
  const stamp = compactTimestamp();
  const sessionId = `vvs-${stamp}-${normalizeIdPart(input.userId).slice(0, 16)}`;

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    sessionId,
    groupId: `group-${stamp}-${normalizeIdPart(config.BYTEPLUS_PROJECT_NAME)}`,
    validateUrl: appUrl(
      config,
      `/identity/validate?session_id=${encodeURIComponent(sessionId)}`
    ),
    callbackUrl: config.BYTEPLUS_REAL_PERSON_CALLBACK_URL,
    expiresAt: addMinutes(30),
  };
}

export function createLocalFallbackVisualValidateResult(
  bytedToken: string,
  config: BytePlusConfig
) {
  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    bytedToken,
    resultCode: "10000",
    algorithmBaseRespCode: "0",
    reqMeasureInfoValue: "0",
    verifyType: "real_time",
    groupId: `group-${compactTimestamp()}-${normalizeIdPart(config.BYTEPLUS_PROJECT_NAME)}`,
  };
}

export function createLocalFallbackAsset(
  input: AssetUploadRequest,
  config: BytePlusConfig
) {
  const stamp = compactTimestamp();
  const assetId = `asset-${stamp}-${normalizeIdPart(input.assetKind)}`;
  const sourceName =
    input.fileName ?? input.name ?? input.url?.split("/").pop() ?? "asset";

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId: input.groupId,
    asset: {
      assetId,
      assetKind: input.assetKind,
      fileName: sourceName,
      purpose: input.purpose ?? "reference",
      status: "Processing",
      nextStatus: "Active",
    },
    pollAfterMs: config.polling.assetPollIntervalMs,
    pollUrl: appUrl(
      config,
      `/api/byteplus/assets?asset_id=${encodeURIComponent(assetId)}`
    ),
  };
}

export function createLocalFallbackAssetList(config: BytePlusConfig) {
  const stamp = compactTimestamp();

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    items: [
      {
        assetId: `asset-${stamp}-image`,
        groupId: `group-${stamp}-default`,
        assetKind: "Image",
        name: "front-portrait",
        status: "Active",
      },
      {
        assetId: `asset-${stamp}-audio`,
        groupId: `group-${stamp}-default`,
        assetKind: "Audio",
        name: "dance-beat",
        status: "Processing",
      },
    ],
    total: 2,
  };
}

export function createLocalFallbackAssetGroup(
  input: AssetGroupRequest,
  config: BytePlusConfig
) {
  const stamp = compactTimestamp();
  const groupId = `group-${stamp}-${normalizeIdPart(input.name).slice(0, 16)}`;

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId,
    groupType: input.groupType,
    name: input.name,
    title: input.title,
    description: input.description,
  };
}

export function createLocalFallbackAssetGroupList(config: BytePlusConfig) {
  const stamp = compactTimestamp();

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    items: [
      {
        groupId: `group-${stamp}-real-human`,
        name: "verified-real-human",
        groupType: "REAL_HUMAN",
        status: "Active",
      },
      {
        groupId: `group-${stamp}-virtual`,
        name: "virtual-dancer",
        groupType: "AIGC",
        status: "Active",
      },
    ],
    total: 2,
  };
}

export function createLocalFallbackGenerationTask(
  input: GenerationTaskRequest,
  config: BytePlusConfig
) {
  const useFastEndpoint =
    input.useFastEndpoint ?? config.generation.defaultUseFastEndpoint;
  const model = getSeedanceEndpoint(config, useFastEndpoint);
  const taskId = `cgt-${compactTimestamp()}-${useFastEndpoint ? "fast" : "standard"}`;
  const content = [
    {
      type: "text",
      text: input.prompt,
    },
    ...input.imageRefs.map((imageRef) => ({
      type: "image_url",
      image_url: { url: imageRef.url },
      role: imageRef.role ?? "reference_image",
    })),
    ...input.assetRefs.map((assetRef) => {
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
    }),
  ];

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    taskId,
    status: "queued",
    request: {
      model,
      content,
      ratio: input.ratio ?? config.generation.defaultRatio,
      duration: input.duration ?? config.generation.defaultDuration,
      resolution: input.resolution ?? config.generation.defaultResolution,
      generate_audio:
        input.generateAudio ?? config.generation.defaultGenerateAudio,
      watermark: input.watermark ?? config.generation.defaultWatermark,
      safety_identifier: input.safetyIdentifier,
      seed: input.seed,
      priority: input.priority,
      return_last_frame: input.returnLastFrame,
      callback_url: config.BYTEPLUS_VIDEO_TASK_CALLBACK_URL,
    },
    pollAfterMs: config.polling.videoTaskPollIntervalMs,
    pollUrl: appUrl(config, `/api/byteplus/generation-tasks/${taskId}`),
  };
}

export function createLocalFallbackGenerationTaskList(config: BytePlusConfig) {
  const stamp = compactTimestamp();

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    items: [
      {
        taskId: `cgt-${stamp}-standard`,
        status: "queued",
        model: getSeedanceEndpoint(config, false),
      },
      {
        taskId: `cgt-${stamp}-fast`,
        status: "succeeded",
        model: getSeedanceEndpoint(config, true),
        content: {
          video_url: appUrl(config, `/works/cgt-${stamp}-fast.mp4`),
        },
      },
    ],
    total: 2,
  };
}

export function createLocalFallbackGenerationTaskStatus(
  taskId: string,
  config: BytePlusConfig
) {
  return {
    mode: "local",
    taskId,
    status: "succeeded",
    content: {
      video_url: appUrl(config, `/works/${encodeURIComponent(taskId)}.mp4`),
    },
    expiresAt: addMinutes(24 * 60),
  };
}

export function createLocalFallbackGenerationTaskAction(
  taskId: string,
  action: "cancel" | "delete"
) {
  return {
    mode: "local",
    taskId,
    action,
    status: action === "cancel" ? "cancelled" : "deleted",
  };
}
