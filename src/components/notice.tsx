import { clsx } from "clsx";

export function Notice({
  children,
  variant = "message",
}: {
  children?: string;
  variant?: "message" | "error";
}) {
  if (!children) return null;
  return <p className={clsx("notice", `notice-${variant}`)}>{children}</p>;
}

