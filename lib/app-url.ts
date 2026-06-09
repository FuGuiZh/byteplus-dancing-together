import type { BytePlusConfig } from "@/lib/byteplus-config";

export function appUrl(config: BytePlusConfig, pathname: string) {
  return `${config.APP_PUBLIC_URL.replace(/\/$/, "")}${pathname}`;
}
