/**
 * Omarchy palettes. Add an id, a THEMES row, and a html[data-theme] block
 * in styles.css. See docs/EXTENDING.md.
 */
import { create } from "zustand";

export const THEME_KEY = "omadash-theme-v1";

export type ThemeId =
  | "auto"
  | "omadash"
  | "nord"
  | "everforest"
  | "gruvbox"
  | "tokyo"
  | "white";

export type ResolvedTheme = Exclude<ThemeId, "auto">;

export const THEMES: {
  id: ThemeId;
  label: string;
  hint: string;
}[] = [
  { id: "auto", label: "Auto", hint: "Follows light / dark" },
  { id: "omadash", label: "Steel", hint: "Omadash" },
  { id: "nord", label: "Nord", hint: "Arctic" },
  { id: "everforest", label: "Everforest", hint: "Moss" },
  { id: "gruvbox", label: "Gruvbox", hint: "Warm" },
  { id: "tokyo", label: "Tokyo Night", hint: "Neon" },
  { id: "white", label: "White", hint: "Paper" },
];

const RESOLVED = new Set<ResolvedTheme>([
  "omadash", "nord", "everforest", "gruvbox", "tokyo", "white",
]);

function prefersLight() {
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

export function resolveTheme(id: ThemeId): ResolvedTheme {
  if (id === "auto") return prefersLight() ? "white" : "omadash";
  return RESOLVED.has(id) ? id : "omadash";
}

export function applyTheme(id: ThemeId) {
  const resolved = resolveTheme(id);
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved !== "white");
  root.classList.toggle("light", resolved === "white");
  const meta = document.querySelector('meta[name="theme-color"]');
  const bg = getComputedStyle(root).getPropertyValue("--color-bg").trim();
  if (meta && bg) meta.setAttribute("content", bg);
}

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)})||"omadash";var known=${JSON.stringify([...RESOLVED])};var id=t==="auto"?(window.matchMedia("(prefers-color-scheme: light)").matches?"white":"omadash"):t;if(known.indexOf(id)<0)id="omadash";var r=document.documentElement;r.setAttribute("data-theme",id);r.classList.toggle("dark",id!=="white");r.classList.toggle("light",id==="white");}catch(e){}})();`;

function readStored(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "auto" || RESOLVED.has(raw as ResolvedTheme)) return raw as ThemeId;
  } catch { /* ignore */ }
  return "omadash";
}

interface ThemeState {
  id: ThemeId;
  resolved: ResolvedTheme;
  open: boolean;
  hydrate: () => void;
  setTheme: (id: ThemeId) => void;
  setOpen: (open: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  id: "omadash",
  resolved: "omadash",
  open: false,
  hydrate: () => {
    const id = readStored();
    applyTheme(id);
    set({ id, resolved: resolveTheme(id) });
  },
  setTheme: (id) => {
    try { localStorage.setItem(THEME_KEY, id); } catch { /* ignore */ }
    applyTheme(id);
    set({ id, resolved: resolveTheme(id), open: false });
  },
  setOpen: (open) => set({ open }),
}));

export function themeLabel(id: ThemeId): string {
  return THEMES.find((t) => t.id === id)?.label ?? "Omadash";
}

export function isLightTheme(resolved: ResolvedTheme) {
  return resolved === "white";
}
