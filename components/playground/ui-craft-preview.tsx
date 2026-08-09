export function UICraftPreview({
  variant = "card",
}: {
  variant?: "card" | "category";
}) {
  const isCategory = variant === "category";

  return (
    <div
      aria-hidden="true"
      className={`relative grid place-items-center bg-[#F2F4F6] dark:bg-surface ${
        isCategory ? "h-54 max-sm:h-60" : "h-44 max-sm:h-40"
      }`}
    >
      <div className="absolute size-28 rounded-full bg-[rgb(61_110_247/18%)] blur-2xl" />
      <div
        className={`relative z-1 grid gap-2 rounded-[0.75rem] border border-border bg-surface p-3 shadow-[0_14px_36px_rgb(62_54_47/10%)] dark:shadow-[0_14px_36px_rgb(0_0_0/28%)] ${
          isCategory ? "w-[72%]" : "w-[78%]"
        }`}
      >
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#F4F6F8] px-3 py-2 dark:bg-surface-alt">
          <span className="h-[0.32rem] w-[40%] rounded-full bg-[#c8c3d0] dark:bg-[#5b5568]" />
          <span className="size-[0.55rem] rotate-45 rounded-[0.1rem] border-r border-b border-muted-foreground/60" />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-border px-3 py-2">
          <span className="h-[0.32rem] w-[52%] rounded-full bg-[#dfdbe8] dark:bg-[#4b4658]" />
          <span className="size-[0.55rem] rounded-[0.1rem] border-r border-b border-muted-foreground/40" />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-border px-3 py-2 opacity-70">
          <span className="h-[0.32rem] w-[46%] rounded-full bg-[#e0dce5] dark:bg-[#403b4a]" />
          <span className="size-[0.55rem] rounded-[0.1rem] border-r border-b border-muted-foreground/30" />
        </div>
      </div>
    </div>
  );
}
