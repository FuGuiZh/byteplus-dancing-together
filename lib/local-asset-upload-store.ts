import { randomUUID } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";

import { getUserDataDirectory } from "@/lib/user-data-directory";

const assetUploadDirectoryName = "asset-library-uploads";

export type StoredAssetKind = "Image" | "Video" | "Audio";

const supportedImageExtensions = new Set([
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);
const supportedVideoExtensions = new Set([".mp4", ".mov"]);
const supportedAudioExtensions = new Set([".mp3", ".wav"]);
const supportedImageMimeTypes = new Set([
  "image/bmp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
  "image/webp",
]);
const supportedVideoMimeTypes = new Set(["video/mp4", "video/quicktime"]);
const supportedAudioMimeTypes = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
]);

const assetExtensionsByMime: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
};

export const maxAssetImageUploadBytes = 30 * 1024 * 1024;
export const maxAssetVideoUploadBytes = 50 * 1024 * 1024;
export const maxAssetAudioUploadBytes = 15 * 1024 * 1024;
export const assetImageDimensionLimits = {
  max: 6000,
  min: 300,
};
export const assetImageAspectRatioLimits = {
  max: 2.5,
  min: 0.4,
};

export const supportedAssetUploadSummary =
  "图片 jpeg/png/webp/bmp/tiff/gif/heic/heif，小于 30MB，宽高 300-6000px，W/H 在 0.4-2.5 之间；视频 mp4/mov，小于等于 50MB，需满足 2-15 秒、480p/720p/1080p、24-60 FPS 等 BytePlus 终检；音频 wav/mp3，小于等于 15MB，需满足 2-15 秒 BytePlus 终检。";

export interface AssetImageDimensions {
  height: number;
  width: number;
}

export interface StoredAssetUploadFile {
  assetKind: StoredAssetKind;
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

  if (extension === ".bmp") {
    return "image/bmp";
  }

  if (extension === ".tif" || extension === ".tiff") {
    return "image/tiff";
  }

  if (extension === ".heic") {
    return "image/heic";
  }

  if (extension === ".heif") {
    return "image/heif";
  }

  if (extension === ".mp4") {
    return "video/mp4";
  }

  if (extension === ".mov") {
    return "video/quicktime";
  }

  if (extension === ".mp3") {
    return "audio/mpeg";
  }

  if (extension === ".wav") {
    return "audio/wav";
  }

  return "application/octet-stream";
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

export function inferStoredAssetKind({
  contentType,
  originalName,
}: {
  contentType: string;
  originalName: string;
}): StoredAssetKind | undefined {
  const normalizedContentType = contentType.toLowerCase();
  const extension = extname(originalName).toLowerCase();

  if (
    supportedImageMimeTypes.has(normalizedContentType) ||
    supportedImageExtensions.has(extension)
  ) {
    return "Image";
  }

  if (
    supportedVideoMimeTypes.has(normalizedContentType) ||
    supportedVideoExtensions.has(extension)
  ) {
    return "Video";
  }

  if (
    supportedAudioMimeTypes.has(normalizedContentType) ||
    supportedAudioExtensions.has(extension)
  ) {
    return "Audio";
  }

  return undefined;
}

export function getAssetUploadValidationError({
  assetKind,
  buffer,
  dimensions,
}: {
  assetKind: StoredAssetKind | undefined;
  buffer: Buffer;
  dimensions?: AssetImageDimensions;
}) {
  if (!assetKind) {
    return {
      code: "BYTEPLUS_ASSET_FILE_TYPE_UNSUPPORTED",
      message: `文件格式不在 BytePlus CreateAsset 支持范围内；${supportedAssetUploadSummary}`,
    };
  }

  if (assetKind === "Image") {
    if (buffer.byteLength >= maxAssetImageUploadBytes) {
      return {
        code: "BYTEPLUS_ASSET_IMAGE_TOO_LARGE",
        message: "图片必须小于 30 MB。",
      };
    }

    return getAssetImageDimensionError(dimensions);
  }

  if (assetKind === "Video" && buffer.byteLength > maxAssetVideoUploadBytes) {
    return {
      code: "BYTEPLUS_ASSET_VIDEO_TOO_LARGE",
      message: "视频不能超过 50 MB。",
    };
  }

  if (assetKind === "Audio" && buffer.byteLength > maxAssetAudioUploadBytes) {
    return {
      code: "BYTEPLUS_ASSET_AUDIO_TOO_LARGE",
      message: "音频不能超过 15 MB。",
    };
  }

  return undefined;
}

export async function storeAssetUploadFile({
  assetKind,
  buffer,
  contentType,
  dimensions,
  originalName,
}: {
  assetKind: StoredAssetKind;
  buffer: Buffer;
  contentType: string;
  dimensions?: AssetImageDimensions;
  originalName: string;
}): Promise<StoredAssetUploadFile> {
  const validationError = getAssetUploadValidationError({
    assetKind,
    buffer,
    dimensions,
  });

  if (validationError) {
    throw new Error(validationError.message);
  }

  const extension =
    assetExtensionsByMime[contentType.toLowerCase()] ||
    extname(originalName).toLowerCase() ||
    ".png";
  const fileId = `${randomUUID()}${extension}`;
  const uploadDirectory = getAssetUploadDirectory();
  const localPath = join(uploadDirectory, fileId);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(localPath, buffer);

  return {
    assetKind,
    contentType,
    dimensions,
    fileId,
    localPath,
    originalName,
    size: buffer.byteLength,
  };
}

export async function storeAssetUploadImage(input: {
  buffer: Buffer;
  contentType: string;
  dimensions?: AssetImageDimensions;
  originalName: string;
}) {
  return storeAssetUploadFile({
    ...input,
    assetKind: "Image",
  });
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

  if (
    normalizedContentType === "image/tiff" ||
    extension === ".tif" ||
    extension === ".tiff"
  ) {
    return readTiffDimensions(buffer);
  }

  if (
    normalizedContentType === "image/heic" ||
    normalizedContentType === "image/heif" ||
    extension === ".heic" ||
    extension === ".heif"
  ) {
    return readHeifDimensions(buffer);
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
    const aspectRatio = dimensions.width / dimensions.height;
    const aspectTooNarrow = aspectRatio <= assetImageAspectRatioLimits.min;
    const aspectTooWide = aspectRatio >= assetImageAspectRatioLimits.max;

    if (!aspectTooNarrow && !aspectTooWide) {
      return undefined;
    }

    return {
      code: "BYTEPLUS_ASSET_IMAGE_ASPECT_RATIO_OUT_OF_RANGE",
      message: `图片宽高比不符合 BytePlus CreateAsset 要求：W/H 需要在 ${assetImageAspectRatioLimits.min} 到 ${assetImageAspectRatioLimits.max} 之间；当前为 ${aspectRatio.toFixed(3)}。`,
    };
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

function readTiffDimensions(buffer: Buffer) {
  if (buffer.length < 8) {
    return undefined;
  }

  const byteOrder = buffer.subarray(0, 2).toString("ascii");
  const littleEndian = byteOrder === "II";
  const bigEndian = byteOrder === "MM";

  if (!littleEndian && !bigEndian) {
    return undefined;
  }

  const readUInt16 = (offset: number) =>
    littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);
  const readUInt32 = (offset: number) =>
    littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);

  if (readUInt16(2) !== 42) {
    return undefined;
  }

  const ifdOffset = readUInt32(4);
  if (ifdOffset + 2 > buffer.length) {
    return undefined;
  }

  const entryCount = readUInt16(ifdOffset);
  let width: number | undefined;
  let height: number | undefined;

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    if (entryOffset + 12 > buffer.length) {
      break;
    }

    const tag = readUInt16(entryOffset);
    const type = readUInt16(entryOffset + 2);
    const value =
      type === 3 ? readUInt16(entryOffset + 8) : readUInt32(entryOffset + 8);

    if (tag === 256) {
      width = value;
    }

    if (tag === 257) {
      height = value;
    }

    if (width && height) {
      return { height, width };
    }
  }

  return undefined;
}

function readHeifDimensions(buffer: Buffer) {
  for (let offset = 4; offset + 20 <= buffer.length; offset += 1) {
    if (buffer.subarray(offset, offset + 4).toString("ascii") !== "ispe") {
      continue;
    }

    const size = buffer.readUInt32BE(offset - 4);
    const boxStart = offset - 4;
    const widthOffset = offset + 8;
    const heightOffset = offset + 12;

    if (
      size >= 20 &&
      boxStart >= 0 &&
      boxStart + size <= buffer.length &&
      heightOffset + 4 <= buffer.length
    ) {
      const width = buffer.readUInt32BE(widthOffset);
      const height = buffer.readUInt32BE(heightOffset);

      if (width > 0 && height > 0) {
        return { height, width };
      }
    }
  }

  return undefined;
}
