"use client";

import { useEffect } from "react";
import { CTA } from "./CTA";
import { Features } from "./Features";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { Marquee } from "./Marquee";
import { Nav } from "./Nav";
import { Roles } from "./Roles";

const WHATSAPP_DEMO_HREF =
  "https://wa.me/573166229191?text=Hola%2C%20quiero%20solicitar%20una%20demo%20de%20CanchaLista.";

export function Landing() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const els = document.querySelectorAll<HTMLElement>(".cl-landing .reveal");
    if (reduceMotion) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="cl-landing">
      <Nav ctaHref={WHATSAPP_DEMO_HREF} />
      <Hero ctaHref={WHATSAPP_DEMO_HREF} />
      <Marquee />
      <Features />
      <HowItWorks />
      <Roles />
      <CTA ctaHref={WHATSAPP_DEMO_HREF} />
      <Footer />
    </div>
  );
}
