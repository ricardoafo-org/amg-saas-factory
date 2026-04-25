'use client';

import { motion } from 'framer-motion';
import { MOTION } from '@/lib/motion';

// Bundle-canonical testimonials — copy from Website.html Section F
const TESTIMONIALS = [
  {
    initials: 'MG',
    text: 'Me llamaron antes de cambiar nada para decirme el precio exacto. Al final fue menos de lo presupuestado porque una pieza estaba en buen estado. Vuelvo seguro.',
    name: 'María González',
    vehicle: 'Golf V · Reseña en Google',
  },
  {
    initials: 'JS',
    text: 'Llevo 15 años con ellos. Arreglaron el embrague de mi furgo en un día cuando otro taller me decía que era imposible. Gente honesta y trabajadora.',
    name: 'Javier Sánchez',
    vehicle: 'Transit · Cliente desde 2010',
  },
  {
    initials: 'CM',
    text: 'Mi hija acababa de sacarse el carnet y la atendieron con una paciencia que no he visto en otro sitio. Le explicaron todo sin hacerla sentir tonta. Diez.',
    name: 'Carmen Martín',
    vehicle: 'Clio IV · Reseña en Google',
  },
] as const;

export function Testimonials() {
  return (
    <section className="sect" id="testimonios">
      <div className="sect-inner">
        {/* Section header */}
        <div className="sect-head">
          <div>
            <p className="sect-pre">Lo que dicen los vecinos</p>
            <h2>38 años en el barrio no se inventan.</h2>
          </div>
        </div>

        {/* 3-card grid with stagger-in — replaces old carousel */}
        <motion.div
          className="testi-grid"
          variants={{ visible: MOTION.serviceGridStagger }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10% 0px' }}
        >
          {TESTIMONIALS.map((t) => (
            <motion.article
              key={t.initials}
              className="testi"
              variants={{
                hidden: MOTION.serviceCard.initial,
                visible: {
                  ...MOTION.serviceCard.whileInView,
                  transition: MOTION.serviceCard.transition,
                },
              }}
            >
              {/* 5 yellow stars */}
              <div className="testi-stars" aria-label="5 de 5 estrellas">★★★★★</div>

              {/* Quote */}
              <p className="testi-text">{t.text}</p>

              {/* Author */}
              <div className="testi-meta">
                <div className="testi-avatar" aria-hidden>{t.initials}</div>
                <div>
                  <div className="testi-name">{t.name}</div>
                  <div className="testi-sub">{t.vehicle}</div>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
