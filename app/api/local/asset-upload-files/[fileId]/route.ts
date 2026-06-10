import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { getErrorStatus, toErrorPayload } from "@/lib/api-request";
import { readAssetUploadFileStat } from "@/lib/local-asset-upload-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { contentType, fileStat, localPath } =
      await readAssetUploadFileStat(fileId);
    const stream = createReadStream(localPath);

    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(fileStat.size),
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
