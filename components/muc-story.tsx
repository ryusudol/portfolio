import Link from "next/link";

import { pytorchCka } from "@/lib/case-studies";

import { Chapter } from "./chapter";
import {
  Change,
  Counter,
  pad,
  Readout,
  Snippet,
  tok as t,
} from "./story-parts";

const at = (length: number) => pad(length, 46);

export function MotivationChapter() {
  return (
    <Chapter
      id="why"
      scene="muc-motivation"
      topic="Motivation"
      source="the right to be forgotten"
      title={["Forgetting on request,", "without starting over."]}
      length={4}
      body={
        <>
          Privacy laws like the GDPR let people ask for their data to be erased,
          and regulators have started applying that to the models trained on it.
          Retraining from scratch without that data is exact but slow and
          computationally expensive, so unlearning methods, which adjust the
          trained model instead, have become an active area of research. Working
          with unlearning researchers, we found they judged these methods mostly
          by a few summary numbers, with no standard way to see how close each
          came to retraining. To address this, we built Unlearning Comparator to
          show what those numbers leave out. Every example here comes from its
          live demo, where a ResNet-18 trained on CIFAR-10 is asked to forget
          airplanes.
        </>
      }
      steps={[
        "Each dot is a training image, placed by how the ResNet-18 sees it. Airplanes, the class it will forget, are marked ×.",
        "Retraining from scratch without the airplanes is the exact answer. It took 58.7 minutes.",
        "Unlearning methods start from the trained model and adjust it instead. The demo’s three each forget their own way, in 11 seconds to 2.6 minutes.",
        "Researchers compared them mostly through summary numbers, like accuracy on the airplanes and on the other classes, which shrink every model to two bars.",
        "Unlearning Comparator brings the picture back, two models side by side, image by image.",
      ]}
      visual={
        <Readout
          items={[
            ["forget class", "airplane"],
            ["retraining", <Counter key="r" name="retrain" initial="–" />],
            [
              "unlearning methods",
              <Counter key="m" name="methods" initial="–" />,
            ],
          ]}
        />
      }
    />
  );
}

export function ProblemChapter() {
  return (
    <Chapter
      id="problem"
      scene="muc-screen"
      topic="Blind spot"
      source="what summary metrics miss"
      title={["A perfect score", "that still remembers."]}
      length={3.5}
      body={
        <>
          The numbers researchers leaned on look like these, replayed from the
          demo’s Model Screening table. Each row is a model, and its columns
          score accuracy, efficiency, and privacy. By accuracy, Random Labeling
          is a perfect match for retraining. By privacy it scores 0.003 out of
          1, so an attacker can still tell that it was trained on the airplanes.
          Unlearning Comparator was built to show what a table like this hides.
        </>
      }
      steps={[
        "Unlearning Accuracy is accuracy on the airplanes and should fall to 0. Retain Accuracy covers the other nine classes and should stay at 1.",
        "Run Time is how long each model took to make. Retraining takes the longest by far.",
        "By accuracy, Random Labeling is indistinguishable from retraining.",
        "Privacy Score is 1 when an attacker can’t tell a model from the retrained one. Retraining scores 1, Random Labeling 0.003.",
      ]}
    />
  );
}

export function WorkflowChapter() {
  return (
    <Chapter
      id="workflow"
      scene="muc-workflow"
      topic="Workflow"
      source="how researchers evaluate unlearning"
      title={["Four stages,", "two models at a time."]}
      length={3.5}
      body={
        <>
          We met two unlearning researchers every week for two months, a
          professor in ML security and a graduate student, and found their
          evaluations followed the same loop, always comparing two models at a
          time. I turned that loop into the interface, one view per stage.
          Showing every model at once would have crowded each view, so every
          view reads the same pair, Model A in green and Model B in purple, and
          picking a pair in the table redraws them all together.
        </>
      }
      steps={[
        "Build. Pick an unlearning method and a few values for its settings, like the learning rate. Each combination becomes a candidate model.",
        "Screen. One table ranks them all on accuracy, efficiency, or privacy.",
        "Contrast. Model A and Model B side by side, by class, by image, and by layer.",
        "Attack. A simulated attack checks each against the retrained model, and the loop starts again.",
      ]}
    />
  );
}

export function EmbeddingChapter() {
  return (
    <Chapter
      id="embedding"
      scene="muc-embedding"
      topic="Embedding Space"
      source="image by image"
      title={["Where the airplanes", "went."]}
      length={4}
      body={
        <>
          Accuracy says whether a model still names airplanes, not whether it
          still recognizes them. The Embedding Space view places 2,000 training
          images by each model’s activations in the layer before the classifier,
          reduced to 2D with UMAP, which keeps more of the global layout than
          t-SNE, so drifting airplanes land near the classes they drift toward.
          These are the demo’s real points.
        </>
      }
      steps={[
        "Model A, the original. Ten classes form ten clusters, and the airplanes, marked ×, have their own.",
        "Model B, retrained without airplanes. Their cluster is gone, most are called ship or bird, and only 72% of an airplane’s nearest neighbors are airplanes.",
        "Model B, Random Labeling. It calls 90% of them birds, yet they still sit together, their nearest neighbors all airplanes.",
        "Hover a dot to link the same image in both plots. I gave each model its own SVG so the two zoom separately, and drew the link on a thin layer above both. Airplanes also open the view’s tooltip.",
      ]}
      visual={
        <Readout
          items={[
            [
              "Model B labels airplanes as",
              <Counter key="c" name="called" initial="–" />,
            ],
            [
              "airplanes among an airplane’s 10 nearest",
              <Counter key="n" name="near" initial="–" />,
            ],
          ]}
        />
      }
    />
  );
}

export function MatrixChapter() {
  return (
    <Chapter
      id="matrix"
      scene="muc-matrix"
      topic="Prediction Matrix"
      source="class by class"
      title={["Two numbers,", "one cell."]}
      length={3.5}
      body={
        <>
          The Prediction Matrix shows, for each true class, which classes a
          model predicts and how confident it is, since unlearning can leave a
          model wrong with high confidence. My first version drew one bubble per
          cell. In the design study, the researchers found a bubble’s color hard
          to read when it was small, and unlearning scatters predictions into
          exactly those small bubbles, so I redesigned it.
        </>
      }
      steps={[
        "The first design. Bubble size is the proportion of predictions, and color is the confidence.",
        "Unlearning spreads the airplane row thin, and small bubbles hide their color.",
        "The redesign splits each cell, proportion at the lower left and confidence at the upper right, on one gray scale so the halves compare directly. The bubbles stay behind a hidden toggle.",
        "Now the mismatch is plain. 90% of airplanes are called birds, at 0.16 confidence. Hover any cell to read its numbers.",
      ]}
      visual={
        <Readout
          items={[
            ["cell", <Counter key="c" name="cell" initial="–" />],
            ["proportion", <Counter key="p" name="proportion" initial="–" />],
            ["confidence", <Counter key="f" name="confidence" initial="–" />],
          ]}
        />
      }
    />
  );
}

export function LayersChapter() {
  return (
    <Chapter
      id="layers"
      scene="muc-layers"
      topic="Layer-wise Similarity"
      source="layer by layer"
      title={["Accuracy reads one layer.", "CKA reads them all."]}
      length={3.5}
      body={
        <>
          The Layer-wise Similarity chart compares every layer of a model with
          the same layer of the original, for the airplane images and the rest
          separately. We measured it with Centered Kernel Alignment rather than
          distances between weights, since CKA compares what two layers
          represent, not how their weights happen to be ordered. The CKA library
          behind this chart was extremely slow, and replacing it became my next
          project,{" "}
          <Link className="inline-link" href={pytorchCka.href}>
            PyTorch-CKA
          </Link>
          , which the comparator has run on since January 2026.
        </>
      }
      steps={[
        "Each point compares one layer with the original model. 1 means unchanged.",
        "For the other nine classes, both models stay close to 1.",
        "Retraining changes how the last layers see airplanes. Their similarity falls to 0.28 at layer4.0.",
        "Random Labeling holds 0.93 at layer4.0 and changes only the last two layers, which is why its airplanes still cluster.",
      ]}
      visual={
        <Readout
          items={[
            ["Retrained · layer4.0", "0.28"],
            ["Random Labeling · layer4.0", "0.93"],
          ]}
        />
      }
    />
  );
}

export function AttackChapter() {
  return (
    <Chapter
      id="attack"
      scene="muc-attack"
      topic="Attack Simulation"
      source="membership inference"
      title={["Attack the model", "to check it forgot."]}
      length={4}
      body={
        <>
          If a model truly forgot the airplanes, its outputs on them should look
          like the retrained model’s, and an attacker comparing the two should
          be left guessing. The Attack Simulation view stacks the 200 airplane
          images by output entropy, retrained on the left and unlearned on the
          right, and a threshold decides which model each image seems to come
          from. I drew every image as its own dot rather than a histogram bar,
          so the attack’s hits and misses stay tied to images you can hover and
          open.
        </>
      }
      steps={[
        "Left, the retrained model’s 200 airplanes, stacked by output entropy. The cleaner a threshold splits the two sides, the higher the attack score and the lower the privacy score.",
        "Right, Fine-Tuning’s. The stacks overlap, so no threshold splits them cleanly.",
        "Random Labeling’s all land at entropy 2.24, near the maximum. One threshold splits them perfectly. In the tool you drag it yourself, beside error-rate curves and grids of the images it caught.",
      ]}
      visual={
        <Readout
          items={[
            ["threshold", <Counter key="t" name="threshold" initial="–" />],
            ["attack score", <Counter key="a" name="score" initial="–" />],
            ["privacy score", <Counter key="p" name="privacy" initial="–" />],
          ]}
        />
      }
    />
  );
}

export function StateChapter() {
  return (
    <Chapter
      id="state"
      scene="muc-state"
      topic="Tradeoff"
      source="React Context to Zustand"
      title={["Every poll", "re-rendered the table."]}
      length={3.5}
      body={
        <>
          Every view reads the same Model A and Model B, so that state lives
          above all of them. I started with React Context, but a context
          re-renders everything that reads it whenever any part of its value
          changes. By early 2025 six nested providers wrapped the app, and a
          status poll every second re-rendered the model table, which only
          needed to know whether a run was going. I moved all six to Zustand in
          two days.
        </>
      }
      steps={[
        "Six context providers wrapped the whole app.",
        "Each poll changed the status context, and everything reading it re-rendered, the model table included.",
        "Zustand moved the state into stores outside the tree, and the table selects only isRunning. I chose it over Redux, the popular choice, for scale. Both subscribe through selectors, but this state is a handful of loose values, the results live in the backend’s JSON, and a small team didn’t need actions and reducers.",
        "Now the table sits still through every poll. The parts that take the whole status store still re-render.",
      ]}
      tag={
        <p className="hint hide-compact">
          What the move left undone. The embedding view still checks every 16 ms
          whether its link line moved, a workaround from the Context days, and
          12 components still subscribe to a whole store rather than a slice, so
          they re-render on any change to it.
        </p>
      }
      visual={
        <Readout
          items={[
            ["polls", <Counter key="p" name="polls" initial="–" />],
            [
              "model table re-renders",
              <Counter key="t" name="table" initial="–" />,
            ],
          ]}
        />
      }
    />
  );
}

export function RenderingChapter() {
  return (
    <Chapter
      id="rendering"
      scene="muc-render"
      topic="Tradeoff"
      source="SVG or canvas"
      title={["Every dot", "is an element."]}
      length={3.5}
      body={
        <>
          D3 can draw into SVG or onto a canvas, and I chose SVG. Each of the
          2,000 points in an embedding plot becomes an element, so hovering,
          tooltips, highlighting, and the line linking an image across both
          plots all come from ordinary DOM events. On a canvas, each would need
          its own hit testing and redrawing. The price is that the browser
          tracks every point, and zooming rewrites all 2,000 radii each frame to
          keep dots the same size on screen. So I timed that zoom at growing
          point counts, in SVG and in canvas.
        </>
      }
      steps={[
        "In SVG, each zoom frame costs about 2 µs per point.",
        "In canvas, about 0.4 µs, roughly a fifth as much.",
        "At 2,000 points a plot, SVG uses 4.5 ms of the 16.7 ms a 60 fps frame allows. It would run out near 8,000.",
        "Inside the comparator the same zoom takes about 15 ms, most of it recalculating styles for all 2,000 circles. It still fits in a frame, with little to spare.",
      ]}
      tag={
        <p className="hint hide-compact">
          Main-thread time per zoom frame in Chromium with GPU rasterization on
          an Apple M1, median of three runs of 90 frames. The canvas version
          batches points into short paths by color.
        </p>
      }
      visual={
        <Readout
          items={[
            ["SVG · 2,000 points", "4.5 ms"],
            ["canvas · 2,000 points", "1.0 ms"],
            ["one frame at 60 fps", "16.7 ms"],
          ]}
        />
      }
    />
  );
}

export function RedrawChapter() {
  return (
    <Chapter
      id="redraw"
      scene="muc-redraw"
      visualClassName="chapter__visual--tall"
      topic="Performance"
      source="D3 updates in place"
      title={["Update in place,", "don’t rebuild."]}
      body={
        <>
          SVG’s other cost came from how I first used it. My first attack plot
          redrew itself from scratch. Hovering a dot or dragging the threshold
          changed React state, and the effect that followed cleared the SVG and
          appended every axis, legend, and circle again, 1,133 nodes each time.
          I split drawing from updating. The plot is now built once per dataset
          and metric, and a hover only changes the opacity of circles that
          already exist and adds one label. Measured with a MutationObserver on
          the demo build, a hover went from 1,133 nodes created or removed to 8,
          and a step of a threshold drag from about 1,128 to 25. The same fix
          took the embedding view’s first hover from about 70 ms of main-thread
          work to 10.
        </>
      }
      steps={[
        "Before, every hover cleared the SVG and appended all 1,133 nodes again.",
        "After, the plot is built once, and a hover only restyles what is already there.",
      ]}
      chips={[
        "Fashion-MNIST support",
        "A face-recognition dataset for another lab",
      ]}
      visual={
        <>
          <Snippet
            label="AttackPlot.tsx · before and after"
            ours
            lines={[
              t.c("// before, any change redrew the whole plot"),
              <>
                {t.f("useEffect")}(() {"=>"} {"{"}
              </>,
              <>
                {"  "}svg.{t.f("selectAll")}({t.s('"*"')}).{t.f("remove")}();
                {at(30)}
                {t.c("// 1,133 nodes out")}
              </>,
              <>
                {"  "}
                {t.f("drawButterflyChart")}();{at(23)}
                {t.c("// and back in")}
              </>,
              <>{"}"}, [data, thresholdValue, hoveredId]);</>,
              "",
              t.c("// after, build once and restyle in place"),
              <>
                {t.f("useEffect")}(() {"=>"} {t.f("drawButterflyChart")}(),
                [data, metric]);
              </>,
              <>
                {t.f("useEffect")}(() {"=>"} {"{"}
              </>,
              <>
                {"  "}
                {t.f("applyCircleOpacities")}(svg, hoveredId);{at(39)}
                {t.c("// same nodes")}
              </>,
              <>
                {"  "}
                {t.f("applyHoverLabels")}(svg, hoveredId);{at(35)}
                {t.c("// one label")}
              </>,
              <>{"}"}, [hoveredId]);</>,
            ]}
          />
          <Readout
            items={[
              [
                "nodes rebuilt per hover",
                <Change key="h" from="1,133" to="8" />,
              ],
              [
                "DOM mutations per hover",
                <Change key="m" from="6,906" to="1,220" />,
              ],
              [
                "embedding view, first hover",
                <Change key="e" from="~70 ms" to="~10 ms" />,
              ],
            ]}
          />
        </>
      }
    />
  );
}
