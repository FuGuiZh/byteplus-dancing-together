"use client";

import * as React from "react";
import {
  Activity,
  BadgeCheck,
  Braces,
  ClipboardList,
  Database,
  FileJson,
  FolderPlus,
  ListChecks,
  Play,
  RefreshCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UploadCloud,
  UserCheck,
  XCircle,
} from "lucide-react";

import {
  defaultPrompt,
  initialAssets,
  realPersonProfile,
  seedanceEndpoints,
} from "@/lib/studio-fixtures";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataLine,
  FieldLabel,
  inputClassName,
  textareaClassName,
} from "@/components/workspace-primitives";

type RuntimeStatus = {
  mode: "local" | "live";
  modelArkMode: "local" | "live";
  openApiMode: "local" | "live";
  projectName: string;
  hasCredentials: boolean;
  hasModelArkCredentials: boolean;
  apiConnection: {
    openApi: "connected" | "missing_credentials";
    modelArk: "connected" | "missing_api_key";
  };
  credentials: {
    iamAccessKeyId: boolean;
    iamSecretAccessKey: boolean;
    modelArkApiKey: boolean;
  };
  endpoints: {
    standard: string;
    fast: string;
  };
  urls: {
    modelArkBaseUrl: string;
    openApiHost: string;
    realPersonCallbackUrl: string;
    videoTaskCallbackUrl: string;
  };
  polling: Record<string, number>;
  generation: Record<string, unknown>;
};

type ApiResult = {
  title: string;
  status: number | null;
  data: unknown;
};

type ApiRequestPreview = {
  method: string;
  path: string;
  body?: unknown;
};

type LogEntry = ApiRequestPreview & {
  id: string;
  label: string;
  mode?: string;
  status: number | null;
  createdAt: string;
};

type DomainId = "overview" | "identity" | "library" | "generation" | "callbacks";
type InspectorTab = "response" | "request" | "logs";

type AssetRefRow = {
  id: string;
  enabled: boolean;
  assetKind: "Image" | "Video" | "Audio";
  assetId: string;
  role: string;
};

type DomainMeta = {
  id: DomainId;
  label: string;
  description: string;
  icon: React.ElementType;
  operations: Array<{
    id: string;
    label: string;
    description: string;
  }>;
};

const domainMeta: Record<DomainId, DomainMeta> = {
  overview: {
    id: "overview",
    label: "总览",
    description: "环境、权限、端点和接口覆盖面",
    icon: Activity,
    operations: [
      {
        id: "coverage",
        label: "覆盖面",
        description: "查看当前接入能力和运行态。",
      },
    ],
  },
  identity: {
    id: "identity",
    label: "真人档案",
    description: "H5 活体认证和 GroupId 查询",
    icon: UserCheck,
    operations: [
      {
        id: "create-session",
        label: "创建认证",
        description: "生成真人认证 H5 链接。",
      },
      {
        id: "query-result",
        label: "查询结果",
        description: "用 BytedToken 查询 GroupId。",
      },
    ],
  },
  library: {
    id: "library",
    label: "素材库",
    description: "素材组、素材入库和轮询",
    icon: Database,
    operations: [
      {
        id: "asset-groups",
        label: "素材组",
        description: "创建或列出素材组。",
      },
      {
        id: "assets",
        label: "素材",
        description: "创建、查询或列出素材。",
      },
    ],
  },
  generation: {
    id: "generation",
    label: "生成任务",
    description: "Seedance 任务创建和管理",
    icon: Play,
    operations: [
      {
        id: "compose",
        label: "编排请求",
        description: "组织 content、prompt 和生成参数。",
      },
      {
        id: "tasks",
        label: "任务管理",
        description: "查询、列表、取消或删除任务。",
      },
    ],
  },
  callbacks: {
    id: "callbacks",
    label: "回调",
    description: "认证回调和视频任务回调",
    icon: ClipboardList,
    operations: [
      {
        id: "real-callback",
        label: "认证回调",
        description: "查看 H5 认证回调字段。",
      },
      {
        id: "video-callback",
        label: "任务回调",
        description: "查看视频任务回调字段。",
      },
    ],
  },
};

const domainOrder: DomainId[] = [
  "overview",
  "identity",
  "library",
  "generation",
  "callbacks",
];

const defaultOperationByDomain: Record<DomainId, string> = {
  overview: "coverage",
  identity: "create-session",
  library: "asset-groups",
  generation: "compose",
  callbacks: "real-callback",
};

const ratioOptions = ["9:16", "16:9", "1:1", "3:4", "4:3", "21:9", "adaptive"];
const resolutionOptions = ["720p", "1080p"];
const assetKindOptions = ["Image", "Video", "Audio"] as const;

const defaultRefs: AssetRefRow[] = [
  {
    id: "person",
    enabled: true,
    assetKind: "Image",
    assetId:
      initialAssets.find((asset) => asset.id === "asset-hero-portrait")
        ?.assetId ?? "",
    role: "reference_image",
  },
  {
    id: "outfit",
    enabled: true,
    assetKind: "Image",
    assetId: initialAssets.find((asset) => asset.id === "asset-outfit")?.assetId ?? "",
    role: "reference_image",
  },
  {
    id: "motion",
    enabled: false,
    assetKind: "Video",
    assetId: initialAssets.find((asset) => asset.id === "asset-move")?.assetId ?? "",
    role: "reference_video",
  },
  {
    id: "audio",
    enabled: true,
    assetKind: "Audio",
    assetId: initialAssets.find((asset) => asset.id === "asset-music")?.assetId ?? "",
    role: "reference_audio",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getModeFromPayload(payload: unknown) {
  return isRecord(payload) && typeof payload.mode === "string"
    ? payload.mode
    : undefined;
}

function compactObject<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => {
      if (value === undefined || value === null) {
        return false;
      }

      if (typeof value === "string" && value.trim() === "") {
        return false;
      }

      return true;
    })
  ) as Partial<T>;
}

function parseOptionalInteger(value: string) {
  if (value.trim() === "") {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : undefined;
}

function appendSearchParams(
  path: string,
  params: Record<string, string | undefined>
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value && value.trim().length > 0) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function getOperationLabel(domainId: DomainId, operationId: string) {
  return (
    domainMeta[domainId].operations.find((operation) => operation.id === operationId)
      ?.label ?? operationId
  );
}

export function ConsoleWorkspace() {
  const [activeDomain, setActiveDomain] = React.useState<DomainId>("overview");
  const [activeOperationByDomain, setActiveOperationByDomain] = React.useState(
    defaultOperationByDomain
  );
  const [inspectorTab, setInspectorTab] = React.useState<InspectorTab>("response");
  const [runtime, setRuntime] = React.useState<RuntimeStatus | null>(null);
  const [result, setResult] = React.useState<ApiResult>({
    title: "等待操作",
    status: null,
    data: {
      route: "选择一个操作后查看真实 BytePlus API 或本地未接入 fallback 返回。",
    },
  });
  const [latestRequest, setLatestRequest] =
    React.useState<ApiRequestPreview | null>(null);
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const [realUserId, setRealUserId] = React.useState("studio-operator");
  const [realReturnUrl, setRealReturnUrl] = React.useState("");
  const [bytedToken, setBytedToken] = React.useState("vvs-token-from-callback");

  const [groupId, setGroupId] = React.useState(realPersonProfile.groupId);
  const [groupName, setGroupName] = React.useState("virtual-dancer");
  const [groupTitle, setGroupTitle] = React.useState("虚拟舞蹈人物");
  const [groupDescription, setGroupDescription] =
    React.useState("用于 Seedance 2.0 舞蹈视频参考的虚拟素材组");
  const [groupSearchName, setGroupSearchName] = React.useState("");

  const [assetId, setAssetId] = React.useState(initialAssets[0]?.assetId ?? "");
  const [assetKind, setAssetKind] =
    React.useState<(typeof assetKindOptions)[number]>("Image");
  const [assetName, setAssetName] = React.useState("front-portrait");
  const [assetUrl, setAssetUrl] = React.useState(
    "https://example.com/material/front-portrait.png"
  );
  const [moderationStrategy, setModerationStrategy] = React.useState("Default");
  const [assetStatusFilter, setAssetStatusFilter] = React.useState("");

  const [prompt, setPrompt] = React.useState(defaultPrompt);
  const [assetRefs, setAssetRefs] = React.useState<AssetRefRow[]>(defaultRefs);
  const [useFastEndpoint, setUseFastEndpoint] = React.useState(false);
  const [ratio, setRatio] = React.useState("9:16");
  const [duration, setDuration] = React.useState("8");
  const [resolution, setResolution] = React.useState("720p");
  const [generateAudio, setGenerateAudio] = React.useState(true);
  const [watermark, setWatermark] = React.useState(false);
  const [returnLastFrame, setReturnLastFrame] = React.useState(false);
  const [seed, setSeed] = React.useState("-1");
  const [priority, setPriority] = React.useState("0");
  const [safetyIdentifier, setSafetyIdentifier] = React.useState(
    "user_hash_47d2b0a18c6f"
  );
  const [taskId, setTaskId] = React.useState("cgt-smoke-test");
  const [taskLimit, setTaskLimit] = React.useState("10");
  const [taskAfter, setTaskAfter] = React.useState("");
  const [taskBefore, setTaskBefore] = React.useState("");

  const activeOperation = activeOperationByDomain[activeDomain];
  const currentDomain = domainMeta[activeDomain];
  const CurrentIcon = currentDomain.icon;

  const generationBody = React.useMemo(() => {
    const refs = assetRefs
      .filter((ref) => ref.enabled && ref.assetId.trim().length > 0)
      .map((ref) => ({
        assetId: ref.assetId.trim(),
        assetKind: ref.assetKind,
        role: ref.role.trim() || undefined,
      }));

    return compactObject({
      groupId,
      assetRefs: refs,
      prompt,
      useFastEndpoint,
      ratio,
      duration: parseOptionalInteger(duration),
      resolution,
      generateAudio,
      watermark,
      returnLastFrame,
      seed: parseOptionalInteger(seed),
      priority: parseOptionalInteger(priority),
      safetyIdentifier,
    });
  }, [
    assetRefs,
    duration,
    generateAudio,
    groupId,
    priority,
    prompt,
    ratio,
    resolution,
    returnLastFrame,
    safetyIdentifier,
    seed,
    useFastEndpoint,
    watermark,
  ]);

  const latestMode = getModeFromPayload(result.data) ?? runtime?.mode ?? "local";

  async function callApi({
    label,
    method,
    path,
    body,
  }: {
    label: string;
    method: string;
    path: string;
    body?: unknown;
  }) {
    const requestPreview = { method, path, body };
    setBusy(label);
    setLatestRequest(requestPreview);
    setInspectorTab("response");

    try {
      const response = await fetch(path, {
        method,
        headers:
          body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));

      setResult({
        title: `${label} ${response.ok ? "成功" : "失败"}`,
        status: response.status,
        data,
      });
      setLogs((current) => [
        {
          id: `${Date.now()}-${label}`,
          label,
          method,
          path,
          body,
          status: response.status,
          mode: getModeFromPayload(data),
          createdAt: new Date().toLocaleTimeString("zh-CN", {
            hour12: false,
          }),
        },
        ...current.slice(0, 9),
      ]);

      return data;
    } catch (error) {
      setResult({
        title: `${label} 请求失败`,
        status: null,
        data: {
          message: error instanceof Error ? error.message : "未知错误",
        },
      });
      return undefined;
    } finally {
      setBusy(null);
    }
  }

  async function refreshRuntime() {
    const data = await callApi({
      label: "GetRuntimeStatus",
      method: "GET",
      path: "/api/byteplus/runtime",
    });

    if (isRuntimeStatus(data)) {
      setRuntime(data);
    }
  }

  React.useEffect(() => {
    fetch("/api/byteplus/runtime")
      .then((response) => response.json())
      .then((data: unknown) => {
        if (isRuntimeStatus(data)) {
          setRuntime(data);
        }
      })
      .catch(() => undefined);
  }, []);

  function setOperation(operationId: string) {
    setActiveOperationByDomain((current) => ({
      ...current,
      [activeDomain]: operationId,
    }));
  }

  function updateAssetRef(id: string, patch: Partial<AssetRefRow>) {
    setAssetRefs((current) =>
      current.map((ref) => (ref.id === id ? { ...ref, ...patch } : ref))
    );
  }

  function createGenerationTask() {
    void callApi({
      label: "CreateContentGenerationTask",
      method: "POST",
      path: "/api/byteplus/generation-tasks",
      body: generationBody,
    }).then((data) => {
      if (isRecord(data) && typeof data.taskId === "string") {
        setTaskId(data.taskId);
      }
    });
  }

  return (
    <div className="mx-auto grid max-w-[1320px] gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="rounded-[var(--ui-radius)] border-border bg-card p-3 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-sm font-bold">控制域</span>
            <Badge variant={latestMode === "live" ? "success" : "outline"}>
              {latestMode}
            </Badge>
          </div>
          <nav className="grid gap-1">
            {domainOrder.map((domainId) => {
              const domain = domainMeta[domainId];
              const Icon = domain.icon;
              const active = activeDomain === domainId;

              return (
                <button
                  className={cn(
                    "flex min-w-0 items-start gap-3 rounded-[var(--ui-radius)] px-3 py-3 text-left text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                  key={domain.id}
                  onClick={() => setActiveDomain(domain.id)}
                  type="button"
                >
                  <Icon className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-bold">{domain.label}</span>
                    <span className="mt-1 block text-xs leading-5 opacity-70">
                      {domain.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </section>

        <section className="rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-bold">运行态</div>
            <Button
              disabled={busy !== null}
              onClick={refreshRuntime}
              size="sm"
              variant="secondary"
            >
              <RefreshCcw className="size-4" />
              刷新
            </Button>
          </div>
          <div className="space-y-2">
            <DataLine label="API" value={runtime?.mode ?? "loading"} />
            <DataLine
              label="ModelArk"
              value={runtime?.apiConnection.modelArk ?? "-"}
            />
            <DataLine
              label="OpenAPI"
              value={runtime?.apiConnection.openApi ?? "-"}
            />
            <DataLine
              label="Credentials"
              value={runtime?.hasCredentials ? "complete" : "incomplete"}
            />
            <DataLine
              label="Project"
              value={runtime?.projectName ?? realPersonProfile.projectName}
            />
          </div>
        </section>
      </aside>

      <section className="min-w-0 space-y-5">
        <section className="rounded-[var(--ui-radius)] border-border bg-card p-5 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ui-radius)] bg-secondary text-secondary-foreground">
                <CurrentIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{currentDomain.label}</h2>
                  <Badge variant="outline">
                    {getOperationLabel(activeDomain, activeOperation)}
                  </Badge>
                </div>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {currentDomain.description}
                </p>
              </div>
            </div>
            <OperationSwitch
              activeOperation={activeOperation}
              operations={currentDomain.operations}
              setOperation={setOperation}
            />
          </div>
        </section>

        {activeDomain === "overview" ? (
          <OverviewOperation
            runtime={runtime}
            selectedEndpoint={
              useFastEndpoint
                ? runtime?.endpoints.fast ?? seedanceEndpoints.fast
                : runtime?.endpoints.standard ?? seedanceEndpoints.standard
            }
          />
        ) : null}

        {activeDomain === "identity" && activeOperation === "create-session" ? (
          <Surface
            description="创建短时 H5 认证链接。真实接入时前端只打开后端返回的链接，不自己拼 BytePlus 参数。"
            icon={BadgeCheck}
            title="创建真人认证 Session"
          >
            <FormGrid>
              <Field
                description="我们自己的用户标识，用来绑定真人档案。"
                label="UserId"
              >
                <input
                  className={inputClassName}
                  onChange={(event) => setRealUserId(event.target.value)}
                  value={realUserId}
                />
              </Field>
              <Field
                description="可选，认证完成后回到业务页面。"
                label="Return URL"
              >
                <input
                  className={inputClassName}
                  onChange={(event) => setRealReturnUrl(event.target.value)}
                  placeholder="https://app.example.com/identity/done"
                  value={realReturnUrl}
                />
              </Field>
            </FormGrid>
            <ActionRow>
              <Button
                disabled={busy !== null || realUserId.trim().length === 0}
                onClick={() =>
                  void callApi({
                    label: "CreateVisualValidateSession",
                    method: "POST",
                    path: "/api/byteplus/real-person-sessions",
                    body: compactObject({
                      userId: realUserId,
                      returnUrl: realReturnUrl,
                    }),
                  })
                }
              >
                <BadgeCheck className="size-4" />
                创建认证
              </Button>
            </ActionRow>
          </Surface>
        ) : null}

        {activeDomain === "identity" && activeOperation === "query-result" ? (
          <Surface
            description="认证回调带回 BytedToken。后端应立即查询 GroupId 并落库。"
            icon={ShieldCheck}
            title="查询认证结果"
          >
            <Field
              description="真实 token 有效期很短，这里用于研发手动排查。"
              label="BytedToken"
            >
              <input
                className={inputClassName}
                onChange={(event) => setBytedToken(event.target.value)}
                value={bytedToken}
              />
            </Field>
            <ActionRow>
              <Button
                disabled={busy !== null || bytedToken.trim().length === 0}
                onClick={() =>
                  void callApi({
                    label: "GetVisualValidateResult",
                    method: "POST",
                    path: "/api/byteplus/real-person-results",
                    body: { bytedToken },
                  })
                }
                variant="secondary"
              >
                <Search className="size-4" />
                查询 GroupId
              </Button>
            </ActionRow>
          </Surface>
        ) : null}

        {activeDomain === "library" && activeOperation === "asset-groups" ? (
          <Surface
            description="虚拟素材走 CreateAssetGroup；真人素材组来自活体认证结果，不在这里手动创建。"
            icon={FolderPlus}
            title="素材组"
          >
            <FormGrid>
              <Field label="Name">
                <input
                  className={inputClassName}
                  onChange={(event) => setGroupName(event.target.value)}
                  value={groupName}
                />
              </Field>
              <Field label="Title">
                <input
                  className={inputClassName}
                  onChange={(event) => setGroupTitle(event.target.value)}
                  value={groupTitle}
                />
              </Field>
            </FormGrid>
            <Field label="Description">
              <textarea
                className={`${textareaClassName} min-h-24`}
                onChange={(event) => setGroupDescription(event.target.value)}
                value={groupDescription}
              />
            </Field>
            <FormGrid>
              <Field
                description="ListAssetGroups 的名称过滤。"
                label="搜索 Name"
              >
                <input
                  className={inputClassName}
                  onChange={(event) => setGroupSearchName(event.target.value)}
                  value={groupSearchName}
                />
              </Field>
            </FormGrid>
            <ActionRow>
              <Button
                disabled={busy !== null || groupName.trim().length === 0}
                onClick={() =>
                  void callApi({
                    label: "CreateAssetGroup",
                    method: "POST",
                    path: "/api/byteplus/asset-groups",
                    body: compactObject({
                      name: groupName,
                      title: groupTitle,
                      description: groupDescription,
                      groupType: "AIGC",
                    }),
                  })
                }
              >
                <FolderPlus className="size-4" />
                创建组
              </Button>
              <Button
                disabled={busy !== null}
                onClick={() =>
                  void callApi({
                    label: "ListAssetGroups",
                    method: "GET",
                    path: appendSearchParams("/api/byteplus/asset-groups", {
                      name: groupSearchName,
                      group_type: "AIGC",
                      page_size: "20",
                    }),
                  })
                }
                variant="secondary"
              >
                <ListChecks className="size-4" />
                列出素材组
              </Button>
            </ActionRow>
          </Surface>
        ) : null}

        {activeDomain === "library" && activeOperation === "assets" ? (
          <Surface
            description="CreateAsset 返回后通常进入 Processing。只有 Active 素材才应该进入生成页。"
            icon={UploadCloud}
            title="素材"
          >
            <FormGrid>
              <Field label="GroupId">
                <input
                  className={inputClassName}
                  onChange={(event) => setGroupId(event.target.value)}
                  value={groupId}
                />
              </Field>
              <SelectField
                label="AssetType"
                onChange={(value) =>
                  setAssetKind(value as (typeof assetKindOptions)[number])
                }
                options={assetKindOptions}
                value={assetKind}
              />
              <Field label="Name / fileName">
                <input
                  className={inputClassName}
                  onChange={(event) => setAssetName(event.target.value)}
                  value={assetName}
                />
              </Field>
              <SelectField
                label="Moderation"
                onChange={setModerationStrategy}
                options={["Default", "Skip"]}
                value={moderationStrategy}
              />
            </FormGrid>
            <Field
              description="真实入库要求 BytePlus 可访问；凭证缺失时只返回本地未接入 fallback。"
              label="素材 URL"
            >
              <input
                className={inputClassName}
                onChange={(event) => setAssetUrl(event.target.value)}
                value={assetUrl}
              />
            </Field>
            <FormGrid>
              <Field label="AssetId">
                <input
                  className={inputClassName}
                  onChange={(event) => setAssetId(event.target.value)}
                  value={assetId}
                />
              </Field>
              <SelectField
                label="状态过滤"
                onChange={setAssetStatusFilter}
                options={["", "Processing", "Active", "Failed"]}
                value={assetStatusFilter}
              />
            </FormGrid>
            <ActionRow>
              <Button
                disabled={busy !== null || groupId.trim().length === 0}
                onClick={() =>
                  void callApi({
                    label: "CreateAsset",
                    method: "POST",
                    path: "/api/byteplus/assets",
                    body: compactObject({
                      groupId,
                      assetKind,
                      name: assetName,
                      fileName: assetName,
                      url: assetUrl,
                      moderationStrategy:
                        moderationStrategy === "Default"
                          ? undefined
                          : moderationStrategy,
                    }),
                  })
                }
              >
                <UploadCloud className="size-4" />
                创建素材
              </Button>
              <Button
                disabled={busy !== null || assetId.trim().length === 0}
                onClick={() =>
                  void callApi({
                    label: "GetAsset",
                    method: "GET",
                    path: appendSearchParams("/api/byteplus/assets", {
                      asset_id: assetId,
                    }),
                  })
                }
                variant="secondary"
              >
                <Search className="size-4" />
                查询素材
              </Button>
              <Button
                disabled={busy !== null}
                onClick={() =>
                  void callApi({
                    label: "ListAssets",
                    method: "GET",
                    path: appendSearchParams("/api/byteplus/assets", {
                      group_id: groupId,
                      asset_kind: assetKind,
                      name: assetName,
                      status: assetStatusFilter,
                      page_size: "20",
                    }),
                  })
                }
                variant="secondary"
              >
                <ListChecks className="size-4" />
                列出素材
              </Button>
            </ActionRow>
          </Surface>
        ) : null}

        {activeDomain === "generation" && activeOperation === "compose" ? (
          <Surface
            description="content 顺序决定 Image 1 / Video 1 / Audio 1 编号。当前请求快照可在底部调试面板查看。"
            icon={Braces}
            title="请求编排"
          >
            <Field label="Prompt">
              <textarea
                className={textareaClassName}
                onChange={(event) => setPrompt(event.target.value)}
                value={prompt}
              />
            </Field>

            <div className="overflow-x-auto rounded-[var(--ui-radius)] border-border [border-width:var(--ui-border-width)]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-border bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">启用</th>
                    <th className="px-3 py-2">类型</th>
                    <th className="px-3 py-2">AssetId</th>
                    <th className="px-3 py-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {assetRefs.map((ref) => (
                    <tr className="border-b border-border last:border-b-0" key={ref.id}>
                      <td className="px-3 py-2">
                        <input
                          checked={ref.enabled}
                          onChange={(event) =>
                            updateAssetRef(ref.id, {
                              enabled: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className={inputClassName}
                          onChange={(event) =>
                            updateAssetRef(ref.id, {
                              assetKind:
                                event.target.value as AssetRefRow["assetKind"],
                              role:
                                event.target.value === "Audio"
                                  ? "reference_audio"
                                  : event.target.value === "Video"
                                    ? "reference_video"
                                    : "reference_image",
                            })
                          }
                          value={ref.assetKind}
                        >
                          {assetKindOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateAssetRef(ref.id, { assetId: event.target.value })
                          }
                          value={ref.assetId}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className={inputClassName}
                          onChange={(event) =>
                            updateAssetRef(ref.id, { role: event.target.value })
                          }
                          value={ref.role}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <FormGrid>
              <SelectField
                label="ratio"
                onChange={setRatio}
                options={ratioOptions}
                value={ratio}
              />
              <Field label="duration">
                <input
                  className={inputClassName}
                  onChange={(event) => setDuration(event.target.value)}
                  value={duration}
                />
              </Field>
              <SelectField
                label="resolution"
                onChange={setResolution}
                options={resolutionOptions}
                value={resolution}
              />
              <Field label="priority">
                <input
                  className={inputClassName}
                  onChange={(event) => setPriority(event.target.value)}
                  value={priority}
                />
              </Field>
              <Field label="seed">
                <input
                  className={inputClassName}
                  onChange={(event) => setSeed(event.target.value)}
                  value={seed}
                />
              </Field>
              <Field label="safety_identifier">
                <input
                  className={inputClassName}
                  onChange={(event) => setSafetyIdentifier(event.target.value)}
                  value={safetyIdentifier}
                />
              </Field>
            </FormGrid>

            <div className="flex flex-wrap gap-3">
              <Toggle
                checked={useFastEndpoint}
                label="Fast endpoint"
                onChange={setUseFastEndpoint}
              />
              <Toggle
                checked={generateAudio}
                label="generate_audio"
                onChange={setGenerateAudio}
              />
              <Toggle
                checked={watermark}
                label="watermark"
                onChange={setWatermark}
              />
              <Toggle
                checked={returnLastFrame}
                label="return_last_frame"
                onChange={setReturnLastFrame}
              />
            </div>

            <ActionRow>
              <Button disabled={busy !== null} onClick={createGenerationTask}>
                <Play className="size-4" />
                创建任务
              </Button>
            </ActionRow>
          </Surface>
        ) : null}

        {activeDomain === "generation" && activeOperation === "tasks" ? (
          <Surface
            description="任务结果 URL 只短期有效。成功后我们自己的系统要转存成片。"
            icon={ClipboardList}
            title="任务管理"
          >
            <FormGrid>
              <Field label="TaskId">
                <input
                  className={inputClassName}
                  onChange={(event) => setTaskId(event.target.value)}
                  value={taskId}
                />
              </Field>
              <Field label="limit">
                <input
                  className={inputClassName}
                  onChange={(event) => setTaskLimit(event.target.value)}
                  value={taskLimit}
                />
              </Field>
              <Field label="after">
                <input
                  className={inputClassName}
                  onChange={(event) => setTaskAfter(event.target.value)}
                  value={taskAfter}
                />
              </Field>
              <Field label="before">
                <input
                  className={inputClassName}
                  onChange={(event) => setTaskBefore(event.target.value)}
                  value={taskBefore}
                />
              </Field>
            </FormGrid>
            <ActionRow>
              <Button
                disabled={busy !== null || taskId.trim().length === 0}
                onClick={() =>
                  void callApi({
                    label: "RetrieveContentGenerationTask",
                    method: "GET",
                    path: `/api/byteplus/generation-tasks/${encodeURIComponent(
                      taskId
                    )}`,
                  })
                }
                variant="secondary"
              >
                <Search className="size-4" />
                查询任务
              </Button>
              <Button
                disabled={busy !== null}
                onClick={() =>
                  void callApi({
                    label: "ListContentGenerationTasks",
                    method: "GET",
                    path: appendSearchParams("/api/byteplus/generation-tasks", {
                      limit: taskLimit,
                      after: taskAfter,
                      before: taskBefore,
                    }),
                  })
                }
                variant="secondary"
              >
                <ListChecks className="size-4" />
                任务列表
              </Button>
              <Button
                disabled={busy !== null || taskId.trim().length === 0}
                onClick={() =>
                  void callApi({
                    label: "CancelContentGenerationTask",
                    method: "POST",
                    path: `/api/byteplus/generation-tasks/${encodeURIComponent(
                      taskId
                    )}`,
                    body: { action: "cancel" },
                  })
                }
                variant="secondary"
              >
                <XCircle className="size-4" />
                取消任务
              </Button>
              <Button
                disabled={busy !== null || taskId.trim().length === 0}
                onClick={() =>
                  void callApi({
                    label: "DeleteContentGenerationTask",
                    method: "DELETE",
                    path: `/api/byteplus/generation-tasks/${encodeURIComponent(
                      taskId
                    )}`,
                  })
                }
                variant="destructive"
              >
                <Trash2 className="size-4" />
                删除任务
              </Button>
            </ActionRow>
          </Surface>
        ) : null}

        {activeDomain === "callbacks" ? (
          <CallbackOperation
            operation={activeOperation}
            runtime={runtime}
          />
        ) : null}

        <InspectorPanel
          busy={busy}
          generationBody={generationBody}
          inspectorTab={inspectorTab}
          latestRequest={latestRequest}
          logs={logs}
          result={result}
          setInspectorTab={setInspectorTab}
        />
      </section>
    </div>
  );
}

function isRuntimeStatus(value: unknown): value is RuntimeStatus {
  return (
    isRecord(value) &&
    (value.mode === "local" || value.mode === "live") &&
    typeof value.projectName === "string"
  );
}

function OverviewOperation({
  runtime,
  selectedEndpoint,
}: {
  runtime: RuntimeStatus | null;
  selectedEndpoint: string;
}) {
  const coverage = [
    {
      title: "真人认证",
      actions: "CreateVisualValidateSession / GetVisualValidateResult",
    },
    {
      title: "私域素材库",
      actions: "CreateAssetGroup / ListAssetGroups / CreateAsset / GetAsset / ListAssets",
    },
    {
      title: "Seedance 任务",
      actions: "Create / Retrieve / List / Cancel / Delete",
    },
  ];

  return (
    <Surface
      description="这里不放表单，只看接入边界和运行态。真正操作从左侧资源域进入。"
      icon={SlidersHorizontal}
      title="控制台总览"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="API" value={runtime?.mode ?? "loading"} />
        <Metric label="ModelArk" value={runtime?.apiConnection.modelArk ?? "-"} />
        <Metric label="OpenAPI" value={runtime?.apiConnection.openApi ?? "-"} />
        <Metric
          label="Credentials"
          value={runtime?.hasCredentials ? "complete" : "incomplete"}
        />
        <Metric label="ProjectName" value={runtime?.projectName ?? "default"} />
        <Metric label="Endpoint" value={selectedEndpoint} />
      </div>
      <div className="rounded-[var(--ui-radius)] border-border [border-width:var(--ui-border-width)]">
        {coverage.map((item, index) => (
          <div
            className={cn(
              "grid gap-1 px-4 py-3 text-sm md:grid-cols-[160px_minmax(0,1fr)]",
              index > 0 && "border-t border-border"
            )}
            key={item.title}
          >
            <div className="font-bold">{item.title}</div>
            <code className="font-mono text-xs leading-5 text-muted-foreground">
              {item.actions}
            </code>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function CallbackOperation({
  operation,
  runtime,
}: {
  operation: string;
  runtime: RuntimeStatus | null;
}) {
  const payload =
    operation === "video-callback"
      ? {
          url: runtime?.urls.videoTaskCallbackUrl,
          bodyShape: {
            id: "cgt-xxxx",
            status: "succeeded | failed | queued | running | expired",
            content: {
              video_url: "https://...",
              last_frame_url: "https://...",
            },
            error: {
              code: "provider_error_code",
              message: "provider_error_message",
            },
          },
          nextAction: "persist provider status -> transfer video_url within 24h",
        }
      : {
          url: runtime?.urls.realPersonCallbackUrl,
          query: {
            bytedToken: "vvs-token",
            resultCode: "10000",
            algorithmBaseRespCode: "0",
            reqMeasureInfoValue: "1",
            verify_type: "real_time",
          },
          nextAction: "GetVisualValidateResult -> persist GroupId",
        };

  return (
    <Surface
      description={
        operation === "video-callback"
          ? "任务回调失败时用轮询兜底；成功结果要尽快转存。"
          : "认证回调只做接收和转交查询，GroupId 必须由后端保存。"
      }
      icon={operation === "video-callback" ? ClipboardList : ShieldCheck}
      title={operation === "video-callback" ? "视频任务回调" : "真人认证回调"}
    >
      <DebugCode value={JSON.stringify(payload, null, 2)} />
    </Surface>
  );
}

function InspectorPanel({
  busy,
  generationBody,
  inspectorTab,
  latestRequest,
  logs,
  result,
  setInspectorTab,
}: {
  busy: string | null;
  generationBody: Partial<Record<string, unknown>>;
  inspectorTab: InspectorTab;
  latestRequest: ApiRequestPreview | null;
  logs: LogEntry[];
  result: ApiResult;
  setInspectorTab: (tab: InspectorTab) => void;
}) {
  return (
    <section className="rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--ui-radius)] bg-secondary text-secondary-foreground">
            <FileJson className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold">调试输出</div>
            <div className="truncate text-xs text-muted-foreground">
              {busy ? busy : result.title}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["response", "request", "logs"] as InspectorTab[]).map((tab) => (
            <button
              className={cn(
                "rounded-[var(--ui-radius)] px-3 py-1.5 text-xs font-bold",
                inspectorTab === tab ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
              key={tab}
              onClick={() => setInspectorTab(tab)}
              type="button"
            >
              {tab === "response" ? "返回" : tab === "request" ? "请求" : "日志"}
            </button>
          ))}
          <Badge variant={result.status && result.status >= 400 ? "destructive" : "outline"}>
            {result.status ?? "idle"}
          </Badge>
        </div>
      </div>

      {inspectorTab === "response" ? (
        <DebugCode value={JSON.stringify(result.data, null, 2)} />
      ) : null}
      {inspectorTab === "request" ? (
        <DebugCode
          value={JSON.stringify(
            latestRequest ?? {
              method: "-",
              path: "尚未发起请求",
              generationPayloadPreview: generationBody,
            },
            null,
            2
          )}
        />
      ) : null}
      {inspectorTab === "logs" ? <LogList logs={logs} /> : null}
    </section>
  );
}

function LogList({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-[var(--ui-radius)] border-border bg-background p-3 text-sm text-muted-foreground [border-width:var(--ui-border-width)]">
        暂无请求。
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {logs.map((log) => (
        <div
          className="grid gap-2 rounded-[var(--ui-radius)] border-border bg-background p-3 text-xs [border-width:var(--ui-border-width)] md:grid-cols-[150px_minmax(0,1fr)_80px_70px]"
          key={log.id}
        >
          <div className="font-bold">{log.label}</div>
          <code className="truncate font-mono text-muted-foreground">
            {log.method} {log.path}
          </code>
          <span className="text-muted-foreground">{log.createdAt}</span>
          <Badge variant={log.status && log.status >= 400 ? "destructive" : "outline"}>
            {log.status ?? "ERR"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function Surface({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--ui-radius)] border-border bg-card p-5 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow)]">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ui-radius)] bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </div>
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function OperationSwitch({
  activeOperation,
  operations,
  setOperation,
}: {
  activeOperation: string;
  operations: DomainMeta["operations"];
  setOperation: (operationId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {operations.map((operation) => (
        <button
          className={cn(
            "rounded-[var(--ui-radius)] border-border px-3 py-2 text-sm font-bold [border-width:var(--ui-border-width)]",
            activeOperation === operation.id
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-muted"
          )}
          key={operation.id}
          onClick={() => setOperation(operation.id)}
          type="button"
        >
          {operation.label}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel description={description} label={label} />
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        className={inputClassName}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option || "all"} value={option}>
            {option || "All"}
          </option>
        ))}
      </select>
    </Field>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-10 items-center gap-3 rounded-[var(--ui-radius)] border-border bg-background px-3 py-2 text-sm font-bold [border-width:var(--ui-border-width)]">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2 pt-1">{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--ui-radius)] border-border bg-background p-4 [border-width:var(--ui-border-width)]">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 truncate font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

function DebugCode({ value }: { value: string }) {
  return (
    <div className="max-h-[320px] min-h-40 overflow-auto rounded-[var(--ui-radius)] border-border bg-[oklch(0.17_0.012_250)] [border-width:var(--ui-border-width)]">
      <pre className="min-w-max p-4 font-mono text-[11px] leading-5 text-[oklch(0.94_0.012_88)]">
        {value}
      </pre>
    </div>
  );
}
