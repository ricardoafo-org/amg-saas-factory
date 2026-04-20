export const bookingFixture = {
  oilChange: {
    service: /Cambio de aceite/i,
    oilType: /Sintético/i,
    lastKm: '50000',
    currentKm: '62000',
    plate: '1234ABC',
    name: 'Test Usuario QA',
    phone: '+34 600 111 222',
    email: 'qa-test@amg-talleres.test',
  },
  presupuesto: {
    service: /Solicitar presupuesto/i,
    serviceType: /Mecánica/i,
    plate: '5678DEF',
    vehicle: 'Ford Focus 2019',
    description: 'Revisión general de frenos y amortiguadores',
    name: 'Test Presupuesto QA',
    phone: '+34 600 333 444',
    email: 'qa-presupuesto@amg-talleres.test',
  },
} as const;
