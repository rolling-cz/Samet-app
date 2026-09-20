import type { CharacterAliases } from '../characters'
import { answerId, FIRST_QUESTION_ORDINAL, questionId } from '../constants/question-ids'
import {
  BOOL_ANSWER_TEXTS,
  OTHER_ANSWER_MARKER,
  ORG_SOURCE_WORD,
  PLAYER_SOURCE_WORDS,
  QUESTION_TYPES,
  YES_WORDS,
} from '../constants/sheet-vocabulary'
import {
  ANSWER_BLOCKS_COLUMN,
  ANSWER_ID_COLUMN,
  ANSWER_LABEL_COLUMN,
  chapterSheetName,
  EFFECTS_COLUMN,
  IMPACT_COLUMN,
  QUESTION_COLUMNS,
  QUESTION_CONDITION_COLUMN,
  QUESTION_FILL_DOWN_COLUMNS,
  QUESTION_PRIVATE_COLUMN,
  QUESTION_SOURCE_COLUMN,
} from '../constants/sheets'
import type { IssueCollector } from '../issue-collector'
import { parseCondition } from '../expression'
import { householdEffectImpacts } from '../household-effect-impacts'
import { parseScaleImpact } from '../scale-impact'
import type { SheetRow } from '../sheet'
import type { ImportRepairs, Workbook } from '../types/parsed-config'
import type {
  ParsedAnswerOption,
  ParsedQuestion,
  ParsedQuestionType,
} from '../types/parsed-question'
import { splitList } from '../utils/split-list'
import { parseAnswerEffects } from './parse-answer-effects'
import { readConfigSheet, requireColumns } from './read-config-sheet'
import { resolveOwner, resolveReferencedCharacter } from './resolve-character-refs'

/** Question type used when the sheet's value is unknown; already reported as an error. */
const FALLBACK_QUESTION_TYPE: ParsedQuestionType = 'single'

/**
 * A filled-in `Type` cell is what starts a new question.
 *
 * It is the one column every question has and no answer row repeats — the ID
 * may be blank (§4.2) and `Character` carries down over several questions of
 * the same person.
 */
const QUESTION_START_COLUMN = 'Type'

export const parseQuestions = (
  workbook: Workbook,
  chapter: number,
  aliases: CharacterAliases,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedQuestion[] => {
  const name = chapterSheetName(chapter, 'Questions')
  const read = readConfigSheet(
    workbook,
    name,
    repairs,
    QUESTION_COLUMNS,
    QUESTION_FILL_DOWN_COLUMNS,
  )
  if (!read) {
    issues.error(
      'missing_sheet',
      { sheet: name },
      `Kapitola ${chapter} má v souboru listy, ale chybí jí \`${name}\` s otázkami.`,
    )

    return []
  }
  if (!requireColumns(name, read.headers, QUESTION_COLUMNS, issues)) return []

  const questions: ParsedQuestion[] = []
  const seenQuestions = new Map<string, number>()
  const seenAnswers = new Map<string, number>()
  /** Next ordinal per character; a poll belongs to nobody and takes none (§6.6). */
  const nextOrdinal = new Map<string, number>()

  let current: ParsedQuestion | undefined

  for (const row of read.rows) {
    // A blank row ends the group, so what follows belongs to no question yet.
    if (row.precededByBlank) current = undefined

    if (startsNewQuestion(row)) {
      current = beginQuestion(row, chapter, nextOrdinal, aliases, issues, repairs)
      questions.push(current)

      const previous = seenQuestions.get(current.externalId)
      if (previous !== undefined) {
        issues.error(
          'duplicate_id',
          row.at('ID'),
          `Otázka \`${current.externalId}\` je v listu \`${name}\` dvakrát (poprvé na řádku ${previous}).`,
          { value: current.externalId },
        )
      }
      seenQuestions.set(current.externalId, row.rowNumber)
    }

    // An answer row before any question — typically after a blank row that
    // ended the previous group (§11.1).
    if (current === undefined) {
      const orphan = row.get(ANSWER_ID_COLUMN) || row.get(ANSWER_LABEL_COLUMN)
      if (orphan !== '') {
        issues.error(
          'answer_without_question',
          row.at(ANSWER_ID_COLUMN),
          `Řádek odpovědi \`${orphan}\` nepatří k žádné otázce — nad ním žádná otázka nezačíná.`,
          { value: orphan },
        )
      }
      continue
    }

    const option = readAnswer(row, current, aliases, repairs, issues)
    if (!option) continue

    const previousAnswer = seenAnswers.get(option.externalId)
    if (previousAnswer !== undefined) {
      issues.error(
        'duplicate_id',
        row.at(ANSWER_ID_COLUMN),
        `Odpověď \`${option.externalId}\` je v listu \`${name}\` dvakrát (poprvé na řádku ${previousAnswer}).`,
        { value: option.externalId },
      )
      continue
    }
    seenAnswers.set(option.externalId, row.rowNumber)
    current.options.push(option)

    readDirectTarget(current, option)
  }

  for (const question of questions) {
    completeBoolAnswers(question)
    checkQuestionShape(question, issues)
  }

  return questions
}

const startsNewQuestion = (row: SheetRow): boolean => row.raw(QUESTION_START_COLUMN) !== ''

const beginQuestion = (
  row: SheetRow,
  chapter: number,
  nextOrdinal: Map<string, number>,
  aliases: CharacterAliases,
  issues: IssueCollector,
  repairs: ImportRepairs,
): ParsedQuestion => {
  const typeRaw = row.get('Type')
  const type = QUESTION_TYPES.find((known) => known === typeRaw)
  if (!type) {
    issues.error(
      'missing_value',
      row.at('Type'),
      `Otázka na řádku ${row.rowNumber} má neznámý typ „${typeRaw}" — čeká se ${QUESTION_TYPES.map((t) => `\`${t}\``).join(', ')}.`,
      { value: typeRaw },
    )
  }
  const resolvedType = type ?? FALLBACK_QUESTION_TYPE

  const sourceRaw = row.get(QUESTION_SOURCE_COLUMN)
  if (sourceRaw !== '' && sourceRaw !== ORG_SOURCE_WORD && !isPlayerWord(sourceRaw)) {
    issues.error(
      'missing_value',
      row.at(QUESTION_SOURCE_COLUMN),
      `Otázka na řádku ${row.rowNumber} má neznámý zdroj „${sourceRaw}" — čeká se \`hráč\` nebo \`org\`.`,
      { value: sourceRaw },
    )
  }

  const isPoll = resolvedType === 'poll'
  const characterRef = isPoll ? '' : row.get('Character')
  const characterId = isPoll
    ? undefined
    : resolveOwner(
        characterRef,
        aliases,
        repairs,
        row.at('Character'),
        `Otázka na řádku ${row.rowNumber}`,
        issues,
        row.raw('Character') !== '',
      )

  // A poll counts towards nobody's order (§6.6), so it neither takes an ordinal
  // nor shifts the character's numbering.
  let ordinal: number | undefined
  if (!isPoll) {
    const owner = characterId ?? characterRef
    ordinal = nextOrdinal.get(owner) ?? FIRST_QUESTION_ORDINAL
    nextOrdinal.set(owner, ordinal + 1)
  }

  const writtenId = row.get('ID')
  const question: ParsedQuestion = {
    externalId: writtenId,
    idWasDerived: false,
    chapter,
    characterRef,
    characterId,
    ordinal,
    // A vote carries its poll's ID in the `Text` column and shows the poll's
    // own text in the app (§6.6).
    text: resolvedType === 'poll-answer' ? '' : row.get('Text'),
    type: resolvedType,
    source: sourceRaw === ORG_SOURCE_WORD ? 'org' : 'player',
    isPrivate: isYes(row.get(QUESTION_PRIVATE_COLUMN)),
    pollRef: resolvedType === 'poll-answer' ? row.get('Text') : undefined,
    condition: parseQuestionCondition(row, issues),
    options: [],
    location: row.at('ID'),
  }

  if (writtenId === '') {
    if (isPoll) {
      issues.error(
        'missing_value',
        row.at('ID'),
        'Anketa (`poll`) musí mít vyplněné `ID` — u ankety se nikdy negeneruje.',
      )
      question.externalId = `Q_poll_radek_${row.rowNumber}`
    } else {
      question.externalId = questionId(
        characterId ?? characterRef,
        chapter,
        ordinal ?? FIRST_QUESTION_ORDINAL,
      )
      question.idWasDerived = true
    }
  }

  if (!isPoll && characterRef === '') {
    issues.error(
      'missing_value',
      row.at('Character'),
      `Otázka \`${question.externalId}\` nemá postavu.`,
    )
  }
  if (resolvedType === 'poll-answer' && question.pollRef === '') {
    issues.error(
      'missing_value',
      row.at('Text'),
      `Otázka \`${question.externalId}\` je typu \`poll-answer\`, ale ve sloupci \`Text\` nemá ID ankety.`,
    )
  }
  if (resolvedType !== 'poll-answer' && question.text === '') {
    issues.warn(
      'missing_value',
      row.at('Text'),
      `Otázka \`${question.externalId}\` nemá text — v dotazníku bude prázdná.`,
    )
  }

  return question
}

const readAnswer = (
  row: SheetRow,
  question: ParsedQuestion,
  aliases: CharacterAliases,
  repairs: ImportRepairs,
  issues: IssueCollector,
): ParsedAnswerOption | undefined => {
  const label = row.get(ANSWER_LABEL_COLUMN)
  const writtenId = row.get(ANSWER_ID_COLUMN)

  // A vote has no answers of its own: text, options and effects all come from
  // the poll, so there is only one place to edit them (§6.6).
  if (question.type === 'poll-answer') return undefined
  if (writtenId === '' && label === '') return undefined

  let externalId = writtenId
  if (externalId === '') {
    const derived = deriveAnswerId(question, label)
    if (!derived) {
      // A `bool` answer is recognised by its text, so anything else there is a
      // typo that would silently become an answer nobody can refer to (§11.8).
      const detail =
        question.type === 'bool'
          ? `u otázky typu \`bool\` smí být jen \`Ano\` nebo \`Ne\`, ne „${label}"`
          : `bez \`${ANSWER_ID_COLUMN}\` se ID odvozuje jen u typu \`bool\` z textu \`Ano\` / \`Ne\``
      issues.error(
        question.type === 'bool' ? 'missing_value' : 'missing_value',
        row.at(ANSWER_LABEL_COLUMN),
        `Odpověď „${label}" u otázky \`${question.externalId}\`: ${detail}.`,
        { value: label },
      )

      return undefined
    }
    externalId = derived
    repairs.derivedAnswerIds++
  }

  const impactCell = row.get(IMPACT_COLUMN)
  if (impactCell.includes(';')) repairs.semicolonSeparators++

  const { impacts, problems } = parseScaleImpact(impactCell)
  for (const problem of problems) {
    issues.error(
      'invalid_impact',
      row.at(IMPACT_COLUMN),
      `Dopad „${problem.raw}" u odpovědi \`${externalId}\` se nedá přečíst: ${problem.detail}.`,
      { value: problem.raw },
    )
  }

  const effects = parseAnswerEffects(
    row.get(EFFECTS_COLUMN),
    externalId,
    row.at(EFFECTS_COLUMN),
    issues,
  )

  // A household effect brings its own transfer between the accounts (§4.4), so
  // the author writes none — anything they did write stays and is reported.
  for (const effect of effects) impacts.push(...householdEffectImpacts(effect))

  const option: ParsedAnswerOption = {
    externalId,
    label,
    ordinal: question.options.length + 1,
    impacts,
    blocks: splitList(row.get(ANSWER_BLOCKS_COLUMN)),
    effects,
    isOther: externalId.endsWith(OTHER_ANSWER_MARKER) || label === OTHER_ANSWER_MARKER,
    isDerived: false,
    location: row.at(ANSWER_ID_COLUMN),
  }
  option.referencedCharacter = resolveReferencedCharacter(option, aliases.ids)

  return option
}

/**
 * A question may itself be conditional from chapter 2 on (§4.2) — asked only
 * when the expression holds. Conditional *sub*-questions stay out: this gates a
 * whole question, it does not nest one inside another.
 */
const parseQuestionCondition = (row: SheetRow, issues: IssueCollector) => {
  const raw = row.get(QUESTION_CONDITION_COLUMN)
  if (raw === '') return undefined

  const condition = parseCondition(raw)
  if (!condition.ok) {
    issues.error(
      'invalid_expression',
      row.at(QUESTION_CONDITION_COLUMN),
      `Podmínka otázky je syntakticky vadná: ${condition.error}.`,
      { value: condition.raw },
    )
  }

  return condition
}

/** `bool` answers are recognised by their text, so row order does not matter (§6.1). */
const deriveAnswerId = (question: ParsedQuestion, label: string): string | undefined => {
  if (question.type !== 'bool') return undefined
  const known = BOOL_ANSWER_TEXTS.find((text) => text === label)
  if (!known) return undefined

  return answerId(
    question.characterId ?? question.characterRef,
    question.chapter,
    question.ordinal ?? FIRST_QUESTION_ORDINAL,
    known,
  )
}

/**
 * A missing `Ano` / `Ne` row means "this answer has no effects", not "this
 * answer cannot be given" (§6.1) — so the option is added with the derived ID
 * and conditions can still refer to it.
 */
const completeBoolAnswers = (question: ParsedQuestion): void => {
  if (question.type !== 'bool') return

  for (const text of BOOL_ANSWER_TEXTS) {
    if (question.options.some((option) => option.label === text)) continue

    const externalId = deriveAnswerId(question, text)
    if (!externalId) continue

    question.options.push({
      externalId,
      label: text,
      ordinal: question.options.length + 1,
      impacts: [],
      blocks: [],
      effects: [],
      isOther: false,
      isDerived: true,
      location: question.location,
    })
  }

  question.options.sort(
    (a, b) => BOOL_ANSWER_TEXTS.indexOf(a.label as never) - BOOL_ANSWER_TEXTS.indexOf(b.label as never),
  )
  question.options.forEach((option, index) => {
    option.ordinal = index + 1
  })
}

/**
 * `scale_direct` / `resource_direct` write an absolute value; the target comes
 * from the impact column rather than a column of its own, and must name a
 * concrete account — routing is forbidden here (§4.4).
 */
const readDirectTarget = (question: ParsedQuestion, option: ParsedAnswerOption): void => {
  if (question.target !== undefined) return
  if (question.type !== 'scale_direct' && question.type !== 'resource_direct') return

  const absolute = option.impacts.find((impact) => impact.mode === 'absolute')
  if (!absolute) return

  question.target = { kind: absolute.kind, owner: absolute.owner, key: absolute.key }
}

/** Checks that need every answer row of the question to have been read. */
const checkQuestionShape = (question: ParsedQuestion, issues: IssueCollector): void => {
  if (question.type === 'poll-answer') return

  if (question.options.length === 0) {
    issues.error(
      'question_without_answers',
      question.location,
      `Otázka \`${question.externalId}\` nemá žádnou odpověď.`,
      { value: question.externalId },
    )
  }

  const expectedKind = question.type === 'scale_direct' ? 'scale' : 'resource'
  if (question.type === 'scale_direct' || question.type === 'resource_direct') {
    if (question.target === undefined) {
      issues.error(
        'invalid_impact',
        question.location,
        `Otázka \`${question.externalId}\` je typu \`${question.type}\`, ale žádná její odpověď neurčuje cíl zápisem \`${expectedKind === 'scale' ? 'S_<Postava>_<Skala>' : 'R_<Vlastnik>_<Zdroj>'}=VALUE\`.`,
        { value: question.externalId },
      )
    } else if (question.target.kind !== expectedKind) {
      issues.error(
        'invalid_impact',
        question.location,
        `Otázka \`${question.externalId}\` je typu \`${question.type}\`, ale míří na ${question.target.kind === 'scale' ? 'škálu' : 'resource'} \`${question.target.owner}_${question.target.key}\`.`,
        { value: question.externalId },
      )
    }
  }

  // Absolute setting must always name a concrete account: the org is setting a
  // balance and must never have it land somewhere else than they meant (§4.4).
  for (const option of question.options) {
    for (const impact of option.impacts) {
      if (impact.mode !== 'absolute' || impact.kind !== 'resource') continue
      if (impact.forcedPrivate) continue
      issues.error(
        'invalid_impact',
        option.location,
        `Odpověď \`${option.externalId}\` nastavuje zdroj \`${impact.externalId}\` absolutně, ale nejmenuje konkrétní účet — u absolutního nastavení je směrování zakázané (§4.4). Napište \`_private\`, nebo ID domácnosti.`,
        { value: impact.raw },
      )
    }
  }
}

/** `hráč`, `hrac`, `Hráč` — the sheet is written by hand. */
const isPlayerWord = (value: string): boolean => PLAYER_SOURCE_WORDS.includes(value.toLowerCase())

const isYes = (value: string): boolean => YES_WORDS.includes(value.toLowerCase())
