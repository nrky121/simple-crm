import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  className?: string;
}

/**
 * Converts a hex color to an RGB tuple.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const sanitized = hex.replace("#", "");
  const full =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((c) => c + c)
          .join("")
      : sanitized;
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(full);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Returns "dark" or "light" depending on the perceived luminance of the color,
 * so we can pick a readable text color.
 */
function getContrastShade(hex: string): "dark" | "light" {
  const rgb = hexToRgb(hex);
  if (!rgb) return "dark";
  // Perceived luminance formula (WCAG)
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "dark" : "light";
}

export function TagBadge({ name, color, onRemove, className }: TagBadgeProps) {
  const rgb = hexToRgb(color);
  const bgColor = rgb
    ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`
    : "rgba(0,0,0,0.08)";
  const textColor = getContrastShade(color) === "dark" ? color : color;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : "transparent"}`,
      }}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current"
          aria-label={`Remove tag ${name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
