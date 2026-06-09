import { NextResponse } from "next/server";

import {
  getLocalWorkspaceStorageInfo,
  readTextToVideoSessionState,
  type TextToVideoSessionState,
  writeTextToVideoSessionState,
} from "@/lib/local-workspace-store";

export async function GET() {
  const state = await readTextToVideoSessionState();

  return NextResponse.json({
    ...state,
    storage: getLocalWorkspaceStorageInfo(),
  });
}

export async function PUT(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as unknown;
  const state = await writeTextToVideoSessionState(
    payload as TextToVideoSessionState
  );

  return NextResponse.json({
    ...state,
    storage: getLocalWorkspaceStorageInfo(),
  });
}
