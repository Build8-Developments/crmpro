"use client";

/** Parse hex/rgb stage color and return badge surface styles. */
export function getStageColorStyles(color: string | null | undefined): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  if (!color) {
    return {
      backgroundColor: "var(--muted)",
      color: "var(--muted-foreground)",
      borderColor: "var(--border)",
    };
  }

  const rgb = parseCssColor(color);
  if (!rgb) {
    return {
      backgroundColor: "var(--muted)",
      color: "var(--muted-foreground)",
      borderColor: "var(--border)",
    };
  }

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  const text = luminance > 0.62 ? "#1a1a1a" : "#ffffff";

  return {
    backgroundColor: color,
    color: text,
    borderColor: `color-mix(in srgb, ${color} 75%, #000000)`,
  };
}

function parseCssColor(
  input: string,
): { r: number; g: number; b: number } | null {
  const value = input.trim();

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  const rgbMatch = value.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i,
  );
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }

  return null;
}

export function StageColorDot({
  color,
  className,
}: {
  color: string | null | undefined;
  className?: string;
}) {
  const styles = getStageColorStyles(color);
  return (
    <span
      className={className}
      style={{
        backgroundColor: styles.backgroundColor,
        border: `1px solid ${styles.borderColor}`,
      }}
    />
  );
}
