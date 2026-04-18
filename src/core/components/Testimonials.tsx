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
    <section id="testimonios" className="relative px-5 py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" aria-hidden />

      <div className="relative z-10 mx-auto max-w-2xl text-center">
        <p className="mb-2 text-xs font-mono text-primary tracking-[0.2em] uppercase">Opiniones</p>
        <h2 className="text-3xl font-bold tracking-tight mb-10">
          Lo que dicen <span className="gradient-text">nuestros clientes</span>
        </h2>

        {/* Testimonial card */}
        <div className="relative min-h-[200px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              {...MOTION.slideUp}
              exit={{ opacity: 0, y: -16 }}
              className="glass-strong rounded-[--radius-xl] p-8 border border-border/50 w-full"
            >
              <Quote className="h-6 w-6 text-primary/40 mx-auto mb-4" aria-hidden />

              {/* Stars */}
              <div className="flex justify-center gap-0.5 mb-4" aria-label={`Valoración: ${t.rating} de 5 estrellas`}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                ))}
              </div>

              <blockquote className="text-base text-foreground/90 leading-relaxed mb-6">
                &ldquo;{t.text}&rdquo;
              </blockquote>

              <div className="flex flex-col items-center gap-1">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{t.service}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot navigation */}
        <div className="flex justify-center gap-2 mt-6" role="tablist" aria-label="Testimonios">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Testimonio ${i + 1}`}
              onClick={() => setActive(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === active
                  ? 'bg-primary w-5'
                  : 'bg-border/60 hover:bg-muted-foreground/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
