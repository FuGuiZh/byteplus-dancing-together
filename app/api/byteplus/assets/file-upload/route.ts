import { NextResponse } from "next/server";

import { getErrorStatus, toErrorPayload } from "@/lib/api-request";
import { appUrl, isPubliclyReachableHostname } from "@/lib/app-url";
import {
  getBytePlusConfig,
  shouldUseLocalBytePlusFallback,
} from "@/lib/byteplus-config";
import type { AssetUploadRequest } from "@/lib/byteplus-contracts";
import { BytePlusServiceError } from "@/lib/byteplus-errors";
import { createLocalFallbackAsset } from "@/lib/byteplus-local-fallback";
import { createBytePlusAsset } from "@/lib/byteplus-openapi-client";
import { storeAssetUploadImage } from "@/lib/local-asset-upload-store";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readFiles(formData: FormData) {
  return [...formData.getAll("files"), ...formData.getAll("file")].filter(
    (value): value is File =>
      typeof value === "object" &&
      value !== null &&
      "arrayBuffer" in value &&
      "name" in value &&
      "type" in value
  );
}

function getFileAssetName(file: File, fallbackName?: string) {
  if (fallbackName) {
    return fallbackName;
  }

  const fileName = file.name || "uploaded-image";
  const extensionIndex = fileName.lastIndexOf(".");
  return extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
}

function getPublicUrlWarning(publicUrl: string) {
  try {
    const { hostname } = new URL(publicUrl);

    if (!isPubliclyReachableHostname(hostname)) {
      return "当前 APP_PUBLIC_URL 是本机地址，BytePlus 公网服务通常无法拉取这个 URL；部署到 Render 等公网环境后再提交会更可靠。";
    }
  } catch {
    return "APP_PUBLIC_URL 不是可解析 URL，BytePlus 可能无法拉取素材。";
  }

  return undefined;
}

function getPublicUrlDiagnostic(publicUrl: string) {
  const warning = getPublicUrlWarning(publicUrl);

  if (!warning) {
    return {
      ok: true,
      publicUrl,
    };
  }

  return {
    ok: false,
    publicUrl,
    warning,
    fix: [
      "把 APP_PUBLIC_URL 改成当前服务的公网 HTTPS 地址，例如 Render 的 https://xxx.onrender.com。",
      "确保上传文件保存目录和当前运行的服务是同一台机器；本地文件不能用 Render 域名代为访问。",
      "或者先把图片上传到对象存储、CDN、公开静态文件服务，再用 URL 入库。",
    ],
  };
}

export async function POST(request: Request) {
  try {
    const config = getBytePlusConfig();
    const formData = await request.formData();
    const groupId = readString(formData, "groupId");
    const moderationStrategy =
      readString(formData, "moderationStrategy") === "Skip" ? "Skip" : "Default";
    const requestedName = readString(formData, "name");
    const files = readFiles(formData);

    if (!groupId) {
      throw new BytePlusServiceError({
        code: "BYTEPLUS_ASSET_GROUP_REQUIRED",
        message: "图片入库需要先选择素材组。",
        status: 400,
      });
    }

    if (files.length === 0) {
      throw new BytePlusServiceError({
        code: "BYTEPLUS_ASSET_IMAGE_REQUIRED",
        message: "请至少选择一张图片。",
        status: 400,
      });
    }

    const uploaded = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storedFile = await storeAssetUploadImage({
        buffer,
        contentType: file.type || "image/png",
        originalName: file.name || "uploaded-image.png",
      });
      const publicUrl = appUrl(
        config,
        `/api/local/asset-upload-files/${encodeURIComponent(storedFile.fileId)}`,
        {
          preferRequestOriginForLocalConfig: true,
          request,
        }
      );
      const assetInput: AssetUploadRequest = {
        assetKind: "Image",
        fileName: storedFile.originalName,
        groupId,
        moderationStrategy,
        name: getFileAssetName(file, files.length === 1 ? requestedName : undefined),
        purpose: "reference",
        url: publicUrl,
      };
      const fileInfo = {
        contentType: storedFile.contentType,
        fileId: storedFile.fileId,
        localPath: storedFile.localPath,
        originalName: storedFile.originalName,
        publicUrl,
        configuredAppPublicUrl: config.APP_PUBLIC_URL,
        publicUrlDiagnostic: getPublicUrlDiagnostic(publicUrl),
        publicUrlWarning: getPublicUrlWarning(publicUrl),
        size: storedFile.size,
      };

      if (
        !shouldUseLocalBytePlusFallback(config) &&
        !fileInfo.publicUrlDiagnostic.ok
      ) {
        uploaded.push({
          ok: false,
          assetInput,
          error: {
            code: "BYTEPLUS_ASSET_PUBLIC_URL_UNREACHABLE",
            message: "BytePlus CreateAsset 需要公网可访问的素材 URL。",
            diagnostic: fileInfo.publicUrlDiagnostic,
          },
          file: fileInfo,
        });
        continue;
      }

      try {
        const createdAsset = shouldUseLocalBytePlusFallback(config)
          ? createLocalFallbackAsset(assetInput, config)
          : await createBytePlusAsset(assetInput, config);

        uploaded.push({
          ok: true,
          assetInput,
          createdAsset,
          file: fileInfo,
        });
      } catch (error) {
        uploaded.push({
          ok: false,
          assetInput,
          error: toErrorPayload(error),
          file: fileInfo,
        });
      }
    }

    const successCount = uploaded.filter((item) => item.ok).length;
    const failedCount = uploaded.length - successCount;
    const status =
      failedCount === 0 ? 200 : successCount > 0 ? 207 : 400;

    return NextResponse.json({
      mode: shouldUseLocalBytePlusFallback(config) ? "local" : "live",
      projectName: config.BYTEPLUS_PROJECT_NAME,
      uploadedCount: uploaded.length,
      successCount,
      failedCount,
      uploaded,
    }, { status });
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
