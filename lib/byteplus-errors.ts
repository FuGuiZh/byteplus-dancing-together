type BytePlusErrorOptions = {
  code: string;
  message: string;
  status?: number;
  provider?: unknown;
};

export class BytePlusServiceError extends Error {
  code: string;
  status: number;
  provider?: unknown;

  constructor(options: BytePlusErrorOptions) {
    super(options.message);
    this.name = "BytePlusServiceError";
    this.code = options.code;
    this.status = options.status ?? 502;
    this.provider = options.provider;
  }
}

export function getProviderError(response: unknown) {
  if (!response || typeof response !== "object") {
    return undefined;
  }

  const metadata = "ResponseMetadata" in response ? response.ResponseMetadata : undefined;
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const error = "Error" in metadata ? metadata.Error : undefined;
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const code =
    "Code" in error && typeof error.Code === "string"
      ? error.Code
      : "BYTEPLUS_PROVIDER_ERROR";
  const message =
    "Message" in error && typeof error.Message === "string"
      ? error.Message
      : "BytePlus provider returned an error.";

  return { code, message };
}

function getProviderErrorStatus(code: string) {
  if (code === "AccessDenied" || code === "Unauthorized") {
    return 403;
  }

  if (code === "InvalidAccessKeyId" || code === "SignatureDoesNotMatch") {
    return 401;
  }

  if (code === "Throttling" || code === "LimitExceeded") {
    return 429;
  }

  if (
    code === "InvalidParameter" ||
    code.startsWith("InvalidParameter.") ||
    code.startsWith("MissingParameter.")
  ) {
    return 400;
  }

  return 502;
}

export function requireProviderResult<T>(response: unknown): T {
  const providerError = getProviderError(response);

  if (providerError) {
    throw new BytePlusServiceError({
      code: providerError.code,
      message: providerError.message,
      status: getProviderErrorStatus(providerError.code),
      provider: response,
    });
  }

  if (
    response &&
    typeof response === "object" &&
    "Result" in response &&
    response.Result !== undefined
  ) {
    return response.Result as T;
  }

  return response as T;
}
