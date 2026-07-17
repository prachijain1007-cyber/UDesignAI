import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/utils/cn";

const VARIANTS = {
  primary:
    "bg-brand-ink text-brand-cream hover:bg-brand-ink-soft shadow-[0_10px_30px_-12px_rgba(28,21,15,0.5)]",
  gold: "bg-brand-gold text-brand-ink hover:bg-brand-gold-dark hover:text-brand-cream shadow-[0_10px_30px_-12px_rgba(184,135,79,0.6)]",
  outline:
    "border border-brand-ink/20 text-brand-ink hover:border-brand-ink hover:bg-brand-ink/5",
  ghost: "text-brand-ink hover:bg-brand-ink/5",
} as const;

const SIZES = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
} as const;

interface ButtonBaseProps {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
}

type ButtonAsButton = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = ButtonBaseProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => {
    const classes = cn(
      "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
      VARIANTS[variant],
      SIZES[size],
      className
    );

    if ("href" in props && props.href !== undefined) {
      const { href, ...rest } = props;
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        />
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      />
    );
  }
);
Button.displayName = "Button";
