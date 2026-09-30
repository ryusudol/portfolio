import { BarrierIcon } from "./barrier-icon";

/** A dashed notice for a page whose content is still being built. */
export function UnderConstruction({ note }: { note: string }) {
  return (
    <div className="construction">
      <BarrierIcon size={72} />
      <div>
        <p className="construction__title">Under construction</p>
        <p className="construction__note">{note}</p>
      </div>
    </div>
  );
}
