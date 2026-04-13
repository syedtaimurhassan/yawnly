import type { HTMLAttributes, PropsWithChildren } from "react";
import { cx } from "@/lib/classNames";

export function Card({
  children,
  className,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div className={cx("card", className)} {...props}>
      {children}
    </div>
  );
}

