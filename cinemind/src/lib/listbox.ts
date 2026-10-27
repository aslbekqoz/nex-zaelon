// Arrow-key movement in a suggestion list. Pure, unit tested.

/**
 * Moves the highlighted option by `step` (+1 down, -1 up) and wraps around through -1, which
 * means "nothing highlighted" (Enter then searches for the typed text).
 */
export function moveActive(current: number, step: 1 | -1, length: number) {
  if (length <= 0) return -1;
  const slots = length + 1;
  return ((current + 1 + step + slots) % slots) - 1;
}
