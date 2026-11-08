import { links } from "@/lib/content";

import { Chapter } from "./chapter";
import {
  A,
  pad as at,
  Counter,
  Readout,
  Snippet,
  tok as t,
} from "./story-parts";

export function PrincipleChapter() {
  return (
    <Chapter
      id="principle"
      scene="inv-principle"
      length={3.5}
      topic="Why it’s built this way"
      title={["The LLM reads.", "Code decides."]}
      body={
        <>
          Invoices are the kind of input LLMs handle well: an email that says
          “Amt”, a PDF that writes 2026 as “2O26”, a CSV with no currency. But
          an invoice is also a request for money, and some of them push. One
          sample says “URGENT - Pay immediately to avoid penalties!!!” I didn’t
          want a model that can be talked into something, or that rounds a
          total, anywhere near the decision to pay. So I split the work by what
          a mistake costs. The agents read, propose, and explain. Code computes,
          checks, decides, and pays, and when the two disagree, code wins.
        </>
      }
      steps={[
        "Invoices arrive as text, PDF, JSON, CSV, and XML, with typos, OCR errors, and missing fields.",
        "Four agents do the reading. Intake extracts the fields, Validation proposes catalog matches, and the VP and critic write and audit the decision.",
        "Code does everything that touches money: arithmetic in integer cents, stock, duplicates, the policy gate, and payment.",
        "Code treats what the agents say as proposals. When it disagrees, it overrides them and logs the override as an event.",
      ]}
    />
  );
}

export function OrchestrationChapter() {
  return (
    <Chapter
      id="orchestration"
      scene="inv-machine"
      visualClassName="chapter__visual--tall"
      length={4}
      topic="Orchestration"
      source="Pydantic AI"
      title={["A transition table,", "not a graph framework."]}
      body={
        <>
          Grok was a given, so the open question was what should drive the
          agents. LangGraph was the obvious candidate, but nothing here needed
          it. No agent picks its own next step, every path is known in advance,
          and the one loop, between the VP and the critic, has a fixed cap. So I
          used <A href={links.pydanticAi}>Pydantic AI</A> for what the agents do
          need, typed outputs, tools, and output validators, and wrote the
          orchestration as a small state machine: a <code>Stage</code> enum, a
          table of transitions keyed by stage and condition, and one handler per
          stage. Each handler returns a condition and the table says where it
          leads, so a path missing from the table fails the run instead of
          wandering somewhere new. Any exception ends at <code>failed</code>.
        </>
      }
      visual={
        <>
          <Snippet
            label="orchestrator.py · the whole control flow"
            ours
            lines={[
              t.c("# (stage, condition) -> next stage"),
              <>TRANSITIONS = {"{"}</>,
              <>
                {"  "}(EXTRACT, {t.s('"extracted"')}): CHECK_DUPLICATE,
              </>,
              <>
                {"  "}(CHECK_DUPLICATE, {t.s('"identical"')}): DUPLICATE,
              </>,
              <>{"  "}(APPROVAL, NEEDS_REVIEW): NEEDS_REVIEW,</>,
              <>
                {"  "}(NEEDS_REVIEW, APPROVE): PAYMENT,{at(33)}
                {t.c("# resolve_review()")}
              </>,
              "  …",
              "}",
              <>
                {t.k("while")} stage {t.k("not in")} TERMINAL:
              </>,
              <>
                {"  "}
                {t.f("_save")}(state){at(14)}
                {t.c("# before every stage")}
              </>,
              <>{"  "}cond, summary = HANDLERS[stage](state, sink)</>,
              <>{"  "}stage = TRANSITIONS[(stage, cond)]</>,
            ]}
          />
          <Readout
            items={[
              ["invoice", <Counter key="f" name="file" initial="1001.txt" />],
              ["stage", <Counter key="s" name="stage" initial="load" />],
              ["runs row saved", <Counter key="v" name="saves" initial="1" />],
            ]}
          />
        </>
      }
    />
  );
}

export function ExtractionChapter() {
  return (
    <Chapter
      id="extraction"
      scene="inv-intake"
      length={4}
      topic="Extraction"
      source="Intake agent · output validator"
      title={["Every value has to be", "on the page."]}
      body={
        <>
          The Intake agent turns any format into one typed <code>Invoice</code>{" "}
          schema. The schema only holds what the document states, like{" "}
          <code>stated_total</code> and <code>stated_tax_rate</code>, never a
          computed value, so an invented number has nowhere to hide. Pydantic
          enforces the shape, and an output validator checks the content: every
          number, name, and date must appear in the source text, after
          normalizing case, punctuation, and OCR zeros. A value that doesn’t
          raises <code>ModelRetry</code> with a sentence the model can act on,
          up to two retries. The animation replays the test that covers this, on
          invoice 1010.
        </>
      }
      steps={[
        "Grok returns an Invoice: every field copied as written, and null wherever the document says nothing.",
        "Before the output is accepted, code looks for each value in the document’s own text.",
        "The first attempt states a 5% tax rate. Invoice 1010 lists $335.00 of sales tax but never writes a rate.",
        "ModelRetry sends the problem back. The second attempt returns null, and the check passes.",
        "A wrong total that is printed on the page still passes here. That is the vendor’s mistake, and Validation flags it.",
      ]}
      visual={
        <Readout
          items={[
            ["attempt", <Counter key="a" name="attempt" initial="1 of 3" />],
            ["problems", <Counter key="p" name="problems" initial="—" />],
          ]}
        />
      }
    />
  );
}

export function MatchingChapter() {
  return (
    <Chapter
      id="matching"
      scene="inv-match"
      length={4}
      topic="Item matching"
      source="Validation agent · reconcile()"
      title={["A similar name is", "not the same item."]}
      body={
        <>
          Invoices name items loosely: “Widget A”, “WIDGET A”, “WidgetA (rush
          order)”. The Validation agent handles that with three read-only tools
          over the inventory table, <code>lookup_item</code>,{" "}
          <code>search_inventory</code>, and <code>check_stock</code>, and
          proposes a catalog item for each line. But a model that decides
          WidgetC is probably WidgetA would pay for a part that doesn’t exist.
          So code computes its own match, exact apart from spaces, letter case,
          and a trailing note in parentheses, keeps it, and records every
          disagreement as a <code>match_override</code> event. In the recorded
          run Grok got WidgetC right. The scene replays the test that makes sure
          it wouldn’t matter if it hadn’t.
        </>
      }
      steps={[
        "Invoice 1016 bills for WidgetA, WidgetB, and WidgetC. The catalog has no WidgetC.",
        "The Validation agent looks each line up with its tools and checks stock for what it finds.",
        "Suppose it maps WidgetC to WidgetA, the closest name. The test scripts exactly that.",
        "Code matches names exactly, keeps its own answer for the line, and logs a match_override.",
        "The rules then run on code’s matches. WidgetC is an unknown item, an error, so the policy gate will reject the invoice.",
      ]}
      visual={
        <Readout
          items={[
            [
              "WidgetC · agent",
              <Counter key="p" name="proposed" initial="—" />,
            ],
            ["WidgetC · code", <Counter key="k" name="kept" initial="—" />],
            ["match_override", <Counter key="o" name="override" initial="0" />],
          ]}
        />
      }
    />
  );
}

export function PolicyChapter() {
  return (
    <Chapter
      id="policy"
      scene="inv-gate"
      length={4}
      topic="Policy gate"
      source="approval/policy.py"
      title={["Most outcomes are settled", "before an agent drafts one."]}
      body={
        <>
          Validation turns everything code found into typed findings, each with
          a code like <code>out_of_stock</code> or{" "}
          <code>price_above_catalog</code> and a severity. The policy gate reads
          only those findings and picks one of four modes, which sets how much
          the approval agents may choose. A reject or a human review is a fixed
          outcome; only strict and standard leave the decision open. Of the 17
          sample invoices that weren’t duplicates, the gate fixed 11. The
          animation runs the whole batch in order.
        </>
      }
      steps={[
        "Any error-level finding, such as a missing vendor, an unknown item, short stock, or wrong arithmetic: reject. Eight invoices.",
        "A non-USD currency, a price above catalog, a revision, or an invoice number another vendor already used: a person decides. Three invoices.",
        "A total over $10,000, or a risk signal the Intake agent quoted: strict review, with up to three VP and critic rounds.",
        "Everything else is standard. The VP approves unless it finds a concrete problem, and the critic checks it. Six paid.",
      ]}
      visual={
        <Readout
          items={[
            ["rejected", <Counter key="r" name="rejected" initial="0" />],
            ["needs_review", <Counter key="n" name="review" initial="0" />],
            ["paid", <Counter key="p" name="paid" initial="0" />],
            ["duplicate", <Counter key="d" name="duplicate" initial="0" />],
          ]}
        />
      }
    />
  );
}

export function ApprovalChapter() {
  return (
    <Chapter
      id="approval"
      scene="inv-critique"
      length={4}
      topic="Approval"
      source="VP and critic agents"
      title={["The agents can escalate.", "They can’t loosen."]}
      body={
        <>
          The VP agent never sees the raw document. It gets a case file that
          code wrote: each line with its catalog match, stated against computed
          amounts, every finding, and the policy mode with the outcomes it
          allows. It drafts a decision with a rationale of at most 120 words,
          and a critic agent audits the draft against the same case file,
          checking every claim and amount. Under strict review they get three
          rounds to agree, otherwise one. After every draft, one function of
          code has the last word.
        </>
      }
      steps={[
        "Code writes the case file, and the VP drafts a decision and a rationale from it.",
        "The critic audits the draft. An objection goes back as concrete issues, and the VP revises until the critic agrees.",
        "If they still disagree after three rounds, the invoice goes to a person.",
        "A fixed outcome stays fixed. On 1002.txt, a test scripts a VP that approves 20 GadgetX with only 5 in stock, and a policy override sets it back to reject.",
        "In standard mode a VP reject becomes needs_review, so no agent can reject a clean invoice on its own.",
      ]}
      visual={
        <Readout
          items={[
            ["mode", <Counter key="m" name="mode" initial="—" />],
            ["round", <Counter key="r" name="round" initial="—" />],
            ["decided by", <Counter key="d" name="decided" initial="—" />],
          ]}
        />
      }
    />
  );
}

export function PaymentChapter() {
  return (
    <Chapter
      id="payment"
      scene="inv-ledger"
      length={4}
      topic="Duplicates and payment"
      source="duplicates.py · payment.py"
      title={["Pay each invoice once,", "whatever file it comes in."]}
      body={
        <>
          A filename says nothing about whether an invoice was paid, so identity
          comes from content. The key is the normalized number plus the vendor,
          and the fingerprint is a SHA-256 of the fields every format carries:
          number, vendor, date, the lines as a multiset, total, and currency.
          The same key and fingerprint is a duplicate. The same key with a new
          fingerprint is a revision, which a person must approve. Payment then
          sends only what is still owed, under an idempotency key, inside one{" "}
          <code>BEGIN IMMEDIATE</code> transaction, so two approvals at the same
          moment can’t both read “nothing paid yet”. Money is integer cents
          throughout.
        </>
      }
      steps={[
        "INV-1012 arrives twice: as a PDF, then as a text file with a different layout.",
        "Both reduce to the same core fields, whatever the layout.",
        "Their fingerprints match, 6d751f33753066a3, so the text file ends as a duplicate and pays nothing.",
        "INV-1004 comes back revised: same key, new fingerprint, and 5 more GadgetX. A person has to approve it.",
        "Approved, it pays only the difference, $4,050, under its own key. Approving either version again pays nothing.",
      ]}
      visual={
        <Readout
          items={[
            ["fingerprint", <Counter key="f" name="fingerprint" initial="—" />],
            ["INV-1004 paid", <Counter key="p" name="paid" initial="—" />],
            ["payments", <Counter key="n" name="payments" initial="—" />],
          ]}
        />
      }
    />
  );
}

export function PersistenceChapter() {
  return (
    <Chapter
      id="persistence"
      scene="inv-resume"
      length={4}
      topic="Persistence"
      source="SQLite · WAL"
      title={["A paused run", "is just a row."]}
      body={
        <>
          The CLI and the dashboard are separate processes over one SQLite file
          in WAL mode, and both call the same two entry points,{" "}
          <code>run_pipeline()</code> and <code>resolve_review()</code>. Because
          the run’s state is saved before every stage, a run that stops for
          review holds nothing in memory, and either process can load it and
          carry on. The dashboard’s FastAPI server runs invoices on one worker
          thread in the order they were submitted, so every duplicate check sees
          the invoices that came before it.
        </>
      }
      steps={[
        "Each stage starts by writing the run’s full state to its row.",
        "A run waiting at needs_review needs no process. The CLI can exit, and the dashboard picks the run up with Approve and Reject.",
        "Two people approve at once. An UPDATE that only matches a run still at needs_review claims it for one of them; the other is told it’s no longer waiting.",
        "A process killed mid-run leaves a row with no new events. After 15 quiet minutes, the next run fails it, or puts a claimed review back in the queue.",
      ]}
      visual={
        <Readout
          items={[
            ["run", <Counter key="r" name="row" initial="#11" />],
            ["status", <Counter key="s" name="status" initial="processing" />],
            ["claim", <Counter key="u" name="update" initial="—" />],
          ]}
        />
      }
    />
  );
}

export function TestingChapter() {
  return (
    <Chapter
      id="testing"
      scene="inv-replay"
      length={3.5}
      topic="Testing"
      source="FunctionModel · ANSWER_KEY"
      title={["Record Grok once,", "replay it in every test."]}
      body={
        <>
          A pipeline of LLM calls is hard to test when every run costs money and
          answers a little differently. So the offline suite runs with model
          requests switched off. A script saves each agent’s outputs per invoice
          from a live run, and in tests each of the four agents is replaced by a
          FunctionModel that replays its queue and fails the test if anything is
          left unused. The golden test runs all 20 samples end to end and checks
          each against an answer key: status, amount paid, and finding codes.
        </>
      }
      steps={[
        "A live run records each agent’s outputs, per invoice, as a JSON fixture.",
        "In tests, all four agents become FunctionModels that replay their queues, with no API key and no network.",
        "The whole batch replays end to end against ANSWER_KEY, one test in a suite of 126 that runs in 4.6 s.",
        "pytest -m live checks the same answer key against real Grok: 20 of 20.",
      ]}
      visual={
        <Readout
          items={[
            [
              "model",
              <Counter key="m" name="model" initial="grok (recording)" />,
            ],
            ["matched", <Counter key="n" name="matched" initial="—" />],
          ]}
        />
      }
    />
  );
}
