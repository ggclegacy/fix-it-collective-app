import Image from "next/image";
import { brands, type BrandId } from "@/lib/brands";
export function BrandEmblem({
  brand = "collective",
  size = 96,
  decorative = false,
  eager = false,
}: {
  brand?: BrandId;
  size?: number;
  decorative?: boolean;
  eager?: boolean;
}) {
  const identity = brands[brand];
  const assetSize =
    size <= 48 ? 96 : size <= 96 ? 192 : size <= 256 ? 512 : 768;
  return (
    <Image
      className="brand-emblem"
      src={`/brand/${identity.asset}-${assetSize}.webp`}
      alt={decorative ? "" : `${identity.name} — official emblem`}
      width={size}
      height={size}
      unoptimized
      loading={eager ? "eager" : "lazy"}
    />
  );
}
