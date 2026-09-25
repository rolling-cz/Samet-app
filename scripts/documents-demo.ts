/**
 * Filling documents end to end, over `documents/fixture-platny.xlsx`,
 * `documents/sablony-platne-vzor.zip` and a real database:
 *
 *   1. a run with the fixture config and the template zip archived as uploaded
 *   2. chapter 1 answered, computed and confirmed
 *   3. chapter 1's documents — templates of fixed text, no computation needed
 *   4. chapter 2's documents — `2_Content` variants chosen while chapter 1 was
 *      computed, including the nested block, printed in full
 *
 * The templates go in as the **zip exactly as uploaded**, so the run also proves
 * that `loadTemplates` unpacks the archive rather than expecting loose files.
 *
 *   npx tsx scripts/documents-demo.ts           prints the `.md` documents
 *   npx tsx scripts/documents-demo.ts --write   also writes them to tmp/documents-demo/
 *   npx tsx scripts/documents-demo.ts --config <cesta.xlsx>
 *                                               another workbook, e.g. one with a `Templates` sheet
 *
 * The PDF is not made here: react-pdf and `marked` ship as ESM only, and these
 * scripts run through tsx in a CommonJS project. `src/documents/pdf/render-pdf.test.ts`
 * renders one instead, and the app itself renders through Next's own bundler.
 *
 * Re-runnable: it first drops its own run — allowed only because it is a demo
 * run in a local database.
 */
import 'dotenv/config'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { confirmComputation, runComputation } from '../src/computation'
import { buildIdDirectory } from '../src/computation/convert/build-id-directory'
import { DICE_SIDES } from '../src/computation/constants/dice'
import { loadConfigRows } from '../src/computation/services/load-config-rows'
import { answersToRows } from '../src/computation/testing/answers-to-rows'
import { unscopedDb } from '../src/db/client'
import { forRun } from '../src/db/run-scope'
import { answerInputValues, answerSelectedOptions, answers, chapters, diceRolls, runs } from '../src/db/schema'
import { generateDocuments, type DocumentSet, type GeneratedDocument } from '../src/documents'
import type { AnswerInput } from '../src/engine'
import { importXlsx } from '../src/import/import-config'
import { persistConfig } from '../src/import/persist/persist-config'
import { FIXTURE_PATH, chapter1Answers, chapter1Rolls } from '../src/testing/fixture-run'
import { wipeRun } from './lib/wipe-run'

const RUN_ID = '2026-01-03_A'
const AUTHOR = 'documents-demo'
const TEMPLATES_PATH = 'documents/sablony-platne-vzor.zip'

const configArg = process.argv.indexOf('--config')
const CONFIG_PATH = configArg === -1 ? FIXTURE_PATH : (process.argv[configArg + 1] ?? FIXTURE_PATH)
const CHAPTER_NUMBERS = [1, 2, 3] as const

const show = (title: string, value: unknown): void => {
  console.log(`\n=== ${title} ===`)
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
}

const createDemoRun = async (): Promise<void> => {
  await unscopedDb.insert(runs).values({
    id: RUN_ID,
    startDate: '2026-01-03',
    letter: 'A',
    label: 'Ukázka dokumentů (documents-demo)',
    status: 'active',
    createdBy: AUTHOR,
  })
  await unscopedDb.insert(chapters).values(CHAPTER_NUMBERS.map((number) => ({ runId: RUN_ID, number })))

  const content = readFileSync(CONFIG_PATH)
  const templates = readFileSync(TEMPLATES_PATH)
  const imported = importXlsx(content)

  await persistConfig({
    runId: RUN_ID,
    config: imported.config,
    issues: imported.issues,
    configFile: { filename: path.basename(CONFIG_PATH), content },
    templateFiles: [{ filename: 'sablony-platne-vzor.zip', content: templates }],
    author: AUTHOR,
  })
}

const enterAnswers = async (inputs: AnswerInput[]): Promise<void> => {
  const scope = forRun(RUN_ID)
  const config = await loadConfigRows(scope)
  const rows = answersToRows(inputs, config, buildIdDirectory(config))

  for (const { id: draftId, ...answer } of rows.answers) {
    const [stored] = await scope
      .insert(answers, { ...answer, filledByOrg: true, answeredBy: AUTHOR })
      .returning({ id: answers.id })
    if (!stored) throw new Error(`answer to ${answer.questionId} was not stored`)

    const answerId = stored.id
    const selected = rows.selectedOptions.filter((row) => row.answerId === draftId)
    const typed = rows.inputValues.filter((row) => row.answerId === draftId)
    if (selected.length > 0) await scope.insert(answerSelectedOptions, selected.map((row) => ({ ...row, answerId })))
    if (typed.length > 0) await scope.insert(answerInputValues, typed.map((row) => ({ ...row, answerId })))
  }
}

/** The fixture's roll stored up front, so the chosen variant is the one the engine tests expect. */
const storeFixtureRolls = async (): Promise<void> => {
  const scope = forRun(RUN_ID)
  const directory = buildIdDirectory(await loadConfigRows(scope))

  await scope.insert(
    diceRolls,
    chapter1Rolls().map((roll) => ({
      blockVariationId: directory.variations.toDb(roll.variationId),
      occurrence: roll.occurrence,
      sides: DICE_SIDES,
      value: roll.value,
      isManualOverride: true,
      rolledBy: AUTHOR,
      reason: 'fixture roll, to match scripts/engine-demo.ts',
    })),
  )
}

const computeAndConfirm = async (chapter: number): Promise<void> => {
  const outcome = await runComputation({ runId: RUN_ID, chapter, author: AUTHOR })
  if (outcome._type !== 'computed') throw new Error(`chapter ${chapter} was not computed: ${outcome._type}`)

  const confirmed = await confirmComputation({
    runId: RUN_ID,
    computationId: outcome.computationId,
    author: AUTHOR,
  })
  if (confirmed._type !== 'confirmed') throw new Error(`chapter ${chapter} was not confirmed: ${confirmed._type}`)
  show(`Přepočet kapitoly ${chapter}`, { verze: outcome.version, konfliktu: outcome.conflictCount })
}

const summarize = (title: string, set: DocumentSet): void => {
  if (set._type !== 'ready') {
    show(title, set)
    throw new Error(`documents are not ready: ${set._type}`)
  }

  show(title, {
    prepocet: set.computationId ?? 'bez přepočtu (kapitola 1)',
    dokumentu: set.documents.length,
    chybiSablona: set.missingTemplates.map((entry) => entry.ownerLabel),
    problemy: set.documents.flatMap((document) =>
      document.problems.map((problem) => `${document.fileName}: ${problem.code} ${problem.raw}`),
    ),
    soubory: set.documents.map((document) => document.fileName),
  })
}

const main = async (): Promise<void> => {
  await wipeRun(RUN_ID)
  await createDemoRun()
  await enterAnswers(chapter1Answers())
  await storeFixtureRolls()
  await computeAndConfirm(1)

  const first = await generateDocuments(RUN_ID, 1)
  summarize('Dokumenty kapitoly 1', first)

  const second = await generateDocuments(RUN_ID, 2)
  summarize('Dokumenty kapitoly 2', second)

  if (second._type !== 'ready') return
  // Antonín has four blocks of real text, Marie's won variant is the empty
  // "nothing happened" one (her joint account passes `R_Marie_Wealth >= 7`) and
  // Funkcionáři is a group — between them every path through the filler shows.
  const shown = ['Antonin', 'Marie', 'Funkcionari']
  for (const document of second.documents) {
    if (!shown.includes(document.owner.id)) continue
    show(document.fileName, document.markdown)
  }

  const leftover = second.documents.filter((document) => document.markdown.includes('{'))
  if (leftover.length > 0) {
    throw new Error(`markers survived into: ${leftover.map((document) => document.fileName).join(', ')}`)
  }
  console.log('\nŽádná značka nepřežila do hotového dokumentu.')

  if (process.argv.includes('--write')) writeMarkdown(second.documents)
}

/** The filled `.md` files, to read or hand to the PDF renderer. */
const writeMarkdown = (documents: readonly GeneratedDocument[]): void => {
  const outDir = path.join('.', 'tmp', 'documents-demo')
  mkdirSync(outDir, { recursive: true })

  for (const document of documents) {
    writeFileSync(path.join(outDir, document.fileName), document.markdown, 'utf8')
  }
  console.log(`
Zapsáno ${documents.length} souborů do ${outDir}/`)
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
