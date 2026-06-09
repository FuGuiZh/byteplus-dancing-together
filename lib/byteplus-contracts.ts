import { z } from "zod";

export const assetKindSchema = z.enum(["Image", "Video", "Audio"]);

export const realPersonSessionRequestSchema = z.object({
  userId: z.string().min(1).default("local-user"),
  returnUrl: z.string().url().optional(),
});

export const visualValidateResultRequestSchema = z.object({
  bytedToken: z.string().min(1),
});

export const assetUploadRequestSchema = z.object({
  assetKind: assetKindSchema,
  fileName: z.string().min(1).optional(),
  url: z.string().url().optional(),
  name: z.string().min(1).optional(),
  groupId: z.string().min(1),
  purpose: z.string().min(1).optional(),
  moderationStrategy: z.enum(["Default", "Skip"]).optional(),
});

export const assetGroupRequestSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  groupType: z.enum(["AIGC"]).default("AIGC"),
});

export const generationTaskActionRequestSchema = z.object({
  action: z.enum(["cancel", "delete"]),
});

export const generationAssetRefSchema = z.object({
  assetId: z.string().min(1),
  assetKind: assetKindSchema,
  role: z.string().min(1).optional(),
});

export const generationImageRefSchema = z.object({
  url: z.string().min(1),
  role: z.string().min(1).optional(),
});

export const generationTaskRequestSchema = z.object({
  groupId: z.string().min(1).optional(),
  assetRefs: z.array(generationAssetRefSchema).default([]),
  imageRefs: z.array(generationImageRefSchema).default([]),
  prompt: z.string().min(1),
  useFastEndpoint: z.boolean().optional(),
  ratio: z.string().min(1).optional(),
  duration: z.union([z.number().int().positive(), z.literal(-1)]).optional(),
  resolution: z.string().min(1).optional(),
  generateAudio: z.boolean().optional(),
  safetyIdentifier: z.string().min(1).optional(),
  seed: z.number().int().min(-1).max(2 ** 32 - 1).optional(),
  priority: z.number().int().min(0).max(9).optional(),
  watermark: z.boolean().optional(),
  returnLastFrame: z.boolean().optional(),
});

export type RealPersonSessionRequest = z.infer<
  typeof realPersonSessionRequestSchema
>;
export type VisualValidateResultRequest = z.infer<
  typeof visualValidateResultRequestSchema
>;
export type AssetUploadRequest = z.infer<typeof assetUploadRequestSchema>;
export type AssetGroupRequest = z.infer<typeof assetGroupRequestSchema>;
export type GenerationTaskActionRequest = z.infer<
  typeof generationTaskActionRequestSchema
>;
export type GenerationTaskRequest = z.infer<
  typeof generationTaskRequestSchema
>;
