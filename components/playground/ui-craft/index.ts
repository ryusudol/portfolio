import type { ComponentType } from "react";

import BlogCard from "@/components/playground/ui-craft/blog-card";
import TestimonialCard from "@/components/playground/ui-craft/testimonial-card";

const uiCraftDemos = {
  "testimonial-card": TestimonialCard,
  "blog-card": BlogCard,
} satisfies Record<string, ComponentType>;

export type UICraftDemoSlug = keyof typeof uiCraftDemos;

export function getUICraftDemo(slug: string): ComponentType | undefined {
  return uiCraftDemos[slug as UICraftDemoSlug];
}
