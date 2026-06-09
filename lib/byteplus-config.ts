import { z } from "zod";

import { getAppConfig, type AppConfig } from "@/lib/app-config";

const bytePlusConfigSchema = z.object({
  BYTEPLUS_REGION: z.string().min(1).default("ap-southeast-1"),
  BYTEPLUS_IAM_ACCESS_KEY_ID: z.string().optional(),
  BYTEPLUS_IAM_SECRET_ACCESS_KEY: z.string().optional(),
  BYTEPLUS_MODELARK_API_KEY: z.string().optional(),
  BYTEPLUS_PROJECT_NAME: z.string().min(1).default("default"),
  BYTEPLUS_SEEDANCE_2_ENDPOINT_ID: z.string().min(1),
  BYTEPLUS_SEEDANCE_2_FAST_ENDPOINT_ID: z.string().min(1),
  APP_PUBLIC_URL: z.string().url(),
  BYTEPLUS_REAL_PERSON_CALLBACK_URL: z.string().url(),
  BYTEPLUS_VIDEO_TASK_CALLBACK_URL: z.string().url(),
});

export type BytePlusEnvConfig = z.infer<typeof bytePlusConfigSchema>;
export type BytePlusConfig = BytePlusEnvConfig & AppConfig;

export const requiredRealApiEnvKeys = [
  "BYTEPLUS_IAM_ACCESS_KEY_ID",
  "BYTEPLUS_IAM_SECRET_ACCESS_KEY",
  "BYTEPLUS_MODELARK_API_KEY",
] as const;

export function getBytePlusConfig() {
  return {
    ...bytePlusConfigSchema.parse(process.env),
    ...getAppConfig(),
  };
}

export function hasBytePlusCredentials(config: BytePlusConfig) {
  return requiredRealApiEnvKeys.every((key) => Boolean(config[key]));
}

export function hasModelArkCredentials(config: BytePlusConfig) {
  return Boolean(config.BYTEPLUS_MODELARK_API_KEY);
}

export function shouldUseLocalBytePlusFallback(config: BytePlusConfig) {
  return !hasBytePlusCredentials(config);
}

export function shouldUseLocalModelArkFallback(config: BytePlusConfig) {
  return !hasModelArkCredentials(config);
}

export function getSeedanceEndpoint(config: BytePlusConfig, useFast: boolean) {
  return useFast
    ? config.BYTEPLUS_SEEDANCE_2_FAST_ENDPOINT_ID
    : config.BYTEPLUS_SEEDANCE_2_ENDPOINT_ID;
}
