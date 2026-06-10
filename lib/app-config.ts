import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

const defaultBytePlusConfig = {
  logPayloads: false,
  modelArkBaseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3",
  openApiHost: "ark.ap-southeast-1.byteplusapi.com",
  openApiProtocol: "https" as const,
};

const defaultGenerationConfig = {
  defaultRatio: "16:9",
  defaultDuration: 4,
  defaultResolution: "480p",
  defaultGenerateAudio: true,
  defaultUseFastEndpoint: true,
  defaultWatermark: false,
};

const defaultPollingConfig = {
  assetPollIntervalMs: 5000,
  videoTaskPollIntervalMs: 15000,
};

const appConfigSchema = z.object({
  byteplus: z
    .object({
      logPayloads: z.boolean().default(false),
      modelArkBaseUrl: z
        .string()
        .url()
        .default("https://ark.ap-southeast.bytepluses.com/api/v3"),
      openApiHost: z
        .string()
        .min(1)
        .default("ark.ap-southeast-1.byteplusapi.com"),
      openApiProtocol: z.enum(["http", "https"]).default("https"),
    })
    .default(defaultBytePlusConfig),
  generation: z
    .object({
      defaultRatio: z.string().min(1).default("16:9"),
      defaultDuration: z.number().int().positive().default(4),
      defaultResolution: z.string().min(1).default("480p"),
      defaultGenerateAudio: z.boolean().default(true),
      defaultUseFastEndpoint: z.boolean().default(true),
      defaultWatermark: z.boolean().default(false),
    })
    .default(defaultGenerationConfig),
  polling: z
    .object({
      assetPollIntervalMs: z.number().int().positive().default(5000),
      videoTaskPollIntervalMs: z.number().int().positive().default(15000),
    })
    .default(defaultPollingConfig),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

const configFile = join(process.cwd(), "config", "byteplus-dancing-together.json");
const localConfigFile = join(
  process.cwd(),
  "config",
  "byteplus-dancing-together.local.json"
);

function readJsonFile(pathname: string) {
  if (!existsSync(pathname)) {
    return {};
  }

  return JSON.parse(readFileSync(pathname, "utf8")) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeJson(base: unknown, override: unknown): unknown {
  if (!isRecord(base) || !isRecord(override)) {
    return override ?? base;
  }

  return Object.entries(override).reduce<Record<string, unknown>>(
    (result, [key, value]) => {
      result[key] = mergeJson(result[key], value);
      return result;
    },
    { ...base }
  );
}

export function getAppConfig() {
  const baseConfig = readJsonFile(configFile);
  const localConfig = readJsonFile(localConfigFile);

  return appConfigSchema.parse(mergeJson(baseConfig, localConfig));
}
