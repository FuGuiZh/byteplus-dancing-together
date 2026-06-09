export type UiTheme = "neo-brutalism" | "studio-soft";
export type ColorMode = "light" | "dark";

export const themeStorageKey = "bdt-ui-theme";
export const colorModeStorageKey = "bdt-color-mode";

export const defaultUiTheme: UiTheme = "neo-brutalism";
export const defaultColorMode: ColorMode = "light";

export const uiThemes: Array<{
  id: UiTheme;
  name: string;
  description: string;
  swatches: string[];
}> = [
  {
    id: "neo-brutalism",
    name: "Neo Brutalism",
    description: "当前默认主题，高对比、硬边框、强投影。",
    swatches: [
      "oklch(0.6489 0.2370 26.9728)",
      "oklch(0.9680 0.2110 109.7692)",
      "oklch(0.5635 0.2408 260.8178)",
    ],
  },
  {
    id: "studio-soft",
    name: "Studio Soft",
    description: "提交文件主题，紫调、低投影、视觉更克制。",
    swatches: [
      "oklch(0.4348 0.2320 271.7916)",
      "oklch(0.8774 0.0596 264.2014)",
      "oklch(0.9970 0.0144 106.6580)",
    ],
  },
];

export function isUiTheme(value: string | null): value is UiTheme {
  return value === "neo-brutalism" || value === "studio-soft";
}

export function isColorMode(value: string | null): value is ColorMode {
  return value === "light" || value === "dark";
}

export function applyAppearance(theme: UiTheme, mode: ColorMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", mode === "dark");
}
