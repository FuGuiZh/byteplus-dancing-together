"use client";

import * as React from "react";
import {
  BadgeCheck,
  Clipboard,
  ExternalLink,
  FileJson,
  KeyRound,
  Link2,
  RefreshCcw,
  Search,
  ShieldCheck,
  TimerReset,
  UserCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CodeBlock,
  DataLine,
  FieldLabel,
  inputClassName,
} from "@/components/workspace-primitives";

type RuntimeStatus = {
  mode: "local" | "live";
  openApiMode: "local" | "live";
  projectName: string;
  hasCredentials: boolean;
  apiConnection: {
    openApi: "connected" | "missing_credentials";
  };
  urls: {
    realPersonCallbackUrl: string;
  };
};

type ApiPayload = Record<string, unknown>;

type RealPersonSessionPayload = ApiPayload & {
  mode?: string;
  projectName?: string;
  sessionId?: string;
  bytedToken?: string;
  validateUrl?: string;
  callbackUrl?: string;
  expiresInSeconds?: number;
  expiresAt?: string;
  groupId?: string;
};

type RealPersonResultPayload = ApiPayload & {
  mode?: string;
  projectName?: string;
  groupId?: string;
  bytedToken?: string;
  resultCode?: string;
};

type RequestPreview = {
  method: string;
  path: string;
  body?: unknown;
};

const languageOptions = [
  { value: "zh", label: "简体中文 zh" },
  { value: "en", label: "English en" },
  { value: "zh-Hant", label: "繁体中文 zh-Hant" },
];

const callbackKeys = [
  "bytedToken",
  "byted_token",
  "resultCode",
  "algorithmBaseRespCode",
  "reqMeasureInfoValue",
  "verify_type",
  "return_url",
];

function isRuntimeStatus(value: unknown): value is RuntimeStatus {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as RuntimeStatus).projectName === "string" &&
    ((value as RuntimeStatus).mode === "local" ||
      (value as RuntimeStatus).mode === "live")
  );
}

function readString(value: unknown, fallback = "-") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function formatSeconds(seconds: number) {
  if (seconds <= 0) {
    return "已过期";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function withLanguage(validateUrl: string | undefined, language: string) {
  if (!validateUrl) {
    return "";
  }

  try {
    const url = new URL(validateUrl);
    url.searchParams.set("lng", language);
    return url.toString();
  } catch {
    return validateUrl;
  }
}

function extractCallbackParams() {
  if (typeof window === "undefined") {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    callbackKeys
      .map((key) => [key, params.get(key)] as const)
      .filter(([, value]) => value)
  );
}

export function RealPersonWorkspace() {
  const [runtime, setRuntime] = React.useState<RuntimeStatus | null>(null);
  const [userId, setUserId] = React.useState("studio-operator");
  const [returnUrl, setReturnUrl] = React.useState("");
  const [language, setLanguage] = React.useState("zh");
  const [bytedToken, setBytedToken] = React.useState("");
  const [sessionPayload, setSessionPayload] =
    React.useState<RealPersonSessionPayload | null>(null);
  const [resultPayload, setResultPayload] =
    React.useState<RealPersonResultPayload | null>(null);
  const [callbackParams, setCallbackParams] = React.useState<ApiPayload>({});
  const [latestRequest, setLatestRequest] = React.useState<RequestPreview | null>(
    null
  );
  const [busy, setBusy] = React.useState<"runtime" | "session" | "result" | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [expiresAtMs, setExpiresAtMs] = React.useState<number | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [copied, setCopied] = React.useState<string | null>(null);

  const validateUrl = withLanguage(sessionPayload?.validateUrl, language);
  const secondsLeft =
    expiresAtMs === null ? null : Math.max(0, Math.ceil((expiresAtMs - now) / 1000));
  const callbackResultCode = readString(callbackParams.resultCode, "");
  const callbackSuccess = callbackResultCode === "10000";

  React.useEffect(() => {
    let cancelled = false;

    window.queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      const extracted = extractCallbackParams();
      setCallbackParams(extracted);

      const token =
        readString(extracted.bytedToken, "") ||
        readString(extracted.byted_token, "");
      if (token) {
        setBytedToken(token);
      }

      setReturnUrl(`${window.location.origin}/real-person`);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    fetch("/api/byteplus/runtime", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: unknown) => {
        if (!cancelled && isRuntimeStatus(payload)) {
          setRuntime(payload);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  async function callJson<T extends ApiPayload>(
    request: RequestPreview,
    busyKey: "runtime" | "session" | "result"
  ) {
    setBusy(busyKey);
    setError(null);
    setLatestRequest(request);

    try {
      const response = await fetch(request.path, {
        method: request.method,
        headers:
          request.body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        body:
          request.body === undefined ? undefined : JSON.stringify(request.body),
      });
      const payload = (await response.json().catch(() => ({}))) as T;

      if (!response.ok) {
        setError(readString(payload.message, "请求失败。"));
      }

      return payload;
    } catch (currentError) {
      const message =
        currentError instanceof Error ? currentError.message : "请求失败。";
      setError(message);
      return { message } as unknown as T;
    } finally {
      setBusy(null);
    }
  }

  async function refreshRuntime() {
    const payload = await callJson<ApiPayload>(
      { method: "GET", path: "/api/byteplus/runtime" },
      "runtime"
    );

    if (isRuntimeStatus(payload)) {
      setRuntime(payload);
    }
  }

  async function createSession() {
    const body = {
      userId,
      returnUrl: returnUrl.trim() || undefined,
    };
    const payload = await callJson<RealPersonSessionPayload>(
      {
        method: "POST",
        path: "/api/byteplus/real-person-sessions",
        body,
      },
      "session"
    );

    setSessionPayload(payload);
    if (payload.bytedToken) {
      setBytedToken(payload.bytedToken);
    }

    if (typeof payload.expiresInSeconds === "number") {
      setExpiresAtMs(Date.now() + payload.expiresInSeconds * 1000);
    } else if (payload.expiresAt) {
      setExpiresAtMs(new Date(payload.expiresAt).getTime());
    } else {
      setExpiresAtMs(null);
    }
  }

  async function queryResult() {
    const payload = await callJson<RealPersonResultPayload>(
      {
        method: "POST",
        path: "/api/byteplus/real-person-results",
        body: { bytedToken },
      },
      "result"
    );

    setResultPayload(payload);
  }

  async function copyText(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <div className="mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="min-w-0 space-y-5">
        <header className="space-y-3">
          <Badge variant="outline">真人认证流程</Badge>
          <div className="max-w-4xl">
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              实名本人授权与真人素材组创建
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              这个页面把 CreateVisualValidateSession、H5 认证跳转、
              Callback 参数解析和 GetVisualValidateResult 串成完整链路。
            </p>
          </div>
        </header>

        <FlowTimeline
          callbackSuccess={callbackSuccess}
          hasGroupId={Boolean(resultPayload?.groupId ?? sessionPayload?.groupId)}
          hasSession={Boolean(sessionPayload?.validateUrl)}
          hasToken={Boolean(bytedToken)}
          openApiReady={Boolean(runtime?.hasCredentials)}
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>1. 创建 H5 真人认证链接</CardTitle>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  后端用 AK/SK 调用 CreateVisualValidateSession，返回短时 H5Link
                  和 BytedToken。H5Link 使用后失效，超时后也需要重新创建。
                </p>
              </div>
              <Badge variant={runtime?.hasCredentials ? "success" : "warning"}>
                {runtime?.hasCredentials ? "AK/SK 已配置" : "等待 AK/SK"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="UserId" description="我们自己的用户或真人档案 ID。">
                <input
                  className={inputClassName}
                  onChange={(event) => setUserId(event.target.value)}
                  value={userId}
                />
              </Field>
              <Field
                label="Return URL"
                description="认证完成后回到的业务页面；最终会被包进 CallbackURL。"
              >
                <input
                  className={inputClassName}
                  onChange={(event) => setReturnUrl(event.target.value)}
                  value={returnUrl}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={busy !== null || userId.trim().length === 0}
                onClick={createSession}
              >
                <ShieldCheck className="size-4" />
                创建认证链接
              </Button>
              <Button
                disabled={busy !== null}
                onClick={refreshRuntime}
                variant="secondary"
              >
                <RefreshCcw className="size-4" />
                刷新运行态
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>2. 打开 H5Link 完成活体认证</CardTitle>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  用户在 BytePlus H5 页面完成活体检测。成功后 CallbackURL
                  会附带 bytedToken、resultCode、algorithmBaseRespCode 等字段。
                </p>
              </div>
              <Badge variant={secondsLeft === 0 ? "destructive" : "outline"}>
                {secondsLeft === null ? "未创建" : formatSeconds(secondsLeft)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <Field label="H5 页面语言">
                <select
                  className={inputClassName}
                  onChange={(event) => setLanguage(event.target.value)}
                  value={language}
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="H5Link">
                <div className="flex min-w-0 gap-2">
                  <input className={inputClassName} readOnly value={validateUrl} />
                  <Button
                    disabled={!validateUrl}
                    onClick={() => copyText("validateUrl", validateUrl)}
                    size="icon"
                    type="button"
                    variant="secondary"
                  >
                    <Clipboard className="size-4" />
                  </Button>
                  <Button asChild disabled={!validateUrl} size="icon">
                    <a
                      href={validateUrl || "#"}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                </div>
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <InfoTile
                icon={TimerReset}
                label="H5Link / BytedToken"
                value="120 秒有效"
              />
              <InfoTile
                icon={Link2}
                label="Callback resultCode"
                value="10000 为成功"
              />
              <InfoTile
                icon={KeyRound}
                label="GroupId"
                value="成功后查询获取"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3. 回调参数与 GroupId 查询</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              如果当前页面 URL 里带着 BytePlus 回调参数，会自动填入 token。
              也可以手动粘贴 BytedToken 后查询 GetVisualValidateResult。
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <Field label="BytedToken">
                <input
                  className={inputClassName}
                  onChange={(event) => setBytedToken(event.target.value)}
                  value={bytedToken}
                />
              </Field>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  disabled={busy !== null || bytedToken.trim().length === 0}
                  onClick={queryResult}
                >
                  <Search className="size-4" />
                  查询 GroupId
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <StatusCard
                label="Callback resultCode"
                ok={callbackSuccess}
                value={callbackResultCode || "未接收"}
              />
              <StatusCard
                label="GroupId"
                ok={Boolean(resultPayload?.groupId ?? sessionPayload?.groupId)}
                value={readString(resultPayload?.groupId ?? sessionPayload?.groupId)}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>运行态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <DataLine label="Mode" value={runtime?.mode ?? "loading"} />
            <DataLine
              label="OpenAPI"
              value={runtime?.apiConnection.openApi ?? "-"}
            />
            <DataLine
              label="Project"
              value={runtime?.projectName ?? "default"}
            />
            <DataLine
              label="Callback"
              value={runtime?.urls.realPersonCallbackUrl ?? "-"}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>接口约束</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>CreateVisualValidateSession 和 GetVisualValidateResult 使用 AK/SK。</p>
            <p>H5Link、BytedToken 有效期 120 秒，失败或过期必须重新创建。</p>
            <p>resultCode 为 10000 后，才能用 BytedToken 查询真人 GroupId。</p>
            <p>同一 GroupId 对应一个真人，后续真人素材会和活体基准图做人脸一致性校验。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>调试输出</CardTitle>
              {error ? <Badge variant="destructive">error</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <div className="rounded-[var(--ui-radius)] bg-destructive px-3 py-2 text-sm text-destructive-foreground">
                {error}
              </div>
            ) : null}
            <DebugSection
              icon={FileJson}
              label="Latest request"
              value={latestRequest}
            />
            <DebugSection
              icon={BadgeCheck}
              label="Session response"
              value={sessionPayload ?? { message: "尚未创建认证链接。" }}
            />
            <DebugSection
              icon={UserCheck}
              label="Result response"
              value={resultPayload ?? { message: "尚未查询 GroupId。" }}
            />
            <DebugSection
              icon={Link2}
              label="Callback params"
              value={
                Object.keys(callbackParams).length > 0
                  ? callbackParams
                  : { message: "当前 URL 未携带认证回调参数。" }
              }
            />
          </CardContent>
        </Card>

        {copied ? (
          <div className="rounded-[var(--ui-radius)] bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground">
            已复制 {copied}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function FlowTimeline({
  callbackSuccess,
  hasGroupId,
  hasSession,
  hasToken,
  openApiReady,
}: {
  callbackSuccess: boolean;
  hasGroupId: boolean;
  hasSession: boolean;
  hasToken: boolean;
  openApiReady: boolean;
}) {
  const steps = [
    {
      label: "AK/SK 权限",
      detail: "OpenAPI 鉴权和 ArkFullAccess。",
      done: openApiReady,
    },
    {
      label: "创建 H5Link",
      detail: "CreateVisualValidateSession。",
      done: hasSession,
    },
    {
      label: "回调成功",
      detail: "resultCode=10000 或拿到 token。",
      done: callbackSuccess || hasToken,
    },
    {
      label: "获得 GroupId",
      detail: "GetVisualValidateResult。",
      done: hasGroupId,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => (
        <div
          className="rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow-xs)]"
          key={step.label}
        >
          <div className="mb-3 flex items-center justify-between">
            <Badge variant={step.done ? "success" : "outline"}>{index + 1}</Badge>
            <ShieldCheck
              className={cn(
                "size-4",
                step.done ? "text-foreground" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="font-bold">{step.label}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {step.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function Field({
  children,
  description,
  label,
}: {
  children: React.ReactNode;
  description?: string;
  label: string;
}) {
  return (
    <div>
      <FieldLabel description={description} label={label} />
      <div className="mt-2">{children}</div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[var(--ui-radius)] border-border bg-background p-3 [border-width:var(--ui-border-width)]">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--ui-radius)] bg-secondary text-secondary-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 truncate text-sm font-bold">{value}</div>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  ok,
  value,
}: {
  label: string;
  ok: boolean;
  value: string;
}) {
  return (
    <div className="rounded-[var(--ui-radius)] border-border bg-background p-4 [border-width:var(--ui-border-width)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-bold">{label}</div>
        <Badge variant={ok ? "success" : "outline"}>{ok ? "已就绪" : "等待"}</Badge>
      </div>
      <code className="block truncate font-mono text-xs">{value}</code>
    </div>
  );
}

function DebugSection({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: unknown;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
        <Icon className="size-4" />
        {label}
      </div>
      <CodeBlock value={JSON.stringify(value, null, 2)} />
      <Separator className="mt-4" />
    </section>
  );
}
