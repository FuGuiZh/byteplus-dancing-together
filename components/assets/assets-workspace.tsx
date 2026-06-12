"use client";

import * as React from "react";

import { AssetsBrowser } from "@/components/assets/assets-browser";
import { AssetsFrame } from "@/components/assets/assets-frame";
import {
  AssetsInspector,
  type AssetCreateFormState,
  type AssetGroupFormState,
} from "@/components/assets/assets-inspector";
import { AssetsStatusBar } from "@/components/assets/assets-status-bar";
import { AssetsToolbar } from "@/components/assets/assets-toolbar";
import { AssetsTree } from "@/components/assets/assets-tree";
import type {
  ApiSnapshot,
  AssetGroupItem,
  AssetItem,
  AssetKind,
  AssetScope,
  AssetSelection,
  AssetStatus,
  AssetViewMode,
} from "@/components/assets/assets-types";
import {
  filterVisibleAssets,
  filterVisibleGroups,
  getAssetCounts,
  normalizeAssetDetail,
  normalizeAssetGroups,
  normalizeAssets,
  normalizeGroupDetail,
} from "@/components/assets/assets-utils";

const ASSET_LIST_PAGE_SIZE = 100;
const SUPPORTED_ASSET_FILE_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,image/bmp,image/tiff,image/gif,image/heic,image/heif,video/mp4,video/quicktime,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,.gif,.heic,.heif,.mp4,.mov,.mp3,.wav";

const defaultGroupForm: AssetGroupFormState = {
  name: "dance-assets",
  description: "Seedance 2.0 生成视频使用的私域素材组",
};

const defaultAssetForm: AssetCreateFormState = {
  assetKind: "Image",
  groupId: "",
  name: "reference-asset",
  url: "",
  moderationStrategy: "Default",
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "请求失败。";
}

export function AssetsWorkspace() {
  const fileUploadInputRef = React.useRef<HTMLInputElement>(null);
  const [groups, setGroups] = React.useState<AssetGroupItem[]>([]);
  const [assets, setAssets] = React.useState<AssetItem[]>([]);
  const [scope, setScope] = React.useState<AssetScope>({ type: "root" });
  const [selection, setSelection] = React.useState<AssetSelection>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<"all" | AssetStatus>("all");
  const [assetKindFilter, setAssetKindFilter] =
    React.useState<"all" | AssetKind>("all");
  const [viewMode, setViewMode] = React.useState<AssetViewMode>("grid");
  const [pendingRequestCount, setPendingRequestCount] = React.useState(0);
  const [apiSnapshot, setApiSnapshot] = React.useState<ApiSnapshot | null>(null);
  const [groupForm, setGroupForm] =
    React.useState<AssetGroupFormState>(defaultGroupForm);
  const [assetForm, setAssetForm] =
    React.useState<AssetCreateFormState>(defaultAssetForm);

  const counts = React.useMemo(() => getAssetCounts(groups, assets), [assets, groups]);
  const visibleGroups = React.useMemo(
    () => filterVisibleGroups(groups, scope, searchQuery),
    [groups, scope, searchQuery]
  );
  const visibleAssets = React.useMemo(
    () =>
      filterVisibleAssets(
        assets,
        scope,
        searchQuery,
        statusFilter,
        assetKindFilter
      ),
    [assetKindFilter, assets, scope, searchQuery, statusFilter]
  );
  const selectedGroup = React.useMemo(
    () =>
      selection?.type === "group"
        ? groups.find((group) => group.id === selection.id) ?? null
        : null,
    [groups, selection]
  );
  const selectedAsset = React.useMemo(
    () =>
      selection?.type === "asset"
        ? assets.find((asset) => asset.id === selection.id) ?? null
        : null,
    [assets, selection]
  );
  const busy = pendingRequestCount > 0;

  const requestJson = React.useCallback(
    async <T,>(
      label: string,
      path: string,
      options: RequestInit = {},
      requestBody?: unknown
    ) => {
      const method = options.method ?? "GET";
      const startedAt = performance.now();
      let snapshotWritten = false;
      setPendingRequestCount((current) => current + 1);

      try {
        const response = await fetch(path, {
          cache: "no-store",
          ...options,
        });
        const payload = (await response.json().catch(() => ({}))) as T;
        const snapshot: ApiSnapshot = {
          label,
          method,
          path,
          status: response.status,
          elapsedMs: Math.round(performance.now() - startedAt),
          request: requestBody,
          response: payload,
        };
        setApiSnapshot(snapshot);
        snapshotWritten = true;

        if (!response.ok) {
          const message =
            typeof (payload as { message?: unknown }).message === "string"
              ? (payload as { message: string }).message
              : `${label}失败。`;
          setApiSnapshot({ ...snapshot, error: message });
          throw new Error(message);
        }

        return payload;
      } catch (error) {
        const message = getErrorMessage(error);
        if (!snapshotWritten) {
          setApiSnapshot({
            label,
            method,
            path,
            elapsedMs: Math.round(performance.now() - startedAt),
            request: requestBody,
            error: message,
          });
        }
        throw error;
      } finally {
        setPendingRequestCount((current) => Math.max(0, current - 1));
      }
    },
    []
  );

  const loadGroups = React.useCallback(async () => {
    const params = new URLSearchParams({
      group_type: "AIGC",
      page_size: String(ASSET_LIST_PAGE_SIZE),
      sort_by: "UpdateTime",
      sort_order: "Desc",
    });
    const payload = await requestJson<unknown>(
      "列出素材组",
      `/api/byteplus/asset-groups?${params.toString()}`
    );
    const nextGroups = normalizeAssetGroups(payload);
    setGroups(nextGroups);
    setAssetForm((current) => {
      if (current.groupId || nextGroups.length === 0) {
        return current;
      }

      const writableGroup =
        nextGroups.find((group) => group.groupType === "AIGC") ??
        nextGroups[0];

      return {
        ...current,
        groupId: writableGroup?.id ?? "",
      };
    });
    return { items: nextGroups, raw: payload };
  }, [requestJson]);

  const loadAssets = React.useCallback(async () => {
    const params = new URLSearchParams({
      group_type: "AIGC",
      page_size: String(ASSET_LIST_PAGE_SIZE),
      sort_by: "UpdateTime",
      sort_order: "Desc",
    });
    const payload = await requestJson<unknown>(
      "列出素材",
      `/api/byteplus/assets?${params.toString()}`
    );
    const nextAssets = normalizeAssets(payload);
    setAssets(nextAssets);
    return { items: nextAssets, raw: payload };
  }, [requestJson]);

  const refreshAll = React.useCallback(async () => {
    const startedAt = performance.now();
    const [groupResult, assetResult] = await Promise.allSettled([
      loadGroups(),
      loadAssets(),
    ]);
    const hasError =
      groupResult.status === "rejected" || assetResult.status === "rejected";

    setApiSnapshot({
      error: hasError
        ? "素材组和素材列表已分别请求；部分接口失败时，可用数据仍会展示。"
        : undefined,
      elapsedMs: Math.round(performance.now() - startedAt),
      label: "刷新素材库",
      method: "GET",
      path: "/api/byteplus/asset-groups + /api/byteplus/assets",
      request: {
        note: "ProjectName 由服务端 BYTEPLUS_PROJECT_NAME 决定；当前未在前端开放任意 ProjectName。",
        pageSize: ASSET_LIST_PAGE_SIZE,
      },
      response: {
        assetGroups:
          groupResult.status === "fulfilled"
            ? {
                count: groupResult.value.items.length,
                ok: true,
                raw: groupResult.value.raw,
              }
            : {
                error: getErrorMessage(groupResult.reason),
                ok: false,
              },
        assets:
          assetResult.status === "fulfilled"
            ? {
                count: assetResult.value.items.length,
                ok: true,
                raw: assetResult.value.raw,
              }
            : {
                error: getErrorMessage(assetResult.reason),
                ok: false,
              },
      },
      status: hasError ? 207 : 200,
    });

    if (groupResult.status === "rejected" && assetResult.status === "rejected") {
      return;
    }
  }, [loadAssets, loadGroups]);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => void refreshAll(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshAll]);

  function handleScopeChange(nextScope: AssetScope) {
    setScope(nextScope);
    setSelection(null);
    if (nextScope.type === "group") {
      setAssetForm((current) => ({ ...current, groupId: nextScope.groupId }));
    }
  }

  function getActiveUploadGroupId() {
    if (assetForm.groupId) {
      return assetForm.groupId;
    }

    if (selectedGroup?.id) {
      return selectedGroup.id;
    }

    if (scope.type === "group") {
      return scope.groupId;
    }

    return (
      groups.find((group) => group.groupType === "AIGC")?.id ??
      groups[0]?.id ??
      ""
    );
  }

  function openFileUploadPicker() {
    const groupId = getActiveUploadGroupId();

    if (!groupId) {
      setApiSnapshot({
        label: "本地文件入库",
        method: "POST",
        path: "/api/byteplus/assets/file-upload",
        error: "请先刷新或创建一个素材组，再上传素材文件。",
      });
      return;
    }

    setAssetForm((current) => ({ ...current, groupId }));
    fileUploadInputRef.current?.click();
  }

  async function uploadAssetFiles(files: File[], targetGroupId?: string) {
    const groupId = targetGroupId ?? getActiveUploadGroupId();

    if (!groupId) {
      setApiSnapshot({
        label: "本地文件入库",
        method: "POST",
        path: "/api/byteplus/assets/file-upload",
        error: "请先刷新或创建一个素材组，再上传素材文件。",
      });
      return;
    }

    setAssetForm((current) => ({ ...current, groupId }));

    if (files.length === 0) {
      return;
    }

    const formData = new FormData();
    formData.set("groupId", groupId);
    formData.set("moderationStrategy", assetForm.moderationStrategy);
    if (files.length === 1 && assetForm.name.trim()) {
      formData.set("name", assetForm.name.trim());
    }

    for (const file of files) {
      formData.append("files", file);
    }

    const requestBody = {
      groupId,
      moderationStrategy: assetForm.moderationStrategy,
      files: files.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    };

    try {
      await requestJson(
        "本地文件入库",
        "/api/byteplus/assets/file-upload",
        {
          body: formData,
          method: "POST",
        },
        requestBody
      );
      await loadAssets();
    } catch {
      // 详情在 API 面板。
    }
  }

  function handleFileUploadInputChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void uploadAssetFiles(files);
  }

  async function createGroup() {
    const requestBody = {
      name: groupForm.name.trim(),
      description: groupForm.description.trim() || undefined,
      groupType: "AIGC",
    };

    if (!requestBody.name) {
      setApiSnapshot({
        label: "创建素材组",
        method: "POST",
        path: "/api/byteplus/asset-groups",
        request: requestBody,
        error: "素材组名称不能为空。",
      });
      return;
    }

    try {
      await requestJson("创建素材组", "/api/byteplus/asset-groups", {
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }, requestBody);
      await loadGroups();
    } catch {
      // 详情在 API 面板。
    }
  }

  async function createAsset() {
    const requestBody = {
      assetKind: assetForm.assetKind,
      groupId: assetForm.groupId,
      name: assetForm.name.trim(),
      fileName: assetForm.name.trim(),
      url: assetForm.url.trim(),
      moderationStrategy: assetForm.moderationStrategy,
    };

    if (!requestBody.groupId || !requestBody.name || !requestBody.url) {
      setApiSnapshot({
        label: "创建素材",
        method: "POST",
        path: "/api/byteplus/assets",
        request: requestBody,
        error: "GroupId、素材名称和素材 URL 都不能为空。",
      });
      return;
    }

    try {
      await requestJson("创建素材", "/api/byteplus/assets", {
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }, requestBody);
      await loadAssets();
    } catch {
      // 详情在 API 面板。
    }
  }

  async function runPermissionCheck() {
    const requestBody = {
      includeWriteChecks: true,
    };

    try {
      await requestJson("权限链路自检", "/api/byteplus/permission-check", {
        body: JSON.stringify(requestBody),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }, requestBody);
    } catch {
      // 分步结果和原始响应已经写入 API 面板。
    }
  }

  async function fetchSelectionDetail() {
    if (selection?.type === "group") {
      try {
        const payload = await requestJson<unknown>(
          "获取素材组详情",
          `/api/byteplus/asset-groups/${encodeURIComponent(selection.id)}`
        );
        const nextGroup = normalizeGroupDetail(payload);
        if (nextGroup) {
          setGroups((current) =>
            current.map((group) =>
              group.id === nextGroup.id ? nextGroup : group
            )
          );
        }
      } catch {
        // 详情在 API 面板。
      }
      return;
    }

    if (selection?.type === "asset") {
      try {
        const payload = await requestJson<unknown>(
          "获取素材详情",
          `/api/byteplus/assets/${encodeURIComponent(selection.id)}`
        );
        const nextAsset = normalizeAssetDetail(payload);
        if (nextAsset) {
          setAssets((current) =>
            current.map((asset) =>
              asset.id === nextAsset.id ? nextAsset : asset
            )
          );
        }
      } catch {
        // 详情在 API 面板。
      }
    }
  }

  async function renameSelection() {
    if (selection?.type === "group" && selectedGroup) {
      const nextName = window.prompt("新的素材组名称", selectedGroup.name);
      if (!nextName?.trim()) {
        return;
      }

      const requestBody = {
        name: nextName.trim(),
        description: selectedGroup.description || undefined,
      };

      try {
        await requestJson(
          "更新素材组",
          `/api/byteplus/asset-groups/${encodeURIComponent(selectedGroup.id)}`,
          {
            body: JSON.stringify(requestBody),
            headers: { "Content-Type": "application/json" },
            method: "PATCH",
          },
          requestBody
        );
        setGroups((current) =>
          current.map((group) =>
            group.id === selectedGroup.id
              ? { ...group, name: requestBody.name }
              : group
          )
        );
      } catch {
        // 详情在 API 面板。
      }
      return;
    }

    if (selection?.type === "asset" && selectedAsset) {
      const nextName = window.prompt("新的素材名称", selectedAsset.name);
      if (!nextName?.trim()) {
        return;
      }

      const requestBody = { name: nextName.trim() };

      try {
        await requestJson(
          "更新素材",
          `/api/byteplus/assets/${encodeURIComponent(selectedAsset.id)}`,
          {
            body: JSON.stringify(requestBody),
            headers: { "Content-Type": "application/json" },
            method: "PATCH",
          },
          requestBody
        );
        setAssets((current) =>
          current.map((asset) =>
            asset.id === selectedAsset.id
              ? { ...asset, name: requestBody.name }
              : asset
          )
        );
      } catch {
        // 详情在 API 面板。
      }
    }
  }

  async function deleteSelection() {
    if (selection?.type === "group" && selectedGroup) {
      const confirmed = window.confirm(
        `删除素材组 ${selectedGroup.name}？文档说明删除素材组会连同组内素材一起删除，且不可恢复。`
      );
      if (!confirmed) {
        return;
      }

      try {
        await requestJson(
          "删除素材组",
          `/api/byteplus/asset-groups/${encodeURIComponent(selectedGroup.id)}`,
          { method: "DELETE" }
        );
        setGroups((current) =>
          current.filter((group) => group.id !== selectedGroup.id)
        );
        setAssets((current) =>
          current.filter((asset) => asset.groupId !== selectedGroup.id)
        );
        setSelection(null);
      } catch {
        // 详情在 API 面板。
      }
      return;
    }

    if (selection?.type === "asset" && selectedAsset) {
      const confirmed = window.confirm(`删除素材 ${selectedAsset.name}？`);
      if (!confirmed) {
        return;
      }

      try {
        await requestJson(
          "删除素材",
          `/api/byteplus/assets/${encodeURIComponent(selectedAsset.id)}`,
          { method: "DELETE" }
        );
        setAssets((current) =>
          current.filter((asset) => asset.id !== selectedAsset.id)
        );
        setSelection(null);
      } catch {
        // 详情在 API 面板。
      }
    }
  }

  function openAsset(asset: AssetItem) {
    if (!asset.url) {
      setApiSnapshot({
        label: "打开素材 URL",
        method: "GET",
        path: asset.id,
        error: "当前素材没有 URL。List/GetAsset 返回的 URL 通常只有 12 小时有效。",
      });
      return;
    }

    window.open(asset.url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <input
        accept={SUPPORTED_ASSET_FILE_ACCEPT}
        className="hidden"
        multiple
        onChange={handleFileUploadInputChange}
        ref={fileUploadInputRef}
        type="file"
      />
      <AssetsFrame
        browser={
          <AssetsBrowser
            assets={visibleAssets}
            groups={visibleGroups}
            loading={busy}
            onClearSelection={() => setSelection(null)}
            onCreateAsset={createAsset}
            onCreateGroup={createGroup}
            onDelete={deleteSelection}
            onDetail={fetchSelectionDetail}
            onOpenAsset={openAsset}
            onRefresh={() => void refreshAll()}
            onRename={renameSelection}
            onDropRejected={(message) =>
              setApiSnapshot({
                label: "拖拽文件入库",
                method: "POST",
                path: "/api/byteplus/assets/file-upload",
                error: message,
              })
            }
            onScopeChange={handleScopeChange}
            onSelect={setSelection}
            onUploadFiles={(files, groupId) =>
              void uploadAssetFiles(files, groupId)
            }
            onUploadFilesPicker={openFileUploadPicker}
            onViewModeChange={setViewMode}
            scope={scope}
            selection={selection}
            viewMode={viewMode}
          />
        }
        inspector={
          <AssetsInspector
            apiSnapshot={apiSnapshot}
            assetForm={assetForm}
            busy={busy}
            groupForm={groupForm}
            groups={groups}
            onAssetFormChange={setAssetForm}
            onCreateAsset={createAsset}
            onCreateGroup={createGroup}
            onDeleteSelection={deleteSelection}
            onFetchDetail={fetchSelectionDetail}
            onGroupFormChange={setGroupForm}
            onOpenAsset={openAsset}
            onRenameSelection={renameSelection}
            onUploadFiles={openFileUploadPicker}
            selectedAsset={selectedAsset}
            selectedGroup={selectedGroup}
          />
        }
        sidebar={
          <AssetsTree
            counts={counts}
            groups={groups}
            onScopeChange={handleScopeChange}
            scope={scope}
          />
        }
        statusBar={
          <AssetsStatusBar
            apiSnapshot={apiSnapshot}
            busy={busy}
            counts={counts}
            visibleAssetCount={visibleAssets.length}
            visibleGroupCount={visibleGroups.length}
          />
        }
        toolbar={
          <AssetsToolbar
            assetKindFilter={assetKindFilter}
            busy={busy}
            onAssetKindFilterChange={setAssetKindFilter}
            onCreateAsset={createAsset}
            onCreateGroup={createGroup}
            onDeleteSelection={deleteSelection}
            onPermissionCheck={() => void runPermissionCheck()}
            onRefresh={() => void refreshAll()}
            onRenameSelection={renameSelection}
            onSearchChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onUploadFiles={openFileUploadPicker}
            onViewModeChange={setViewMode}
            searchQuery={searchQuery}
            selected={Boolean(selection)}
            statusFilter={statusFilter}
            viewMode={viewMode}
          />
        }
      />
    </>
  );
}
