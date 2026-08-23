import { useEffect } from "react";
import { THEMES, useThemeStore, type ThemeId } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";

export function ThemePicker() {
  const open = useThemeStore((s) => s.open);
  const setOpen = useThemeStore((s) => s.setOpen);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      const n = e.key === "0" ? 10 : Number(e.key);
      if (n >= 1 && n <= THEMES.length) {
        e.preventDefault();
        e.stopPropagation();
        const next = THEMES[n - 1];
        if (next) setTheme(next.id);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setTheme]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Theme"
        className="w-full max-w-lg rounded-xl border border-border bg-elevated p-4 shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-fg">Omarchy theme</h2>
          <Kbd>Esc</Kbd>
        </div>
        <ThemeGrid showKeys />
      </div>
    </div>
  );
}

export function ThemeGrid({ showKeys = false }: { showKeys?: boolean }) {
  const current = useThemeStore((s) => s.id);
  const setTheme = useThemeStore((s) => s.setTheme);
  return (
    <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {THEMES.map((t, i) => (
        <li key={t.id}>
          <ThemeButton
            id={t.id}
            label={t.label}
            hint={t.hint}
            index={i + 1}
            active={current === t.id}
            showKey={showKeys}
            onPick={setTheme}
          />
        </li>
      ))}
    </ul>
  );
}

function ThemeButton({
  id,
  label,
  hint,
  index,
  active,
  showKey,
  onPick,
}: {
  id: ThemeId;
  label: string;
  hint: string;
  index: number;
  active: boolean;
  showKey?: boolean;
  onPick: (id: ThemeId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-select",
        active && "bg-select",
      )}
    >
      <span data-preview={id} className="theme-preview w-16 shrink-0">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-mail text-fg">{label}</span>
        <span className="block text-micro text-subtle">{hint}</span>
      </span>
      {showKey && <Kbd>{index === 10 ? "0" : String(index)}</Kbd>}
    </button>
  );
}
