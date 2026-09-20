/** Admin screen (§10.2). */
export const sprava = Object.freeze({
  title: 'Správa konfigurace',

  uploadTitle: 'Nahrání konfigurace',
  uploadHintBefore: 'Stáhni Google Sheet přes ',
  uploadHintMenu: 'Soubor → Stáhnout → Microsoft Excel',
  uploadHintMiddle: ' a nahraj jeden soubor ',
  uploadHintFormat: '.xlsx',
  uploadHintAfter: ' se všemi listy.',
  configLabel: 'Konfigurace (.xlsx)',
  templatesLabel: 'Šablony (.md nebo .zip)',
  templatesHint: 'Šablony všech tří kapitol. Bez nich se kontroly značek v šablonách nespustí.',
  noteLabel: 'Poznámka k importu',
  frozenWarning: (runId: string) =>
    `Běh ${runId} už má přepočet, konfigurace je zmrazená. Nahrání je nouzová oprava: potřebuje důvod, nesmí nic odebrat a spočítané kapitoly označí jako dotčené.`,
  reasonLabel: 'Důvod nouzové opravy (povinný)',
  checking: 'Kontroluji…',
  check: 'Zkontrolovat bez uložení',
  save: 'Uložit konfiguraci',
  saveEmergency: (runId: string) => `Uložit nouzovou opravu do běhu ${runId}`,

  archiveTitle: 'Archiv nahraných souborů',
  archiveEmpty: 'Zatím se nic nenahrálo.',
  archiveIntro: 'Každý nahraný soubor zůstává tak, jak přišel — po hře jde dohledat, z čeho se počítalo (§6.5).',
  kindLabels: Object.freeze({ config: 'konfigurace', template: 'šablona' }),
  emergencyReason: (reason: string) => `Nouzová oprava: ${reason}`,
  issueSummary: (warnings: number, errorCount: number) =>
    `${warnings} varování${errorCount > 0 ? `, ${errorCount} chyb` : ''}`,
  hideChecks: 'Skrýt',
  showChecks: 'Výsledky kontrol',
  download: 'Stáhnout',
  noFindings: 'Kontroly nic nenašly.',
})
