import { ProfileMenu } from "@/components/profile-menu";
import { SkipToContent } from "@/components/skip-to-content";

export function PlaygroundShell({ children }: { children: React.ReactNode }) {
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
        className="relative w-full animate-content-enter motion-reduce:animate-none"
      >
        {children}
      </main>
    </>
  );
}
