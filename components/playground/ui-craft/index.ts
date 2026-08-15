import type { ComponentType } from "react";

import BlogCard from "@/components/playground/ui-craft/blog-card";
import ProfileCard from "@/components/playground/ui-craft/profile-card";
import TestimonialCard from "@/components/playground/ui-craft/testimonial-card";

const uiCraftDemos = {
  "blog-card": BlogCard,
  "profile-card": ProfileCard,
  "testimonial-card": TestimonialCard,
} satisfies Record<string, ComponentType>;

export type UICraftDemoSlug = keyof typeof uiCraftDemos;

export function getUICraftDemo(slug: string): ComponentType | undefined {
  return uiCraftDemos[slug as UICraftDemoSlug];
}
