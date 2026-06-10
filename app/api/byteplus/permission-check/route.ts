import { NextResponse } from "next/server";

import { getErrorStatus, toErrorPayload } from "@/lib/api-request";
import {
  getBytePlusConfig,
  hasBytePlusCredentials,
} from "@/lib/byteplus-config";
import {
  createBytePlusAssetGroup,
  createBytePlusRealPersonSession,
  deleteBytePlusAssetGroup,
  getBytePlusVisualValidateResult,
  listBytePlusAssetGroups,
  listBytePlusAssets,
} from "@/lib/byteplus-openapi-client";

type PermissionCheckStatus = "passed" | "failed" | "skipped";

type PermissionCheckStep = {
  id: string;
  label: string;
  action: string;
  category: "real-person" | "asset-library";
  elapsedMs?: number;
  error?: unknown;
  httpStatus?: number;
  note?: string;
  request?: unknown;
  response?: unknown;
  sideEffect?: string;
  status: PermissionCheckStatus;
};

type PermissionCheckContext = {
  createdGroupId?: string;
  bytedToken?: string;
};

function compactTimestamp() {
  return new Date().toISOString().replace(/\D/g, "").slice(0, 14);
}

async function readOptions(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    includeWriteChecks?: unknown;
  };

  return {
    includeWriteChecks: body.includeWriteChecks !== false,
  };
}

function createSkippedStep(
  step: Omit<PermissionCheckStep, "status">,
  note: string
): PermissionCheckStep {
  return {
    ...step,
    note,
    status: "skipped",
  };
}

async function runStep(
  step: Omit<PermissionCheckStep, "elapsedMs" | "error" | "httpStatus" | "response" | "status">,
  run: () => Promise<unknown>
): Promise<PermissionCheckStep> {
  const startedAt = performance.now();

  try {
    const response = await run();
    return {
      ...step,
      elapsedMs: Math.round(performance.now() - startedAt),
      response,
      status: "passed",
    };
  } catch (error) {
    return {
      ...step,
      elapsedMs: Math.round(performance.now() - startedAt),
      error: toErrorPayload(error),
      httpStatus: getErrorStatus(error),
      status: "failed",
    };
  }
}

function summarizeSteps(steps: PermissionCheckStep[]) {
  return {
    failed: steps.filter((step) => step.status === "failed").length,
    passed: steps.filter((step) => step.status === "passed").length,
    skipped: steps.filter((step) => step.status === "skipped").length,
    total: steps.length,
  };
}

export async function POST(request: Request) {
  const config = getBytePlusConfig();
  const options = await readOptions(request);
  const context: PermissionCheckContext = {};
  const steps: PermissionCheckStep[] = [];

  if (!hasBytePlusCredentials(config)) {
    const missingStep = createSkippedStep(
      {
        action: "Read .env.local",
        category: "asset-library",
        id: "byteplus-credentials",
        label: "检查 BytePlus IAM AK/SK",
        request: {
          required: [
            "BYTEPLUS_IAM_ACCESS_KEY_ID",
            "BYTEPLUS_IAM_SECRET_ACCESS_KEY",
          ],
        },
      },
      "缺少 IAM AK/SK，无法执行 BytePlus OpenAPI 权限自检。"
    );

    return NextResponse.json(
      {
        code: "BYTEPLUS_IAM_CREDENTIAL_MISSING",
        message: "缺少 BytePlus IAM AK/SK，无法执行权限自检。",
        mode: "missing_credentials",
        projectName: config.BYTEPLUS_PROJECT_NAME,
        steps: [missingStep],
        summary: summarizeSteps([missingStep]),
      },
      { status: 400 }
    );
  }

  steps.push(
    await runStep(
      {
        action: "CreateVisualValidateSession",
        category: "real-person",
        id: "create-visual-validate-session",
        label: "创建真人认证 H5 会话",
        request: {
          returnUrl: config.APP_PUBLIC_URL,
          userId: "permission-check",
        },
      },
      async () => {
        const response = await createBytePlusRealPersonSession(
          {
            returnUrl: config.APP_PUBLIC_URL,
            userId: "permission-check",
          },
          config
        );
        context.bytedToken = response.bytedToken;
        return response;
      }
    )
  );

  if (context.bytedToken) {
    steps.push(
      await runStep(
        {
          action: "GetVisualValidateResult",
          category: "real-person",
          id: "get-visual-validate-result",
          label: "查询真人认证结果",
          note: "新建 H5 会话尚未完成活体认证时，这一步可能返回未完成或无 GroupId；重点看是否 AccessDenied。",
          request: {
            bytedToken: context.bytedToken,
          },
        },
        () => getBytePlusVisualValidateResult(context.bytedToken!, config)
      )
    );
  } else {
    steps.push(
      createSkippedStep(
        {
          action: "GetVisualValidateResult",
          category: "real-person",
          id: "get-visual-validate-result",
          label: "查询真人认证结果",
        },
        "CreateVisualValidateSession 未返回 BytedToken，无法继续查询认证结果。"
      )
    );
  }

  steps.push(
    await runStep(
      {
        action: "ListAssetGroups",
        category: "asset-library",
        id: "list-asset-groups",
        label: "列出素材组",
        request: {
          groupType: "AIGC",
          pageSize: 1,
          sortBy: "UpdateTime",
          sortOrder: "Desc",
        },
      },
      () =>
        listBytePlusAssetGroups(config, {
          groupType: "AIGC",
          pageSize: 1,
          sortBy: "UpdateTime",
          sortOrder: "Desc",
        })
    )
  );

  steps.push(
    await runStep(
      {
        action: "ListAssets",
        category: "asset-library",
        id: "list-assets",
        label: "列出素材",
        request: {
          groupType: "AIGC",
          pageSize: 1,
          sortBy: "UpdateTime",
          sortOrder: "Desc",
        },
      },
      () =>
        listBytePlusAssets(config, {
          groupType: "AIGC",
          pageSize: 1,
          sortBy: "UpdateTime",
          sortOrder: "Desc",
        })
    )
  );

  if (options.includeWriteChecks) {
    const groupName = `permission-check-${compactTimestamp()}`;
    steps.push(
      await runStep(
        {
          action: "CreateAssetGroup",
          category: "asset-library",
          id: "create-asset-group",
          label: "创建临时 AIGC 素材组",
          request: {
            description: "BytePlus Dancing Together permission check.",
            groupType: "AIGC",
            name: groupName,
          },
          sideEffect: "如果成功，会创建一个临时素材组；随后会尝试 DeleteAssetGroup 清理。",
        },
        async () => {
          const response = await createBytePlusAssetGroup(
            {
              description: "BytePlus Dancing Together permission check.",
              groupType: "AIGC",
              name: groupName,
            },
            config
          );
          context.createdGroupId = response.groupId;
          return response;
        }
      )
    );

    if (context.createdGroupId) {
      steps.push(
        await runStep(
          {
            action: "DeleteAssetGroup",
            category: "asset-library",
            id: "delete-asset-group",
            label: "删除临时素材组",
            request: {
              groupId: context.createdGroupId,
            },
            sideEffect: "清理权限自检创建的临时素材组。",
          },
          () => deleteBytePlusAssetGroup(context.createdGroupId!, config)
        )
      );
    } else {
      steps.push(
        createSkippedStep(
          {
            action: "DeleteAssetGroup",
            category: "asset-library",
            id: "delete-asset-group",
            label: "删除临时素材组",
          },
          "CreateAssetGroup 未成功或未返回 GroupId，无需清理。"
        )
      );
    }
  } else {
    steps.push(
      createSkippedStep(
        {
          action: "CreateAssetGroup",
          category: "asset-library",
          id: "create-asset-group",
          label: "创建临时 AIGC 素材组",
        },
        "本次自检关闭了写操作检查。"
      )
    );
    steps.push(
      createSkippedStep(
        {
          action: "DeleteAssetGroup",
          category: "asset-library",
          id: "delete-asset-group",
          label: "删除临时素材组",
        },
        "本次自检关闭了写操作检查。"
      )
    );
  }

  steps.push(
    createSkippedStep(
      {
        action: "CreateAsset",
        category: "asset-library",
        id: "create-asset",
        label: "提交素材入库",
      },
      "CreateAsset 需要真实素材 URL 和目标 GroupId。请在素材库页选择素材组并使用 URL 入库按钮单独验证。"
    )
  );

  const summary = summarizeSteps(steps);
  const hasFailedStep = summary.failed > 0;

  return NextResponse.json(
    {
      code: hasFailedStep ? "BYTEPLUS_PERMISSION_CHECK_FAILED" : "OK",
      message: hasFailedStep
        ? "权限自检发现不可用项，请查看 steps 中每个 Action 的原始响应。"
        : "权限自检通过，可继续执行对应链路。",
      mode: "live",
      options,
      projectName: config.BYTEPLUS_PROJECT_NAME,
      region: config.BYTEPLUS_REGION,
      steps,
      summary,
    },
    { status: hasFailedStep ? 424 : 200 }
  );
}
