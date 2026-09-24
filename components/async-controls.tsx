"use client";

import { useSyncExternalStore } from "react";

import { operatorNotes, operators } from "@/lib/content";
import { dots } from "@/lib/dots/runtime";

export function AsyncControls() {
  const { operator, stats } = useSyncExternalStore(
    dots.subscribe,
    dots.getSnapshot,
    dots.getServerSnapshot,
  );

  return (
    <div className="controls">
      <fieldset className="segmented">
        <legend className="sr-only">RxJS flattening operator</legend>
        <span className="segmented__label" aria-hidden>
          Operator
        </span>
        {operators.map((op) => (
          <label key={op} className="segmented__option">
            <input
              type="radio"
              name="operator"
              value={op}
              checked={operator === op}
              onChange={() => dots.setOperator(op)}
            />
            <span>{op.replace("Map", "")}</span>
          </label>
        ))}
      </fieldset>
      <p className="controls__note">
        <code>{operator}</code> — {operatorNotes[operator]}
      </p>
      <p className="log">
        <span>
          emitted <b>{stats.emitted}</b>
        </span>
        <span>
          completed <b>{stats.completed}</b>
        </span>
        <span>
          dropped <b className="log__accent">{stats.dropped}</b>
        </span>
      </p>
      <p className="hint">[ hover the branches to fire requests ]</p>
    </div>
  );
}
