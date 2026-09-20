import type { RunSection } from '@/core'

/** App shell: top bar and sections (§6.4). */
export const navigation = Object.freeze({
  sections: Object.freeze({
    postavy: 'Postavy',
    skupiny: 'Skupiny',
    prepocet: 'Přepočet',
    vystupy: 'Výstupy',
    sprava: 'Správa',
  } satisfies Record<RunSection, string>),
  sectionPlaceholders: Object.freeze({
    postavy: 'Zadávání odpovědí z papírových dotazníků přijde v další session.',
    skupiny: 'Členové, vedení a stav skupin přijdou s enginem.',
    prepocet: 'Spuštění přepočtu, konflikty a trace „proč" přijdou s enginem.',
    vystupy: 'Přehled škál a vygenerované dokumenty přijdou po přepočtu.',
    sprava: '',
  } satisfies Record<RunSection, string>),
  sectionInChapter: (section: string, chapter: number) => `${section} — kapitola ${chapter}`,
  chapterBlockedTitle: (chapter: number) => `Kapitolu ${chapter} zatím nejde otevřít`,
  chapterBlockedBody: (chapter: number, missingChapter: number) =>
    `Kapitola ${chapter} vychází z potvrzeného přepočtu kapitoly ${missingChapter} — z něj se berou otázky i výchozí stav postav. Ten zatím neexistuje.`,
  sectionsLabel: 'Sekce běhu',
  runLabel: 'Běh',
  allRuns: 'Všechny běhy',
  pickRun: 'Vyber nebo založ běh',
  runOption: (id: string, label: string | null, status: string) =>
    label ? `${id} — ${label} (${status})` : `${id} (${status})`,
  runStatus: (status: string) => `běh ${status}`,
  chaptersLabel: 'Kapitoly',
  chapter: (number: number, status: string, isTouched: boolean) =>
    isTouched ? `${number}: ${status}, dotčená` : `${number}: ${status}`,

  notFoundTitle: 'Tohle tu není',
  notFoundBody: 'Běh nebo stránka neexistuje. Vyber běh ze seznamu.',
  errorTitle: 'Obrazovku se nepodařilo načíst',
  errorBody: 'Nejčastěji neodpovídá databáze. Zkus to znovu za chvíli; nic se neuložilo napůl.',
  backToRuns: 'Na seznam běhů',
})
