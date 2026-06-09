"use client";

import * as React from "react";

import {
  applyAppearance,
  colorModeStorageKey,
  defaultColorMode,
  defaultUiTheme,
  isColorMode,
  isUiTheme,
  themeStorageKey,
} from "@/lib/theme-options";

export function ThemeSync() {
  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    const storedMode = window.localStorage.getItem(colorModeStorageKey);
    const theme = isUiTheme(storedTheme) ? storedTheme : defaultUiTheme;
    const mode = isColorMode(storedMode) ? storedMode : defaultColorMode;

    applyAppearance(theme, mode);
    window.localStorage.setItem(themeStorageKey, theme);
    window.localStorage.setItem(colorModeStorageKey, mode);
  }, []);

  return null;
}
