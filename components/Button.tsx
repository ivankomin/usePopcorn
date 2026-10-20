import React, { type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ButtonBaseProps {
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  children: ReactNode;
  className?: string;
}

export type ButtonAsButton = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

export type ButtonAsLink = ButtonBaseProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export default function Button({
  size = "md",
  fullWidth = false,
  isLoading = false,
  children,
  className,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-4 py-1.5 text-xs gap-1.5",
    md: "px-6 py-2.5 text-xs sm:text-sm gap-2",
    lg: "px-7 py-3 text-xs sm:text-sm gap-2.5",
  };

  const classes = cn(
    "inline-flex items-center justify-center rounded-md border-2 border-brand-lime text-brand-lime hover:text-black font-semibold uppercase tracking-wider bg-transparent hover:bg-brand-lime active:scale-95 transition-all duration-200 cursor-pointer shadow-sm select-none",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:bg-black/50 disabled:hover:text-brand-lime",
    sizeClasses[size],
    fullWidth && "w-full",
    className
  );

  if ("href" in props && props.href) {
    const { href, ...linkProps } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...linkProps}>
        {children}
      </Link>
    );
  }

  const { type = "button", disabled, ...buttonProps } = props as ButtonAsButton;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={classes}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
