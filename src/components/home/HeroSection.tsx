"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { DURATION, EASE } from "@/lib/motion";
import type { PhotoAsset } from "@/lib/content/media";
import { HOME_HERO } from "@/lib/content/home";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { RealImage, FadeImg } from "@/components/media/RealImage";

interface HeroSectionProps {
  photo: PhotoAsset | null;
  poster: string | null;
  alt: string;
}

/**
 * 01 Hero, dark, cinematic, media-first (§31.14).
 * Lines rise from a mask; copy fades in; the media drifts with scroll.
 */
export function HeroSection({ photo, poster, alt }: HeroSectionProps) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({
          defaults: { ease: EASE.out },
          delay: 0.1,
        });

        timeline
          .fromTo(
            "[data-hero-line]",
            { yPercent: 105 },
            { yPercent: 0, duration: 0.9, stagger: 0.09 },
          )
          .fromTo(
            "[data-hero-fade]",
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: DURATION.base, stagger: 0.08 },
            "-=0.55",
          );

        gsap.fromTo(
          "[data-hero-media]",
          { autoAlpha: 0, scale: 1.04 },
          { autoAlpha: 1, scale: 1, duration: 1.1, ease: EASE.out },
        );

        gsap.to("[data-hero-media]", {
          yPercent: 5,
          ease: "none",
          scrollTrigger: {
            trigger: scope.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      data-section="hero"
      className="text-primary"
    >
      <div className="container-editorial grid items-center gap-14 pb-20 pt-16 lg:grid-cols-12 lg:gap-10 lg:pb-28 lg:pt-24">
        <div className="lg:col-span-7">
          <p
            data-hero-fade
            className="text-label uppercase tracking-label-wide text-muted"
          >
            {HOME_HERO.eyebrow}
          </p>
          <h1 className="mt-8 font-display text-display-mega">
            {HOME_HERO.headlineLines.map((line) => (
              <span key={line.text} className="block overflow-hidden pb-1">
                <span data-hero-line className="block">
                  {line.italic ? <em>{line.text}</em> : line.text}
                </span>
              </span>
            ))}
          </h1>
          <p data-hero-fade className="mt-8 max-w-md text-body text-secondary">
            {HOME_HERO.statement}
          </p>
          <div data-hero-fade className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink href="/work" variant="primary">
              View Work
            </ButtonLink>
            <ButtonLink href="/start-project" variant="secondary">
              Start a Project
            </ButtonLink>
          </div>
        </div>
        <div className="lg:col-span-5">
          <div data-hero-media>
            {photo ? (
              <RealImage
                photo={photo}
                sizes="(max-width: 1024px) 100vw, 480px"
                priority
                alt={alt}
                imgClassName="media-color-reveal"
              />
            ) : (
              <FadeImg
                src={poster}
                loading="eager"
                imgClassName="media-color-reveal"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
