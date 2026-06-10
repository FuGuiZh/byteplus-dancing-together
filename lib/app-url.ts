import type { BytePlusConfig } from "@/lib/byteplus-config";

export interface AppUrlOptions {
  preferRequestOriginForLocalConfig?: boolean;
  request?: Request;
}

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function isPubliclyReachableHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "0.0.0.0" ||
    normalizedHostname === "::1" ||
    normalizedHostname.endsWith(".local")
  ) {
    return false;
  }

  if (/^10\./.test(normalizedHostname)) {
    return false;
  }

  if (/^192\.168\./.test(normalizedHostname)) {
    return false;
  }

  const private172Match = /^172\.(\d+)\./.exec(normalizedHostname);
  if (private172Match) {
    const secondPart = Number(private172Match[1]);
    return secondPart < 16 || secondPart > 31;
  }

  return true;
}

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || undefined;
}

export function getRequestOrigin(request: Request) {
  const forwardedHost =
    getFirstHeaderValue(request.headers.get("x-forwarded-host")) ||
    getFirstHeaderValue(request.headers.get("host"));
  const forwardedProto =
    getFirstHeaderValue(request.headers.get("x-forwarded-proto")) ||
    getFirstHeaderValue(request.headers.get("x-forwarded-protocol"));

  if (forwardedHost) {
    const proto = forwardedProto || new URL(request.url).protocol.replace(":", "");
    return `${proto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export function getEffectiveAppPublicUrl(
  config: BytePlusConfig,
  options: AppUrlOptions = {}
) {
  const configuredBaseUrl = normalizeBaseUrl(config.APP_PUBLIC_URL);

  if (!options.preferRequestOriginForLocalConfig || !options.request) {
    return configuredBaseUrl;
  }

  try {
    const configuredHostname = new URL(configuredBaseUrl).hostname;
    if (isPubliclyReachableHostname(configuredHostname)) {
      return configuredBaseUrl;
    }

    const requestOrigin = normalizeBaseUrl(getRequestOrigin(options.request));
    const requestHostname = new URL(requestOrigin).hostname;

    if (isPubliclyReachableHostname(requestHostname)) {
      return requestOrigin;
    }
  } catch {
    return configuredBaseUrl;
  }

  return configuredBaseUrl;
}

export function appUrl(
  config: BytePlusConfig,
  pathname: string,
  options: AppUrlOptions = {}
) {
  return `${getEffectiveAppPublicUrl(config, options)}${pathname}`;
}
