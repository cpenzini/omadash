import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn("omadash-kbd", className)}>{children}</kbd>;
}
