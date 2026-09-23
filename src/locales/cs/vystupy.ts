/** Outputs section (§6.4, §10.4, §10.5). */
export const vystupy = Object.freeze({
  title: (chapter: number, documentChapter: number) => `Výstupy kapitoly ${chapter} — dokumenty pro kapitolu ${documentChapter}`,
  tabs: Object.freeze({ prehled: 'Přehled', dokumenty: 'Dokumenty' }),
  basis: (chapter: number, version: number | undefined) =>
    `Stav a vybrané varianty po potvrzeném přepočtu kapitoly ${chapter}${version === undefined ? '' : ` (verze ${version})`}.`,

  // Přehled
  characters: 'Postavy',
  groups: 'Skupiny',
  columns: Object.freeze({
    owner: 'Postava',
    group: 'Skupina',
    scales: 'Škály',
    resources: 'Zdroje',
    variants: 'Vybrané varianty',
  }),
  scaleValue: (label: string, value: number, min: number, max: number) => `${label} ${value} (${min}–${max})`,
  resourceValue: (label: string, value: number) => `${label} ${value}`,
  jointAccount: 'společný účet s postavou',
  personalAccount: 'osobní účet',
  undecided: 'nerozhodnuto — chybí hod',
  noVariants: 'žádné bloky',
  none: '—',
  /** Values in `vysledky.xlsx`. */
  results: Object.freeze({
    personalAccount: 'osobní',
    jointAccount: (householdId: string, partners: string[]) => `společný ${householdId} (s postavou ${partners.join(', ')})`,
  }),

  // Dokumenty
  downloadZip: 'Stáhnout zip',
  downloadCharactersPdf: 'postavy.pdf',
  downloadGroupsPdf: 'skupiny.pdf',
  downloadMd: '.md',
  downloadPdf: '.pdf',
  copy: 'Kopírovat do schránky',
  copied: 'Zkopírováno',
  copyFailed: 'Schránka není dostupná — stáhni .md.',
  show: 'Zobrazit',
  hide: 'Skrýt',
  documentCount: (count: number) => `Dokumentů: ${count}`,
  problemCount: (count: number) => `problémů: ${count}`,
  problemLine: (line: number | undefined, detail: string) => (line === undefined ? detail : `Řádek ${line}: ${detail}`),
  missingTemplates: (owners: string) => `Chybí šablona pro: ${owners}. Nahraj ji ve Správě.`,
  notPrintable: Object.freeze({
    fill_problems: 'PDF a zip vzniknou, až budou všechny dokumenty bez problémů. Oprav šablonu nebo konfiguraci a nahraj ji znovu.',
    missing_templates: 'PDF a zip vzniknou, až bude mít šablonu každá postava a skupina.',
    no_documents: 'Není z čeho udělat PDF — žádný dokument tohoto typu.',
  }),
  renderFailed: (fileName: string, detail: string) => `Soubor ${fileName} se nepodařilo vyrobit: ${detail}`,
  empty: 'Žádné dokumenty — běh nemá nahrané šablony pro tuhle kapitolu.',

  // Šablony a Google
  templateFromGoogle: (time: string) => `šablona z Google Docs, staženo ${time}`,
  templateUploaded: (filename: string, time: string) => `šablona z nahraného souboru ${filename}, ${time}`,
  openInGoogle: 'Otevřít v Google',
  refreshOne: 'Obnovit z Google',
  refreshAll: 'Obnovit vše z Google',
  refreshing: 'Stahuji…',
  refreshDone: (ok: number, total: number) => `Obnoveno ${ok} z ${total} šablon z Google Docs.`,
  refreshNothing: (total: number) => `Z ${total} karet se žádná nepoužila — dosavadní šablony zůstávají.`,
  refreshNoConfig: 'Běh nemá nahranou konfiguraci.',
  refreshConfigUnusable: (filename: string) => `Archivovaná konfigurace ${filename} už neprojde importem.`,
  refreshNoSheet: 'Nahraný .xlsx nemá list Templates, adresy šablon nejsou odkud vzít.',
  refreshNoUrl: 'List Templates pro tuhle kapitolu (a postavu) žádnou adresu nemá.',
  refreshAuthorRequired: 'Chybí jméno z „Kdo jsi?" — obnovení se zapisuje do auditu.',
  refreshFailed: (detail: string) => `Obnovení se nepovedlo: ${detail}`,

  // Nedostupné výstupy
  noConfig: 'Běh nemá nahranou konfiguraci. Nahraj ji ve Správě.',
  configUnusable: (filename: string, count: number) =>
    `Archivovaná konfigurace ${filename} už neprojde importem (chyb: ${count}). Nahraj opravenou ve Správě.`,
  blocked: (missingChapter: number) =>
    `Dokumenty pro kapitolu ${missingChapter + 1} se plní z potvrzeného přepočtu kapitoly ${missingChapter}, a ten zatím není.`,
  blockedAction: (chapter: number) => `Přepočet kapitoly ${chapter}`,
  lastChapterTitle: 'Po poslední kapitole se nic netiskne',
  lastChapter: (chapter: number) =>
    `Výstupy kapitoly N jsou dokumenty pro kapitolu N+1. Kapitola ${chapter} je poslední, takže z ní žádné dokumenty nevznikají.`,
  unknownChapter: (chapter: number) => `Kapitola ${chapter} v běhu není.`,
  unavailableTitle: 'Výstupy zatím nejdou vyrobit',
})
