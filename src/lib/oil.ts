const OIL_KM: Record<string, number> = {
  mineral: 7500,
  semi: 10000,
  synthetic: 15000,
  unknown: 10000,
};

export type OilRecommendation = {
  kmLeft: number;
  interval: number;
  urgent: boolean;
  message: string;
};

export function calcOilRecommendation(
  oilType: string,
  kmLast: number,
  kmNow: number,
): OilRecommendation {
  const interval = OIL_KM[oilType] ?? 10000;
  const kmDriven = kmNow - kmLast;
  const kmLeft = interval - kmDriven;
  const urgent = kmLeft <= 0 || kmLeft <= 1000;

  let message: string;
  if (kmLeft <= 0) {
    message = `¡Ya tocaba el cambio! Llevas ${kmDriven.toLocaleString('es-ES')} km desde el último cambio (intervalo recomendado: ${interval.toLocaleString('es-ES')} km). Te recomendamos reservar cuanto antes.`;
  } else if (kmLeft <= 1000) {
    message = `Te quedan solo ${kmLeft.toLocaleString('es-ES')} km para el cambio de aceite. ¡Reserva pronto!`;
  } else {
    const oilLabel = oilType === 'mineral' ? 'mineral' : oilType === 'semi' ? 'semisintético' : 'sintético';
    message = `Te quedan aproximadamente ${kmLeft.toLocaleString('es-ES')} km para el próximo cambio de aceite${oilType !== 'unknown' ? ` (aceite ${oilLabel})` : ''}. Intervalo recomendado: ${interval.toLocaleString('es-ES')} km.`;
  }

  return { kmLeft, interval, urgent, message };
}

export function estimateOilDate(kmLeft: number, kmNow: number, kmLast: number): Date {
  const kmPerDay = Math.max((kmNow - kmLast) / 180, 10);
  const daysLeft = Math.max(Math.round(kmLeft / kmPerDay), 1);
  const date = new Date();
  date.setDate(date.getDate() + daysLeft);
  return date;
}
