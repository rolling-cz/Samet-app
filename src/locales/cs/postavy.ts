/** Character section and the left panel (§6.4). */
export const postavy = Object.freeze({
  panelTitle: 'Postavy',
  count: (count: number) => `${count}`,
  empty: 'Postavy se objeví po nahrání konfigurace ve Správě.',
  fullName: (firstName: string, lastName: string) => `${firstName} ${lastName}`,
})
