/**
 * next/image loader that resizes the PokeAPI artwork through the free
 * wsrv.nl proxy, so it does not use Vercel's image optimization quota.
 * Local files and other URLs are returned untouched.
 */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  if (!src.startsWith("https://raw.githubusercontent.com/")) return src;
  const params = new URLSearchParams({
    url: src,
    w: String(width),
    q: String(quality ?? 75),
    output: "webp",
  });
  return `https://wsrv.nl/?${params}`;
}
