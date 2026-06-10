import { appUrl } from "@/lib/app-url";
import type { BytePlusConfig } from "@/lib/byteplus-config";
import { getSeedanceEndpoint } from "@/lib/byteplus-config";
import type {
  AssetGroupRequest,
  AssetGroupUpdateRequest,
  AssetUpdateRequest,
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
  const updatedAt = new Date().toISOString();

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    items: [
      {
        Id: `asset-${stamp}-image`,
        assetId: `asset-${stamp}-image`,
        GroupId: `group-${stamp}-virtual`,
        groupId: `group-${stamp}-default`,
        AssetType: "Image",
        assetKind: "Image",
        Name: "front-portrait",
        URL: "https://example.com/assets/front-portrait.png",
        Status: "Active",
        Moderation: { Strategy: "Default" },
        ProjectName: config.BYTEPLUS_PROJECT_NAME,
        CreateTime: updatedAt,
        UpdateTime: updatedAt,
      },
      {
        Id: `asset-${stamp}-audio`,
        assetId: `asset-${stamp}-audio`,
        GroupId: `group-${stamp}-virtual`,
        groupId: `group-${stamp}-default`,
        AssetType: "Audio",
        assetKind: "Audio",
        Name: "dance-beat",
        URL: "https://example.com/assets/dance-beat.mp3",
        Status: "Processing",
        Moderation: { Strategy: "Default" },
        ProjectName: config.BYTEPLUS_PROJECT_NAME,
        CreateTime: updatedAt,
        UpdateTime: updatedAt,
      },
    ],
    TotalCount: 2,
    total: 2,
  };
}

export function createLocalFallbackAssetDetail(
  assetId: string,
  config: BytePlusConfig
) {
  const updatedAt = new Date().toISOString();
  const normalizedId = normalizeIdPart(assetId);
  const assetKind = normalizedId.includes("audio")
    ? "Audio"
    : normalizedId.includes("video")
      ? "Video"
      : "Image";

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    assetId,
    asset: {
      Id: assetId,
      Name: assetId,
      URL: `https://example.com/assets/${assetId}`,
      GroupId: `group-${compactTimestamp()}-virtual`,
      AssetType: assetKind,
      Status: "Active",
      Moderation: { Strategy: "Default" },
      ProjectName: config.BYTEPLUS_PROJECT_NAME,
      CreateTime: updatedAt,
      UpdateTime: updatedAt,
    },
  };
}

export function createLocalFallbackAssetUpdate(
  assetId: string,
  input: AssetUpdateRequest,
  config: BytePlusConfig
) {
  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    assetId,
    updated: true,
    asset: {
      Id: assetId,
      Name: input.name,
      UpdateTime: new Date().toISOString(),
    },
  };
}

export function createLocalFallbackAssetDelete(
  assetId: string,
  config: BytePlusConfig
) {
  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    assetId,
    deleted: true,
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
  const updatedAt = new Date().toISOString();

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    items: [
      {
        Id: `group-${stamp}-real-human`,
        groupId: `group-${stamp}-real-human`,
        Name: "verified-real-human",
        Description: "真人认证生成的 LivenessFace 素材组。",
        GroupType: "LivenessFace",
        ProjectName: config.BYTEPLUS_PROJECT_NAME,
        CreateTime: updatedAt,
        UpdateTime: updatedAt,
      },
      {
        Id: `group-${stamp}-virtual`,
        groupId: `group-${stamp}-virtual`,
        Name: "virtual-dancer",
        Description: "可手动创建的 AIGC 私域素材组。",
        GroupType: "AIGC",
        ProjectName: config.BYTEPLUS_PROJECT_NAME,
        CreateTime: updatedAt,
        UpdateTime: updatedAt,
      },
    ],
    TotalCount: 2,
    total: 2,
  };
}

export function createLocalFallbackAssetGroupDetail(
  groupId: string,
  config: BytePlusConfig
) {
  const updatedAt = new Date().toISOString();

  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId,
    assetGroup: {
      Id: groupId,
      Name: groupId,
      Description: "本地兜底素材组详情。",
      GroupType: groupId.toLowerCase().includes("real")
        ? "LivenessFace"
        : "AIGC",
      ProjectName: config.BYTEPLUS_PROJECT_NAME,
      CreateTime: updatedAt,
      UpdateTime: updatedAt,
    },
  };
}

export function createLocalFallbackAssetGroupUpdate(
  groupId: string,
  input: AssetGroupUpdateRequest,
  config: BytePlusConfig
) {
  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId,
    updated: true,
    assetGroup: {
      Id: groupId,
      Name: input.name ?? groupId,
      Description: input.description,
      UpdateTime: new Date().toISOString(),
    },
  };
}

export function createLocalFallbackAssetGroupDelete(
  groupId: string,
  config: BytePlusConfig
) {
  return {
    mode: "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId,
    deleted: true,
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
