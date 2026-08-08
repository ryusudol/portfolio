import { CopyEmailButton } from "@/components/copy-email-button";
import { SocialLinks } from "@/components/social-links";
import type { Contributions } from "@/lib/github-contributions";
import { contact } from "@/lib/portfolio";

type HomeSectionProps = {
  contributions: Contributions;
};

export function HomeSection({ contributions }: HomeSectionProps) {
  return (
    <section
      id="home"
      className="flex scroll-mt-36 flex-col gap-[2.8rem] max-sm:gap-[2.25rem]"
    >
      <h1 className="mt-4 mb-0 font-display text-[clamp(2rem,5vw,2.45rem)] font-[520] italic leading-none tracking-[-0.035em]">
        Suhyeon Yu
      </h1>

      <div
        data-testid="hero-copy"
        className="grid gap-4 text-base leading-[1.68] text-pretty text-subtle max-[420px]:text-[0.94rem] [&_p]:m-0"
      >
        <p>
          👋 Hey! I&apos;m a{" "}
          <span className="text-black dark:text-white">frontend-focused software engineer</span>{" "}
          crafting web experiences for both humans and agents.
        </p>
        <p>
          I care about the details that make interactions engaging and polished.
          I&apos;ve built production product surfaces, optimized complex
          interactive visualizations, and shipped open-source ML tooling.
        </p>
        <p>
          I&apos;m currently pursuing my Master&apos;s in Computer Science at{" "}
          <span className="text-black dark:text-white">Rice University</span>,
          and I&apos;m looking to join an amazing team as a new-grad SWE.
        </p>
      </div>

      <div className="flex items-center gap-[0.55rem] max-[420px]:flex-col max-[420px]:items-start">
        <CopyEmailButton email={contact.email} />
        <SocialLinks contributions={contributions} />
      </div>
    </section>
  );
}
