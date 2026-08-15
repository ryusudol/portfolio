import Image from "next/image";

import { DemoCanvas } from "@/components/playground/demo-canvas";
import profileThumbnail from "./assets/profile-thumbnail.png";

export default function TestimonialCard() {
  return (
    <DemoCanvas>
      <figure className="flex max-h-70 w-full max-w-85 flex-col gap-4 rounded-md p-6 shadow-md bg-surface">
        <figcaption className="flex items-center gap-4">
          <Image
            src={profileThumbnail}
            alt="Sarah Dole's profile thumbnail"
            width={48}
            height={48}
            className="size-12 rounded-full"
          />
          <div className="flex flex-col justify-center gap-px">
            <span className="text-lg font-semibold">Sarah Dole</span>
            <span className="text-sm text-neutral-600 dark:text-muted-foreground">
              @sarahdole
            </span>
          </div>
        </figcaption>
        <blockquote>
          <p className="line-clamp-6 text-neutral-600 dark:text-muted-foreground">
            I've been searching for high-quality abstract images for my design
            projects, and I'm thrilled to have found this platform. The variety
            and depth of creativity are astounding!
          </p>
        </blockquote>
      </figure>
    </DemoCanvas>
  );
}
