import type { Scene } from "../types";
import { AgentsScene } from "./agents";
import { CkaScene } from "./cka";
import { CurtainScene } from "./curtain";
import { HeroScene } from "./hero";
import { InterfaceScene } from "./interface";
import { OutroScene } from "./outro";
import { RequestsScene } from "./requests";
import { ShapesScene } from "./shapes";
import { SimilarityScene } from "./similarity";
import { UnlearningScene } from "./unlearning";

/** Keyed by each section's `data-scene` attribute. */
export const scenes: Record<string, () => Scene> = {
  hero: () => new HeroScene(),
  async: () => new RequestsScene(),
  interface: () => new InterfaceScene(),
  visualization: () => new UnlearningScene(),
  orchestration: () => new AgentsScene(),
  performance: () => new CkaScene(),
  similarity: () => new SimilarityScene(),
  contact: () => new ShapesScene({ share: 0.5 }),
  curtain: () => new CurtainScene(),
  results: () => new ShapesScene({ share: 0.5, alpha: 0.75 }),
  profile: () => new ShapesScene({ share: 0.8, stages: 6 }),
  outro: () => new OutroScene(),
};
