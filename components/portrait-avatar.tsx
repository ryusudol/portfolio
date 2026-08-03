import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const PORTRAIT_SRC = "/images/portrait/suhyeon-mountain-profile.png";

type PortraitAvatarProps = {
  className?: string;
  imageClassName?: string;
  size?: ComponentProps<typeof Avatar>["size"];
  imageSize: number;
  alt?: string;
  priority?: boolean;
  children?: ReactNode;
};

export function PortraitAvatar({
  className,
  imageClassName,
  size,
  imageSize,
  alt = "Suhyeon Yu's profile image",
  priority,
  children,
}: PortraitAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      <AvatarImage asChild src={PORTRAIT_SRC}>
        <Image
          src={PORTRAIT_SRC}
          alt={alt}
          width={imageSize}
          height={imageSize}
          className={cn("size-full object-cover", imageClassName)}
          priority={priority}
        />
      </AvatarImage>
      <AvatarFallback>SY</AvatarFallback>
      {children}
    </Avatar>
  );
}
