import type { ComponentType } from "react";

import { Accordion } from "@/components/playground/ui-craft/accordion";
import { TestimonialCard } from "@/components/playground/ui-craft/testimonial-card";

const uiCraftDemos = {
  accordion: Accordion,
  "testimonial-card": TestimonialCard,
} satisfies Record<string, ComponentType>;

export type UICraftDemoSlug = keyof typeof uiCraftDemos;

export function getUICraftDemo(slug: string): ComponentType | undefined {
  return uiCraftDemos[slug as UICraftDemoSlug];
}
