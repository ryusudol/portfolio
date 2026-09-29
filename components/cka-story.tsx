import Link from "next/link";
import { unlearningComparator } from "@/lib/case-studies";
import { links } from "@/lib/content";

import { Chapter } from "./chapter";
import {
  A,
  pad as at,
  Change,
  Counter,
  Readout,
  Snippet,
  tok as t,
} from "./story-parts";

export function WhyChapter() {
  return (
    <Chapter
      id="why"
      scene="cka-loop"
      visualClassName="chapter__visual--tall"
      topic="Why I started this project"
      title={["It started as a bottleneck", "in my own tool."]}
      body={
        <>
          While building{" "}
          <Link className="inline-link" href={unlearningComparator.href}>
            Machine Unlearning Comparator
          </Link>
          , I found the CKA computation behind its layer-similarity view
          extremely slow, even for 10 layers of ResNet-18 comparing two model
          pairs over 10,000 CIFAR-10 samples. It ran on torch_cka, the most
          widely used CKA library for PyTorch at the time. The animation replays
          its nested loop. For every batch, it takes the 18 × 18 layer pairs one
          at a time, and each pair stalls the GPU six times. Both of its HSIC
          calls end in three <code>.item()</code> calls, and each one makes
          Python wait for the GPU to hand back a number before it can queue more
          work.
        </>
      }
      visual={
        <>
          <Snippet
            label="torch_cka · the existing library"
            lines={[
              t.c("# runs once per batch"),
              <>
                {t.k("for")} i, x {t.k("in")} {t.f("enumerate")}(feats_a):
                {at(31)}
                {t.c("# i = ")}
                <Counter name="i" initial="0" />
              </>,
              "    K = x @ x.T",
              <>
                {"    "}
                {t.k("for")} j, y {t.k("in")} {t.f("enumerate")}(feats_b):
                {at(35)}
                {t.c("# j = ")}
                <Counter name="j" initial="0" />
              </>,
              <>
                {"        "}L = y @ y.T{at(19)}
                {t.c("# rebuilt for every pair")}
              </>,
              <>
                {"        "}hsic[i, j] += {t.f("_HSIC")}(K, L){at(33)}
                {t.c("# trace(K @ L), 3 × .item()")}
              </>,
              <>
                {"        "}hsic_l[i, j] += {t.f("_HSIC")}(L, L){at(35)}
                {t.c("# L @ L, again for every i")}
              </>,
            ]}
          />
          <Readout
            items={[
              [
                "layer pairs",
                <Counter key="p" name="pairs" initial="0 / 324" />,
              ],
              [
                "B³ matrix products",
                <Counter key="m" name="products" initial="0" />,
              ],
              ["GPU → CPU syncs", <Counter key="s" name="syncs" initial="0" />],
            ]}
          />
        </>
      }
    />
  );
}

export function GroundworkChapter() {
  return (
    <Chapter
      id="groundwork"
      scene="cka-basis"
      topic="Groundwork"
      source="3Blue1Brown · Kornblith et al., ICML 2019"
      title={["Before the code,", "the linear algebra."]}
      body={
        <>
          I started with <A href={links.ckaPaper}>the paper</A> that introduced
          CKA and soon realized I couldn’t follow it without really
          understanding linear algebra. So I relearned it from scratch with
          3Blue1Brown’s{" "}
          <A href={links.essenceOfLinearAlgebra}>Essence of Linear Algebra</A>,
          then learned PyTorch. The picture that stuck is that a matrix moves
          space. Rotating a layer’s activations, or scaling them evenly, changes
          every number but not which inputs sit close together, and that
          closeness is what the layer has learned. CKA scores those moves as no
          change at all. Only moves that distort it, like stretching or
          flattening, lower the score.
        </>
      }
      steps={[
        "A layer’s activations are points, and a matrix moves them.",
        "Rotate them and the geometry is intact, so CKA stays 1.00.",
        "Scale them evenly and it is still 1.00.",
        "Stretch and shear them, and similarity drops.",
        "Flatten them to a line, and what the layer knew is lost.",
      ]}
      visual={
        <Readout
          items={[
            [
              "matrix",
              <span key="m" className="matrix">
                <Counter name="m0" initial="1.00" />
                <Counter name="m1" initial="0.00" />
                <Counter name="m2" initial="0.00" />
                <Counter name="m3" initial="1.00" />
              </span>,
            ],
            [
              "linear CKA vs. original",
              <Counter key="c" name="cka" initial="1.00" />,
            ],
          ]}
        />
      }
    >
      <div className="chapter__aside">
        <p className="chapter__aside-title">The ideas CKA rests on</p>
        <ul className="tools">
          <li>Dot products</li>
          <li>Gram matrices</li>
          <li>Orthogonal transformations</li>
          <li>Trace</li>
          <li>Frobenius inner product</li>
          <li>Centering</li>
        </ul>
      </div>
    </Chapter>
  );
}

export function InsightChapter() {
  return (
    <Chapter
      id="insight"
      scene="cka-trace"
      topic="Insight"
      source="Frobenius inner product"
      title={["The trace never needed", "the whole product."]}
      length={4}
      body={
        <>
          CKA compares layers through their Gram matrices. For a batch of B
          inputs, a layer’s activations form a B × D matrix X, one row per
          input, and its Gram matrix K = XXᵀ holds the dot product of every pair
          of inputs, a B × B table of how alike they look to that layer. Layers
          of any width give tables of the same size, and rotating X leaves K
          unchanged. CKA’s core term is tr(KL). torch_cka built all of K @ L to
          get it, spending B³ multiply-adds and then keeping only the B numbers
          on the diagonal, which is a big part of why it was slow. Written out
          by hand, their sum is just{" "}
          <span className="nowrap">
            Σ K<sub>ij</sub> L<sub>ij</sub>
          </span>
          .
        </>
      }
      steps={[
        "Each cell is how alike two inputs look to a layer. Brighter means more alike.",
        "torch_cka’s way. K @ L costs B³ multiply-adds, one slice at a time.",
        "The trace keeps B of the B² results and throws the rest away.",
        "My way. Σ K ⊙ L reaches the same number with B² multiply-adds.",
      ]}
      visual={
        <Readout
          items={[
            [
              "torch_cka · tr(K\u00a0@\u00a0L)",
              <Counter key="c" name="cubic" initial="0" />,
            ],
            [
              "pytorch-cka · Σ\u00a0K\u00a0⊙\u00a0L",
              <Counter key="s" name="square" initial="0" />,
            ],
            [
              "at B\u00a0=\u00a01,000",
              <Counter key="r" name="ratio" initial="–" />,
            ],
          ]}
        />
      }
    />
  );
}

export function RedesignChapter() {
  return (
    <Chapter
      id="redesign"
      scene="cka-batch"
      visualClassName="chapter__visual--tall"
      topic="Redesign"
      source="vectorized HSIC"
      title={["Every layer pair,", "in one pass."]}
      length={3.5}
      body={
        <>
          My first working version already summed K ⊙ L, yet it was only 2.1×
          faster than torch_cka, taking 13.9 s against its 29.3 s on a Colab T4,
          with the same models and data as the benchmark below. The per-pair
          loop was still there, and another HSIC term still multiplied K by L.
          So I rewrote the estimator to work on whole stacks. Each Gram matrix
          is built once, a single <code>torch.einsum</code> takes all 324
          Frobenius products, and an outer product plus one matmul supply the
          rest of the unbiased HSIC.
        </>
      }
      steps={[
        "Build each layer’s Gram matrix once and stack each model’s 18.",
        "Read each B × B matrix row by row into B² numbers, giving (18, B²) and (B², 18).",
        'Multiply the two, einsum("aij,bij->ab"), for all 324 Frobenius products at once.',
        "Off-diagonal and column sums add the other two terms, with no K @ L.",
        "Normalize to get the CKA matrix, then hover a cell.",
      ]}
      tag={
        <p className="hint">
          Counts per batch, 18 × 18 layers. torch_cka makes 666 HSIC calls (1
          per row, 2 per pair) with 3 .item() syncs each, and 342 Gram builds
          (each K once, each L per pair). pytorch-cka makes 1 call and builds 18
          Grams per model.
        </p>
      }
      visual={
        <>
          <Snippet
            label="pytorch-cka"
            ours
            lines={[
              t.c("# runs once per batch, for all 324 pairs at once"),
              <>
                ga = torch.{t.f("stack")}([x @ x.T {t.k("for")} x {t.k("in")}{" "}
                feats_a]){"   "}
                {t.c("# (18, B, B)")}
              </>,
              <>
                gb = torch.{t.f("stack")}([y @ y.T {t.k("for")} y {t.k("in")}{" "}
                feats_b]){"   "}
                {t.c("# (18, B, B)")}
              </>,
              <>
                tr = {t.f("einsum")}({t.s('"aij,bij->ab"')}, ga, gb) -{" "}
                {t.f("einsum")}({t.s('"ai,bi->ab"')}, da, db)
              </>,
              <>t2 = {t.f("outer")}(sum_a, sum_b) / ((n - 1) * (n - 2))</>,
              <>t3 = 2 / (n - 2) * col_a @ col_b.T</>,
              <>hsic_xy += (tr + t2 - t3) / (n * (n - 3))</>,
            ]}
          />
          <Readout
            items={[
              ["HSIC calls per batch", <Change key="h" from="666" to="1" />],
              [".item() per batch", <Change key="i" from="1,998" to="0" />],
              ["Gram builds per batch", <Change key="g" from="342" to="36" />],
            ]}
          />
        </>
      }
    />
  );
}

export function MemoryChapter() {
  return (
    <Chapter
      id="memory"
      scene="cka-memory"
      topic="Memory management"
      source="forward hooks"
      title={["Keep the answer,", "drop the activations."]}
      body={
        <>
          Speed was half the problem. After one pass over the 10,000 CIFAR-10
          test images on an A100, torch_cka still held 4.26 GB of GPU memory,
          the last batch’s activations from all 18 layers of both models. Its
          forward hooks store each output on the CKA object and are never
          removed, and since the models keep the hooks, even{" "}
          <code>del cka</code> and <code>gc.collect()</code> can’t free it.
          pytorch-cka scopes its hooks to a <code>with</code> block, clears
          features every batch, and ends at 0.18 GB.
        </>
      }
      steps={[
        "Every batch, hooks capture 18 layers from both models.",
        "When the comparison ends, pytorch-cka removes its hooks and frees the features.",
        "torch_cka’s hooks stay on the models, and so does its last batch, 4.26 GB.",
      ]}
      chips={[
        "Self-comparison in one forward pass",
        "Two models run in parallel on CUDA streams",
        "Unwraps DataParallel and DDP models",
        "Reads Hugging Face model outputs",
      ]}
      visual={
        <Readout
          items={[
            [
              "torch_cka holds",
              <Counter key="t" name="torch" initial="0 MB" />,
            ],
            [
              "pytorch-cka holds",
              <Counter key="o" name="ours" initial="0.0 MB" />,
            ],
            ["difference", <Counter key="f" name="freed" initial="–" />],
          ]}
        />
      }
    />
  );
}

export function BenchmarkChapter() {
  return (
    <Chapter
      id="benchmark"
      scene="cka-race"
      topic="Benchmark"
      source="ResNet-18 · CIFAR-10 · H100"
      title={["Same GPU, same layers,", "8.98 s down to 1.16 s."]}
      body={
        <>
          The benchmark compares two ResNet-18s, the original and one unlearned
          to forget CIFAR-10’s airplane class, across all 18 layers. It runs
          over the four splits the comparator uses, forget-class and
          remaining-class images from the training and test sets, 10,000 images
          in batches of 1,000, on an H100. pytorch-cka finished in 1.16 seconds,
          7.7× faster than torch_cka, 17× faster than ckapytorch, and 44× faster
          than a NumPy reference on CPU. The work I removed grows cubically with
          batch size, so the gap should widen as batches grow.
        </>
      }
      visual={
        <Readout
          items={[
            ["elapsed", <Counter key="e" name="elapsed" initial="0.00 s" />],
            ["pytorch-cka", "1.16 s"],
            ["vs torch_cka", "7.7× faster"],
          ]}
        />
      }
    />
  );
}
