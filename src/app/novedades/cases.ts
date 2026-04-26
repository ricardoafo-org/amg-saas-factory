/**
 * FEAT-038 PR 8 — Mocked case-study seed data.
 *
 * Replace with real cases when the owner has documented them. The schema
 * is intentionally complete (datePublished, image, body) so swapping in
 * real cases doesn't change any code, only this file.
 */

export interface CaseStudy {
  slug: string;
  headline: string;
  excerpt: string;
  tag: string;
  datePublished: string;
  dateLabel: string;
  image: string;
  imageAlt: string;
  body: ReadonlyArray<{ heading: string; paragraphs: ReadonlyArray<string> }>;
}

export const CASE_STUDIES: ReadonlyArray<CaseStudy> = [
  {
    slug: 'p0420-no-era-el-catalizador',
    headline: 'P0420 que no era el catalizador',
    excerpt:
      'Un Golf VII con el testigo de motor encendido y un código de catalizador. Antes de cambiar la pieza más cara, medimos la sonda lambda con osciloscopio y descubrimos lo de siempre.',
    tag: 'Diagnóstico ECU',
    datePublished: '2026-04-15',
    dateLabel: '15 de abril de 2026',
    image:
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1280&auto=format&fit=crop&q=80',
    imageAlt: 'Volkswagen Golf VII con el capó abierto durante el diagnóstico',
    body: [
      {
        heading: 'Lo que nos contó el cliente',
        paragraphs: [
          'Un Volkswagen Golf VII 1.4 TSI del 2017 entró al taller con el testigo de motor encendido desde hacía dos semanas. El cliente venía de otro taller de Cartagena donde le habían leído el código P0420 (eficiencia del catalizador por debajo del umbral) y le habían pasado un presupuesto de 940 € para sustituir el catalizador completo.',
          'La pista que nos hizo dudar fue otra: el coche había pasado la ITV un mes antes sin emisiones por encima del límite. Un catalizador realmente agotado deja huella en el banco de gases. Le pedimos al cliente media mañana para verificar antes de cambiar nada.',
        ],
      },
      {
        heading: 'Lo que medimos',
        paragraphs: [
          'Conectamos el equipo OBD-II y, además del P0420, encontramos un código pendiente que el otro taller no había anotado: P2096 (mezcla pobre post-catalizador). Ese código aislado no obliga a sustituir nada, pero combinado con el P0420 cambia por completo el diagnóstico.',
          'Salimos a carretera con el coche y registramos las dos sondas lambda en vivo. La pre-catalizador respondía con normalidad, oscilando entre 0,1 y 0,9 voltios al ritmo correcto. La post-catalizador, en cambio, oscilaba casi igual que la primera: una post sana debería estar más estable.',
          'Pero la prueba definitiva fue el osciloscopio. Conectamos las dos sondas en paralelo y comparamos sus ondas en una rampa de aceleración. La post-catalizador respondía con un ligero retraso, más lento de lo que esperábamos para una sonda con 80.000 km. La sonda estaba envejecida, no muerta. Suficiente para confundir a la centralita y disparar el P0420 sin que el catalizador tuviera nada.',
        ],
      },
      {
        heading: 'Lo que reparamos',
        paragraphs: [
          'Sustituimos sólo la sonda lambda post-catalizador (118 € pieza original) y borramos los códigos. Hicimos el ciclo de conducción que activa el monitor del catalizador: arranque en frío, autopista a 90 km/h durante 15 minutos, regreso al taller. Ningún código volvió.',
          'Total cobrado: 145 € entre pieza, mano de obra e IVA. Cuatro veces menos que el presupuesto original. El catalizador del coche está perfectamente; la sonda envejecida se hizo pasar por un fallo de catalizador.',
        ],
      },
      {
        heading: 'Por qué importa',
        paragraphs: [
          'Cambiar el catalizador habría hecho desaparecer el código durante un par de meses (la sonda nueva no estaría: error de comunicación), pero el problema habría vuelto en cuanto el OBD-II reaprendiera la lectura. El cliente habría pagado 940 € para arreglar nada y, además, habría perdido un catalizador en buen estado.',
          'No es un caso raro. El código P0420 es probablemente el más sobre-diagnosticado del sector. Si te lo presupuestan sin verificar la sonda primero, pide una segunda opinión.',
        ],
      },
    ],
  },
  {
    slug: 'adas-camara-dos-grados-fuera',
    headline: 'Cámara ADAS dos grados fuera de eje',
    excerpt:
      'Una furgoneta nueva frenaba sola en autopista. La avería no estaba en el sensor: estaba en una calibración que el taller anterior se saltó tras cambiar el parabrisas.',
    tag: 'Calibración ADAS',
    datePublished: '2026-04-08',
    dateLabel: '8 de abril de 2026',
    image:
      'https://images.unsplash.com/photo-1571987502227-9231b837d92a?w=1280&auto=format&fit=crop&q=80',
    imageAlt: 'Furgoneta con dianas de calibración ADAS instaladas frente al parabrisas',
    body: [
      {
        heading: 'Lo que nos contó el cliente',
        paragraphs: [
          'Un autónomo de Cartagena llegó con una furgoneta de 2024, 12.000 km en el cuentakilómetros, con un problema serio: el sistema de frenada automática se activaba sin motivo en autopista, varias veces por semana. Le había pasado dos veces con clientes detrás. Tenía miedo de seguir trabajando con ella.',
          'El cliente recordaba un dato clave: tres meses antes le habían cambiado el parabrisas tras una piedra en autovía. Lo había llevado a una cadena de instalación rápida. Después del cambio, los frenazos.',
        ],
      },
      {
        heading: 'Lo que medimos',
        paragraphs: [
          'Leímos las centralitas y, efectivamente, había códigos guardados de "objeto detectado" en el momento exacto de cada frenazo. La centralita estaba haciendo su trabajo: recibía la señal del radar y de la cámara y, al cruzarlas, identificaba un obstáculo. El problema es que el obstáculo no existía.',
          'Conectamos el equipo de calibración ADAS y medimos la posición real de la cámara contra la dirección teórica del coche. Estaba dos grados desviada hacia abajo. Dos grados son nada para el ojo humano, pero a 80 metros de distancia (la zona donde la cámara busca obstáculos a 120 km/h) se traducen en casi tres metros de error vertical. La cámara veía el carril contiguo o el arcén como si estuviera en la trayectoria del coche.',
          'El parabrisas se había instalado correctamente. La cámara se había vuelto a montar. Pero nadie había hecho la calibración estática con dianas que el fabricante exige tras cualquier intervención en el cristal. La centralita asumía que la cámara estaba en su sitio. No lo estaba.',
        ],
      },
      {
        heading: 'Lo que reparamos',
        paragraphs: [
          'Calibración estática con el equipo de dianas del fabricante, dentro del taller, con el coche nivelado y a la distancia exacta que pide el procedimiento (3,80 m en este modelo). Después calibración dinámica en carretera, conduciendo 30 minutos con tráfico real para que la centralita aprenda. El procedimiento completo lleva dos horas y media.',
          'Sello en el libro de mantenimiento, parte firmado del procedimiento ADAS y factura desglosada. Total: 295 € + IVA. El parabrisas seguía siendo correcto; la calibración estaba sin hacer.',
        ],
      },
      {
        heading: 'Por qué importa',
        paragraphs: [
          'Una calibración ADAS no es una recomendación: es obligatoria tras parabrisas, alineación de dirección, suspensión y carrocería. La omiten muchos talleres no especializados porque exige equipo dedicado y dos horas de tiempo. La consecuencia es la que vivió el cliente: un coche que frena solo, en autopista, con tráfico detrás.',
          'Si te cambian un parabrisas y la factura no incluye una línea de calibración ADAS (estática y dinámica), pregunta. Y si no la tiene, no firmes la entrega.',
        ],
      },
    ],
  },
  {
    slug: 'bateria-12v-hibrido-toyota',
    headline: 'La avería del híbrido Toyota era la batería de 12 V',
    excerpt:
      'Un Toyota Corolla híbrido que arrancaba con avisos extraños y luces de tablero. La batería de tracción estaba perfecta. La de 12 V tenía año y medio.',
    tag: 'Híbridos · Eléctricos',
    datePublished: '2026-04-02',
    dateLabel: '2 de abril de 2026',
    image:
      'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1280&auto=format&fit=crop&q=80',
    imageAlt: 'Toyota híbrido conectado a equipo de diagnóstico en el taller',
    body: [
      {
        heading: 'Lo que nos contó el cliente',
        paragraphs: [
          'Una clienta llegó con un Toyota Corolla híbrido de 2022 que llevaba dos semanas dando guerra: al arrancar por la mañana, el cuadro mostraba una cascada de testigos amarillos y rojos durante diez segundos antes de apagarse y dejar el coche listo para circular. Un par de veces, además, el coche no había arrancado a la primera.',
          'Venía con miedo a que fuera la batería de tracción de alta tensión. Esa pieza, en un híbrido reciente, ronda los 3.500 €. La angustia era real.',
        ],
      },
      {
        heading: 'Lo que medimos',
        paragraphs: [
          'Conectamos el equipo y leímos primero el estado de la batería de tracción: salud al 92 %, ningún código de la HV, capacidad correcta para el kilometraje (38.000 km). La batería de tracción estaba mejor de lo que cabría esperar.',
          'Después medimos la batería auxiliar de 12 V. Es una batería pequeña, de plomo o AGM, que en los híbridos se encarga de despertar todos los sistemas electrónicos cuando se gira la llave. Tensión en reposo: 11,9 voltios. Tensión bajo carga (test con probador profesional): caía a 9,4 V con apenas 50 amperios. Una batería sana de 12 V no debería bajar de 10 V en ese ensayo.',
          'Y aquí está la trampa de los híbridos: cuando la batería auxiliar de 12 V no tiene fuerza, el coche no puede inicializar correctamente el sistema de control. Saltan códigos en cascada (motor, ABS, ADAS, dirección asistida) que nada tienen que ver con un fallo real. El coche da una imagen de avería gravísima cuando lo único que pasa es que la batería pequeña está agotada.',
        ],
      },
      {
        heading: 'Lo que reparamos',
        paragraphs: [
          'Sustituimos la batería de 12 V (AGM original Toyota, 110 € pieza), reseteamos la centralita de gestión de batería con el equipo del fabricante y borramos todos los códigos. Hicimos cinco arranques consecutivos verificando que el cuadro no mostrara avisos en ningún momento. Cuadro limpio en todos.',
          'Total con mano de obra e IVA: 168 €. La batería de tracción no se tocó porque no hacía falta tocarla.',
        ],
      },
      {
        heading: 'Por qué importa',
        paragraphs: [
          'El error más común con los híbridos y eléctricos es asumir que cualquier avería eléctrica viene de la batería grande. La realidad es la contraria: en los primeros cuatro o cinco años de un híbrido, la inmensa mayoría de los problemas que aparecen son fallos de la batería auxiliar de 12 V, sensores de bajo coste o cableado.',
          'La batería de tracción de un híbrido moderno está diseñada para durar la vida útil del coche. Tratar a un cliente honesto es decirle eso desde el principio, en lugar de dejarle creer durante una semana que tiene una factura de 3.500 € por delante.',
        ],
      },
    ],
  },
];
