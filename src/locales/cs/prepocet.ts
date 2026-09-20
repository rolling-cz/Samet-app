/** Computation section (§6.4). The screen itself — trace, conflicts, preview — comes later. */
export const prepocet = Object.freeze({
  title: (chapter: number) => `Přepočet — kapitola ${chapter}`,
  intro:
    'Každé spuštění je nová verze nanečisto; nic se nepřepisuje. Trace „proč", konflikty k rozhodnutí a náhled změn přijdou v další session.',
  run: 'Přepočítat',
  running: 'Počítám…',
  computed: (version: number, conflictCount: number, newRollCount: number) =>
    `Verze ${version}: konfliktů ${conflictCount}, nově hozených kostek ${newRollCount}.`,
  missingAnswers: (count: number, questionIds: string) =>
    `Přepočet se nespustil, chybí odpovědí: ${count} (${questionIds}). Nic se nedoplňuje samo.`,
  rejected: (problems: string) => `Engine vstupy odmítl: ${problems}`,
  noConfig: 'Běh nemá nahranou konfiguraci. Nahraj ji ve Správě.',
  configUnusable: (filename: string, count: number) =>
    `Archivovaná konfigurace ${filename} už neprojde importem (chyb: ${count}). Nahraj opravenou ve Správě.`,
  noBaseline: (missingChapter: number) => `Chybí potvrzený přepočet kapitoly ${missingChapter}, ze kterého se vychází.`,
  unknownChapter: (chapter: number) => `Kapitola ${chapter} v běhu není.`,
  authorRequired: 'Chybí jméno z „Kdo jsi?" — každý přepočet se zapisuje do auditu se jménem.',
})
