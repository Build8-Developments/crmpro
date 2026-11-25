import {
  IconArrowRight,
  IconFileSpreadsheet,
  IconMessages,
  IconNotebook,
  IconPhoneOff,
} from "@tabler/icons-react";
import { ProductShot } from "@/components/site/product-shot";
import { Reveal } from "@/components/site/reveal";
import type { Dictionary } from "@/i18n/get-dictionary";

const SCATTERED_ICONS = [IconFileSpreadsheet, IconMessages, IconNotebook, IconPhoneOff];
/** Loose, hand-placed positions for the "before" notes (start offset %, top %, tilt). */
const SCATTERED_LAYOUT = [
  { start: "4%", top: "8%", r: "-4deg", d: "0s" },
  { start: "30%", top: "32%", r: "3deg", d: "1.2s" },
  { start: "8%", top: "56%", r: "2deg", d: "0.6s" },
  { start: "26%", top: "78%", r: "-3deg", d: "1.8s" },
];

/** "Why Nomow": scattered follow-ups on one side, the real "Up next" card on the other. */
export function ProblemSection({ copy }: { copy: Dictionary["problem"] }) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-4 py-20 sm:px-8 lg:grid-cols-12 lg:gap-x-6 lg:px-12 lg:py-28">
        <Reveal className="lg:col-span-4">
          <span className="eyebrow text-muted-foreground">
            <span className="flip-rtl inline-block">→</span> {copy.label}
          </span>
          <h2 className="mt-4 font-display text-[clamp(2rem,3.4vw,3.1rem)] leading-[1.05] font-semibold tracking-display text-balance [html[lang=ar]_&]:leading-[1.35]">
            {copy.title}
          </h2>
          <p className="mt-6 max-w-[30em] text-pretty text-muted-foreground">{copy.text}</p>
        </Reveal>

        <Reveal delay={120} className="grid gap-4 sm:grid-cols-2 lg:col-span-8 lg:col-start-5">
          {/* Before */}
          <div className="relative min-h-[340px] overflow-hidden rounded-2xl border border-dashed border-border bg-muted/40">
            <span className="eyebrow absolute start-5 top-5 text-subtle-foreground">{copy.before}</span>
            <ul aria-label={copy.before}>
              {copy.scattered.map((note, index) => {
                const Icon = SCATTERED_ICONS[index % SCATTERED_ICONS.length];
                const place = SCATTERED_LAYOUT[index % SCATTERED_LAYOUT.length];
                return (
                  <li
                    key={note}
                    className="drift absolute flex max-w-[78%] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground shadow-sm"
                    style={
                      {
                        insetInlineStart: place.start,
                        top: `calc(${place.top} + 1.5rem)`,
                        "--r": place.r,
                        "--d": place.d,
                      } as React.CSSProperties
                    }
                  >
                    <Icon className="size-4 shrink-0 text-subtle-foreground" />
                    <span className="truncate">{note}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* After: the real "Up next" card from an agent's Today page */}
          <div className="relative flex min-h-[340px] flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-navy p-5 text-navy-foreground">
            <div className="flex items-center justify-between">
              <span className="eyebrow text-[#4ecc98]">{copy.after}</span>
              <IconArrowRight className="flip-rtl size-4 text-navy-muted" />
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 shadow-card">
              <ProductShot name="next" alt={copy.afterAlt} sizes="(min-width: 1024px) 420px, 90vw" />
            </div>
            <p className="text-[15px] leading-relaxed text-navy-muted">{copy.afterText}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
