/**
 * Border and background of a selectable picture card (evolution cards, form
 * picker). Keep the selected border on hover; only unselected cards react.
 */
export function selectableCardState(selected: boolean): string {
  return selected
    ? "border-selected bg-surface-muted"
    : "border-border hover:border-muted hover:bg-surface-muted";
}
