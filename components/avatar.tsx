import { avatarColor, initials } from "@/lib/utils";

export function Avatar({
  name,
  seed,
  size = 36,
  className = "",
}: {
  name: string;
  seed: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: avatarColor(seed || name),
      }}
    >
      {initials(name)}
    </span>
  );
}
