import { NextResponse } from "next/server";

import {
  getErrorStatus,
  parseJsonBody,
  toErrorPayload,
} from "@/lib/api-request";
import {
  getBytePlusConfig,
  shouldUseLocalModelArkFallback,
} from "@/lib/byteplus-config";
import { generationTaskRequestSchema } from "@/lib/byteplus-contracts";
import {
  createBytePlusGenerationTask,
  listBytePlusGenerationTasks,
} from "@/lib/byteplus-modelark-client";
import {
  createLocalFallbackGenerationTask,
  createLocalFallbackGenerationTaskList,
} from "@/lib/byteplus-local-fallback";

function readPositiveInteger(value: string | null) {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
}

export async function POST(request: Request) {
  try {
    const config = getBytePlusConfig();
    const input = await parseJsonBody(request, generationTaskRequestSchema);

    if (shouldUseLocalModelArkFallback(config)) {
      const task = createLocalFallbackGenerationTask(input, config);

      if (config.byteplus.logPayloads) {
        console.info("[byteplus:generation-task]", task.request);
      }

      return NextResponse.json(task);
    }

    const task = await createBytePlusGenerationTask(input, config);

    if (config.byteplus.logPayloads) {
      console.info("[byteplus:generation-task]", task.request);
    }

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function GET(request: Request) {
  try {
    const config = getBytePlusConfig();
    const searchParams = new URL(request.url).searchParams;

    if (shouldUseLocalModelArkFallback(config)) {
      return NextResponse.json(createLocalFallbackGenerationTaskList(config));
    }

    return NextResponse.json(
      await listBytePlusGenerationTasks(config, {
        pageNum: readPositiveInteger(searchParams.get("page_num")),
        pageSize:
          readPositiveInteger(searchParams.get("page_size")) ??
          readPositiveInteger(searchParams.get("limit")),
        status: searchParams.get("filter.status") ?? undefined,
        model: searchParams.get("filter.model") ?? undefined,
        serviceTier: searchParams.get("filter.service_tier") ?? undefined,
        after: searchParams.get("after") ?? undefined,
        before: searchParams.get("before") ?? undefined,
      })
    );
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
