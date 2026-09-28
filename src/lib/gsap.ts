"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single client-side GSAP entry point.
 * Plugins are registered once; all GSAP usage must go through client
 * components so nothing runs during SSR.
 */
gsap.registerPlugin(useGSAP, ScrollTrigger, Flip);

export { gsap, ScrollTrigger, Flip, useGSAP };
