/**
 * Sample data — one run, three characters, one group, scales and resources.
 *
 * Its purpose is a shape in the database showing how the tables fit together.
 * It is not the game's configuration: that is imported from `.xlsx` (§10.1).
 *
 * The data deliberately exercises the least obvious parts of the model: a
 * `household` resource with both the personal and the joint account (§4.4),
 * routing decided by marital status, a `{input}` transfer into the joint
 * account, a poll and its vote (§6.6), and a nested block (§8.4).
 *
 * Re-runnable: it first drops the run `2026-09-12_A` if it exists — allowed only
 * because it is a seed run in a local database.
 */
import 'dotenv/config'
import { eq, sql } from 'drizzle-orm'
import { unscopedDb, rawSql } from '../src/db/client'
import type { RunScopedTable } from '../src/db/run-scope'
import {
  answerOptions,
  answerSelectedOptions,
  answers,
  auditLog,
  blockVariations,
  characterResourceValues,
  characterResources,
  characterScaleValues,
  characterScales,
  characterVariables,
  characters,
  chapters,
  computations,
  contentBlocks,
  diceRolls,
  effectInputs,
  effects,
  groups,
  householdMemberships,
  householdResourceValues,
  households,
  questions,
  resources,
  scales,
  runs,
  templates,
  uploadedFiles,
} from '../src/db/schema'
import { householdExternalId } from '../src/engine'

const RUN_ID = '2026-09-12_A'
const AUTHOR = 'seed skript'
const CHAPTER_NUMBERS = [1, 2, 3] as const

/**
 * Bounds are per pair character × scale (§4.2), so the seed gives Karel a
 * narrower `Control` than Marie — a shape the old model could not express.
 */
interface ScaleSeed {
  key: string
  label: string
  perCharacter: { character: string; min: number; max: number; value: number }[]
}

const SCALE_SEED: ScaleSeed[] = [
  {
    key: 'Regime',
    label: 'Vztah k režimu',
    perCharacter: [
      { character: 'Marie', min: 1, max: 10, value: 6 },
      { character: 'Mirek', min: 1, max: 10, value: 3 },
      { character: 'Karel', min: 1, max: 10, value: 8 },
    ],
  },
  {
    key: 'Control',
    label: 'Vliv v organizaci',
    perCharacter: [
      { character: 'Marie', min: 1, max: 10, value: 2 },
      { character: 'Karel', min: 1, max: 5, value: 4 },
    ],
  },
]

/** `Wealth` is `household`: it lives on a personal and on a joint account (§4.4). */
const RESOURCE_SEED = [
  {
    key: 'Wealth',
    label: 'Peníze',
    scope: 'household' as const,
    perCharacter: [
      { character: 'Marie', value: 4 },
      { character: 'Mirek', value: 6 },
      { character: 'Karel', value: 5 },
    ],
  },
]

const CHARACTER_SEED = [
  { externalId: 'Marie', firstName: 'Marie', lastName: 'Balážová', birthYear: 1955 },
  { externalId: 'Mirek', firstName: 'Mirek', lastName: 'Pokorný', birthYear: 1953 },
  { externalId: 'Karel', firstName: 'Karel', lastName: 'Novák', birthYear: 1950 },
]

const wipeSeedRun = async () => {
  // Delete dependents first — the foreign keys are `restrict`.
  const order: RunScopedTable[] = [
    auditLog,
    characterVariables,
    characterScaleValues,
    characterResourceValues,
    householdResourceValues,
    householdMemberships,
    households,
    diceRolls,
    answerSelectedOptions,
    answers,
    computations,
    effectInputs,
    effects,
    answerOptions,
    questions,
    blockVariations,
    contentBlocks,
    templates,
    characterScales,
    characterResources,
    scales,
    resources,
    characters,
    groups,
    uploadedFiles,
    chapters,
  ]

  await unscopedDb.transaction(async (tx) => {
    // The append-only trigger (`db/sql/001_audit_append_only.sql`) would refuse
    // the audit delete. `alter table` holds an exclusive lock until commit, so
    // nothing else can touch `audit_log` while the trigger is off.
    await tx.execute(sql`alter table audit_log disable trigger user`)
    for (const table of order) {
      await tx.delete(table).where(eq(table.runId, RUN_ID))
    }
    await tx.delete(runs).where(eq(runs.id, RUN_ID))
    await tx.execute(sql`alter table audit_log enable trigger user`)
  })
}

const main = async () => {
  await wipeSeedRun()

  await unscopedDb.insert(runs).values({
    id: RUN_ID,
    startDate: '2026-09-12',
    letter: 'A',
    label: 'Ukázkový běh (seed)',
    status: 'aktivni',
    createdBy: AUTHOR,
  })

  // All three chapters are created with the run so config import has something
  // to attach questions to (§3.2).
  const chapterRows = await unscopedDb
    .insert(chapters)
    .values(
      CHAPTER_NUMBERS.map((number) => ({
        runId: RUN_ID,
        number,
        status: 'rozpracovana' as const,
      })),
    )
    .returning()
  const chapter1 = chapterRows.find((row) => row.number === 1)
  const chapter2 = chapterRows.find((row) => row.number === 2)
  if (!chapter1 || !chapter2) throw new Error('Nepodařilo se založit kapitoly.')

  const [srdceParty] = await unscopedDb
    .insert(groups)
    .values({ runId: RUN_ID, externalId: 'SrdceParty', name: 'Srdce party' })
    .returning()
  if (!srdceParty) throw new Error('Nepodařilo se založit skupinu.')

  const characterRows = await unscopedDb
    .insert(characters)
    .values(
      CHARACTER_SEED.map((character) => ({ runId: RUN_ID, ...character })),
    )
    .returning()
  const characterId = new Map(characterRows.map((row) => [row.externalId, row.id]))

  const scaleId = new Map<string, string>()
  for (const scale of SCALE_SEED) {
    const [row] = await unscopedDb
      .insert(scales)
      .values({ runId: RUN_ID, key: scale.key, label: scale.label })
      .returning()
    if (!row) continue
    scaleId.set(scale.key, row.id)

    for (const entry of scale.perCharacter) {
      const owner = characterId.get(entry.character)
      if (!owner) continue

      await unscopedDb.insert(characterScales).values({
        runId: RUN_ID,
        characterId: owner,
        scaleId: row.id,
        externalId: `S_${entry.character}_${scale.key}`,
        minValue: entry.min,
        maxValue: entry.max,
        defaultValue: entry.value,
      })
      await unscopedDb.insert(characterScaleValues).values({
        runId: RUN_ID,
        chapterId: chapter1.id,
        characterId: owner,
        scaleId: row.id,
        value: entry.value,
        source: 'pocatecni',
      })
    }
  }

  const resourceId = new Map<string, string>()
  for (const resource of RESOURCE_SEED) {
    const [row] = await unscopedDb
      .insert(resources)
      .values({ runId: RUN_ID, key: resource.key, label: resource.label, scope: resource.scope })
      .returning()
    if (!row) continue
    resourceId.set(resource.key, row.id)

    for (const entry of resource.perCharacter) {
      const owner = characterId.get(entry.character)
      if (!owner) continue

      await unscopedDb.insert(characterResources).values({
        runId: RUN_ID,
        characterId: owner,
        resourceId: row.id,
        externalId: `R_${entry.character}_${resource.key}`,
        defaultValue: entry.value,
      })
      await unscopedDb.insert(characterResourceValues).values({
        runId: RUN_ID,
        chapterId: chapter1.id,
        characterId: owner,
        resourceId: row.id,
        value: entry.value,
        source: 'pocatecni',
      })
    }
  }

  await seedHousehold(chapter2.id, characterId, resourceId)
  await seedContent(chapter2.id, characterId)
  await seedQuestions(chapter2.id, characterId, scaleId, resourceId)

  await unscopedDb.insert(auditLog).values({
    runId: RUN_ID,
    action: 'beh.zalozeni',
    entityKind: 'runs',
    entityId: RUN_ID,
    summary: 'Založen ukázkový běh seed skriptem.',
    author: AUTHOR,
  })

  console.log(`Seed hotový: běh ${RUN_ID}.`)
  await rawSql.end()
}

/**
 * Marie and Mirek marry in chapter 2. The household ID is derived from both
 * member IDs sorted alphabetically (§4.2), never stored from a sheet.
 */
const seedHousehold = async (
  chapterId: string,
  characterId: Map<string, string>,
  resourceId: Map<string, string>,
): Promise<void> => {
  const marie = characterId.get('Marie')
  const mirek = characterId.get('Mirek')
  const wealth = resourceId.get('Wealth')
  if (!marie || !mirek || !wealth) return

  const [household] = await unscopedDb
    .insert(households)
    .values({
      runId: RUN_ID,
      externalId: householdExternalId('Marie', 'Mirek'),
      label: 'Balážovi–Pokorní',
      createdInChapterId: chapterId,
    })
    .returning()
  if (!household) return

  await unscopedDb.insert(householdMemberships).values(
    [marie, mirek].map((member) => ({
      runId: RUN_ID,
      chapterId,
      characterId: member,
      householdId: household.id,
      source: 'prepocet' as const,
    })),
  )

  await unscopedDb.insert(householdResourceValues).values({
    runId: RUN_ID,
    chapterId,
    householdId: household.id,
    resourceId: wealth,
    value: 0,
    source: 'prepocet',
  })
}

/** A block whose chosen variant nests another block (§8.4). */
const seedContent = async (
  chapterId: string,
  characterId: Map<string, string>,
): Promise<void> => {
  const marie = characterId.get('Marie')
  if (!marie) return

  const [historie] = await unscopedDb
    .insert(contentBlocks)
    .values({ runId: RUN_ID, externalId: 'B_Marie_2_Historie_1', chapterId, characterId: marie })
    .returning()
  const [penize] = await unscopedDb
    .insert(contentBlocks)
    .values({ runId: RUN_ID, externalId: 'B_Marie_2_Penize_1', chapterId, characterId: marie })
    .returning()
  if (!historie || !penize) return

  await unscopedDb.insert(blockVariations).values([
    {
      runId: RUN_ID,
      externalId: 'V_Marie_2_Historie_1_A',
      blockId: historie.id,
      ordinal: 1,
      priority: 1,
      description: 'Svatba',
      text: 'V květnu si vzala {PRIJMENI}. {BLOK B_Marie_2_Penize_1}',
      conditionExpr: 'A_Marie_2_1_Mirek',
      conditionRefs: [{ name: 'A_Marie_2_1_Mirek', kind: 'odpoved' }],
    },
    {
      runId: RUN_ID,
      externalId: 'V_Marie_2_Historie_1_B',
      blockId: historie.id,
      ordinal: 2,
      priority: 2,
      description: null,
      text: 'Rok proběhl bez velkých změn.',
      // An empty condition is the always-true fallback, same as `DEFAULT` (§8.2).
      conditionExpr: '',
      conditionRefs: [],
    },
    {
      runId: RUN_ID,
      externalId: 'V_Marie_2_Penize_1_A',
      blockId: penize.id,
      // This block orders by rows: no variant carries a priority (§8.2).
      ordinal: 1,
      priority: null,
      description: null,
      text: 'Na společný účet dali dohromady slušnou sumu.',
      conditionExpr: 'R_MarieMirek_Wealth >= 7',
      conditionRefs: [{ name: 'R_MarieMirek_Wealth', kind: 'zdroj' }],
    },
    {
      runId: RUN_ID,
      externalId: 'V_Marie_2_Penize_1_B',
      blockId: penize.id,
      ordinal: 2,
      priority: null,
      description: null,
      text: 'Na nic dalšího nezbylo.',
      conditionExpr: 'DEFAULT',
      conditionRefs: [],
    },
  ])
}

/**
 * A marriage question carrying `HOUSEHOLD_CREATE` (§4.4): the effect itself
 * brings the transfer into the joint account, through the two `{input}`s the
 * org types in. Plus a poll and one vote in it.
 */
const seedQuestions = async (
  chapterId: string,
  characterId: Map<string, string>,
  scaleId: Map<string, string>,
  resourceId: Map<string, string>,
): Promise<void> => {
  const marie = characterId.get('Marie')
  const mirek = characterId.get('Mirek')
  const karel = characterId.get('Karel')
  const wealth = resourceId.get('Wealth')
  const regime = scaleId.get('Regime')
  if (!marie || !mirek || !karel || !wealth || !regime) return

  const [marriage] = await unscopedDb
    .insert(questions)
    .values({
      runId: RUN_ID,
      externalId: 'Q_Organizatori_2_1',
      chapterId,
      characterId: marie,
      ordinal: 1,
      type: 'bool',
      source: 'org',
      text: 'Došlo ke sňatku Marie a Mirka?',
    })
    .returning()
  if (!marriage) return

  const [yes] = await unscopedDb
    .insert(answerOptions)
    .values({
      runId: RUN_ID,
      externalId: 'A_Organizatori_2_1_Ano',
      questionId: marriage.id,
      ordinal: 1,
      label: 'Ano',
      referencedCharacterId: mirek,
    })
    .returning()
  await unscopedDb.insert(answerOptions).values({
    runId: RUN_ID,
    externalId: 'A_Organizatori_2_1_Ne',
    questionId: marriage.id,
    ordinal: 2,
    label: 'Ne',
  })
  if (!yes) return

  const effectRows = await unscopedDb
    .insert(effects)
    .values([
      {
        runId: RUN_ID,
        answerOptionId: yes.id,
        externalId: 'A_Organizatori_2_1_Ano#0',
        ordinal: 0,
        kind: 'domacnost_vznik',
        characterId: marie,
        relatedCharacterId: mirek,
      },
      {
        runId: RUN_ID,
        answerOptionId: yes.id,
        externalId: 'A_Organizatori_2_1_Ano#1',
        ordinal: 1,
        kind: 'zmena_zdroje',
        characterId: marie,
        resourceId: wealth,
        // The amount comes from `effect_inputs`, not from the sheet (§4.4).
        resourceTarget: 'osobni',
      },
      {
        runId: RUN_ID,
        answerOptionId: yes.id,
        externalId: 'A_Organizatori_2_1_Ano#2',
        ordinal: 2,
        kind: 'zmena_zdroje',
        characterId: mirek,
        resourceId: wealth,
        resourceTarget: 'osobni',
      },
      {
        runId: RUN_ID,
        answerOptionId: yes.id,
        externalId: 'A_Organizatori_2_1_Ano#3',
        ordinal: 3,
        kind: 'zmena_zdroje',
        resourceId: wealth,
        resourceTarget: 'domacnost',
        householdExternalId: householdExternalId('Marie', 'Mirek'),
      },
    ])
    .returning()

  // `{input1}` is the first member of the effect, `{input2}` the second (§4.4):
  // two input fields, and the joint account gets the sum of both.
  const byExternalId = new Map(effectRows.map((row) => [row.externalId, row.id]))
  const fromMarie = byExternalId.get('A_Organizatori_2_1_Ano#1')
  const fromMirek = byExternalId.get('A_Organizatori_2_1_Ano#2')
  const toHousehold = byExternalId.get('A_Organizatori_2_1_Ano#3')
  if (fromMarie && fromMirek && toHousehold) {
    await unscopedDb.insert(effectInputs).values([
      { runId: RUN_ID, effectId: fromMarie, ordinal: 0, inputKey: 'input1', sign: -1 },
      { runId: RUN_ID, effectId: fromMirek, ordinal: 0, inputKey: 'input2', sign: -1 },
      { runId: RUN_ID, effectId: toHousehold, ordinal: 0, inputKey: 'input1', sign: 1 },
      { runId: RUN_ID, effectId: toHousehold, ordinal: 1, inputKey: 'input2', sign: 1 },
    ])
  }

  const [poll] = await unscopedDb
    .insert(questions)
    .values({
      runId: RUN_ID,
      externalId: 'Q_Group_SrdceParty_Vedouci',
      chapterId,
      characterId: null,
      ordinal: null,
      type: 'poll',
      source: 'hrac',
      text: 'Kdo povede partu?',
    })
    .returning()
  if (!poll) return

  await unscopedDb.insert(answerOptions).values([
    {
      runId: RUN_ID,
      externalId: 'A_Group_SrdceParty_Vedouci_Karel',
      questionId: poll.id,
      ordinal: 1,
      label: 'Karel',
      referencedCharacterId: karel,
    },
    {
      runId: RUN_ID,
      externalId: 'A_Group_SrdceParty_Vedouci_Marie',
      questionId: poll.id,
      ordinal: 2,
      label: 'Marie',
      referencedCharacterId: marie,
    },
  ])

  // A vote carries no text and no options of its own — both come from the poll.
  await unscopedDb.insert(questions).values({
    runId: RUN_ID,
    externalId: 'Q_Marie_2_2',
    chapterId,
    characterId: marie,
    ordinal: 2,
    type: 'poll-answer',
    source: 'hrac',
    pollQuestionId: poll.id,
  })
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
