import { Temporal } from "temporal-polyfill";

import { ProfileMenu } from "@/components/profile-menu";
import { CredentialsSection } from "@/components/sections/credentials-section";
import { ExperienceSection } from "@/components/sections/experience-section";
import { HomeSection } from "@/components/sections/home-section";
import { StackSection } from "@/components/sections/stack-section";
import { WorkSection } from "@/components/sections/work-section";
import { SkipToContent } from "@/components/skip-to-content";
import { WaveSeparator } from "@/components/wave-separator";
import { getGithubContributions } from "@/lib/github-contributions";

export default async function HomePage() {
  const githubContributions = await getGithubContributions("ryusudol");

  return (
    <>
      <SkipToContent />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[8.5rem] max-sm:h-28 backdrop-blur-[1px] [background:linear-gradient(to_bottom,var(--color-background)_0%,color-mix(in_srgb,var(--color-background)_88%,transparent)_44%,transparent_100%)] [mask-image:linear-gradient(to_bottom,#000_0_72%,transparent_100%)]"
        aria-hidden="true"
      />
      <ProfileMenu />

      <main
        id="content"
        data-testid="site-shell"
        className="mx-auto flex w-[min(40rem,calc(100vw-2.5rem))] max-[420px]:w-[min(calc(100%-2rem),40rem)] flex-col gap-20 max-sm:gap-[4.25rem] pt-44 max-sm:pt-[8.75rem] animate-content-enter motion-reduce:animate-none"
      >
        <HomeSection contributions={githubContributions} />
        <WaveSeparator />
        <ExperienceSection />
        <WaveSeparator />
        <WorkSection />
        <WaveSeparator />
        <CredentialsSection />
        <WaveSeparator />
        <StackSection />
        <WaveSeparator />
      </main>

      <footer className="mx-auto flex w-[min(40rem,calc(100vw-2.5rem))] max-[420px]:w-[min(calc(100%-2rem),40rem)] items-center justify-between gap-4 px-0 pt-20 pb-9 text-[0.72rem] text-muted-foreground max-sm:flex-col max-sm:items-start [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[0.4rem] [&_a]:underline [&_a]:decoration-border-strong [&_a]:underline-offset-[0.23rem] [&_a]:transition-colors [&_a]:duration-instant [&_a]:ease-in-out [&_a]:hover:text-foreground [&_a]:motion-reduce:transition-none [&_p]:m-0 [&_p]:text-right [&_p]:max-sm:text-left [&_svg]:size-4">
        <p>
          © {Temporal.Now.plainDateISO().year} Suhyeon Yu. All rights reserved.
        </p>
      </footer>
    </>
  );
}
