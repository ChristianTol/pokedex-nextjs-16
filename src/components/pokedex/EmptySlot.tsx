/** The placeholder of a slot that has no Pokémon yet. */
export function EmptySlot({
  label,
  className = "",
}: {
  /** Read out by screen readers; the plus is only decoration. */
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-2xl border border-dashed border-border text-muted ${className}`}
    >
      <span aria-hidden="true" className="text-4xl font-light leading-none">
        +
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );
}
