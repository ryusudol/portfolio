import { ProfileMenu } from "@/components/profile-menu";
import { SkipToContent } from "@/components/skip-to-content";

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        className="mx-auto flex w-full max-w-[90rem] flex-col gap-10 max-sm:gap-8 px-4 sm:px-6 lg:px-10 pt-44 max-sm:pt-[8.75rem] pb-20 animate-content-enter motion-reduce:animate-none"
      >
        {children}
      </main>
    </>
  );
}
