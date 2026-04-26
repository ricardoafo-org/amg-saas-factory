import Image from 'next/image';
import Link from 'next/link';
import { Navbar } from '@/core/components/layout/Navbar';
import { Footer } from '@/core/components/Footer';
import { loadClientConfig } from '@/lib/config';
import { buildHowToJsonLd } from '@/lib/seo/json-ld';

export const metadata = {
  title: 'Cómo hacemos un diagnóstico electrónico — Talleres AMG · Cartagena',
  description:
    'El proceso real, paso a paso, de un diagnóstico electrónico en Talleres AMG: escucha al cliente, lectura OBD-II, prueba en condiciones reales, medida con osciloscopio, programación de centralita y verificación final. Sin sorpresas, con garantía RD 1457/1986.',
  robots: { index: true, follow: true },
};

const TENANT_ID = process.env['TENANT_ID'] ?? 'talleres-amg';

const PROCESS_PHOTOS = [
  {
    src: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=1280&auto=format&fit=crop&q=80',
    alt: 'Mecánico atendiendo a un cliente en la recepción del taller, libreta en mano',
    caption: 'Paso 1 · La conversación inicial. Aquí empieza todo.',
  },
  {
    src: 'https://images.unsplash.com/photo-1632823469850-1b7b1e8b7e2d?w=1280&auto=format&fit=crop&q=80',
    alt: 'Lector OBD-II conectado al puerto de diagnóstico de un coche',
    caption: 'Paso 2 · Lectura de códigos de avería en el puerto OBD-II.',
  },
  {
    src: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1280&auto=format&fit=crop&q=80',
    alt: 'Coche en marcha durante una prueba de carretera con equipo de medida',
    caption: 'Paso 3 · La avería tiene que aparecer. Reproducimos los síntomas.',
  },
  {
    src: 'https://images.unsplash.com/photo-1563299796-17596ed6b017?w=1280&auto=format&fit=crop&q=80',
    alt: 'Osciloscopio mostrando la señal de un sensor de cigüeñal',
    caption: 'Paso 4 · Medida real con osciloscopio sobre el sensor sospechoso.',
  },
  {
    src: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1280&auto=format&fit=crop&q=80',
    alt: 'Centralita ECU desmontada sobre el banco de trabajo',
    caption: 'Paso 5 · Banco de pruebas o reprogramación de centralita.',
  },
  {
    src: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?w=1280&auto=format&fit=crop&q=80',
    alt: 'Llaves de coche entregadas sobre el ticket impreso de garantía',
    caption: 'Paso 6 · Verificación final, factura clara y garantía firmada.',
  },
] as const;

const HOW_TO_STEPS = [
  {
    name: 'Escucha y entrevista al cliente',
    text: 'Antes de conectar nada, te preguntamos cuándo aparece el síntoma, en qué condiciones (frío, caliente, lluvia, autopista) y qué cambió justo antes. La mitad del diagnóstico está en lo que cuentas tú.',
  },
  {
    name: 'Inspección visual y lectura OBD-II',
    text: 'Revisamos en frío conexiones, masas, mazos y signos de humedad. Después conectamos el equipo OBD-II y leemos los códigos almacenados y pendientes en todas las centralitas, no solo en la del motor.',
  },
  {
    name: 'Reproducción del síntoma',
    text: 'Si la avería es intermitente, salimos a carretera con el coche y registramos datos en vivo (PIDs) hasta que el fallo aparece. Sin reproducir, no se diagnostica: se adivina.',
  },
  {
    name: 'Medida en componente con osciloscopio',
    text: 'Cuando el código apunta a un sensor o actuador, verificamos su señal real con osciloscopio o multímetro. Comparamos con la señal patrón antes de cambiar ninguna pieza.',
  },
  {
    name: 'Banco de pruebas o reprogramación',
    text: 'Si la avería está en la centralita (ECU), pasamos al banco de pruebas o a la reprogramación con archivos del fabricante. Ningún archivo pirata: trazabilidad completa.',
  },
  {
    name: 'Verificación, entrega y garantía',
    text: 'Borramos códigos, repetimos el ciclo de conducción que provocaba el fallo y comprobamos que no vuelve. Te entregamos el coche con factura detallada y 3 meses o 2.000 km de garantía RD 1457/1986.',
  },
];

export default function ProcesoPage() {
  const config = loadClientConfig(TENANT_ID);

  const howToLd = buildHowToJsonLd({
    name: 'Cómo hacemos un diagnóstico electrónico',
    description:
      'Proceso completo de un diagnóstico electrónico de automoción en Talleres AMG, Cartagena. Seis pasos verificables, con garantía conforme al RD 1457/1986.',
    totalTime: 'PT2H',
    image: PROCESS_PHOTOS[0].src,
    supply: ['Hoja de orden de reparación', 'Ticket de prediagnóstico'],
    tool: [
      'Equipo de diagnóstico OBD-II multimarca',
      'Osciloscopio automotriz de 4 canales',
      'Multímetro digital de gama alta',
      'Banco de pruebas de centralitas',
      'Lector de PIDs en vivo',
    ],
    steps: HOW_TO_STEPS.map((s) => ({ name: s.name, text: s.text })),
  });

  return (
    <>
      <Navbar config={config} />
      <main className="proceso-page paper">
        <article className="proceso-inner">
          <header className="proceso-header">
            <p className="proceso-eyebrow">Proceso · Diagnóstico electrónico</p>
            <h1 className="proceso-title">
              Cómo hacemos un <em>diagnóstico</em> de verdad
            </h1>
            <p className="proceso-lead">
              Un diagnóstico electrónico bien hecho no es enchufar la máquina y leer el código.
              Es una conversación, una hipótesis, una medida y una verificación. En esta página
              te contamos cómo lo hacemos en Talleres AMG, paso a paso, con honestidad técnica.
            </p>
          </header>

          <section className="proceso-section">
            <h2>El problema con el &quot;diagnóstico rápido&quot;</h2>
            <p>
              Cuando un coche enciende el testigo de avería del motor, lo más fácil es conectar
              un lector OBD-II barato, leer un código (por ejemplo, <code>P0420</code> — eficiencia
              del catalizador por debajo del umbral) y decirle al cliente: &quot;hay que cambiar
              el catalizador, son novecientos euros&quot;. Esa es la versión perezosa del oficio.
            </p>
            <p>
              El catalizador rara vez es el verdadero culpable. Un <code>P0420</code> puede venir
              de una sonda lambda envejecida, de una fuga en el escape antes de la sonda, de un
              motor que quema aceite, de un sensor de temperatura mal calibrado o, sí, también de
              un catalizador que ha llegado al final de su vida útil. Sustituir la pieza más cara
              sin verificar cuál es el problema real es lo que da mala fama al sector. Y lo que
              hace que la gente desconfíe del taller.
            </p>
            <p>
              Nosotros no trabajamos así. Cada diagnóstico que sale por la puerta de Talleres AMG
              ha pasado por seis pasos verificables que te resumimos aquí. Tardamos un poco más,
              cobramos solo lo justo y, sobre todo, te decimos la verdad de lo que tiene tu coche.
            </p>
            <p>
              Esta página no es un anuncio. Es la documentación abierta de cómo trabajamos
              cuando entra un coche con avería electrónica al taller. Si después de leerla
              decides que prefieres llevar tu coche a otro sitio, perfecto: al menos tendrás
              criterio para preguntar lo correcto allí donde vayas. Y si decides venir, sabrás
              exactamente qué te vamos a hacer y por qué.
            </p>
          </section>

          <figure className="proceso-figure">
            <Image
              src={PROCESS_PHOTOS[0].src}
              alt={PROCESS_PHOTOS[0].alt}
              width={1280}
              height={720}
              sizes="(max-width: 960px) 100vw, 800px"
              className="proceso-photo"
            />
            <figcaption>{PROCESS_PHOTOS[0].caption}</figcaption>
          </figure>

          <section className="proceso-section">
            <h2>Paso 1 · Te escuchamos antes de tocar nada</h2>
            <p>
              El primer error de muchos talleres es no escuchar al cliente. Tú llevas el coche
              cada día. Tú sabes cuándo empezó el ruido, en qué circunstancias se enciende el
              testigo, si tira menos cuesta arriba o si solo falla en frío por la mañana. Esa
              información vale más que cualquier máquina, porque te orienta hacia la pista
              correcta antes de gastar tiempo midiendo lo que no toca.
            </p>
            <p>
              En la entrevista preguntamos siempre lo mismo: ¿desde cuándo lo notas? ¿hay un
              patrón (frío, caliente, lluvia, autopista, ciudad)? ¿cambiaste algo justo antes
              (repostaje, una reparación, un golpe)? ¿tienes miedo de que se quede tirado o
              solo es molesto? Esa última pregunta es importante porque ordena las prioridades
              y nos dice si hay que sacar el coche del taller hoy o si podemos planificar.
            </p>
            <p>
              También miramos contigo el cuadro. Muchas veces el cliente describe &quot;una
              luz amarilla del motor&quot; cuando lo que tiene encendido es el testigo del
              ABS, del control de estabilidad o del nivel de AdBlue. La diferencia entre uno
              y otro cambia por completo la ruta del diagnóstico.
            </p>
            <p>
              Y, sobre todo, te explicamos qué te vamos a hacer en este primer paso, cuánto
              cuesta y cuánto va a tardar. Si la entrevista revela que la avería es trivial
              y se puede resolver en quince minutos, te lo decimos en ese momento. Si en
              cambio huele a diagnóstico largo (más de dos horas de medida), te damos un
              tope cerrado y, si lo aceptas, no se mueve del presupuesto pase lo que pase
              en el banco.
            </p>
          </section>

          <figure className="proceso-figure">
            <Image
              src={PROCESS_PHOTOS[1].src}
              alt={PROCESS_PHOTOS[1].alt}
              width={1280}
              height={720}
              sizes="(max-width: 960px) 100vw, 800px"
              className="proceso-photo"
            />
            <figcaption>{PROCESS_PHOTOS[1].caption}</figcaption>
          </figure>

          <section className="proceso-section">
            <h2>Paso 2 · Inspección visual y lectura OBD-II completa</h2>
            <p>
              Antes de conectar el equipo, abrimos el capó y miramos. Las averías eléctricas
              se delatan: una conexión verde de óxido, un mazo rozando contra el chasis, un
              tubo de vacío partido, un conector con humedad. Una inspección visual de cinco
              minutos ahorra a veces dos horas de medida.
            </p>
            <p>
              Después conectamos un equipo OBD-II profesional multimarca y leemos
              <strong> todas las centralitas</strong> del coche, no solo la del motor.
              Un coche moderno tiene entre 30 y 80 unidades de control: motor, caja de cambios,
              ABS, control de estabilidad, airbags, climatizador, ADAS, dirección asistida,
              gestor de batería, gestor de carga... y muchas averías &quot;raras&quot; del
              motor son en realidad códigos almacenados en otra centralita que se comunica
              por CAN-bus.
            </p>
            <p>
              Anotamos todos los códigos: los activos (la avería está pasando ahora) y los
              pendientes (algo que se ha producido pero todavía no ha confirmado el ciclo de
              detección). En diésel modernos también revisamos los datos de adaptación del
              motor: contadores de regeneración del FAP, calidad del AdBlue, presión del
              raíl, cantidad inyectada por cilindro. Esos datos cuentan la historia que el
              cuadro no muestra.
            </p>
          </section>

          <figure className="proceso-figure">
            <Image
              src={PROCESS_PHOTOS[2].src}
              alt={PROCESS_PHOTOS[2].alt}
              width={1280}
              height={720}
              sizes="(max-width: 960px) 100vw, 800px"
              className="proceso-photo"
            />
            <figcaption>{PROCESS_PHOTOS[2].caption}</figcaption>
          </figure>

          <section className="proceso-section">
            <h2>Paso 3 · La avería tiene que aparecer</h2>
            <p>
              Si los códigos están claros y la avería se reproduce en parado, perfecto. Pero
              la mitad de los problemas que entran al taller son <em>intermitentes</em>: el
              coche tira mal solo en autopista a partir de los 120, o vibra solo cuando el
              motor está caliente y se mete sexta a 1.500 rpm, o pierde potencia cuando hace
              calor y aire acondicionado. Esos casos no se diagnostican en el banco. Hay que
              salir a carretera.
            </p>
            <p>
              Conectamos el equipo en modo de registro de datos en vivo y reproducimos las
              condiciones que el cliente ha descrito. Grabamos PIDs relevantes (revoluciones,
              carga del motor, caudal másico de aire, presión de turbo, temperatura de
              admisión, ajustes de mezcla a corto y largo plazo, par solicitado vs. par
              entregado) y volvemos al taller con el archivo. Después se analiza con calma,
              comparando con valores de referencia.
            </p>
            <p>
              Esta fase es la que diferencia un diagnóstico real de una sustitución a ciegas.
              Si no hemos podido reproducir el síntoma, no es honesto cobrarle al cliente
              piezas que &quot;a lo mejor son&quot;.
            </p>
          </section>

          <figure className="proceso-figure">
            <Image
              src={PROCESS_PHOTOS[3].src}
              alt={PROCESS_PHOTOS[3].alt}
              width={1280}
              height={720}
              sizes="(max-width: 960px) 100vw, 800px"
              className="proceso-photo"
            />
            <figcaption>{PROCESS_PHOTOS[3].caption}</figcaption>
          </figure>

          <section className="proceso-section">
            <h2>Paso 4 · Verificación con osciloscopio</h2>
            <p>
              Cuando los códigos y los datos en vivo apuntan a un sensor o actuador concreto
              (sensor de cigüeñal, sonda lambda, válvula EGR, inyector, bobina), no nos
              fiamos del diagnóstico de la centralita: medimos nosotros mismos. Para eso
              está el osciloscopio.
            </p>
            <p>
              Una sonda lambda puede dar valores correctos en estático y fallar dinámicamente
              cuando el motor cambia de carga. Un sensor de cigüeñal puede tener resistencia
              dentro de rango y, sin embargo, generar una señal con un diente saltado que la
              centralita interpreta como ruido. Solo el osciloscopio muestra la forma real de
              la señal, y solo así se sabe si la pieza está bien o no.
            </p>
            <p>
              Comparamos cada medida con la señal patrón del fabricante o con bibliotecas
              técnicas verificadas. Si la señal está dentro del patrón, el componente no es
              culpable y seguimos buscando aguas arriba (alimentación, masa, conexión,
              cableado, mazo). Esto es lo que evita el cambio innecesario de piezas caras.
            </p>
          </section>

          <figure className="proceso-figure">
            <Image
              src={PROCESS_PHOTOS[4].src}
              alt={PROCESS_PHOTOS[4].alt}
              width={1280}
              height={720}
              sizes="(max-width: 960px) 100vw, 800px"
              className="proceso-photo"
            />
            <figcaption>{PROCESS_PHOTOS[4].caption}</figcaption>
          </figure>

          <section className="proceso-section">
            <h2>Paso 5 · Banco de pruebas o reprogramación</h2>
            <p>
              Si las medidas confirman que la centralita (ECU) tiene un fallo interno —y no
              un sensor que la engaña—, hay dos caminos. El primero es el banco de pruebas:
              desmontamos la centralita, la conectamos a un equipo de simulación y verificamos
              cómo responde a entradas controladas. Permite detectar etapas de potencia
              quemadas, condensadores hinchados o rastros de humedad que han cortocircuitado
              capas internas de la placa.
            </p>
            <p>
              El segundo camino es la reprogramación. Si la centralita está físicamente bien
              pero su software ha quedado obsoleto o corrupto, cargamos el archivo oficial
              del fabricante y la dejamos al día. Trabajamos siempre con archivos
              certificados; <strong>nunca con software pirata ni modificaciones que tapen
              códigos</strong>. Eso es engañar al cliente y, además, lo deja indefenso en
              la próxima ITV o ante el siguiente fallo.
            </p>
            <p>
              También en este paso encajan la programación de llaves codificadas, la
              calibración de cámaras y radares ADAS tras un golpe o sustitución, y la
              gestión de baterías de coches híbridos y eléctricos. Cada una con su
              procedimiento documentado y su parte firmada al final.
            </p>
            <p>
              En el caso de los ADAS (frenada automática, cambio de carril, control de
              crucero adaptativo) la calibración no es opcional ni recomendable: es
              obligatoria después de un parabrisas, una alineación de dirección o un
              golpe que afecte a la zona de los sensores. Una cámara mal calibrada por
              dos grados puede hacer que el coche frene cuando no debe, o que no frene
              cuando debe. Hay que medir con dianas y certificar el procedimiento.
            </p>
            <p>
              Con coches híbridos y eléctricos el procedimiento añade un paso de
              seguridad: aislamiento del paquete de batería de alta tensión antes de
              cualquier intervención eléctrica. Trabajamos con guantes dieléctricos,
              detector de tensión residual y procedimiento documentado del fabricante.
              No es algo que se improvise.
            </p>
          </section>

          <figure className="proceso-figure">
            <Image
              src={PROCESS_PHOTOS[5].src}
              alt={PROCESS_PHOTOS[5].alt}
              width={1280}
              height={720}
              sizes="(max-width: 960px) 100vw, 800px"
              className="proceso-photo"
            />
            <figcaption>{PROCESS_PHOTOS[5].caption}</figcaption>
          </figure>

          <section className="proceso-section">
            <h2>Paso 6 · Verificación, entrega y garantía</h2>
            <p>
              La reparación no termina cuando se monta la pieza. Termina cuando hemos
              verificado que el coche se comporta como debe. Borramos los códigos, repetimos
              el ciclo de conducción que provocaba el fallo y comprobamos que ni el código
              vuelve ni los datos en vivo se desvían del patrón. Si algo no encaja, no
              entregamos el coche.
            </p>
            <p>
              Te entregamos una factura desglosada con mano de obra, repuestos y el IVA
              calculado correctamente al tipo vigente. Y te entregamos también la garantía
              legal: 3 meses o 2.000 kilómetros (lo que ocurra primero) en cada reparación,
              conforme al Real Decreto 1457/1986. Si en ese plazo aparece de nuevo el mismo
              síntoma, lo arreglamos sin coste y sin discusión.
            </p>
            <p>
              Esa es la garantía que la ley pide. La garantía que damos en realidad es
              distinta: si en cualquier momento sientes que algo no encaja con lo que te
              hemos cobrado o con cómo te hemos atendido, queremos saberlo. La confianza
              se construye así, conversación a conversación, no con frases impresas en un
              ticket.
            </p>
          </section>

          <section className="proceso-section proceso-cta">
            <h2>¿Tienes una avería que ningún taller ha resuelto?</h2>
            <p>
              Especialmente con coches modernos, los diagnósticos eléctricos largos requieren
              un equipo y una paciencia que pocos talleres del barrio tienen. Si has pasado
              ya por dos o tres sitios y nadie acaba de dar con ello, llámanos. Trabajamos
              esos casos con tarifa de hora cerrada y, si no lo resolvemos en la primera
              cita, te lo decimos antes de seguir. La honestidad técnica es nuestra mejor
              carta de presentación, y la repetimos en cada conversación que tenemos contigo
              desde la primera llamada hasta la entrega final del coche.
            </p>
            <p>
              <Link href="/#visitanos" className="proceso-link">Cómo llegar al taller</Link>
              <span aria-hidden="true"> · </span>
              <a href={`tel:${config.contact.phone}`} className="proceso-link">
                Llamar ahora
              </a>
            </p>
          </section>
        </article>
      </main>
      <Footer config={config} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
    </>
  );
}
