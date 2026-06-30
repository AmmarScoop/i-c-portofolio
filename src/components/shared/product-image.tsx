import { OUTPUT_TYPE_LABELS } from "@/lib/utils";

const GRADIENTS = ["kid-gradient-1", "kid-gradient-2", "kid-gradient-3", "kid-gradient-4"];

/**
 * Shows a session/portfolio-item's real product photo when one exists.
 * Falls back to a friendly colorful gradient + emoji (based on output type)
 * when no photo was uploaded, so the child UI never shows a broken image or
 * an empty box. Used on /child/dashboard, /child/progress, /child/portfolio.
 */
export function ProductImage({
  src,
  alt,
  outputType,
  className = "h-full w-full",
  gradientIndex = 0,
}: {
  src?: string | null;
  alt?: string | null;
  outputType: string;
  className?: string;
  gradientIndex?: number;
}) {
  const meta = OUTPUT_TYPE_LABELS[outputType] ?? OUTPUT_TYPE_LABELS.OTHER;

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- local/Supabase URLs, no next/image domain config needed
    return <img src={src} alt={alt || meta.en} className={`${className} object-cover`} />;
  }

  return (
    <div
      className={`${className} ${GRADIENTS[gradientIndex % GRADIENTS.length]} flex flex-col items-center justify-center text-white gap-1`}
      role="img"
      aria-label={alt || `${meta.en} / ${meta.ar} — no photo yet`}
    >
      <span className="text-4xl leading-none">{meta.emoji}</span>
    </div>
  );
}
