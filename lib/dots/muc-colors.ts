import { mix } from "./math";
import type { RGB } from "./types";

/** Tableau 10, which the comparator colors CIFAR-10's classes with. */
export const TABLEAU: RGB[] = [
  [78, 121, 167],
  [242, 142, 43],
  [225, 87, 89],
  [118, 183, 178],
  [89, 161, 79],
  [237, 201, 72],
  [176, 122, 161],
  [255, 157, 167],
  [156, 117, 95],
  [186, 176, 172],
];

/** The comparator's Model A and Model B. */
export const EMERALD: RGB = [16, 185, 129];
export const PURPLE: RGB = [168, 85, 247];

/** Its metric colors, for accuracy, efficiency, and privacy. */
export const METRIC: RGB[] = [
  [74, 163, 104],
  [72, 128, 196],
  [226, 110, 50],
];

/** On paper the lighter hues wash out, so darken them a touch. */
export const onPaper = (colors: RGB[]) =>
  colors.map((c) => mix(c, [0, 0, 0], 0.18));

export const TABLEAU_PAPER = onPaper(TABLEAU);
