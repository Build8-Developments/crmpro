import { ImageResponse } from "next/og";
import { BRAND_COLORS, BRAND_NAME, LOGO_SYMBOL, LOGO_WORDMARK } from "@crmpro/shared/brand";
import { LOCALES } from "@/i18n/config";

/** Share image: the white lockup on emerald with the navy bar, as in the brand kit. No text fonts needed. */
export const alt = BRAND_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_COLORS.emerald,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 64 }}>
          <svg viewBox={LOGO_SYMBOL.viewBox} width={150} height={136} fill="#ffffff">
            <path d={LOGO_SYMBOL.path} />
          </svg>
          <svg viewBox={LOGO_WORDMARK.viewBox} width={724} height={106} fill="#ffffff">
            <path d={LOGO_WORDMARK.lettersPath} />
            <path d={LOGO_WORDMARK.dotPath} />
          </svg>
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: 456,
            height: 28,
            background: BRAND_COLORS.navy,
          }}
        />
      </div>
    ),
    size,
  );
}
