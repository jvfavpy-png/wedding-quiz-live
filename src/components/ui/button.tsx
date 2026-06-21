import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "bg-[var(--wql-text)] text-white shadow-lg shadow-[#13294b]/20 hover:brightness-95",
  secondary:
    "border border-[var(--wql-accent)] bg-white text-[var(--wql-text)] hover:bg-[var(--wql-accent-soft)]",
  danger: "bg-[var(--wql-danger)] text-white shadow-lg shadow-[#b42335]/20 hover:brightness-95",
  ghost: "bg-white/65 text-[var(--wql-text)] hover:bg-white",
  success: "bg-[var(--wql-success)] text-white shadow-lg shadow-[#0f7b63]/20 hover:brightness-95",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3 text-sm",
  md: "min-h-12 px-4 text-base",
  lg: "min-h-14 px-5 text-lg",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-45",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
