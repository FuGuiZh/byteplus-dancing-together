"use client";

export type AssetKind = "Image" | "Video" | "Audio";
export type AssetStatus = "Active" | "Processing" | "Failed";
export type AssetViewMode = "grid" | "list";
export type AssetScope =
  | { type: "root" }
  | { type: "all-assets" }
  | { type: "group"; groupId: string }
  | { type: "group-type"; groupType: string };

export type AssetSelection =
  | { type: "group"; id: string }
  | { type: "asset"; id: string }
  | null;

export interface AssetGroupItem {
  id: string;
  name: string;
  description: string;
  groupType: string;
  projectName: string;
  createTime: string;
  updateTime: string;
  raw: unknown;
}

export interface AssetItem {
  id: string;
  name: string;
  url: string;
  groupId: string;
  groupType: string;
  assetKind: AssetKind;
  status: AssetStatus;
  error: string;
  moderationStrategy: string;
  projectName: string;
  createTime: string;
  updateTime: string;
  raw: unknown;
}

export interface ApiSnapshot {
  label: string;
  method: string;
  path: string;
  status?: number;
  elapsedMs?: number;
  request?: unknown;
  response?: unknown;
  error?: string;
}

export interface AssetCounts {
  groups: number;
  assets: number;
  active: number;
  processing: number;
  failed: number;
}
