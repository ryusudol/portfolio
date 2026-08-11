export type UICraftEntry = {
  slug: string;
  title: string;
  description: string;
  briefRationale: string;
};

export const uiCraftEntries: readonly UICraftEntry[] = [
  {
    slug: "testimonial-card",
    title: "Testimonial Card",
    description:
      "A compact social-proof card that pairs a customer quote with clear author attribution.",
    briefRationale:
      "I use a figure with blockquote and figcaption so the quote and its source stay semantically linked for screen readers. The layout keeps the quote readable first, with name and role grouped as supporting metadata below.",
  },
  {
    slug: "blog-card",
    title: "Blog Card",
    description:
      "An image-led card that frames editorial content with a fixed media surface.",
    briefRationale:
      "I keep the media as the primary surface so the visual hierarchy is immediate. A figure wraps the image so the composition stays semantic while the canvas controls padding and stage contrast around the card.",
  },
];

export const uiCraftCategory = {
  slug: "ui",
  title: "UI Craft",
  description: "Interactive component explorations.",
  href: "/playground/ui",
} as const;

export function getUICraftEntry(slug: string) {
  return uiCraftEntries.find((entry) => entry.slug === slug);
}
