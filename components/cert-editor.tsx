"use client";

import {
  type KeyboardEvent,
  type PointerEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Reorder } from "reicon-react";

import { type Certification, certifications } from "@/lib/content";

const SLIDE = { duration: 240, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" };

const move = (list: Certification[], from: number, to: number) => {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The certifications editor from the shipped profile page, rebuilt small.
 * Rows reorder by pointer drag, or from the keyboard the way the original
 * does it, with Space to lift, arrows to move, Space to drop, Escape to undo.
 * The dragged row follows the pointer and the others slide aside (FLIP), so
 * the particles tracing each row (`data-dots`) glide rather than jump.
 */
export function CertEditor() {
  const [order, setOrder] = useState<Certification[]>(certifications);
  const [lifted, setLifted] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const hint = useId();

  const list = useRef<HTMLOListElement>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const orderRef = useRef(order);
  orderRef.current = order;
  const before = useRef<Certification[]>(certifications);
  /** Each row's on-screen top just before the last reorder. */
  const tops = useRef<Map<string, number> | null>(null);
  /** Pointer drag in progress: which row, and where it was grabbed. */
  const drag = useRef<{ name: string; grab: number; y: number } | null>(null);

  const reorder = (next: Certification[]) => {
    tops.current = new Map(
      [...rows.current].map(([name, el]) => [
        name,
        el.getBoundingClientRect().top,
      ]),
    );
    setOrder(next);
  };

  /** Pins the dragged row under the pointer, kept inside the list. */
  const follow = () => {
    const d = drag.current;
    const el = d && rows.current.get(d.name);
    const box = list.current;
    if (!d || !el || !box) return 0;
    const natural = box.getBoundingClientRect().top + el.offsetTop;
    const t = Math.min(
      Math.max(d.y - d.grab - natural, -el.offsetTop - 6),
      box.offsetHeight - el.offsetTop - el.offsetHeight + 6,
    );
    el.style.transform = `translateY(${t}px)`;
    return t;
  };

  // FLIP: rows render in their new slots, then animate from where they were.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs per reorder
  useLayoutEffect(() => {
    const prev = tops.current;
    tops.current = null;
    if (drag.current) follow();
    if (!prev || still()) return;
    for (const [name, el] of rows.current) {
      if (name === drag.current?.name) continue;
      const from = prev.get(name);
      for (const a of el.getAnimations()) a.cancel();
      if (from === undefined) continue;
      const dy = from - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 0.5) continue;
      el.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: "none" }],
        SLIDE,
      );
    }
  }, [order]);

  const lift = (i: number) => {
    before.current = orderRef.current;
    setLifted(i);
    setMessage(
      `Lifted ${orderRef.current[i].name}, position ${i + 1} of ${orderRef.current.length}.`,
    );
  };

  const drop = (i: number) => {
    setLifted(null);
    setMessage(`Dropped ${orderRef.current[i].name} at position ${i + 1}.`);
  };

  const shift = (i: number, to: number) => {
    const current = orderRef.current;
    if (to < 0 || to >= current.length || to === i) return;
    reorder(move(current, i, to));
    setLifted(to);
    setMessage(`Moved to position ${to + 1} of ${current.length}.`);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (drag.current) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (lifted === null) lift(i);
      else drop(i);
    } else if (lifted !== null && e.key === "ArrowUp") {
      e.preventDefault();
      shift(i, i - 1);
    } else if (lifted !== null && e.key === "ArrowDown") {
      e.preventDefault();
      shift(i, i + 1);
    } else if (lifted !== null && e.key === "Escape") {
      e.preventDefault();
      reorder(before.current);
      setLifted(null);
      setMessage("Reorder canceled.");
    }
  };

  // Keyboard focus follows the moved row, since React moves its node.
  const onBlur = (name: string) => {
    if (drag.current || lifted === null) return;
    if (orderRef.current[lifted]?.name === name) drop(lifted);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, i: number) => {
    if (e.button !== 0 || drag.current) return;
    e.preventDefault();
    const name = orderRef.current[i].name;
    const el = rows.current.get(name);
    if (!el) return;
    for (const a of el.getAnimations()) a.cancel();
    drag.current = {
      name,
      grab: e.clientY - el.getBoundingClientRect().top,
      y: e.clientY,
    };
    lift(i);

    // Listen on the window: reordering moves row nodes, which would drop a
    // pointer capture held by the handle.
    const onMove = (ev: globalThis.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      d.y = ev.clientY;
      const t = follow();
      const self = rows.current.get(d.name);
      if (!self) return;
      // The new slot is the number of other rows whose middle sits above the
      // dragged row's middle.
      const mid = self.offsetTop + t + self.offsetHeight / 2;
      const current = orderRef.current;
      const to = current.filter((c) => {
        const r = rows.current.get(c.name);
        return c.name !== d.name && r && r.offsetTop + r.offsetHeight / 2 < mid;
      }).length;
      shift(
        current.findIndex((c) => c.name === d.name),
        to,
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      const row = rows.current.get(d.name);
      if (row) {
        const t = new DOMMatrixReadOnly(getComputedStyle(row).transform).m42;
        row.style.transform = "";
        if (!still() && Math.abs(t) > 0.5) {
          row.animate(
            [{ transform: `translateY(${t}px)` }, { transform: "none" }],
            { ...SLIDE, duration: 200 },
          );
        }
      }
      drop(orderRef.current.findIndex((c) => c.name === d.name));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div
      className="mini certs"
      data-dots="outline"
      data-dots-spread="1.6"
      data-dots-weight="1.1"
    >
      <div className="mini__bar">
        <span className="mini__led" aria-hidden />
        <span>Certifications · {order.length}</span>
        <span className="mini__live">live</span>
      </div>
      <div className="mini__rule" data-dots="rule" data-dots-spread="0.8" />

      <p id={hint} className="sr-only">
        Press Space to lift a certification, the arrow keys to move it, Space
        again to drop it, or Escape to cancel.
      </p>
      <ol ref={list} className="certs__list">
        {order.map((cert, i) => (
          <li
            key={cert.name}
            ref={(el) => {
              if (el) rows.current.set(cert.name, el);
              else rows.current.delete(cert.name);
            }}
            className="certs__row"
            data-lifted={lifted === i || undefined}
            data-dots="outline"
            data-dots-spread="0.9"
            data-dots-weight="0.7"
          >
            <button
              type="button"
              className="certs__handle"
              aria-label={`Reorder ${cert.name}, ${cert.issuer}`}
              aria-describedby={hint}
              aria-pressed={lifted === i}
              onKeyDown={(e) => onKey(e, i)}
              onBlur={() => onBlur(cert.name)}
              onPointerDown={(e) => onPointerDown(e, i)}
            >
              <Reorder size={14} aria-hidden />
            </button>
            <span className="certs__text">
              <b>{cert.name}</b>
              <span>{cert.issuer}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="sr-only" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
