import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cx } from "@/lib/classNames";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, PropsWithChildren {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  block = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "button",
        `button--${variant}`,
        `button--${size}`,
        block && "button--block",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

