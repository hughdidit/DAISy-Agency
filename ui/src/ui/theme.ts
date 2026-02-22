<<<<<<< HEAD
export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
=======
export type ThemeMode = "dark" | "light" | "openknot" | "fieldmanual" | "openai" | "clawdash";
export type ResolvedTheme = ThemeMode;

export const VALID_THEMES = new Set<ThemeMode>([
  "dark",
  "light",
  "openknot",
  "fieldmanual",
  "openai",
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
>>>>>>> 26ab93f0e (revert(ui): remove recent UI dashboard/theme commits from main)
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return getSystemTheme();
  return mode;
}
