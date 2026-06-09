import { NextResponse } from "next/server";

import { getUserDataDirectory } from "@/lib/user-data-directory";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "byteplus-dancing-together",
    timestamp: new Date().toISOString(),
    platform: process.platform,
    nodeVersion: process.version,
    storageDirectory: getUserDataDirectory(),
  });
}
