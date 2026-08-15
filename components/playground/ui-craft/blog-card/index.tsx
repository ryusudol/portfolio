import Image from "next/image";

import { DemoCanvas } from "../../demo-canvas";
import blogImage from "./assets/spacejoy.jpg";

export default function BlogCard() {
  return (
    <DemoCanvas>
      <figure className="w-85 rounded-lg bg-surface overflow-hidden">
        <Image
          src={blogImage}
          alt="Blog Image"
          width={340}
          height={288}
          className="w-full h-72"
        />
        <figcaption className="py-6 px-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <div className="w-fit px-2 py-0.5 bg-green-50 dark:bg-green-950 rounded-full ring-1 ring-inset ring-green-200 dark:ring-green-800">
              <span className="text-sm text-green-700 dark:text-green-300">
                Interior
              </span>
            </div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-foreground">
              Top 5 Living Room Inspirations
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <p className="text-neutral-600 dark:text-muted-foreground font-medium">
              Curated vibrant colors for your living, make it pop & calm in the
              same time.
            </p>
            <button
              type="button"
              className="w-fit flex items-center gap-1.5 rounded-sm font-medium text-indigo-700 hover:text-[#3730A3] dark:text-indigo-300 dark:hover:text-indigo-200 disabled:text-[#A3A3A3] dark:disabled:text-[#5C5C5C] outline-none focus:ring-4 focus:ring-[#E9EAFC] dark:focus:ring-[#656565]"
            >
              Read More
              <RightArrow />
            </button>
          </div>
        </figcaption>
      </figure>
    </DemoCanvas>
  );
}

const RightArrow = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M13.4763 9.16658L9.00633 4.69657L10.1848 3.51807L16.6667 9.99992L10.1848 16.4817L9.00633 15.3032L13.4763 10.8332H3.33333V9.16658H13.4763Z"
      fill="currentColor"
    />
  </svg>
);
