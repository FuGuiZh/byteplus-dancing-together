"use client";

import type {
  AssetCounts,
  AssetGroupItem,
  AssetItem,
  AssetKind,
  AssetScope,
  AssetStatus,
} from "@/components/assets/assets-types";

type UnknownRecord = Record<string, unknown>;

export const assetKindOptions: AssetKind[] = ["Image", "Video", "Audio"];
export const assetStatusOptions: AssetStatus[] = [
  "Active",
  "Processing",
  "Failed",
];

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(record: UnknownRecord, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return fallback;
}

function readObject(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (isRecord(value)) {
      return value;
    }
  }

  return {};
}

function readItems(payload: unknown) {
  if (!isRecord(payload)) {
    return [];
  }

  const directItems = payload.items ?? payload.Items ?? payload.AssetItems;
  if (Array.isArray(directItems)) {
    return directItems;
  }

  const provider = payload.provider;
  if (!isRecord(provider)) {
    return [];
  }

  const responseMetadata = provider.ResponseMetadata;
  const result = provider.Result;
  const providerItems = isRecord(result)
    ? result.Items ?? result.AssetItems ?? result.AssetGroups
    : undefined;

  if (Array.isArray(providerItems)) {
    return providerItems;
  }

  if (isRecord(responseMetadata)) {
    const nestedResult = responseMetadata.Result;
    if (isRecord(nestedResult) && Array.isArray(nestedResult.Items)) {
      return nestedResult.Items;
    }
  }

  return [];
}

export function normalizeAssetGroups(payload: unknown): AssetGroupItem[] {
  return readItems(payload)
    .filter(isRecord)
    .map((item, index) => {
      const id = readString(item, ["Id", "GroupId", "groupId", "id"], `group-${index}`);
      const name = readString(item, ["Name", "name", "Title", "title"], id);

      return {
        id,
        name,
        description: readString(item, ["Description", "description"]),
        groupType: readString(item, ["GroupType", "groupType"], "AIGC"),
        projectName: readString(item, ["ProjectName", "projectName"]),
        createTime: readString(item, ["CreateTime", "createTime", "CreatedAt"]),
        updateTime: readString(item, ["UpdateTime", "updateTime", "UpdatedAt"]),
        raw: item,
      };
    });
}

export function normalizeAssets(payload: unknown): AssetItem[] {
  return readItems(payload)
    .filter(isRecord)
    .map((item, index) => normalizeAsset(item, index));
}

export function normalizeAssetDetail(payload: unknown): AssetItem | null {
  if (!isRecord(payload)) {
    return null;
  }

  const rawAsset = payload.asset ?? payload.AssetItem ?? payload;
  if (!isRecord(rawAsset)) {
    return null;
  }

  return normalizeAsset(rawAsset, 0);
}

export function normalizeGroupDetail(payload: unknown): AssetGroupItem | null {
  if (!isRecord(payload)) {
    return null;
  }

  const rawGroup = payload.assetGroup ?? payload.GroupItem ?? payload;
  if (!isRecord(rawGroup)) {
    return null;
  }

  const id = readString(rawGroup, ["Id", "GroupId", "groupId", "id"]);
  if (!id) {
    return null;
  }

  return {
    id,
    name: readString(rawGroup, ["Name", "name", "Title", "title"], id),
    description: readString(rawGroup, ["Description", "description"]),
    groupType: readString(rawGroup, ["GroupType", "groupType"], "AIGC"),
    projectName: readString(rawGroup, ["ProjectName", "projectName"]),
    createTime: readString(rawGroup, ["CreateTime", "createTime", "CreatedAt"]),
    updateTime: readString(rawGroup, ["UpdateTime", "updateTime", "UpdatedAt"]),
    raw: rawGroup,
  };
}

function normalizeAsset(item: UnknownRecord, index: number): AssetItem {
  const id = readString(item, ["Id", "AssetId", "assetId", "id"], `asset-${index}`);
  const moderation = readObject(item, ["Moderation", "moderation"]);
  const error = readObject(item, ["Error", "error"]);

  return {
    id,
    name: readString(item, ["Name", "name", "FileName", "fileName"], id),
    url: readString(item, ["URL", "Url", "url"]),
    groupId: readString(item, ["GroupId", "groupId"]),
    groupType: readString(item, ["GroupType", "groupType"]),
    assetKind: normalizeAssetKind(readString(item, ["AssetType", "assetKind", "type"], "Image")),
    status: normalizeAssetStatus(readString(item, ["Status", "status"], "Processing")),
    error:
      readString(item, ["Error", "error", "FailureReason", "failureReason"]) ||
      readString(error, ["Message", "message", "Code", "code"]),
    moderationStrategy: readString(moderation, ["Strategy", "strategy"], "Default"),
    projectName: readString(item, ["ProjectName", "projectName"]),
    createTime: readString(item, ["CreateTime", "createTime", "CreatedAt"]),
    updateTime: readString(item, ["UpdateTime", "updateTime", "UpdatedAt"]),
    raw: item,
  };
}

function normalizeAssetKind(value: string): AssetKind {
  if (value === "Video" || value === "Audio") {
    return value;
  }

  return "Image";
}

function normalizeAssetStatus(value: string): AssetStatus {
  if (value === "Active" || value === "Failed") {
    return value;
  }

  return "Processing";
}

export function formatAssetTime(value: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getAssetCounts(groups: AssetGroupItem[], assets: AssetItem[]): AssetCounts {
  return {
    groups: groups.length,
    assets: assets.length,
    active: assets.filter((asset) => asset.status === "Active").length,
    processing: assets.filter((asset) => asset.status === "Processing").length,
    failed: assets.filter((asset) => asset.status === "Failed").length,
  };
}

export function getScopeLabel(scope: AssetScope, groups: AssetGroupItem[]) {
  if (scope.type === "root") {
    return "根目录";
  }

  if (scope.type === "all-assets") {
    return "全部素材";
  }

  if (scope.type === "group-type") {
    return `${getGroupTypeLabel(scope.groupType)} 素材组`;
  }

  const group = groups.find((item) => item.id === scope.groupId);
  return group?.name ?? scope.groupId;
}

export function getGroupTypeLabel(groupType: string) {
  if (groupType === "LivenessFace") {
    return "真人认证";
  }

  if (groupType === "AIGC") {
    return "私域素材库";
  }

  return groupType || "素材组";
}

export function getAssetKindLabel(assetKind: string) {
  if (assetKind === "Image") return "图片";
  if (assetKind === "Video") return "视频";
  if (assetKind === "Audio") return "音频";
  return assetKind || "素材";
}

export function getAssetStatusLabel(status: AssetStatus) {
  if (status === "Active") return "可用";
  if (status === "Failed") return "失败";
  return "处理中";
}

export function filterVisibleAssets(
  assets: AssetItem[],
  scope: AssetScope,
  searchQuery: string,
  statusFilter: "all" | AssetStatus,
  kindFilter: "all" | AssetKind
) {
  const query = searchQuery.trim().toLowerCase();

  return assets.filter((asset) => {
    if (scope.type === "group" && asset.groupId !== scope.groupId) {
      return false;
    }

    if (scope.type === "group-type" && asset.groupType && asset.groupType !== scope.groupType) {
      return false;
    }

    if (statusFilter !== "all" && asset.status !== statusFilter) {
      return false;
    }

    if (kindFilter !== "all" && asset.assetKind !== kindFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      asset.id,
      asset.name,
      asset.url,
      asset.groupId,
      asset.assetKind,
      asset.status,
      asset.error,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

export function filterVisibleGroups(
  groups: AssetGroupItem[],
  scope: AssetScope,
  searchQuery: string
) {
  const query = searchQuery.trim().toLowerCase();

  if (scope.type !== "root") {
    return [];
  }

  return groups.filter((group) => {
    if (!query) {
      return true;
    }

    return [group.id, group.name, group.description, group.groupType]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

export function buildAssetUri(assetId: string) {
  return `asset://${assetId}`;
}

export function copyAssetInfo(asset: AssetItem) {
  return [
    `AssetId: ${asset.id}`,
    `asset URI: ${buildAssetUri(asset.id)}`,
    `Name: ${asset.name}`,
    `Type: ${asset.assetKind}`,
    `Status: ${asset.status}`,
    `GroupId: ${asset.groupId}`,
    `URL: ${asset.url || "-"}`,
  ].join("\n");
}
