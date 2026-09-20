/** Character section and the left panel (§6.4). */
export const postavy = Object.freeze({
  panelTitle: 'Postavy',
  count: (count: number) => `${count}`,
  empty: 'Postavy se objeví po nahrání konfigurace ve Správě.',
  pickTitle: (chapter: number) => `Postavy — kapitola ${chapter}`,
  pickBody: 'Vyber v levém panelu postavu, jejíž dotazník držíš v ruce.',
  characterTitle: (fullName: string, chapter: number) => `${fullName} — kapitola ${chapter}`,
  characterBody: 'Dotazník postavy a stav jejích škál a zdrojů přijdou v další session.',
  fullName: (firstName: string, lastName: string) => `${firstName} ${lastName}`,
})
