import { Service } from "@volcengine/openapi";

import { appUrl } from "@/lib/app-url";
import type { BytePlusConfig } from "@/lib/byteplus-config";
import type {
  AssetGroupRequest,
  AssetGroupUpdateRequest,
  AssetUpdateRequest,
  AssetUploadRequest,
  RealPersonSessionRequest,
} from "@/lib/byteplus-contracts";
import {
  BytePlusServiceError,
  requireProviderResult,
} from "@/lib/byteplus-errors";

const ARK_OPENAPI_VERSION = "2024-01-01";

type OpenApiRecord = Record<string, unknown>;

type VisualValidateSessionResult = {
  BytedToken?: string;
  H5Link?: string;
  CallbackURL?: string;
};

type VisualValidateResult = {
  GroupId?: string;
};

type AssetGroupResult = {
  Id?: string;
  GroupId?: string;
};

type AssetGroupDetailResult = {
  Id?: string;
  Name?: string;
  Description?: string;
  GroupType?: string;
  ProjectName?: string;
  CreateTime?: string;
  UpdateTime?: string;
  [key: string]: unknown;
};

type AssetResult = {
  Id?: string;
  AssetId?: string;
  AssetItem?: OpenApiRecord;
  [key: string]: unknown;
};

type AssetListResult = {
  Items?: OpenApiRecord[];
  AssetItems?: OpenApiRecord[];
  Total?: number;
  TotalCount?: number;
  NextToken?: string;
  [key: string]: unknown;
};

type AssetGroupListResult = {
  Items?: OpenApiRecord[];
  AssetGroups?: OpenApiRecord[];
  Total?: number;
  TotalCount?: number;
  NextToken?: string;
  [key: string]: unknown;
};

const DEFAULT_ASSET_GROUP_TYPE = "AIGC";

function requireIamCredential(
  config: BytePlusConfig,
  key: "BYTEPLUS_IAM_ACCESS_KEY_ID" | "BYTEPLUS_IAM_SECRET_ACCESS_KEY"
) {
  const value = config[key];

  if (!value) {
    throw new BytePlusServiceError({
      code: "BYTEPLUS_IAM_CREDENTIAL_MISSING",
      message: `${key} 未配置，无法调用 BytePlus OpenAPI。`,
      status: 500,
    });
  }

  return value;
}

function normalizeOpenApiHost(host: string) {
  return host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function normalizeOpenApiProtocol(protocol: string) {
  return protocol.endsWith(":") ? protocol : `${protocol}:`;
}

function createArkService(config: BytePlusConfig) {
  return new Service({
    accessKeyId: requireIamCredential(config, "BYTEPLUS_IAM_ACCESS_KEY_ID"),
    secretKey: requireIamCredential(config, "BYTEPLUS_IAM_SECRET_ACCESS_KEY"),
    serviceName: "ark",
    region: config.BYTEPLUS_REGION,
    host: normalizeOpenApiHost(config.byteplus.openApiHost),
    protocol: normalizeOpenApiProtocol(config.byteplus.openApiProtocol),
    defaultVersion: ARK_OPENAPI_VERSION,
  });
}

async function requestArkAction<Result>(
  config: BytePlusConfig,
  action: string,
  body: OpenApiRecord
) {
  const service = createArkService(config);
  const api = service.createAPI<OpenApiRecord, Result>(action, {
    Version: ARK_OPENAPI_VERSION,
    method: "POST",
    contentType: "json",
  });

  const response = await api(body);
  return {
    response,
    result: requireProviderResult<Result>(response),
  };
}

function withProjectName(config: BytePlusConfig, body: OpenApiRecord) {
  return {
    ...body,
    ProjectName: config.BYTEPLUS_PROJECT_NAME,
  };
}

function readResultId(result: OpenApiRecord, candidates: string[]) {
  for (const key of candidates) {
    const value = result[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return undefined;
}

function buildCallbackUrl(
  config: BytePlusConfig,
  input: RealPersonSessionRequest
) {
  if (!input.returnUrl) {
    return config.BYTEPLUS_REAL_PERSON_CALLBACK_URL;
  }

  const callbackUrl = new URL(config.BYTEPLUS_REAL_PERSON_CALLBACK_URL);
  callbackUrl.searchParams.set("return_url", input.returnUrl);
  return callbackUrl.toString();
}

export async function createBytePlusRealPersonSession(
  input: RealPersonSessionRequest,
  config: BytePlusConfig
) {
  const callbackUrl = buildCallbackUrl(config, input);
  const { response, result } =
    await requestArkAction<VisualValidateSessionResult>(
      config,
      "CreateVisualValidateSession",
      withProjectName(config, {
        CallbackURL: callbackUrl,
      })
    );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    bytedToken: result.BytedToken,
    validateUrl: result.H5Link,
    callbackUrl: result.CallbackURL ?? callbackUrl,
    expiresInSeconds: 120,
    provider: response,
  };
}

export async function getBytePlusVisualValidateResult(
  bytedToken: string,
  config: BytePlusConfig
) {
  const { response, result } = await requestArkAction<VisualValidateResult>(
    config,
    "GetVisualValidateResult",
    withProjectName(config, {
      BytedToken: bytedToken,
    })
  );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId: result.GroupId,
    provider: response,
  };
}

export async function listBytePlusAssetGroups(
  config: BytePlusConfig,
  filters: {
    groupId?: string;
    name?: string;
    groupType?: string;
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}
) {
  const { response, result } = await requestArkAction<AssetGroupListResult>(
    config,
    "ListAssetGroups",
    withProjectName(config, {
      Filter: {
        GroupIds: filters.groupId ? [filters.groupId] : undefined,
        Name: filters.name,
        GroupType: filters.groupType ?? DEFAULT_ASSET_GROUP_TYPE,
      },
      PageNumber: filters.pageNumber,
      PageSize: filters.pageSize,
      SortBy: filters.sortBy,
      SortOrder: filters.sortOrder,
    })
  );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    items: result.Items ?? result.AssetGroups ?? [],
    total: result.Total ?? result.TotalCount,
    nextToken: result.NextToken,
    provider: response,
  };
}

export async function getBytePlusAssetGroup(
  groupId: string,
  config: BytePlusConfig
) {
  const { response, result } = await requestArkAction<AssetGroupDetailResult>(
    config,
    "GetAssetGroup",
    withProjectName(config, {
      Id: groupId,
    })
  );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId,
    assetGroup: result,
    provider: response,
  };
}

export async function createBytePlusAssetGroup(
  input: AssetGroupRequest,
  config: BytePlusConfig
) {
  const { response, result } = await requestArkAction<AssetGroupResult>(
    config,
    "CreateAssetGroup",
    withProjectName(config, {
      Name: input.name,
      Title: input.title,
      Description: input.description,
      GroupType: input.groupType ?? "AIGC",
    })
  );
  const groupId = readResultId(result as OpenApiRecord, ["Id", "GroupId"]);

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId,
    groupType: input.groupType ?? "AIGC",
    provider: response,
  };
}

export async function updateBytePlusAssetGroup(
  groupId: string,
  input: AssetGroupUpdateRequest,
  config: BytePlusConfig
) {
  const { response, result } = await requestArkAction<AssetGroupResult>(
    config,
    "UpdateAssetGroup",
    withProjectName(config, {
      Id: groupId,
      Name: input.name,
      Description: input.description,
    })
  );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId: readResultId(result as OpenApiRecord, ["Id", "GroupId"]) ?? groupId,
    provider: response,
  };
}

export async function deleteBytePlusAssetGroup(
  groupId: string,
  config: BytePlusConfig
) {
  const { response } = await requestArkAction<OpenApiRecord>(
    config,
    "DeleteAssetGroup",
    withProjectName(config, {
      Id: groupId,
    })
  );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId,
    deleted: true,
    provider: response,
  };
}

export async function listBytePlusAssets(
  config: BytePlusConfig,
  filters: {
    groupId?: string;
    groupType?: string;
    assetKind?: string;
    name?: string;
    status?: string;
    pageNumber?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: string;
  } = {}
) {
  const { response, result } = await requestArkAction<AssetListResult>(
    config,
    "ListAssets",
    withProjectName(config, {
      Filter: {
        GroupIds: filters.groupId ? [filters.groupId] : undefined,
        GroupType: filters.groupType ?? DEFAULT_ASSET_GROUP_TYPE,
        Statuses: filters.status ? [filters.status] : undefined,
        Name: filters.name,
      },
      AssetType: filters.assetKind,
      PageNumber: filters.pageNumber,
      PageSize: filters.pageSize,
      SortBy: filters.sortBy,
      SortOrder: filters.sortOrder,
    })
  );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    items: result.Items ?? result.AssetItems ?? [],
    total: result.Total ?? result.TotalCount,
    nextToken: result.NextToken,
    provider: response,
  };
}

export async function createBytePlusAsset(
  input: AssetUploadRequest,
  config: BytePlusConfig
) {
  if (!input.url) {
    throw new BytePlusServiceError({
      code: "BYTEPLUS_ASSET_URL_REQUIRED",
      message: "真实素材入库需要传入 BytePlus 可访问的素材 URL。",
      status: 400,
    });
  }

  const { response, result } = await requestArkAction<AssetResult>(
    config,
    "CreateAsset",
    withProjectName(config, {
      GroupId: input.groupId,
      URL: input.url,
      AssetType: input.assetKind,
      Name: input.name ?? input.fileName,
      Moderation: input.moderationStrategy
        ? {
            Strategy: input.moderationStrategy,
          }
        : undefined,
    })
  );
  const assetId = readResultId(result as OpenApiRecord, ["Id", "AssetId"]);

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    groupId: input.groupId,
    asset: {
      assetId,
      assetKind: input.assetKind,
      fileName: input.fileName ?? input.name ?? input.url,
      sourceUrl: input.url,
      purpose: input.purpose ?? "reference",
      status: "Processing",
    },
    pollAfterMs: config.polling.assetPollIntervalMs,
    pollUrl: assetId
      ? appUrl(
          config,
          `/api/byteplus/assets?asset_id=${encodeURIComponent(assetId)}`
        )
      : undefined,
    provider: response,
  };
}

export async function getBytePlusAsset(assetId: string, config: BytePlusConfig) {
  const { response, result } = await requestArkAction<AssetResult>(
    config,
    "GetAsset",
    withProjectName(config, {
      Id: assetId,
    })
  );

  const assetItem =
    result.AssetItem && typeof result.AssetItem === "object"
      ? result.AssetItem
      : result;

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    assetId,
    asset: assetItem,
    provider: response,
  };
}

export async function updateBytePlusAsset(
  assetId: string,
  input: AssetUpdateRequest,
  config: BytePlusConfig
) {
  const { response, result } = await requestArkAction<AssetResult>(
    config,
    "UpdateAsset",
    withProjectName(config, {
      Id: assetId,
      Name: input.name,
    })
  );
  const resultId = readResultId(result as OpenApiRecord, ["Id", "AssetId"]);

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    assetId: resultId ?? assetId,
    provider: response,
  };
}

export async function deleteBytePlusAsset(
  assetId: string,
  config: BytePlusConfig
) {
  const { response } = await requestArkAction<OpenApiRecord>(
    config,
    "DeleteAsset",
    withProjectName(config, {
      Id: assetId,
    })
  );

  return {
    mode: "live",
    projectName: config.BYTEPLUS_PROJECT_NAME,
    assetId,
    deleted: true,
    provider: response,
  };
}
