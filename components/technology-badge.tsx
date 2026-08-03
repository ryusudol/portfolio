import { TechnologyIcon } from "@/components/technology-icon";
import { Badge } from "@/components/ui/badge";

export function TechnologyBadge({ name }: { name: string }) {
  return (
    <Badge
      variant="outline"
      className="h-auto cursor-default gap-[0.34rem] rounded-[0.55rem] border-border bg-[color-mix(in_srgb,var(--color-surface)_72%,transparent)] px-2 py-[0.27rem] text-[0.7rem] font-normal text-muted-foreground select-none"
    >
      <TechnologyIcon name={name} className="size-[0.9rem] shrink-0" />
      <span>{name}</span>
    </Badge>
  );
}
