import type { Scene } from "../types";
import { AgentsScene } from "./agents";
import { CkaScene } from "./cka";
import { ContactScene } from "./contact";
import { HeroScene } from "./hero";
import { InterfaceScene } from "./interface";
import { RequestsScene } from "./requests";
import { UnlearningScene } from "./unlearning";

/** Keyed by each section's `data-scene` attribute. */
export const scenes: Record<string, () => Scene> = {
  hero: () => new HeroScene(),
  async: () => new RequestsScene(),
  interface: () => new InterfaceScene(),
  visualization: () => new UnlearningScene(),
  orchestration: () => new AgentsScene(),
  performance: () => new CkaScene(),
  contact: () => new ContactScene(),
};
