"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Clapperboard,
  Code2,
  Film,
  FolderKanban,
  Library,
  MessageSquareText,
  Moon,
  Palette,
  RotateCcw,
  Settings,
  Sun,
} from "lucide-react";

import {
  applyAppearance,
  colorModeStorageKey,
  defaultColorMode,
  defaultUiTheme,
  isColorMode,
  isUiTheme,
  themeStorageKey,
  uiThemes,
  type ColorMode,
  type UiTheme,
} from "@/lib/theme-options";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    href: "/text-to-video",
    label: "文生视频",
    description: "仅用文本创建视频",
    icon: MessageSquareText,
  },
  {
    href: "/",
    label: "生成",
    description: "创建视频任务",
    icon: Clapperboard,
  },
  {
    href: "/console",
    label: "控制台",
    description: "认证、素材组与任务 API",
    icon: Code2,
  },
  {
    href: "/assets",
    label: "素材",
    description: "素材入库与状态",
    icon: Library,
  },
  {
    href: "/generated-assets",
    label: "作品库",
    description: "生成视频资产",
    icon: Film,
  },
];

const colorModes: Array<{
  id: ColorMode;
  label: string;
  icon: React.ElementType;
}> = [
  { id: "light", label: "浅色", icon: Sun },
  { id: "dark", label: "暗色", icon: Moon },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function AppShell({
  children,
  contentClassName,
}: {
  title?: string;
  description?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [hasLocalEnvValues, setHasLocalEnvValues] = React.useState<
    boolean | null
  >(null);

  React.useEffect(() => {
    let cancelled = false;

    async function readRuntimeStatus() {
      try {
        const response = await fetch("/api/byteplus/runtime", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          localEnv?: {
            exists?: boolean;
            hasConfiguredValues?: boolean;
          };
        };

        if (!cancelled) {
          setHasLocalEnvValues(Boolean(payload.localEnv?.hasConfiguredValues));
        }
      } catch {
        if (!cancelled) {
          setHasLocalEnvValues(false);
        }
      }
    }

    void readRuntimeStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    function closeSettingsOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-settings-root='true']")) {
        return;
      }

      setSettingsOpen(false);
    }

    window.addEventListener("pointerdown", closeSettingsOnOutsidePointerDown);

    return () => {
      window.removeEventListener(
        "pointerdown",
        closeSettingsOnOutsidePointerDown
      );
    };
  }, [settingsOpen]);

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <div className="min-h-[100dvh] lg:pl-[72px]">
        <aside className="sticky top-0 z-30 border-b border-border bg-card lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[72px] lg:flex-col lg:border-b-0 lg:border-r">
          <div
            aria-hidden="true"
            className="hidden justify-center lg:flex lg:py-5"
          >
            <div className="flex size-11 items-center justify-center rounded-full text-2xl">
              {hasLocalEnvValues === false ? "😢" : "🙂"}
            </div>
          </div>

          <div className="flex h-16 items-center justify-between px-4 lg:hidden">
            <Link
              aria-label="BytePlus Dancing Together 首页"
              className="flex min-w-0 items-center gap-3 lg:justify-center"
              href="/"
              title="BytePlus Dancing Together"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--ui-radius)] bg-primary text-primary-foreground">
                <FolderKanban className="size-5" />
              </div>
              <div className="min-w-0 lg:hidden">
                <div className="truncate text-sm font-bold">
                  BytePlus Dancing Together
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  真人素材视频工作台
                </div>
              </div>
            </Link>
            <Badge className="lg:hidden" variant="outline">
              {navItems.find((item) => isActive(pathname, item.href))?.label}
            </Badge>
          </div>

          <nav className="hidden px-3 pb-5 lg:block lg:px-2 lg:pt-5">
            <div className="grid justify-items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);

                return (
                  <Button
                    asChild
                    className={cn(
                      "size-11 p-0",
                      !active && "shadow-none"
                    )}
                    key={item.href}
                    size="icon"
                    variant={active ? "default" : "ghost"}
                  >
                    <Link aria-label={item.label} href={item.href} title={item.label}>
                      <Icon className="size-4" />
                    </Link>
                  </Button>
                );
              })}
            </div>
          </nav>

          <div
            className="relative mt-auto hidden justify-center pb-5 lg:flex"
            data-settings-root="true"
          >
            <Button
              aria-expanded={settingsOpen}
              aria-label="打开设置"
              className="size-11 p-0"
              onClick={() => setSettingsOpen((open) => !open)}
              size="icon"
              title="设置"
              type="button"
              variant={settingsOpen ? "default" : "ghost"}
            >
              <Settings className="size-4" />
            </Button>
            {settingsOpen ? (
              <SettingsCard
                className="absolute bottom-0 left-[calc(100%+12px)]"
                onClose={() => setSettingsOpen(false)}
              />
            ) : null}
          </div>

          <nav className="grid grid-cols-6 border-t border-border lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
                    active && "bg-secondary text-foreground"
                  )}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              aria-expanded={settingsOpen}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
                settingsOpen && "bg-secondary text-foreground"
              )}
              data-settings-root="true"
              onClick={() => setSettingsOpen((open) => !open)}
              type="button"
            >
              <Settings className="size-4" />
              <span>设置</span>
            </button>
          </nav>
          {settingsOpen ? (
            <SettingsCard
              className="fixed bottom-16 left-3 right-3 lg:hidden"
              dataSettingsRoot
              onClose={() => setSettingsOpen(false)}
            />
          ) : null}
        </aside>

        <section className="min-w-0">
          <div className={cn("px-5 py-5 lg:px-7 lg:py-7", contentClassName)}>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function SettingsCard({
  className,
  dataSettingsRoot,
  onClose,
}: {
  className?: string;
  dataSettingsRoot?: boolean;
  onClose: () => void;
}) {
  const [uiTheme, setUiTheme] = React.useState<UiTheme>(() => {
    if (typeof window === "undefined") {
      return defaultUiTheme;
    }

    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return isUiTheme(storedTheme) ? storedTheme : defaultUiTheme;
  });
  const [colorMode, setColorMode] = React.useState<ColorMode>(() => {
    if (typeof window === "undefined") {
      return defaultColorMode;
    }

    const storedMode = window.localStorage.getItem(colorModeStorageKey);
    return isColorMode(storedMode) ? storedMode : defaultColorMode;
  });

  React.useEffect(() => {
    applyAppearance(uiTheme, colorMode);
    window.localStorage.setItem(themeStorageKey, uiTheme);
    window.localStorage.setItem(colorModeStorageKey, colorMode);
  }, [colorMode, uiTheme]);

  function resetAppearance() {
    setUiTheme(defaultUiTheme);
    setColorMode(defaultColorMode);
  }

  return (
    <div
      className={cn(
        "z-50 w-[min(340px,calc(100vw-24px))] rounded-[var(--ui-radius)] border-border bg-card p-4 [border-width:var(--ui-border-width)] [box-shadow:var(--ui-shadow)]",
        className
      )}
      data-settings-root={dataSettingsRoot ? "true" : undefined}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[var(--ui-radius)] bg-secondary text-secondary-foreground">
            <Palette className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold">偏好设置</div>
            <div className="mt-1 text-xs text-muted-foreground">
              只保存在本机浏览器。
            </div>
          </div>
        </div>
        <button
          className="rounded-[var(--ui-radius)] px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          关闭
        </button>
      </div>

      <div className="grid gap-4">
        <section>
          <div className="mb-2 text-xs font-bold text-muted-foreground">主题</div>
          <div className="grid gap-2">
            {uiThemes.map((theme) => (
              <button
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[var(--ui-radius)] border-border bg-background px-3 py-2 text-left [border-width:var(--ui-border-width)]",
                  uiTheme === theme.id && "bg-secondary"
                )}
                key={theme.id}
                onClick={() => setUiTheme(theme.id)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">
                    {theme.name}
                  </span>
                  <span className="mt-1 flex gap-1.5">
                    {theme.swatches.map((swatch) => (
                      <span
                        className="size-4 rounded-full border-border [border-width:var(--ui-border-width)]"
                        key={`${theme.id}-${swatch}`}
                        style={{ background: swatch }}
                      />
                    ))}
                  </span>
                </span>
                {uiTheme === theme.id ? <Badge variant="success">当前</Badge> : null}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 text-xs font-bold text-muted-foreground">模式</div>
          <div className="grid grid-cols-2 gap-2">
            {colorModes.map((mode) => {
              const Icon = mode.icon;

              return (
                <button
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-[var(--ui-radius)] border-border bg-background px-3 py-2 text-sm font-bold [border-width:var(--ui-border-width)]",
                    colorMode === mode.id && "bg-secondary"
                  )}
                  key={mode.id}
                  onClick={() => setColorMode(mode.id)}
                  type="button"
                >
                  <Icon className="size-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </section>

        <Button onClick={resetAppearance} size="sm" variant="secondary">
          <RotateCcw className="size-4" />
          恢复默认
        </Button>
      </div>
    </div>
  );
}
