import { links } from "@/lib/content";

import { Chapter } from "./chapter";
import { A, Counter, pad, Readout, Snippet, tok as t } from "./story-parts";

const at = (length: number) => pad(length, 48);

/* What the app does, each feature drawn as the app draws it. */

export function EarthChapter() {
  return (
    <Chapter
      id="earth"
      scene="orbit-earth"
      topic="Explore"
      source="the opening view"
      title={["Every tracked object,", "live in the browser."]}
      length={4}
      body={
        <>
          Satellite trackers like Stuff in Space put everything in orbit on a
          globe and stop there. I wanted a twin that answers the questions an
          engineer would ask, worked out from the orbit model up and checked
          against a published reference. Here is the app redrawn in dots, its
          catalog sampled to fit your screen, at ten minutes a second.
        </>
      }
      steps={[
        "It opens over North America with all 32,583 objects of the October 9 catalog live, around an Earth lit by the real Sun.",
        "Nearly nine in ten circle within 2,000 km of the surface, the bright halo hugging the globe.",
        "Pull back, and the navigation satellites near 20,000 km and the geostationary ring at 35,786 km come into view.",
        "Color is kept for data. A third of the catalog is Starlink, in blue, and two in five objects are debris or spent rocket bodies, in red.",
        "Layers switches the reference frame. Fixed to the stars, the orbital planes hold still and the Earth turns beneath them.",
      ]}
      visual={
        <Readout
          items={[
            ["tracked objects", "32,583"],
            ["dots drawn", <Counter key="d" name="dots" initial="–" />],
            ["frame", <Counter key="f" name="frame" initial="Earth" />],
          ]}
        />
      }
    />
  );
}

export function FollowChapter() {
  return (
    <Chapter
      id="follow"
      scene="orbit-follow"
      topic="Follow"
      source="Starlink by hardware generation"
      title={["Click a dot,", "and ride along with it."]}
      length={4}
      body={
        <>
          Selecting an object opens a card with its live state and draws its
          orbit, faint behind it and bright ahead. Follow flies the camera down
          along a great-circle arc and rides beside it. Up close, every Starlink
          is drawn as the hardware it carries. Its NORAD ID says which launch it
          came from, so a table built from Jonathan McDowell’s launch list tells
          a V1.5 from a V2 Mini or a V3.
        </>
      }
      steps={[
        "Select a Starlink in the 53° shell. Its card reads out altitude, speed, and period, and its orbit is drawn ahead of it.",
        "Follow flies the camera there along a great-circle arc, slowing as it closes in.",
        "3,143 are V1.0 or V1.5, a flat-pack bus with one solar array about 8 m long.",
        "7,962 are V2 Minis, two long panels on one boom, about 30 m end to end.",
        "26 are V3s, launched on Starship flight 14 in September 2026, about 60 m across. Each close-up is framed to fit, so the three aren’t to scale.",
      ]}
      visual={
        <Readout
          items={[
            ["V1.0 and V1.5", "3,143"],
            ["V2 Mini", "7,962"],
            ["V3", "26"],
          ]}
        />
      }
    />
  );
}

export function RoutingChapter() {
  return (
    <Chapter
      id="routing"
      scene="orbit-routing"
      topic="Laser routing"
      source="+Grid · Dijkstra"
      title={["London to New York,", "faster than fiber."]}
      length={4.5}
      body={
        <>
          SpaceX doesn’t publish how its satellites link to one another, so the
          twin models the +Grid from the research literature. Four times a
          second it recovers shells and orbital planes from the elements alone,
          links each satellite to its neighbors, and runs Dijkstra between two
          ground terminals. The 53° shell here runs live in this page on a port
          of the engine’s code, and at the snapshot it finds the engine’s own
          route, to the microsecond.
        </>
      }
      steps={[
        "Starlink’s 53° shell, 4,640 satellites at 464 km, flying from their October 9 positions at a minute a second.",
        "Nothing is labeled. Gaps in inclination, altitude, and node split the catalog into seven shells, and this shell into 100 planes.",
        "+Grid links each satellite to the ones ahead and behind in its plane, and to the nearest one in the next plane east.",
        "Dijkstra finds the shortest chain of laser hops from London to New York, entering and leaving through satellites at least 25° above each city.",
        "Light in vacuum beats light in fiber. About 21 ms one way, against 27.3 ms through an ideal cable on the great circle.",
      ]}
      visual={
        <Readout
          items={[
            ["laser links", <Counter key="l" name="links" initial="–" />],
            ["one-way latency", <Counter key="m" name="latency" initial="–" />],
            ["ideal fiber", "27.3 ms"],
          ]}
        />
      }
    />
  );
}

export function ConjunctionsChapter() {
  return (
    <Chapter
      id="conjunctions"
      scene="orbit-conjunctions"
      topic="Conjunctions"
      source="the hour after the snapshot"
      title={["Starlink’s biggest hazard", "is Starlink."]}
      length={4.5}
      body={
        <>
          The Conjunctions mode screens every tracked object against every other
          for close approaches, up to a day ahead, and marks each on the
          timeline. The hour after the snapshot holds 2,981 pairs passing within
          5 km. Most meet where the planes of Starlink’s dense shells cross,
          nearly head-on. TLEs are only good to about a kilometer, so these are
          screening hits to look at more closely, not collision probabilities.
        </>
      }
      steps={[
        "Each dot is one encounter under 5 km in the hour after the snapshot, placed where it happens and colored by miss distance.",
        "Sorted by how fast each pair closes, 68% meet faster than 10 km/s, crossing almost head-on.",
        "55% are Starlink meeting Starlink.",
        "30% involve debris or a spent rocket body, which only the full catalog shows.",
        "The closest, STARLINK-2063 and FLOCK 4G 24, pass 43 m apart at 14.5 km/s. Watch it happen jumps the clock to 90 s before, with both orbits drawn.",
      ]}
      visual={
        <Readout
          items={[
            ["encounters under 5 km", "2,981"],
            ["Starlink with Starlink", "55%"],
            ["faster than 10 km/s", "68%"],
          ]}
        />
      }
    />
  );
}

export function CoverageChapter() {
  return (
    <Chapter
      id="coverage"
      scene="orbit-coverage"
      topic="Coverage"
      source="the engine’s 2° grid"
      title={["Covered everywhere,", "but not evenly."]}
      length={3.5}
      body={
        <>
          Coverage stamps each linked satellite’s visibility cap onto a 2° grid
          of the Earth, so its cost grows with the satellites and the size of a
          cap rather than with every cell. A test holds the stamp to the
          brute-force check on every cell. At the snapshot, no place on Earth is
          without a Starlink above 25°.
        </>
      }
      steps={[
        "Each dot of the globe is colored by how many Starlinks its 2° cell sees above 25°, from the engine’s grid at the snapshot.",
        "Every cell sees at least four, and 46 on average, weighted by area.",
        "Averaged around each latitude, the count peaks near 47° north and south, where the 53° shells turn around and bunch up.",
        "The equator sees about 38, and near the poles only the 70° and 97° shells pass, a dozen at a time.",
      ]}
      visual={
        <Readout
          items={[
            ["fewest", <Counter key="f" name="fewest" initial="–" />],
            ["mean", <Counter key="m" name="mean" initial="–" />],
            ["most", <Counter key="x" name="most" initial="–" />],
          ]}
        />
      }
    />
  );
}

export function CatalogChapter() {
  return (
    <Chapter
      id="catalog"
      scene="orbit-catalog"
      topic="Catalog"
      source="Space-Track · October 9, 2026"
      title={["Unfold the sky,", "and the structure shows."]}
      length={5}
      body={
        <>
          Placing each object by its mean altitude and its inclination, the tilt
          of its orbit against the equator, turns the cloud into a map of how
          orbit is used. Starlink’s shells are nearly straight lines, because
          SpaceX flies thousands of satellites at one height and one tilt. Old
          breakups show up as smears, and above 2,000 km the navigation
          constellations and the geostationary belt each keep to their own
          corner.
        </>
      }
      steps={[
        "The app’s Catalog mode counts what is up there, and at which altitude, one row of histograms per group, each on its own scale.",
        "Unfold the sky. Each object moves to its mean altitude, on a log scale, and its inclination.",
        "Starlink flies in shells, thousands of satellites at one height and one tilt, at 43°, 53°, 70°, and 97°.",
        "Fengyun-1C, destroyed in a 2007 anti-satellite test, still fills 98.8° at 824 km with 1,979 pieces.",
        "85% of everything between 700 and 1,000 km is debris, including what the 2009 collision of Iridium 33 and Cosmos 2251 left at 86° and 74°.",
        "Higher up, navigation constellations fly near 55° and 20,000 km, and the geostationary belt sits at 0°.",
      ]}
      visual={
        <Readout
          items={[
            ["Starlink", "11,131"],
            ["debris & rocket bodies", "13,744"],
            ["other satellites", "7,708"],
          ]}
        />
      }
    />
  );
}

export function FlightChapter() {
  return (
    <Chapter
      id="flight"
      scene="orbit-flight"
      topic="Flying between worlds"
      source="planned in log-distance"
      title={["Two and a half seconds", "to the Moon."]}
      length={4.5}
      body={
        <>
          The Fly to list holds every planet, the Moon, and the Oort cloud, each
          with how far it is right now. Distances there span five orders of
          magnitude, so a flight is planned in log-distance. The camera rises
          off one world, its distance growing geometrically, then falls toward
          the next just as fast. Splitting the time by each half’s log-distance
          keeps the speed continuous where they meet, and the camera never
          passes through either world. The flight takes about 2.6 s, slowed down
          here.
        </>
      }
      steps={[
        "Click the Moon in the Fly to list, 384,796 km away at the snapshot.",
        "The camera rises off the Earth, its distance growing geometrically while it swings around to the side facing the Moon.",
        "Halfway, 192,000 km from each, it has already turned to look at where it is going.",
        "It falls toward the Moon and swings around to arrive 50° off the Sun, so the terminator shows the relief of LRO’s map.",
        "Five spacecraft orbit the Moon on their missions’ own trajectories, from JPL Horizons. LRO, Chandrayaan-2, and Danuri circle the poles every two hours, and the two ARTEMIS probes loop out to 16,000 km.",
      ]}
      visual={
        <Readout
          items={[
            [
              "camera from the Earth",
              <Counter key="e" name="earth" initial="–" />,
            ],
            ["from the Moon", <Counter key="m" name="moon" initial="–" />],
            ["flight", <Counter key="t" name="flight" initial="0.0 s" />],
          ]}
        />
      }
    />
  );
}

export function RelayChapter() {
  return (
    <Chapter
      id="relay"
      scene="orbit-relay"
      topic="Link to Earth"
      source="relay passes over a landing site"
      title={["When a rover", "can call home."]}
      length={4.5}
      body={
        <>
          A lander reaches the Earth two ways, directly while the Earth is above
          its horizon, or through an orbiter passing overhead, which stores the
          data and forwards it. Link to Earth samples the elevation of the
          Earth, the Sun, and every orbiter from a site over the next 24 hours,
          and turns the samples into passes, each rise and set refined to the
          second.
        </>
      }
      steps={[
        "At Tranquility Base, where Apollo 11 landed, the Earth never sets. The Moon keeps one face toward us.",
        "At Chang’e 4’s site on the far side it never rises, so every signal has to go through a relay.",
        "At Shackleton crater on the south pole, an Artemis target, LRO, Chandrayaan-2, and Danuri each pass overhead 12 times a day.",
        "From the Moon a signal takes 1.28 s to reach the Earth. From Jezero crater on Mars, Perseverance waits 13 min 20 s, with MRO, Mars Odyssey, and the Trace Gas Orbiter among its relays.",
      ]}
      visual={
        <Readout
          items={[
            ["site", <Counter key="s" name="site" initial="Apollo 11" />],
            [
              "one-way light time",
              <Counter key="l" name="light" initial="–" />,
            ],
            [
              "relay passes, 24 h",
              <Counter key="p" name="passes" initial="–" />,
            ],
          ]}
        />
      }
    />
  );
}

export function GiantsChapter() {
  return (
    <Chapter
      id="giants"
      scene="orbit-giants"
      topic="The giant planets"
      source="every known moon, on JPL’s trajectories"
      title={["115 moons around Jupiter,", "290 around Saturn."]}
      length={5}
      body={
        <>
          Past Mars, VSOP87 places Mercury, Venus, and the giant planets within
          a few arcseconds of JPL Horizons, each with every known moon. The fast
          ones follow trajectories sampled from Horizons. Each of the hundreds
          of slow irregular moons gets one set of osculating elements instead,
          and two-body motion keeps it within 0.1% of Horizons over the
          snapshot’s window.
        </>
      }
      steps={[
        "Jupiter, from Hubble’s 2025 map, with Io, Europa, Ganymede, and Callisto close in, and Juno looping over its poles every 33 days.",
        "Pull back and the other moons appear, mostly small captured irregulars on wide, tilted orbits up to 25 million km out. 92 of the 115 orbit backward.",
        "Saturn’s rings are built from their measured edges and optical depths, the Cassini Division a dark gap between the dense B ring and the A ring.",
        "In October 2026 they open only 7° toward the Earth, a year and a half after they turned edge-on in 2025.",
        "Its 290 moons reach 28 million km out, Titan the largest among them.",
      ]}
      visual={
        <Readout
          items={[
            ["world", <Counter key="w" name="world" initial="Jupiter" />],
            ["moons", <Counter key="m" name="moons" initial="–" />],
            [
              "light time from Earth",
              <Counter key="l" name="light" initial="–" />,
            ],
          ]}
        />
      }
    />
  );
}

export function HeliosphereChapter() {
  return (
    <Chapter
      id="heliosphere"
      scene="orbit-heliosphere"
      topic="The Oort cloud"
      source="the solar system from outside"
      title={["From a satellite’s hull", "to 100,000 au."]}
      length={5}
      body={
        <>
          One scene spans 10¹⁴ km, from a followed spacecraft’s hull to the far
          side of the Oort cloud. Anything beyond 700,000 km is pulled toward
          the camera along its line of sight, which keeps its place on screen
          and its depth order, so even the cloud’s far side lands inside the
          view. Each part of the outer solar system then fades in at the scale
          where it means something.
        </>
      }
      steps={[
        "The planets’ orbits, from Mercury out to Neptune at 30 au, four light-hours from the Sun.",
        "The Kuiper belt is real data. All 7,299 known trans-Neptunian objects sit on their own orbits, from JPL’s Small-Body Database.",
        "The Voyagers fly their actual paths since 1977, bent by the giants. Voyager 1 is now 172 au out and Voyager 2 is 144 au out.",
        "Both have crossed the heliopause, where the Sun’s wind gives way to interstellar space, Voyager 1 at 122 au in 2012 and Voyager 2 at 119 au in 2018.",
        "Beyond lies the Oort cloud, a model rather than data. 50,000 points follow the usual picture, from 2,000 au out to 100,000 au, a third of the way to the nearest star.",
      ]}
      visual={
        <Readout
          items={[
            [
              "camera from the Sun",
              <Counter key="d" name="distance" initial="–" />,
            ],
            ["light time", <Counter key="l" name="light" initial="–" />],
            ["dots drawn", <Counter key="n" name="dots" initial="–" />],
          ]}
        />
      }
    />
  );
}

/* How it is built, and how each answer is checked. */

export function ValidationChapter() {
  return (
    <Chapter
      id="validation"
      scene="orbit-validation"
      topic="Validation"
      source="Vallado et al., AIAA 2006-6753"
      title={["Written from the paper,", "checked to 0.1 mm."]}
      length={4}
      body={
        <>
          SGP4 dates from 1980, and decades of fixes live only in reference
          code, so reimplementations quietly drift from it. I wrote mine in Rust
          from the model as Vallado, Crawford, Hujsak, and Kelso define it in{" "}
          <A href={links.vallado}>Revisiting Spacetrack Report #3</A>,
          deep-space resonance and every <code>sgp4fix</code> included, then
          held it to the paper’s published verification output. To check it on
          real orbits too, I compared it with satellite.js across the live
          catalog.
        </>
      }
      steps={[
        "Each dot is one of the 666 reference states, placed by how far my position lands from the published one.",
        "92% are closer than the reference file’s own print rounding, 0.01 mm. The worst, 0.10 mm, is a deep-space orbit 1,280 days past its epoch.",
        "Seven objects are built to fail by decaying or escaping. Mine fail at the same step with the same error codes.",
        "Against satellite.js on 2,507 catalog objects, 89.7% of 17,549 states agree within a micrometer. Each dot here is five states.",
        "The reference computes angles it only needs the sine and cosine of. Exact identities instead made propagation 25% faster, for a median difference of 2 nm, a billionth of a TLE’s own error.",
      ]}
      visual={
        <Readout
          items={[
            ["reference states matched", "666 / 666"],
            [
              "worst error",
              <Counter key="w" name="worst" initial="0.097 mm" />,
            ],
            ["within 0.001 mm of satellite.js", "89.7%"],
          ]}
        />
      }
    />
  );
}

export function PipelineChapter() {
  return (
    <Chapter
      id="pipeline"
      scene="orbit-pipeline"
      visualClassName="chapter__visual--tall"
      topic="Architecture"
      source="SharedArrayBuffer · Atomics"
      title={["SGP4 at 12 Hz,", "frames at 60."]}
      length={4}
      body={
        <>
          A frame gets 16.7 ms, and running SGP4 on the whole catalog takes 8.6
          ms natively, about 6 ms a keyframe even split across four WebAssembly
          workers. So SGP4 never runs per frame. The workers write keyframes,
          every object’s position and velocity at one instant, into shared
          memory, and each frame interpolates between two of them. None of this
          state lives in React. A plain render-loop class owns the workers and
          the GPU, and React only reads the summary it publishes five times a
          second.
        </>
      }
      steps={[
        "The render loop asks for a keyframe by writing a Julian date into shared memory and calling Atomics.notify.",
        "Four workers wake from Atomics.wait, run SGP4 on their quarter of the catalog, and write into one of four keyframe slots. Nothing is posted or copied.",
        "Each frame, a cubic Hermite spline on position and velocity carries all 32,583 objects between two keyframes in 0.22 ms.",
        "Keyframes 60 s apart are off by 2.5 m at worst. When time runs an hour a second they are 300 s apart, off by 0.28 km, and SGP4 runs 12 times a second.",
        "Five times a second the loop publishes a summary to a Zustand store, and only the panels that read it re-render.",
      ]}
      visual={
        <>
          <Snippet
            label="propagate.worker.ts · one of four"
            ours
            lines={[
              <>
                {t.k("for")} (;;) {"{"}
              </>,
              <>
                {"  "}Atomics.{t.f("wait")}(ctrl, REQ_SEQ, seen){at(35)}
                {t.c("// sleep until asked")}
              </>,
              <>
                {"  "}seen = Atomics.{t.f("load")}(ctrl, REQ_SEQ)
              </>,
              <>
                {"  "}
                {t.k("const")} slot = Atomics.{t.f("load")}(ctrl, REQ_SLOT)
              </>,
              <>
                {"  "}prop.{t.f("propagate")}(reqJd[0]){at(26)}
                {t.c("// SGP4, Rust → WASM")}
              </>,
              <>
                {"  "}pos.{t.f("set")}(wasmPositions, slot * 3 * n + 3 * start)
              </>,
              <>
                {"  "}Atomics.{t.f("add")}(ctrl, DONE + slot, 1){at(35)}
                {t.c("// no postMessage")}
              </>,
              "}",
            ]}
          />
          <Readout
            items={[
              ["JavaScript per frame", "2.6 ms"],
              ["moving every object", "0.22 ms"],
              ["messages per keyframe", "0"],
            ]}
          />
        </>
      }
    />
  );
}

export function PrecisionChapter() {
  return (
    <Chapter
      id="precision"
      scene="orbit-precision"
      visualClassName="chapter__visual--tall"
      topic="Precision"
      source="camera-relative rendering"
      title={["The jitter wasn’t", "in the physics."]}
      length={3.5}
      body={
        <>
          Following a satellite from a few dozen meters, its model shook. The
          positions were fine, because JavaScript numbers are already 64-bit.
          The GPU’s are 32-bit, and 7,000 km from Earth’s center a float32 can
          only step in half meters. So every layer is placed at the camera, and
          each object stores its position minus the camera’s, subtracted on the
          CPU in float64. Near the camera those offsets are small, and float32
          holds them to a few micrometers.
        </>
      }
      steps={[
        "The camera rides 40 m from a Starlink V2 Mini. Both are 6,842 km from Earth’s center.",
        "In float32, coordinates that large come in steps of 0.49 m. Every vertex snaps to its own step each frame, and the model shakes.",
        "Subtracting the camera on the CPU, in float64, leaves offsets of tens of meters, which float32 holds to a few micrometers.",
        "The cost is re-uploading the satellites’ offsets every frame, 0.38 MB for the whole catalog, measured.",
      ]}
      visual={
        <>
          <Snippet
            label="sprites.ts · every instanced layer"
            ours
            lines={[
              t.c("// the layer sits at the camera"),
              <>
                {t.f("commit")}(count, camera) {"{"}
              </>,
              <>
                {"  "}
                {t.k("this")}.object.position.{t.f("copy")}(camera)
              </>,
              "}",
              <>
                {t.f("setOffset")}(i, x, y, z, cam) {"{"}
                {at(28)}
                {t.c("// float64 in")}
              </>,
              <>
                {"  "}o[3 * i] = x - cam.x{at(22)}
                {t.c("// float32 out, now small")}
              </>,
              <>{"  "}o[3 * i + 1] = y - cam.y</>,
              "}",
            ]}
          />
          <Readout
            items={[
              ["float32 step at 6,842 km", "0.49 m"],
              [
                "worst vertex error",
                <Counter key="e" name="error" initial="–" />,
              ],
              [
                "uploaded per frame",
                <Counter key="u" name="upload" initial="–" />,
              ],
            ]}
          />
        </>
      }
    />
  );
}

export function SieveChapter() {
  return (
    <Chapter
      id="sieve"
      scene="orbit-sieve"
      topic="Spatial grid"
      source="conjunction screening"
      title={["Half a billion pairs,", "sieved in 1.5 ms."]}
      length={3.5}
      body={
        <>
          Screening for close approaches asks, at every time step, which of 530
          million pairs of objects are near each other. Checking them all takes
          638 ms a step, and a day of screening at 60 s steps has 1,441 of them.
          A spatial grid sorts objects into cubic cells. A pair closer than one
          cell must share a cell or sit in neighboring ones, so each object only
          looks around itself and finds exactly the same pairs.
        </>
      }
      steps={[
        "Low Earth orbit from the sample, seen from above the North Pole, at two minutes a second.",
        "Checking all pairs tests every object against every other, like this one against all the rest.",
        "A spatial grid buckets every object by its cell, drawn here 485 km across, the size a 60 s screening step uses.",
        "Only the 26 cells around an object can hold a partner. Radix-sorted by cell, each column is one run of memory, and a cell need only check itself and the 13 neighbors ahead of it, so every pair is met exactly once.",
        "It finds the same pairs, pair for pair. Finding every pair within 10 km at one instant takes 1.5 ms instead of 638 ms, and at 100,000 objects the gap is 1,522×.",
      ]}
      visual={
        <Readout
          items={[
            [
              "pairs checked a step",
              <Counter key="p" name="pairs" initial="530.7 M" />,
            ],
            [
              "share of all pairs",
              <Counter key="s" name="share" initial="100%" />,
            ],
          ]}
        />
      }
    />
  );
}

export function BoundChapter() {
  return (
    <Chapter
      id="bound"
      scene="orbit-bound"
      topic="Sampling bound"
      source="the engine’s regression test"
      title={["Nothing slips through", "between samples."]}
      length={4}
      body={
        <>
          Screening samples the catalog once a step, so two objects can pass
          close between samples and look far apart at both. A bound closes the
          gap. If a pair passes within d at closest approach, then at the
          nearest sample it is at most d + v·Δt/2 apart, where v is the speed at
          which they close. Search that far around every object and no encounter
          can be missed. A single 16 km/s bound once let a transfer orbit slip
          past a satellite at 16.8 km/s, and a test now pins a pass like it.
        </>
      }
      steps={[
        "A satellite in low orbit and a rocket body on a transfer orbit meet head-on at 18 km/s, closest midway between two samples 120 s apart.",
        "At the nearest sample a pair is at most d + v·Δt/2 apart, so a search radius that size can’t miss it.",
        "One radius once served every pair, sized for 16 km/s, twice the top speed of 95% of the catalog. At 18 km/s both samples sit outside it.",
        "Now the 1,741 objects that can pass 8 km/s each search farther, by their own top speed plus the fastest object’s, and the pass is caught.",
        "Newton’s method on full SGP4 states then finds the closest approach. Over 24 hours, 10, 20, 60, and 120 s steps find the same 60,756 encounters.",
      ]}
      visual={
        <Readout
          items={[
            ["closing speed", "18 km/s"],
            ["search radius", <Counter key="r" name="radius" initial="–" />],
            [
              "at the nearest sample",
              <Counter key="s" name="sample" initial="–" />,
            ],
          ]}
        />
      }
    />
  );
}
