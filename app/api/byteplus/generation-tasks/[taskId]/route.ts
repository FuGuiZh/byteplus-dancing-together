import { NextResponse } from "next/server";

import { getErrorStatus, toErrorPayload } from "@/lib/api-request";
import {
  getBytePlusConfig,
  shouldUseLocalModelArkFallback,
} from "@/lib/byteplus-config";
import { generationTaskActionRequestSchema } from "@/lib/byteplus-contracts";
import {
  cancelBytePlusGenerationTask,
  deleteBytePlusGenerationTask,
  getBytePlusGenerationTaskStatus,
} from "@/lib/byteplus-modelark-client";
import {
  createLocalFallbackGenerationTaskAction,
  createLocalFallbackGenerationTaskStatus,
} from "@/lib/byteplus-local-fallback";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const config = getBytePlusConfig();

    if (!shouldUseLocalModelArkFallback(config)) {
      return NextResponse.json(
        await getBytePlusGenerationTaskStatus(taskId, config)
      );
    }

    return NextResponse.json(createLocalFallbackGenerationTaskStatus(taskId, config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const input = generationTaskActionRequestSchema.parse(
      await request.json().catch(() => ({}))
    );
    const config = getBytePlusConfig();

    if (shouldUseLocalModelArkFallback(config)) {
      return NextResponse.json(
        createLocalFallbackGenerationTaskAction(taskId, input.action)
      );
    }

    if (input.action === "cancel") {
      const result = await cancelBytePlusGenerationTask(taskId, config);
      return NextResponse.json(result, {
        status: result.httpStatus ?? 200,
      });
    }

    return NextResponse.json(await deleteBytePlusGenerationTask(taskId, config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const config = getBytePlusConfig();

    if (shouldUseLocalModelArkFallback(config)) {
      return NextResponse.json(
        createLocalFallbackGenerationTaskAction(taskId, "delete")
      );
    }

    return NextResponse.json(await deleteBytePlusGenerationTask(taskId, config));
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
