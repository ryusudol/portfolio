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
import { AttackScene } from "./muc-attack";
import { EmbeddingScene } from "./muc-embedding";
import { LayersScene } from "./muc-layers";
import { MatrixScene } from "./muc-matrix";
import { MotivationScene } from "./muc-motivation";
import { RedrawScene } from "./muc-redraw";
import { RenderScene } from "./muc-render";
import { MucResultsScene } from "./muc-results";
import { ScreenScene } from "./muc-screen";
import { StateScene } from "./muc-state";
import { WorkflowScene } from "./muc-workflow";
import { BoundScene } from "./orbit-bound";
import { CatalogScene } from "./orbit-catalog";
import { ConjunctionsScene } from "./orbit-conjunctions";
import { EarthScene } from "./orbit-earth";
import { FlightScene } from "./orbit-flight";
import { FollowScene } from "./orbit-follow";
import { GiantsScene } from "./orbit-giants";
import { HeliosphereScene } from "./orbit-heliosphere";
import { OrbitHomeScene } from "./orbit-home";
import { PipelineScene } from "./orbit-pipeline";
import { PrecisionScene } from "./orbit-precision";
import { RelayScene } from "./orbit-relay";
import { OrbitResultsScene } from "./orbit-results";
import { RoutingScene } from "./orbit-routing";
import { SieveScene } from "./orbit-sieve";
import { ValidationScene } from "./orbit-validation";
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
  "muc-results": () => new MucResultsScene(),
  "muc-motivation": () => new MotivationScene(),
  "muc-screen": () => new ScreenScene(),
  "muc-workflow": () => new WorkflowScene(),
  "muc-embedding": () => new EmbeddingScene(),
  "muc-matrix": () => new MatrixScene(),
  "muc-layers": () => new LayersScene(),
  "muc-attack": () => new AttackScene(),
  "muc-state": () => new StateScene(),
  "muc-render": () => new RenderScene(),
  "muc-redraw": () => new RedrawScene(),
  orbit: () => new OrbitHomeScene(),
  "orbit-results": () => new OrbitResultsScene(),
  "orbit-earth": () => new EarthScene(),
  "orbit-follow": () => new FollowScene(),
  "orbit-routing": () => new RoutingScene("routing"),
  "orbit-conjunctions": () => new ConjunctionsScene(),
  "orbit-coverage": () => new RoutingScene("coverage"),
  "orbit-catalog": () => new CatalogScene(),
  "orbit-flight": () => new FlightScene(),
  "orbit-relay": () => new RelayScene(),
  "orbit-giants": () => new GiantsScene(),
  "orbit-heliosphere": () => new HeliosphereScene(),
  "orbit-validation": () => new ValidationScene(),
  "orbit-pipeline": () => new PipelineScene(),
  "orbit-precision": () => new PrecisionScene(),
  "orbit-sieve": () => new SieveScene(),
  "orbit-bound": () => new BoundScene(),
  contact: () => new ShapesScene({ share: 0.5 }),
  curtain: () => new CurtainScene(),
  results: () => new ShapesScene({ share: 0.5, alpha: 0.75 }),
  outro: () => new OutroScene(),
};
