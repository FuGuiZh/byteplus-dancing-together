import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";

import { NextResponse } from "next/server";

import { getErrorStatus, toErrorPayload } from "@/lib/api-request";
import {
  getLocalWorkspaceStorageInfo,
  getTextToVideoSessionFilePath,
} from "@/lib/local-workspace-store";

type OpenStorageTarget =
  | "textToVideoSessions"
  | "textToVideoSession"
  | "generatedContentAssets"
  | "generatedContentVideos";

function isOpenStorageTarget(value: unknown): value is OpenStorageTarget {
  return (
    value === "textToVideoSessions" ||
    value === "textToVideoSession" ||
    value === "generatedContentAssets" ||
    value === "generatedContentVideos"
  );
}

function resolveTargetLocation(target: OpenStorageTarget, sessionId?: unknown) {
  const storage = getLocalWorkspaceStorageInfo();

  if (target === "textToVideoSession") {
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      throw new Error("打开单个会话文件需要 sessionId。");
    }

    const file = getTextToVideoSessionFilePath(sessionId);

    return {
      directory: dirname(file),
      file,
      storage,
    };
  }

  if (target === "generatedContentVideos") {
    return {
      directory: storage.directories.generatedContentVideos,
      file: null,
      storage,
    };
  }

  const file =
    target === "textToVideoSessions"
      ? storage.files.textToVideoSessions
      : storage.files.generatedContentAssets;

  return {
    directory: dirname(file),
    file,
    storage,
  };
}

function openLocation(directory: string, file: string | null) {
  if (process.platform === "win32") {
    spawn("explorer.exe", file ? [`/select,${file}`] : [directory], {
      detached: true,
      stdio: "ignore",
      windowsHide: false,
    }).unref();
    return;
  }

  if (process.platform === "darwin") {
    spawn("open", file ? ["-R", file] : [directory], {
      detached: true,
      stdio: "ignore",
    }).unref();
    return;
  }

  throw new Error("当前只支持在 Windows 和 macOS 打开本地目录。");
}

async function getExistingFile(file: string | null) {
  if (!file) {
    return null;
  }

  try {
    const fileStat = await stat(file);
    return fileStat.isFile() ? file : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      target?: unknown;
      sessionId?: unknown;
    };
    const target = isOpenStorageTarget(payload.target)
      ? payload.target
      : "textToVideoSessions";
    const resolved = resolveTargetLocation(target, payload.sessionId);

    await mkdir(resolved.directory, { recursive: true });
    const existingFile = await getExistingFile(resolved.file);
    openLocation(resolved.directory, existingFile);

    return NextResponse.json({
      target,
      openedDirectory: resolved.directory,
      file: existingFile ?? resolved.file,
      storage: resolved.storage,
    });
  } catch (error) {
    return NextResponse.json(toErrorPayload(error), {
      status: getErrorStatus(error),
    });
  }
}
