import {loadFont as loadNunito} from "@remotion/google-fonts/Nunito";
import {loadFont as loadNunitoSans} from "@remotion/google-fonts/NunitoSans";

const {fontFamily: displayFontFamily} = loadNunito("normal", {
  weights: ["800"],
  subsets: ["latin", "latin-ext"],
});

const {fontFamily: uiFontFamily} = loadNunitoSans("normal", {
  weights: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});

/**
 * Zunvi design tokens, transcribed from the brand manual.
 * Components should consume semantic themes below instead of raw colors.
 */
export const brandColors = {
  ink: "#0F1723",
  accent: "#18C7E6",
  surface: "#F4F7F9",
  softGray: "#EEF2F5",
  white: "#FFFFFF",
  line: "#DCE4EA",
  muted: "#61707F",
  success: "#12805A",
  successSurface: "#E8F4EF",
  warning: "#8A6410",
  warningSurface: "#F7F0DD",
  error: "#A93226",
  errorSurface: "#FBEDEA",
  inkInverse: "#FFFFFF",
} as const;

export const brandThemes = {
  light: {
    canvas: brandColors.surface,
    surface: brandColors.white,
    surfaceMuted: brandColors.softGray,
    text: brandColors.ink,
    textMuted: brandColors.muted,
    accent: brandColors.accent,
    line: brandColors.line,
    active: "#E4F9FC",
    shadow: "rgba(15, 23, 35, 0.10)",
  },
  dark: {
    canvas: brandColors.ink,
    surface: "#152231",
    surfaceMuted: "#1A2B3B",
    text: brandColors.inkInverse,
    textMuted: "#9EABB7",
    accent: brandColors.accent,
    line: "#2A3948",
    active: "#153B47",
    shadow: "rgba(0, 0, 0, 0.22)",
  },
} as const;

export const typography = {
  display: displayFontFamily,
  ui: uiFontFamily,
  mono: 'Consolas, "Courier New", monospace',
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

export const spacing = {
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  6: 48,
  8: 64,
  12: 96,
} as const;

export const radii = {
  field: 8,
  button: 12,
  card: 12,
  modal: 20,
  pill: 999,
} as const;

export const shadows = {
  card: "0 6px 16px rgba(15, 23, 35, 0.10)",
  modal: "0 24px 50px rgba(15, 23, 35, 0.18)",
} as const;

export const motion = {
  baseSeconds: 0.18,
  easing: [0.16, 1, 0.3, 1] as const,
} as const;

export const codePalette = {
  background: brandThemes.dark.surface,
  backgroundActive: brandThemes.dark.active,
  line: brandThemes.dark.line,
  text: "#E7EDF2",
  muted: "#7F8D99",
  comment: "#79A88F",
  string: "#F0B59A",
  keyword: "#CDA6E8",
  literal: "#89B9E8",
  number: "#BFD89D",
  type: "#77D9CD",
  property: "#9ED0EF",
  function: "#E8D08B",
} as const;

export type BrandThemeName = keyof typeof brandThemes;
