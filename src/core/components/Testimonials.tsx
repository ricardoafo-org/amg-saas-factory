'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { MOTION } from '@/lib/motion';

const TESTIMONIALS = [
  {
    name: 'Carlos M.',
    text: 'Rapidísimos y honestos con el presupuesto. No te cobran nada que no necesites.',
    rating: 5,
    service: 'Cambio de aceite',
  },
  {
    name: 'Ana L.',
    text: 'Pasé la ITV a la primera gracias a su revisión pre-ITV. Muy recomendables.',
    rating: 5,
    service: 'Revisión Pre-ITV',
  },
  {
    name: 'Pedro S.',
    text: 'Llevan años cuidando mis coches. Nunca me han fallado.',
    rating: 5,
    service: 'Mecánica general',
  },
] as const;

const ROTATE_MS = 5000;

export function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % TESTIMONIALS.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <section id="testimonios" className="relative px-5 py-20 sm:py-24 bg-background">
      <div className="relative mx-auto max-w-2xl">
        <div className="mb-10 flex flex-col items-center text-center gap-3">
          <span className="amg-stripes" aria-hidden>
            <span /><span /><span />
          </span>
          <p className="eyebrow">Opiniones</p>
          <h2 className="h2">Quien viene, vuelve.</h2>
        </div>

        <div className="relative min-h-[220px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              {...MOTION.slideUp}
              exit={{ opacity: 0, y: -12 }}
              className="ticket relative overflow-hidden p-8 w-full"
            >
              <div className="amg-edge" aria-hidden />
              <div className="pl-3">
                <Quote className="h-6 w-6 text-primary mx-auto mb-3" aria-hidden />

                <div className="flex justify-center gap-0.5 mb-4" aria-label={`Valoración: ${t.rating} de 5 estrellas`}>
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[--brand-amber] text-[--brand-amber]" aria-hidden />
                  ))}
                </div>

                <blockquote className="text-base text-foreground leading-relaxed mb-6 text-center">
                  &ldquo;{t.text}&rdquo;
                </blockquote>

                <div className="flex flex-col items-center gap-1">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="meta">{t.service}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-2 mt-6" role="tablist" aria-label="Testimonios">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Testimonio ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === active
                  ? 'bg-primary w-6'
                  : 'bg-border hover:bg-[--border-strong] w-2'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
