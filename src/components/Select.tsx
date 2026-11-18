import type { ReactNode, SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Shown inside the field, left of the text (e.g. a type icon). */
  icon?: ReactNode;
  /** Less padding, for tight spots such as the header. */
  compact?: boolean;
};

/**
 * A native <select> with our own arrow. `appearance-none` matters: Safari
 * ignores padding on a standard select, which puts the text under an icon.
 */
export function Select({
  icon,
  compact = false,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute top-1/2 left-2.5 flex -translate-y-1/2">
          {icon}
        </span>
      )}
      <select
        {...props}
        className={`appearance-none rounded-lg border border-border bg-surface py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-selected ${
          compact ? "pr-7 pl-2" : icon ? "pr-9 pl-10" : "pr-9 pl-3"
        } ${className}`}
      >
        {children}
      </select>
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-muted ${
          compact ? "right-2" : "right-3"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6l5 5 5-5" />
      </svg>
    </div>
  );
}
