import {brandThemes} from "../design/brand";

export const themes = {
  light: {
    background: brandThemes.light.canvas,
    surface: brandThemes.light.surface,
    text: brandThemes.light.text,
    muted: brandThemes.light.textMuted,
    accent: brandThemes.light.accent,
    line: brandThemes.light.textMuted,
    border: brandThemes.light.line,
    grid: brandThemes.light.line,
    node: brandThemes.light.surface,
    nodeBorder: brandThemes.light.line,
    active: brandThemes.light.active,
    glow: brandThemes.light.active,
    shadow: brandThemes.light.shadow,
  },
  dark: {
    background: brandThemes.dark.canvas,
    surface: brandThemes.dark.surface,
    text: brandThemes.dark.text,
    muted: brandThemes.dark.textMuted,
    accent: brandThemes.dark.accent,
    line: brandThemes.dark.textMuted,
    border: brandThemes.dark.line,
    grid: brandThemes.dark.line,
    node: brandThemes.dark.surfaceMuted,
    nodeBorder: brandThemes.dark.line,
    active: brandThemes.dark.active,
    glow: brandThemes.dark.active,
    shadow: brandThemes.dark.shadow,
  },
} as const;
export type ThemeName = keyof typeof themes;
