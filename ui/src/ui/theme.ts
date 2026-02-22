<<<<<<< HEAD
export type ThemeMode = "dark" | "light" | "openknot" | "fieldmanual" | "clawdash";
export type ResolvedTheme = ThemeMode;

export const VALID_THEMES = new Set<ThemeMode>([
  "dark",
  "light",
  "openknot",
  "fieldmanual",
  "clawdash",
]);

const LEGACY_MAP: Record<string, ThemeMode> = {
  defaultTheme: "dark",
  docsTheme: "light",
  lightTheme: "openknot",
  landingTheme: "openknot",
  newTheme: "openknot",
};

export function resolveTheme(mode: string): ResolvedTheme {
  if (VALID_THEMES.has(mode as ThemeMode)) {
    return mode as ThemeMode;
=======
export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
>>>>>>> 629869800 (revert(ui): remove UI portions of mixed commits from main)
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return getSystemTheme();
  }
  return mode;
}
