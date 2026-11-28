import Image from "next/image";
import { typeIconUrl } from "@/lib/pokedex/types";

/** The round PokéAPI symbol of a type; decorative, the name is shown next to it. */
export function TypeIcon({
  type,
  size = 16,
  className = "",
  bare = false,
}: {
  type: string;
  size?: number;
  className?: string;
  /** Only the white glyph, without the coloured circle behind it. */
  bare?: boolean;
}) {
  const src = bare ? `/type-icons/glyph/${type}.svg` : typeIconUrl(type);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized={bare}
      className={`shrink-0 ${bare ? "" : "rounded-full"} ${className}`}
    />
  );
}
