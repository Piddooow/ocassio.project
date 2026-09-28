"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP } from "@/lib/gsap";
import { EASE } from "@/lib/motion";
import type { Service } from "@/lib/content/services";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface ServicesSectionProps {
  services: Service[];
}

/**
 * 05 Services, light, structured (§31.14). The editorial list echoes the
 * reference language: index numerals, hairline rules, quiet metadata.
 */
export function ServicesSection({ services }: ServicesSectionProps) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!scope.current) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const trigger = {
          trigger: scope.current,
          start: "top 80%",
          once: true,
        };
        gsap.fromTo(
          "[data-service-row]",
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.06,
            ease: EASE.out,
            scrollTrigger: trigger,
          },
        );
        gsap.fromTo(
          "[data-service-rule]",
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: 0.9,
            stagger: 0.06,
            ease: EASE.out,
            scrollTrigger: trigger,
          },
        );
      });
      return () => mm.revert();
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      data-section="services"
      className="text-primary"
    >
      <div className="container-editorial py-20 lg:py-28">
        <SectionHeader
          label="Services"
          title={
            <>
              What we <em>do</em>
            </>
          }
          action={{ label: "All services", href: "/services" }}
        />

        <ul className="mt-12">
          {services.map((service, index) => (
            <li key={service.slug} data-service-row>
              <Link
                href={`/services/${service.slug}`}
                className="group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-2 py-7 lg:grid-cols-[auto_minmax(0,0.9fr)_minmax(0,1.2fr)_auto] lg:items-center lg:gap-x-10 lg:py-8"
              >
                <span className="text-label tabular-nums text-muted">
                  ({String(index + 1).padStart(2, "0")})
                </span>
                <span className="font-display text-display-md transition-transform duration-500 ease-out group-hover:translate-x-1">
                  {service.name}
                </span>
                <span className="col-span-2 text-body-sm text-secondary lg:col-span-1">
                  {service.shortDescription}
                </span>
                {service.startingPrice ? (
                  <span className="col-span-2 text-caption tabular-nums text-muted lg:col-span-1 lg:text-right">
                    {service.startingPrice}
                  </span>
                ) : null}
              </Link>
              <span
                data-service-rule
                aria-hidden
                className="block h-px origin-left bg-line"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
