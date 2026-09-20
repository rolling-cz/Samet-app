const touchedNote = (chapters: number[]): string =>
  chapters.length === 0 ? '' : ` Kapitola byla vydaná; dotčené kapitoly: ${chapters.join(', ')}.`

/** Audit summaries — written once, read after the game. */
export const audit = Object.freeze({
  runCreated: (runId: string, label: string | null) =>
    label ? `Založen běh ${runId} („${label}").` : `Založen běh ${runId}.`,
  runRenamed: (runId: string, before: string | null, after: string | null) =>
    `Běh ${runId} přejmenován z „${before ?? ''}" na „${after ?? ''}".`,
  configImport: (filename: string, removedCount: number) =>
    removedCount > 0
      ? `Import konfigurace ze souboru ${filename}; odebráno ${removedCount} záznamů, které soubor už neobsahuje.`
      : `Import konfigurace ze souboru ${filename}.`,
  configEmergencyFix: (filename: string, touchedChapters: number[]) =>
    `Nouzová oprava konfigurace ze souboru ${filename}; dotčené kapitoly: ${touchedChapters.join(', ')}.`,
  computationRun: (runId: string, chapter: number, version: number, conflictCount: number) =>
    `Přepočet kapitoly ${chapter} běhu ${runId}, verze ${version}; konfliktů: ${conflictCount}.`,
  computationConfirmed: (runId: string, chapter: number, version: number) =>
    `Potvrzen přepočet kapitoly ${chapter} běhu ${runId}, verze ${version}.`,
  rollCreated: (variationId: string, occurrence: number, value: number) =>
    `Hozeno ${value} pro variantu ${variationId} (výskyt ${occurrence}).`,
  scaleClamped: (characterId: string, scaleKey: string, raw: number, value: number) =>
    `Škála ${scaleKey} postavy ${characterId} oříznuta z ${raw} na ${value}.`,
  answerChanged: (questionId: string, characterId: string, chapter: number, touchedChapters: number[]) =>
    `Odpověď postavy ${characterId} na ${questionId} v kapitole ${chapter} změněna.${touchedNote(touchedChapters)}`,
  answerCancelled: (questionId: string, characterId: string, chapter: number, touchedChapters: number[]) =>
    `Odpověď postavy ${characterId} na ${questionId} v kapitole ${chapter} zrušena — otázka je znovu nezodpovězená.${touchedNote(touchedChapters)}`,
})
