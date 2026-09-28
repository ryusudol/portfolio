import type { Scene } from "../types";
import { AgentsScene } from "./agents";
import { CkaScene } from "./cka";
import { BasisScene } from "./cka-basis";
import { BatchScene } from "./cka-batch";
import { LoopScene } from "./cka-loop";
import { MemoryScene } from "./cka-memory";
import { RaceScene } from "./cka-race";
import { CkaResultsScene } from "./cka-results";
import { TraceScene } from "./cka-trace";
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
  "cka-results": () => new CkaResultsScene(),
  "cka-loop": () => new LoopScene(),
  "cka-basis": () => new BasisScene(),
  "cka-trace": () => new TraceScene(),
  "cka-batch": () => new BatchScene(),
  "cka-memory": () => new MemoryScene(),
  "cka-race": () => new RaceScene(),
  contact: () => new ShapesScene({ share: 0.5 }),
  curtain: () => new CurtainScene(),
  results: () => new ShapesScene({ share: 0.5, alpha: 0.75 }),
  profile: () => new ShapesScene({ share: 0.8, stages: 6 }),
  outro: () => new OutroScene(),
};
