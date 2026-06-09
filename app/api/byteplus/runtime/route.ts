import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  getBytePlusConfig,
  hasBytePlusCredentials,
  hasModelArkCredentials,
  shouldUseLocalBytePlusFallback,
  shouldUseLocalModelArkFallback,
} from "@/lib/byteplus-config";

const localSecretEnvKeys = [
  "BYTEPLUS_IAM_ACCESS_KEY_ID",
  "BYTEPLUS_IAM_SECRET_ACCESS_KEY",
  "BYTEPLUS_MODELARK_API_KEY",
  "BYTEPLUS_SEEDANCE_2_ENDPOINT_ID",
  "BYTEPLUS_SEEDANCE_2_FAST_ENDPOINT_ID",
] as const;

function hasConcreteLocalEnvValue(key: string, value: string | undefined) {
  if (!value) {
    return false;
  }

  if (value.includes("填写") || value.includes("xxxxx")) {
    return false;
  }

  if (key.includes("KEY") && value.length < 8) {
    return false;
  }

  return true;
}

function readLocalEnvStatus() {
  const envPath = join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return {
      exists: false,
      hasConfiguredValues: false,
      keys: Object.fromEntries(
        localSecretEnvKeys.map((key) => [key, false])
      ) as Record<(typeof localSecretEnvKeys)[number], boolean>,
    };
  }

  const content = readFileSync(envPath, "utf8");
  const keys = Object.fromEntries(
    localSecretEnvKeys.map((key) => {
      const match = content.match(
        new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`, "m")
      );
      const value = match?.[1]?.replace(/^['"]|['"]$/g, "").trim();

      return [key, hasConcreteLocalEnvValue(key, value)];
    })
  ) as Record<(typeof localSecretEnvKeys)[number], boolean>;

  return {
    exists: true,
    hasConfiguredValues: Object.values(keys).every(Boolean),
    keys,
  };
}

export async function GET() {
  const config = getBytePlusConfig();
  const localEnv = readLocalEnvStatus();
  const openApiConnected = !shouldUseLocalBytePlusFallback(config);
  const modelArkConnected = !shouldUseLocalModelArkFallback(config);

  return NextResponse.json({
    mode: openApiConnected && modelArkConnected ? "live" : "local",
    modelArkMode: modelArkConnected ? "live" : "local",
    openApiMode: openApiConnected ? "live" : "local",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    hasCredentials: hasBytePlusCredentials(config),
    hasModelArkCredentials: hasModelArkCredentials(config),
    apiConnection: {
      openApi: openApiConnected ? "connected" : "missing_credentials",
      modelArk: modelArkConnected ? "connected" : "missing_api_key",
    },
    localEnv,
    credentials: {
      iamAccessKeyId: Boolean(config.BYTEPLUS_IAM_ACCESS_KEY_ID),
      iamSecretAccessKey: Boolean(config.BYTEPLUS_IAM_SECRET_ACCESS_KEY),
      modelArkApiKey: Boolean(config.BYTEPLUS_MODELARK_API_KEY),
    },
    endpoints: {
      standard: config.BYTEPLUS_SEEDANCE_2_ENDPOINT_ID,
      fast: config.BYTEPLUS_SEEDANCE_2_FAST_ENDPOINT_ID,
    },
    urls: {
      modelArkBaseUrl: config.byteplus.modelArkBaseUrl,
      openApiHost: config.byteplus.openApiHost,
      realPersonCallbackUrl: config.BYTEPLUS_REAL_PERSON_CALLBACK_URL,
      videoTaskCallbackUrl: config.BYTEPLUS_VIDEO_TASK_CALLBACK_URL,
    },
    polling: config.polling,
    generation: config.generation,
  });
}
