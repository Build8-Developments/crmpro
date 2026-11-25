import Image from "next/image";
import { IconArrowRight } from "@tabler/icons-react";
import { ScrollProgress } from "@/components/site/scroll-progress";
import { ButtonLink } from "@/components/ui/button-link";
import residentialTowers from "@/assets/hero/residential-towers.jpg";
import type { Dictionary } from "@/i18n/get-dictionary";
import { HeroRibbon } from "./hero-ribbon";
import { ProductTour } from "./product-tour";

/**
 * Cinematic hero (references: Mercury's full-screen photograph, Attio's calm
 * centred layout and product below, Stripe's flowing ribbon).
 *
 * The photograph fills the first screen behind the floating header: modern
 * residential towers seen from below, rising on the left into a soft sky
 * (mirrored). A frosted-glass ribbon in the brand colours sweeps in from the top
 * right, balancing them. A small, quiet message sits in the open sky between.
 *
 * Scrolling is one continuous, cinematic move (driven by `--p` from ScrollProgress):
 * the photo dollies in and dusk falls over it, the ribbon twists away, the message
 * blurs out upward; the coded dashboard, already in view under the buttons, pins
 * below the header, tilts from 3D to flat as it grows, and assembles piece by piece.
 *
 * Photo: Zoshua Colah, Unsplash License (unsplash.com/photos/F-sU9hFWBV8). Kept at 4800px so
 * Retina screens get a sharp image; next/image serves each screen an AVIF or WebP at its size.
 */
export function Hero({
  copy,
  demoHref,
  signInHref,
}: {
  copy: Dictionary["hero"];
  demoHref: string;
  /** Empty: no "Sign in" button. */
  signInHref: string;
}) {
  const [firstLine, lastLine] = copy.title;
  const at = lastLine.lastIndexOf(copy.accent);

  return (
    <>
      {/* Pulled up under the floating header (h-14/h-15 + 12px) so the photo starts at the top edge. */}
      <ScrollProgress
        as="section"
        mode="pass"
        reduced={0}
        className="relative -mt-[4.25rem] h-[100svh] min-h-[620px] overflow-hidden bg-[#2f3340] sm:-mt-[4.5rem]"
      >
        <div className="absolute inset-0 will-change-transform [transform:translate3d(0,calc(var(--p)*14%),0)_scale(calc(1+var(--p)*0.2))]">
          <div className="hero-photo-in absolute inset-0">
          {/* The photo looks up at the towers, so vertical lines converge toward a vanishing point
              (about 19% across the screen once cropped and mirrored, where the main tower's tan face
              is already upright). Tilting the photo back toward the viewer, anchored there, straightens
              everything else, like a shift lens. Anchored anywhere else it over-corrects the towers
              into falling outward. The perspective follows the photo's displayed size (width-bound
              above a 3:2 screen, height-bound below it; the hero is at least 620px tall), so the
              correction holds at every window size. Phones see a different tower: a stronger tilt
              anchored at the left edge, nearest their vanishing point, which also leaves no gaps. */}
          <div className="absolute inset-0 origin-[19%_100%] [transform:perspective(max(66vw,99svh,614px))_rotateX(-7deg)] max-sm:origin-bottom-left max-sm:[transform:perspective(110svh)_rotateX(-22deg)]">
          {/* Mirrored, so the towers stand on the left and balance the ribbon on the right. */}
          <div className="absolute inset-0 -scale-x-100">
          <Image
            src={residentialTowers}
            alt=""
            priority
            placeholder="blur"
            quality={70}
            sizes="(max-width: 639px) 100vw, 140vw"
            // Scaled up from the top-left corner, which pushes the towers (in the middle of the
            // photo) out to one side (the left, once mirrored), leaving open sky behind the message.
            // Phones show the photo unscaled and cropped to one side: sky behind the text, a tower
            // rising on the left. `sizes` follows the 1.4× scale on larger screens.
            className="absolute inset-0 size-full origin-top-left scale-[1.4] object-cover object-[50%_0%] max-sm:origin-top max-sm:scale-100 max-sm:object-[20%_0%]"
          />
          </div>
          </div>
          </div>
        </div>
        {/* Shade the sky behind the text only; the horizon keeps its light. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-b from-[#0b0d14]/70 via-[#0b0d14]/25 via-45% to-[#0b0d14]/10"
        />
        {/* Dusk falls as you scroll: the photo darkens behind the rising product. */}
        <div aria-hidden="true" className="absolute inset-0 bg-[#070a12] [opacity:calc(var(--p)*0.7)]" />
        {/* The photo's lower edge fades into the page. Layered after the dusk, so the blend always
            ends in the page's own colour (no grey band behind the pinned product). */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[30%] bg-linear-to-t from-background to-transparent" />

        <HeroRibbon />

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pt-[calc(4.5rem+5svh)] text-center text-white [filter:blur(calc(var(--p)*10px))] [opacity:calc(1-var(--p)*2.2)] [transform:translate3d(0,calc(var(--p)*-90px),0)_scale(calc(1-var(--p)*0.06))] sm:pt-[calc(4.5rem+6svh)]">
          <span className="eyebrow hero-in inline-flex items-center gap-2 text-white/85 [--in:500ms]">
            <span className="relative size-1.5 rounded-full bg-[#6de6b2]">
              <span className="pulse-ring absolute -inset-1 rounded-full border border-[#6de6b2]" />
            </span>
            {copy.eyebrow}
            <span className="hidden font-normal text-white/60 sm:inline">· {copy.meta}</span>
          </span>

          <h1 className="mt-5 font-display text-[clamp(2.2rem,min(4.2vw,6.8svh),4.25rem)] leading-[1.04] font-semibold tracking-[-0.03em] [text-shadow:0_2px_30px_rgb(0_0_0/0.3)] [html[lang=ar]_&]:text-[clamp(2rem,min(3.6vw,6svh),3.6rem)] [html[lang=ar]_&]:leading-[1.35] [html[lang=ar]_&]:tracking-normal">
            <span className="hero-in block [--in:700ms] sm:whitespace-nowrap">{firstLine}</span>
            <span className="hero-in block [--in:860ms] sm:whitespace-nowrap">
              {at >= 0 ? lastLine.slice(0, at) : lastLine}
              <span className="text-[#8ff0c4]">{at >= 0 ? copy.accent : ""}</span>
            </span>
          </h1>

          <p className="hero-in mt-4 max-w-[36em] text-[16px] text-pretty text-white/85 [--in:1050ms] [text-shadow:0_1px_12px_rgb(0_0_0/0.35)] sm:text-[17px]">
            {copy.lede}
          </p>

          <div className="hero-in mt-7 flex flex-wrap items-center justify-center gap-3 [--in:1200ms]">
            <ButtonLink href={demoHref} variant="inverse" size="md" className="rounded-full px-6">
              {copy.primary}
              <IconArrowRight className="flip-rtl" />
            </ButtonLink>
            {signInHref && (
              <a
                href={signInHref}
                className="inline-flex h-11 items-center rounded-full border border-white/35 bg-white/10 px-6 font-display text-[15px] font-semibold text-white transition-colors hover:bg-white/15"
              >
                {copy.signIn}
              </a>
            )}
          </div>
        </div>
      </ScrollProgress>

      {/*
        The product scene. It starts just under the buttons (overlapping the photo's lower 40%),
        then pins below the header while scrolling continues: the dashboard tilts from 30° to flat,
        grows and assembles, then a scroll-driven tour brings four parts into focus, one by one,
        each with a caption (ProductTour). The scene's height is the length of that sequence.
      */}
      <ScrollProgress
        mode="track"
        scene
        start={0.6}
        hold={0.4}
        reduced={1}
        className="relative z-10 -mt-[40svh] h-[260svh] px-4 max-sm:h-[200svh] sm:px-8 lg:px-12"
        style={
          {
            // The dashboard's width and height (1260×760 layout plus the 36px browser bar), so the
            // pinned position can centre it in the space below the header.
            "--dw": "min(1480px, calc((100svh - 7.5rem) * 1.6), calc(100vw - 2rem))",
            "--dh": "calc(var(--dw) * 0.6032 + 36px)",
            // On phones the caption card sits under the dashboard: centre the pair.
            "--caption": "0px",
          } as React.CSSProperties
        }
      >
        <SceneBackground />
        <div className="sticky top-[calc(4.5rem+max(0.75rem,(100svh-4.5rem-var(--dh)-var(--caption))/2))] max-sm:[--caption:13rem] mx-auto w-full max-w-(--dw) [perspective:2200px]">
          <ProductTour copy={copy.tour} label={copy.dashboardAlt} />
        </div>
      </ScrollProgress>
    </>
  );
}

/**
 * Behind the pinned dashboard: the brand's 12-column grid, faint, and two soft glows
 * (emerald and the photo's gold). The emerald glow follows the tour's zoom point
 * (--zx/--zy from ProductTour). Fades in only once the scene is under way, so it never
 * covers the hero photo.
 */
function SceneBackground() {
  return (
    // An absolute layer spanning exactly the scene, with a sticky screen-sized child: the
    // background can never reach past the scene into the next section.
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
      <div className="absolute inset-0 [opacity:clamp(0,calc((var(--p,0)-0.12)*5),1)]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,var(--line)_0_1px,transparent_1px_calc(100%/12))] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,var(--border)_1px,transparent_1.5px)] bg-[length:28px_28px] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]" />
        {/* Performance: soft glows are radial gradients (no blur filter), moved with transform, so
            following the zoom point never re-renders a blur. */}
        <div className="absolute top-0 left-0 size-[60vmax] rounded-full bg-[radial-gradient(closest-side,rgb(0_132_91/0.2),transparent)] will-change-transform [transform:translate3d(calc((var(--zx,50)*0.6+20)*1vw-50%),calc((var(--zy,50)*0.5+25)*1vh-50%),0)] dark:bg-[radial-gradient(closest-side,rgb(54_185_135/0.2),transparent)]" />
        <div className="ribbon-glow absolute right-[-18vmax] bottom-[-20vmax] size-[52vmax] rounded-full bg-[radial-gradient(closest-side,rgb(232_168_90/0.18),transparent)] will-change-transform" />
      </div>
      </div>
    </div>
  );
}
