import type { Entrance, Scene } from "../types";
import { AgentsScene } from "./agents";
import { CkaScene } from "./cka";
import { BasisScene } from "./cka-basis";
import { BatchScene } from "./cka-batch";
import { LoopScene } from "./cka-loop";
import { MemoryScene } from "./cka-memory";
import { RaceScene } from "./cka-race";
import { CkaResultsScene } from "./cka-results";
import { TraceScene } from "./cka-trace";
import { ContactScene } from "./contact";
import { CurtainScene } from "./curtain";
import { HeroScene } from "./hero";
import { InterfaceScene } from "./interface";
import { CritiqueScene } from "./inv-critique";
import { GateScene } from "./inv-gate";
import { IntakeScene } from "./inv-intake";
import { LedgerScene } from "./inv-ledger";
import { MachineScene } from "./inv-machine";
import { MatchScene } from "./inv-match";
import { PrincipleScene } from "./inv-principle";
import { ReplayScene } from "./inv-replay";
import { ResumeScene } from "./inv-resume";
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
  "inv-principle": () => new PrincipleScene(),
  "inv-machine": () => new MachineScene(),
  "inv-intake": () => new IntakeScene(),
  "inv-match": () => new MatchScene(),
  "inv-gate": () => new GateScene(),
  "inv-critique": () => new CritiqueScene(),
  "inv-ledger": () => new LedgerScene(),
  "inv-resume": () => new ResumeScene(),
  "inv-replay": () => new ReplayScene(),
  contact: () => new ContactScene(),
  curtain: () => new CurtainScene(),
  results: () => new ShapesScene({ share: 0.5, alpha: 0.75 }),
  outro: () => new OutroScene(),
};

const right: Entrance = { kind: "wipe", angle: 0 };
const down: Entrance = { kind: "wipe", angle: 90 };
const up: Entrance = { kind: "wipe", angle: -90 };
const rain: Entrance = { kind: "rain" };
const focus: Entrance = { kind: "focus" };
const draw: Entrance = { kind: "draw" };
const cut: Entrance = { kind: "cut" };
const bloom = (x = 0.5, y = 0.5): Entrance => ({ kind: "bloom", at: [x, y] });

/**
 * How each chapter's figure arrives, keyed like `scenes`. The rule: a figure
 * enters the way it is read. A timeline or a flow is laid down left to right,
 * a table or a listing top to bottom, a histogram from its baseline up; a
 * matrix fills by column, a scatter comes into focus, anything with a center
 * opens from it, and an outline is drawn. Views of the Orbit Explorer app cut
 * to one another, as a screen does. Only the hero flocks.
 */
export const entrances: Record<string, Entrance> = {
  hero: { kind: "flock" },
  async: bloom(0.02, 0.5),
  interface: draw,
  visualization: bloom(0.52, 0.47),
  orchestration: right,
  performance: focus,
  // The heatmap's two axes grow out of their shared corner.
  similarity: { kind: "wipe", angle: -45 },
  "cka-results": draw,
  "cka-loop": down,
  "cka-basis": bloom(0.5, 0.42),
  "cka-trace": rain,
  "cka-batch": down,
  "cka-memory": right,
  "cka-race": right,
  "muc-results": draw,
  "muc-motivation": focus,
  "muc-screen": down,
  "muc-workflow": bloom(),
  "muc-embedding": focus,
  "muc-matrix": rain,
  "muc-layers": right,
  "muc-attack": up,
  "muc-state": down,
  "muc-render": right,
  "muc-redraw": up,
  // Sunrise: the globe is lit from one limb across to the other.
  orbit: right,
  "orbit-results": draw,
  "orbit-earth": bloom(0.5, 0.45),
  "orbit-follow": cut,
  "orbit-routing": cut,
  "orbit-conjunctions": cut,
  "orbit-coverage": cut,
  "orbit-catalog": cut,
  "orbit-flight": cut,
  "orbit-relay": cut,
  "orbit-giants": cut,
  "orbit-heliosphere": bloom(0.5, 0.45),
  "orbit-validation": right,
  "orbit-pipeline": right,
  "orbit-precision": focus,
  "orbit-sieve": bloom(),
  "orbit-bound": right,
  "inv-principle": down,
  "inv-machine": down,
  "inv-intake": right,
  "inv-match": down,
  "inv-gate": right,
  "inv-critique": right,
  "inv-ledger": down,
  "inv-resume": down,
  "inv-replay": right,
  contact: draw,
  curtain: rain,
  results: draw,
  outro: focus,
};
