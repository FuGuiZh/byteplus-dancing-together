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
export const assetImageDimensionLimits = {
  max: 6000,
  min: 300,
};

export interface AssetImageDimensions {
  height: number;
  width: number;
}

export interface StoredAssetUploadFile {
  contentType: string;
  dimensions?: AssetImageDimensions;
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
  dimensions,
  originalName,
}: {
  buffer: Buffer;
  contentType: string;
  dimensions?: AssetImageDimensions;
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
    dimensions,
    fileId,
    localPath,
    originalName,
    size: buffer.byteLength,
  };
}

export function readAssetImageDimensions({
  buffer,
  contentType,
  originalName,
}: {
  buffer: Buffer;
  contentType: string;
  originalName: string;
}) {
  const normalizedContentType = contentType.toLowerCase();
  const extension = extname(originalName).toLowerCase();

  if (
    normalizedContentType === "image/png" ||
    extension === ".png"
  ) {
    return readPngDimensions(buffer);
  }

  if (
    normalizedContentType === "image/jpeg" ||
    normalizedContentType === "image/jpg" ||
    extension === ".jpg" ||
    extension === ".jpeg"
  ) {
    return readJpegDimensions(buffer);
  }

  if (
    normalizedContentType === "image/gif" ||
    extension === ".gif"
  ) {
    return readGifDimensions(buffer);
  }

  if (
    normalizedContentType === "image/webp" ||
    extension === ".webp"
  ) {
    return readWebpDimensions(buffer);
  }

  if (
    normalizedContentType === "image/bmp" ||
    extension === ".bmp"
  ) {
    return readBmpDimensions(buffer);
  }

  return undefined;
}

export function getAssetImageDimensionError(
  dimensions: AssetImageDimensions | undefined
) {
  if (!dimensions) {
    return undefined;
  }

  const { max, min } = assetImageDimensionLimits;
  const tooSmall = dimensions.width < min || dimensions.height < min;
  const tooLarge = dimensions.width > max || dimensions.height > max;

  if (!tooSmall && !tooLarge) {
    return undefined;
  }

  return {
    code: tooSmall
      ? "BYTEPLUS_ASSET_IMAGE_DIMENSION_TOO_SMALL"
      : "BYTEPLUS_ASSET_IMAGE_DIMENSION_TOO_LARGE",
    message: `图片尺寸不符合 BytePlus CreateAsset 要求：宽高都需要在 ${min}px 到 ${max}px 之间；当前为 ${dimensions.width}x${dimensions.height}px。`,
  };
}

function readPngDimensions(buffer: Buffer) {
  const pngSignature = "89504e470d0a1a0a";

  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return undefined;
  }

  return {
    height: buffer.readUInt32BE(20),
    width: buffer.readUInt32BE(16),
  };
}

function readGifDimensions(buffer: Buffer) {
  if (
    buffer.length < 10 ||
    (buffer.subarray(0, 6).toString("ascii") !== "GIF87a" &&
      buffer.subarray(0, 6).toString("ascii") !== "GIF89a")
  ) {
    return undefined;
  }

  return {
    height: buffer.readUInt16LE(8),
    width: buffer.readUInt16LE(6),
  };
}

function readBmpDimensions(buffer: Buffer) {
  if (buffer.length < 26 || buffer.subarray(0, 2).toString("ascii") !== "BM") {
    return undefined;
  }

  return {
    height: Math.abs(buffer.readInt32LE(22)),
    width: Math.abs(buffer.readInt32LE(18)),
  };
}

function readJpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return undefined;
  }

  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (buffer[offset] === 0xff) {
      offset += 1;
    }

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 2 > buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break;
    }

    if (isJpegStartOfFrameMarker(marker) && segmentLength >= 7) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += segmentLength;
  }

  return undefined;
}

function isJpegStartOfFrameMarker(marker: number) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function readWebpDimensions(buffer: Buffer) {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    return undefined;
  }

  const chunkType = buffer.subarray(12, 16).toString("ascii");
  const dataOffset = 20;

  if (chunkType === "VP8X" && buffer.length >= dataOffset + 10) {
    return {
      height: readUInt24LE(buffer, dataOffset + 7) + 1,
      width: readUInt24LE(buffer, dataOffset + 4) + 1,
    };
  }

  if (
    chunkType === "VP8 " &&
    buffer.length >= dataOffset + 10 &&
    buffer[dataOffset + 3] === 0x9d &&
    buffer[dataOffset + 4] === 0x01 &&
    buffer[dataOffset + 5] === 0x2a
  ) {
    return {
      height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
    };
  }

  if (
    chunkType === "VP8L" &&
    buffer.length >= dataOffset + 5 &&
    buffer[dataOffset] === 0x2f
  ) {
    const bits = buffer.readUInt32LE(dataOffset + 1);

    return {
      height: ((bits >> 14) & 0x3fff) + 1,
      width: (bits & 0x3fff) + 1,
    };
  }

  return undefined;
}

function readUInt24LE(buffer: Buffer, offset: number) {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}
