import { NextResponse } from "next/server";

import {
  getErrorStatus,
  parseCallbackBody,
  toErrorPayload,
} from "@/lib/api-request";

function readString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

async function handleCallback(request: Request) {
  try {
    const payload = (await parseCallbackBody(request)) as Record<string, unknown>;

    return NextResponse.json({
      received: true,
      type: "video-task-callback",
      taskId: readString(payload, ["id", "task_id", "TaskId"]),
      status: readString(payload, ["status", "Status"]),
      payload,
    });
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}

export async function GET(request: Request) {
  return handleCallback(request);
}

export async function POST(request: Request) {
  return handleCallback(request);
}
