import Image from "next/image";

export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const iconSize = size === "lg" ? 44 : size === "sm" ? 28 : 34;
  const textSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl";

  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="relative shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        style={{ width: iconSize, height: iconSize }}
      >
        <Image
          src="/co-suite-logo.png"
          alt="co-Suite logo"
          fill
          sizes={`${iconSize}px`}
          className="object-cover"
          priority={size === "lg"}
        />
      </span>
      <span className={`${textSize} font-bold tracking-tight text-foreground`}>co-Suite</span>
    </span>
  );
}
