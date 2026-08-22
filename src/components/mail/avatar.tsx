import { avatarClass, initials } from "@/lib/mail/format";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  email,
  size = "md",
}: {
  name: string;
  email: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-fg/90",
        avatarClass(email),
        size === "sm" && "size-7 text-micro",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-11 text-sm",
      )}
      aria-hidden
    >
      {initials(name || email)}
    </span>
  );
}
