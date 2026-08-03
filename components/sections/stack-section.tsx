import { Code } from "reicon-react";

import { TechnologyIcon } from "@/components/technology-icon";
import { technologies } from "@/lib/portfolio";

export function StackSection() {
  return (
    <section
      id="stack"
      className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
    >
      <div className="flex items-center gap-[0.65rem] [&>svg]:size-[1.15rem] [&>svg]:text-muted-foreground">
        <Code aria-hidden="true" />
        <h2 className="m-0 text-base font-[570] tracking-[-0.01em]">
          Tech Stack
        </h2>
      </div>
      <ul
        data-testid="technology-grid"
        className="group/tech m-0 grid list-none grid-cols-6 gap-0 p-0 max-sm:grid-cols-3"
      >
        {technologies.map((technology) => (
          <li
            key={technology.name}
            className="flex aspect-square min-w-0 flex-col items-center justify-center gap-[0.65rem] rounded-portfolio text-center text-[0.68rem] text-muted-foreground transition-[background-color,color,opacity,filter] duration-motion ease-in-out hover:text-foreground motion-reduce:transition-none [@media(hover:hover)]:group-has-[:hover]/tech:not-hover:opacity-[0.52] [@media(hover:hover)]:group-has-[:hover]/tech:not-hover:saturate-[0.45] hover:[&_[data-testid=technology-icon]]:scale-[1.08] hover:[&_[data-testid=technology-icon]]:-rotate-2 hover:[&_[data-testid=technology-icon]]:drop-shadow-[0_10px_16px_rgb(62_54_47/16%)] [@media(hover:hover)]:group-has-[:hover]/tech:not-hover:[&_[data-testid=technology-icon]]:scale-[0.94] [@media(hover:hover)]:group-has-[:hover]/tech:not-hover:[&_[data-testid=technology-icon]]:grayscale-[0.55]"
          >
            <TechnologyIcon
              name={technology.name}
              className="size-10 drop-shadow-[0_7px_12px_rgb(62_54_47/10%)] transition-[transform,filter] duration-motion ease-in-out motion-reduce:transition-none"
            />
            <span>{technology.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
