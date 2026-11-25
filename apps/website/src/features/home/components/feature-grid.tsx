import { IconBuildingSkyscraper, IconCoins, IconShieldCheck, type Icon } from "@tabler/icons-react";
import { ProductShot, type ProductShotName } from "@/components/site/product-shot";
import { Reveal } from "@/components/site/reveal";
import type { Dictionary } from "@/i18n/get-dictionary";
import { cn } from "@/lib/utils";

type Copy = Dictionary["features"];

/**
 * "What's inside": three rows, each a short text beside a real piece of the app
 * (alternating sides), then three short points. Text and image sit side by side,
 * centred, so neither stretches to the other's height.
 */
export function FeatureGrid({ copy }: { copy: Copy }) {
  return (
    <section id="features" className="border-t border-line">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
        <Reveal className="max-w-3xl">
          <span className="eyebrow text-muted-foreground">
            <span className="flip-rtl inline-block">→</span> {copy.label}
          </span>
          <h2 className="mt-4 font-display text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.05] font-semibold tracking-display text-balance [html[lang=ar]_&]:leading-[1.35]">
            {copy.title}
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-16 lg:mt-20 lg:gap-24">
          <ShotRow index="01" copy={copy.attention} shot="attention" />
          <ShotRow index="02" copy={copy.performance} shot="performance" flip />
          <ShotRow index="03" copy={copy.views} shot="views" />
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3 lg:mt-28">
          <TextTile index="04" icon={IconBuildingSkyscraper} copy={copy.projects} />
          <TextTile index="05" icon={IconCoins} copy={copy.spend} delay={80} />
          <TextTile index="06" icon={IconShieldCheck} copy={copy.team} delay={160} />
        </div>
      </div>
    </section>
  );
}

function ShotRow({
  index,
  copy,
  shot,
  flip = false,
}: {
  index: string;
  copy: { title: string; text: string; alt: string };
  shot: ProductShotName;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-x-6">
      <Reveal className={cn("lg:col-span-4", flip ? "lg:order-2 lg:col-start-9" : "lg:order-1")}>
        <span className="eyebrow text-primary">{index}</span>
        <h3 className="mt-3 font-display text-[clamp(1.6rem,2.4vw,2.1rem)] leading-tight font-semibold tracking-[-0.02em] text-balance [html[lang=ar]_&]:leading-snug [html[lang=ar]_&]:tracking-normal">
          {copy.title}
        </h3>
        <p className="mt-3 max-w-[30em] text-lg text-pretty text-muted-foreground">{copy.text}</p>
      </Reveal>
      <Reveal
        delay={100}
        className={cn(
          "rounded-2xl border border-line bg-muted/50 p-3 sm:p-5 lg:col-span-8",
          flip ? "lg:order-1 lg:col-start-1" : "lg:order-2 lg:col-start-5",
        )}
      >
        <div className="overflow-hidden rounded-xl border border-border shadow-card" dir="ltr">
          <ProductShot name={shot} alt={copy.alt} sizes="(min-width: 1024px) 60vw, 100vw" />
        </div>
      </Reveal>
    </div>
  );
}

function TextTile({
  index,
  icon: TileIcon,
  copy,
  delay = 0,
}: {
  index: string;
  icon: Icon;
  copy: { title: string; text: string };
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className="rounded-2xl border border-line bg-card p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
          <TileIcon className="size-5" />
        </span>
        <span className="eyebrow text-subtle-foreground">{index}</span>
      </div>
      <h3 className="mt-6 font-display text-xl leading-snug font-semibold">{copy.title}</h3>
      <p className="mt-2 text-pretty text-muted-foreground">{copy.text}</p>
    </Reveal>
  );
}
