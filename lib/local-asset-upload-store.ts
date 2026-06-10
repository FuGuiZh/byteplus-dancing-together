import { randomUUID } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";

import { getUserDataDirectory } from "@/lib/user-data-directory";

const assetUploadDirectoryName = "asset-library-uploads";

const imageExtensionsByMime: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const maxAssetImageUploadBytes = 30 * 1024 * 1024;

export interface StoredAssetUploadFile {
  contentType: string;
  fileId: string;
  localPath: string;
  originalName: string;
  size: number;
}

export function getAssetUploadDirectory() {
  return join(getUserDataDirectory(), assetUploadDirectoryName);
}

export function getAssetUploadFilePath(fileId: string) {
  const uploadDirectory = resolve(getAssetUploadDirectory());
  const safeFileName = basename(fileId);
  const filePath = resolve(uploadDirectory, safeFileName);
  const relativePath = relative(uploadDirectory, filePath);

  if (relativePath.startsWith("..") || relativePath === "" || relativePath.includes(":")) {
    throw new Error("文件路径不在素材上传目录内。");
  }

  return filePath;
}

export function getAssetUploadContentType(filePath: string) {
  const extension = extname(filePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  if (extension === ".gif") {
    return "image/gif";
  }

  return "image/png";
}

export async function readAssetUploadFileStat(fileId: string) {
  const localPath = getAssetUploadFilePath(fileId);
  const fileStat = await stat(localPath);
  return {
    contentType: getAssetUploadContentType(localPath),
    fileStat,
    localPath,
  };
}

export async function storeAssetUploadImage({
  buffer,
  contentType,
  originalName,
}: {
  buffer: Buffer;
  contentType: string;
  originalName: string;
}): Promise<StoredAssetUploadFile> {
  if (!contentType.startsWith("image/")) {
    throw new Error("只支持上传图片素材。");
  }

  if (buffer.byteLength > maxAssetImageUploadBytes) {
    throw new Error("图片不能超过 30 MB。");
  }

  const extension =
    imageExtensionsByMime[contentType] ||
    extname(originalName).toLowerCase() ||
    ".png";
  const fileId = `${randomUUID()}${extension}`;
  const uploadDirectory = getAssetUploadDirectory();
  const localPath = join(uploadDirectory, fileId);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(localPath, buffer);

  return {
    contentType,
    fileId,
    localPath,
    originalName,
    size: buffer.byteLength,
  };
}
