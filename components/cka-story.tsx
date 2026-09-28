import Link from "next/link";
import type { ReactNode } from "react";

import { unlearningComparator } from "@/lib/case-studies";
import { links } from "@/lib/content";

import { Chapter } from "./chapter";

const t = {
  c: (s: string) => <span className="tok-comment">{s}</span>,
  k: (s: string) => <span className="tok-key">{s}</span>,
  s: (s: string) => <span className="tok-string">{s}</span>,
  f: (s: string) => <span className="tok-fn">{s}</span>,
};

/** Pads code of `length` characters out to the listing's comment column. */
const at = (length: number) => " ".repeat(Math.max(2, 40 - length));

/**
 * A short listing pinned to the top of a chapter's stage, captioned with whose
 * code it is so the particles below read as that library's work.
 */
function Snippet({
  label,
  ours = false,
  lines,
}: {
  label: string;
  ours?: boolean;
  lines: ReactNode[];
}) {
  return (
    <figure className="snippet" data-reserve="top">
      <figcaption
        className={`snippet__tag${ours ? " snippet__tag--ours" : ""}`}
      >
        {label}
      </figcaption>
      <pre>
        <code>
          {lines.map((line, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static listing
            <span key={i} className="snippet__line">
              {line}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}

function Readout({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="readout readout--story" data-reserve="bottom">
      {items.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Counter({ name, initial }: { name: string; initial: string }) {
  return <span data-counter={name}>{initial}</span>;
}

function Change({ from, to }: { from: string; to: string }) {
  return (
    <>
      <span className="readout__from">{from}</span>
      <span className="readout__arrow" aria-hidden>
        {" → "}
      </span>
      <span className="sr-only"> to </span>
      {to}
    </>
  );
}

function A({ href, children }: { href: string; children: string }) {
  return (
    <a className="inline-link" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function WhyChapter() {
  return (
    <Chapter
      id="why"
      scene="cka-loop"
      visualClassName="chapter__visual--tall"
      topic="Why"
      source="Machine Unlearning Comparator"
      title={["It started as a bottleneck", "in my own tool."]}
      body={
        <>
          While building{" "}
          <Link className="inline-link" href={unlearningComparator.href}>
            Machine Unlearning Comparator
          </Link>
          , I found its CKA view extremely slow, even for 10 layers of ResNet-18
          comparing two model pairs over 10,000 CIFAR-10 samples. The view
          scores each unlearned model against the original or a retrained model,
          layer by layer, and the library doing that work was torch_cka. The
          animation replays torch_cka’s inner loop, which handles one layer pair
          at a time and stalls on the GPU six times before moving on.
        </>
      }
      tag={<span className="hint">[ torch_cka’s loop, replayed ]</span>}
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
                {t.c("# and again")}
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
          space, and CKA is built to ignore the moves that don’t change what a
          layer knows.
        </>
      }
      steps={[
        "A layer’s activations are points, and a matrix moves them.",
        "Rotate them and the geometry is intact, so CKA stays 1.00.",
        "Scale them evenly and it is still 1.00.",
        "Stretch and shear them, and similarity drops.",
        "Flatten them to a line, and what the layer knew is lost.",
      ]}
      tag={<span className="hint">[ scroll to transform the space ]</span>}
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
    />
  );
}

export function InsightChapter() {
  return (
    <Chapter
      id="insight"
      scene="cka-trace"
      topic="Insight"
      source="Frobenius inner product"
      title={["The product was never", "part of the math."]}
      length={4}
      body={
        <>
          CKA compares two layers through their Gram matrices K and L, B × B
          tables of how alike each pair of inputs looks to that layer. Its core
          term is tr(KL). torch_cka, like the other implementations I had read,
          built all of K @ L to get it, spending B³ multiply-adds and then
          keeping only the B numbers on the diagonal. Written out by hand, their
          sum is just{" "}
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
              "torch_cka · K @ L, trace",
              <Counter key="c" name="cubic" initial="0" />,
            ],
            [
              "pytorch-cka · Σ K ⊙ L",
              <Counter key="s" name="square" initial="0" />,
            ],
            [
              "at batch size 1,000",
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
      source="torch.einsum"
      title={["Every layer pair,", "in one pass."]}
      length={3.5}
      body={
        <>
          My first working version already summed K ⊙ L, yet it was only 2.1×
          faster than torch_cka. The per-pair loop was still there, and another
          HSIC term still multiplied K by L. So I rewrote the estimator to work
          on whole stacks. Each Gram matrix is built once, one einsum takes all
          324 Frobenius products, and an outer product plus one matmul supply
          the rest of the unbiased HSIC.
        </>
      }
      steps={[
        "Build each layer’s Gram once and stack them.",
        "Flatten the stacks into (18, B²) and (B², 18).",
        "One einsum computes all 324 products at once.",
        "Off-diagonal and column sums add the other two terms, with no K @ L.",
        "Normalize to get the CKA matrix, then hover a cell.",
      ]}
      visual={
        <>
          <Snippet
            label="pytorch-cka · my rewrite"
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
      topic="Memory"
      source="Hooks & lifecycles"
      title={["Keep the answer,", "drop the activations."]}
      body={
        <>
          Speed was half the problem. torch_cka left its forward hooks on the
          models, and through them the last batch of activations, 4.26 GB that
          stayed allocated even after deleting the object and collecting
          garbage. pytorch-cka registers hooks inside a with block and removes
          them on exit, clears features every batch, and carries only running
          HSIC sums from one batch to the next.
        </>
      }
      steps={[
        "Every batch, hooks capture 18 layers from both models.",
        "When compare() ends, pytorch-cka removes its hooks and frees the features.",
        "After del cka and gc.collect(), torch_cka’s hooks still hold 4.26 GB.",
      ]}
      chips={[
        "One forward pass for self-comparison",
        "CUDA streams for two models",
        "DataParallel & DDP",
        "Hugging Face outputs",
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
          The benchmark compares two ResNet-18s, one before and one after
          unlearning, on all 18 layers over four CIFAR-10 splits, on an H100.
          pytorch-cka finished in 1.16 seconds, 7.7× faster than torch_cka, 17×
          faster than ckapytorch, and 44× faster than a NumPy reference on CPU.
          The work I removed grew cubically with batch size, so the gap widens
          as batches grow.
        </>
      }
      tag={<span className="hint">[ scroll to run the clock ]</span>}
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

export function ShippedChapter() {
  return (
    <Chapter
      id="shipped"
      scene="cka-timeline"
      topic="Shipped"
      source="PyPI"
      title={["Built in a month,", "maintained since."]}
      body={
        <>
          Most of it came together in January 2026, with 134 commits from the
          first estimator to v1.0 on PyPI. In August I came back to add
          cka_from_features, for activations people have already extracted, and
          to bring the test suite to 100% coverage, run in CI on Python 3.10
          through 3.14. It now sees about 400 downloads a month.
        </>
      }
      tag={<span className="hint">[ scroll through the commit history ]</span>}
      visual={
        <Readout
          items={[
            ["commits", <Counter key="c" name="commits" initial="0" />],
            ["releases", <Counter key="r" name="releases" initial="0" />],
            ["downloads", "~400 / month"],
          ]}
        />
      }
    />
  );
}
