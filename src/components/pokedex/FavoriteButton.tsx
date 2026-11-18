type Props = {
  active: boolean;
  /** Accessible name, e.g. "Pikachu aan favorieten toevoegen". */
  label: string;
  onToggle: () => void;
  className?: string;
};

export function FavoriteButton({ active, label, onToggle, className }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={label}
      className={`flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-selected ${
        active ? "text-accent" : "text-muted"
      } ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3 5 6.4 5c2.1 0 3.8 1.2 5.6 3.2C13.8 6.2 15.5 5 17.6 5 21 5 22.8 8.6 21.5 11.8 19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
}
