import { mix, rgba } from "./math";
import type { Palette, RGB } from "./types";

/**
 * The Multi-Agent Invoice Pipeline's 20 sample invoices, in the order the batch
 * runs them (filename order), with how each one ended in the recorded runs.
 */
export type Outcome = "paid" | "rejected" | "review" | "duplicate";
export type Mode = "reject" | "human_review" | "strict" | "standard";

export type Sample = {
  file: string;
  outcome: Outcome;
  /** The policy gate's mode; duplicates stop before the gate. */
  mode: Mode | null;
};

export const SAMPLES: Sample[] = [
  { file: "1001.txt", outcome: "paid", mode: "standard" },
  { file: "1002.txt", outcome: "rejected", mode: "reject" },
  { file: "1003.txt", outcome: "rejected", mode: "reject" },
  { file: "1004.json", outcome: "paid", mode: "standard" },
  { file: "1004_revised.json", outcome: "review", mode: "human_review" },
  { file: "1005.json", outcome: "rejected", mode: "reject" },
  { file: "1006.csv", outcome: "paid", mode: "standard" },
  { file: "1007.csv", outcome: "rejected", mode: "reject" },
  { file: "1008.txt", outcome: "rejected", mode: "reject" },
  { file: "1009.json", outcome: "rejected", mode: "reject" },
  { file: "1010.txt", outcome: "review", mode: "human_review" },
  { file: "1011.pdf", outcome: "paid", mode: "standard" },
  { file: "1011.txt", outcome: "duplicate", mode: null },
  { file: "1012.pdf", outcome: "paid", mode: "standard" },
  { file: "1012.txt", outcome: "duplicate", mode: null },
  { file: "1013.json", outcome: "rejected", mode: "reject" },
  { file: "1013.pdf", outcome: "duplicate", mode: null },
  { file: "1014.xml", outcome: "review", mode: "human_review" },
  { file: "1015.csv", outcome: "paid", mode: "standard" },
  { file: "1016.json", outcome: "rejected", mode: "reject" },
];

export const OUTCOMES: Outcome[] = ["paid", "rejected", "review", "duplicate"];

const INK: Record<Outcome, RGB> = {
  paid: [104, 178, 112],
  rejected: [226, 96, 80],
  review: [232, 186, 72],
  duplicate: [128, 150, 190],
};

/** Outcome colors, darkened on paper where light hues wash out. */
export function outcomeColors(ink: boolean): RGB[] {
  return OUTCOMES.map((o) => (ink ? INK[o] : mix(INK[o], [0, 0, 0], 0.22)));
}

/** 1-based class index for an outcome, for `Mark.cls`. */
export const outcomeClass = (o: Outcome) => OUTCOMES.indexOf(o) + 1;

export function outcomeColor(o: Outcome, palette: Palette) {
  return outcomeColors(palette.ink)[OUTCOMES.indexOf(o)];
}

/** Paper needs a little more ink for the same weight. */
export const boostFor = (ink: boolean) => (ink ? 1 : 1.25);

/** A thin connector with an arrowhead, for edges the particles stream along. */
export function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: RGB,
  alpha: number,
  { dash = false, head = 5 } = {},
) {
  if (alpha <= 0.01) return;
  ctx.strokeStyle = rgba(color, alpha);
  ctx.fillStyle = rgba(color, alpha);
  ctx.lineWidth = 1;
  ctx.setLineDash(dash ? [3, 4] : []);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (!head) return;
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a - 0.45) * head, y2 - Math.sin(a - 0.45) * head);
  ctx.lineTo(x2 - Math.cos(a + 0.45) * head, y2 - Math.sin(a + 0.45) * head);
  ctx.closePath();
  ctx.fill();
}
