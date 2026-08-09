import Image from "next/image";

import profileThumbnail from "./assets/profile-thumbnail.png";

export function TestimonialCard() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-[#F9FAFB] to-[#D2D6DB] p-6">
      <figure className="flex max-h-70 w-85 flex-col gap-4 overflow-hidden rounded-md bg-white p-6 text-ellipsis shadow-md">
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
            <span className="text-sm text-neutral-600">@sarahdole</span>
          </div>
        </figcaption>
        <blockquote>
          <p className="text-neutral-600">
            I've been searching for high-quality abstract images for my design
            projects, and I'm thrilled to have found this platform. The variety
            and depth of creativity are astounding!
          </p>
        </blockquote>
      </figure>
    </div>
  );
}
