import { common } from './common'

/** Character section and the left panel (§6.4). */
export const postavy = Object.freeze({
  panelTitle: 'Postavy',
  summary: (done: number, total: number) => `Vyplněno ${done} / ${total}`,
  summaryUnavailable: (total: number) => `${total}`,
  empty: 'Postavy se objeví po nahrání konfigurace ve Správě.',
  searchLabel: 'Hledat postavu',
  onlyUnfilled: 'jen nevyplněné',
  noMatch: 'Nikdo takový tu není.',
  noQuestions: 'bez otázek',
  progress: (complete: number, asked: number) => `${complete}/${asked}`,
  pickTitle: (chapter: number) => `Postavy — kapitola ${chapter}`,
  pickBody: 'Vyber v levém panelu postavu, jejíž dotazník držíš v ruce.',
  fullName: common.fullName,
})
