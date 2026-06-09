import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { getErrorStatus, toErrorPayload } from "@/lib/api-request";
import { readGeneratedContentAssetById } from "@/lib/local-workspace-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  try {
    const { assetId } = await params;
    const asset = await readGeneratedContentAssetById(assetId);

    if (!asset?.localVideoPath || asset.downloadStatus !== "downloaded") {
      return NextResponse.json(
        {
          code: "LOCAL_VIDEO_NOT_FOUND",
          message: "本地视频文件不存在或尚未下载完成。",
        },
        { status: 404 }
      );
    }

    const fileStat = await stat(asset.localVideoPath);
    const range = request.headers.get("range");
    const contentType = getVideoContentType(asset.localVideoPath);

    if (range) {
      const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!rangeMatch) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileStat.size}`,
          },
        });
      }

      const start = rangeMatch[1] ? Number(rangeMatch[1]) : 0;
      const end = rangeMatch[2]
        ? Math.min(Number(rangeMatch[2]), fileStat.size - 1)
        : fileStat.size - 1;

      if (start > end || start >= fileStat.size) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileStat.size}`,
          },
        });
      }

      const stream = createReadStream(asset.localVideoPath, { start, end });

      return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=3600",
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
          "Content-Type": contentType,
        },
      });
    }

    const stream = createReadStream(asset.localVideoPath);

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(fileStat.size),
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

function getVideoContentType(filePath: string) {
  if (filePath.toLowerCase().endsWith(".webm")) {
    return "video/webm";
  }

  if (filePath.toLowerCase().endsWith(".mov")) {
    return "video/quicktime";
  }

  return "video/mp4";
}
