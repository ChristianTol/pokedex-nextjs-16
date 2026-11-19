"use client";

import Image from "next/image";
import { useState } from "react";
import { itemSpriteUrl } from "@/lib/pokedex/evolution";

/** Decorative: the item's name is always given in text next to it. */
export function ItemSprite({
  item,
  size = 32,
  className = "",
}: {
  item: string;
  size?: number;
  className?: string;
}) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <Image
      src={itemSpriteUrl(item)}
      alt=""
      width={size}
      height={size}
      unoptimized
      className={`shrink-0 object-contain [image-rendering:pixelated] ${className}`}
      style={{ width: size, height: size }}
      onError={() => setMissing(true)}
    />
  );
}
