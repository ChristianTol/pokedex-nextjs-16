export const POKEMON_MODAL_SWIPE_EXCLUDED_SELECTOR =
  'input, select, textarea, [role="tab"], [data-pokemon-swipe-exempt]';

export function isPokemonModalSwipeExcluded(target: HTMLElement) {
  return target.closest(POKEMON_MODAL_SWIPE_EXCLUDED_SELECTOR) !== null;
}