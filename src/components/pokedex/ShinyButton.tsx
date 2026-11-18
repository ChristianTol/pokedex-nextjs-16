import { SparkleIcon } from "./SparkleIcon";

type Props = {
  active: boolean;
  /** Accessible name, e.g. "Pikachu toon shiny-versie". */
  label: string;
  onToggle: () => void;
  className?: string;
};

export function ShinyButton({ active, label, onToggle, className }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={label}
      className={`flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-selected ${
        active ? "text-selected" : "text-muted"
      } ${className ?? ""}`}
    >
      <SparkleIcon filled={active} className="size-5" />
    </button>
  );
}
