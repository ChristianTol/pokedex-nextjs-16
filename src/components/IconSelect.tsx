import type { ReactNode, SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Screen-reader name; there is no visible text. */
  "aria-label": string;
  icon: ReactNode;
  /** Tiny label in the corner, e.g. a generation number. */
  badge?: string;
};

/**
 * A round icon button that opens the native picker of a <select>. The select
 * lies invisibly on top, so the platform's own list is used (and works with
 * keyboard and screen readers) while only the icon is on screen.
 */
export function IconSelect({
  icon,
  badge,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <div
      className={`relative flex size-9 items-center justify-center rounded-full border border-border bg-surface-muted text-foreground focus-within:outline-2 focus-within:outline-selected ${className}`}
    >
      <span aria-hidden="true" className="pointer-events-none flex">
        {icon}
      </span>
      {badge && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -bottom-1 flex min-w-4 items-center justify-center rounded-full bg-selected px-1 text-[10px] leading-4 font-bold text-selected-text"
        >
          {badge}
        </span>
      )}
      <select
        {...props}
        className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
      >
        {children}
      </select>
    </div>
  );
}
