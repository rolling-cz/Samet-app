/**
 * The `Scale and Resources Impact` column (§4.2).
 *
 * A separated list of `<ID><znaménko><číslo>`, e.g.
 * `S_Marie_Regime-2, R_Marie_Wealth+3`. An empty cell means no impact.
 *
 * Three things make it more than a split on `+`:
 *
 *  - **Scales and resources share the column** but not their rules: a scale is
 *    clamped to its own `Min`/`Max`, a resource never is (§4.1).
 *  - **Resources are routed** (§4.4): plain `R_Marie_Wealth` lands on the joint
 *    account when Marie is married and on her own when she is not, while the
 *    `_private` suffix forces the personal one. The engine decides after the
 *    structural phase; the parser only records which form was written.
 *  - **The amount may be an org's input** (§4.4): `R_Antonin_Wealth-{input}`
 *    means "however much the org types in", and the same placeholder name in
 *    another item of the same answer means the same number — that is how a
 *    transfer into the joint account is written without computing anything.
 *
 * A pure function with tests on purpose: it is small, it is called everywhere,
 * and a bug in it shows up as wrong numbers in a printed document.
 */

/** Scales and resources are told apart by their prefix, never by their name. */
export type ImpactKind = 'skala' | 'zdroj'

/**
 * One summand of an amount. A literal number, or a named `{input}` the org
 * fills in. The amount is the signed sum of the terms, so
 * `-{input1}-{input2}` is two terms and a plain `+3` is one.
 */
export interface ImpactTerm {
  sign: 1 | -1
  /** Set for a literal number. */
  literal?: number
  /** Set for `{input}`; the name without braces. */
  inputKey?: string
}

/** One parsed impact. */
export interface ScaleImpact {
  /** Canonical source ID without the `_private` suffix, e.g. `S_Marie_Regime`. */
  externalId: string
  kind: ImpactKind
  /** Owner part: a character (`Marie`) or, for resources, a household (`MarieMirek`). */
  owner: string
  /** Scale or resource key, e.g. `Regime`, `Wealth`. */
  key: string
  /**
   * The author wrote `_private` (§4.4): this lands on the personal account even
   * when the character is married. Never set for a scale.
   */
  forcedPrivate: boolean
  /** `posun` shifts by the amount; `absolutni` sets it (§6.7). */
  mode: 'posun' | 'absolutni'
  /** `=VALUE`: the number comes from the answer, not from the sheet. */
  fromAnswer: boolean
  /** Empty when `fromAnswer`. */
  terms: ImpactTerm[]
  /** The exact text this came from, for error messages. */
  raw: string
}

export interface ScaleImpactProblem {
  raw: string
  reason:
    | 'chybi_znamenko'
    | 'chybi_prefix'
    | 'chybi_skala'
    | 'necislo'
    | 'prazdny_input'
    | 'nezname'
  /** Czech explanation, ready to drop into an issue message. */
  detail: string
}

export interface ScaleImpactParse {
  impacts: ScaleImpact[]
  problems: ScaleImpactProblem[]
}

/**
 * Items are separated by a comma or a semicolon: the real sheet uses both,
 * sometimes in one cell, and rejecting one of them would only annoy the author.
 */
const SEPARATOR = /[,;]/

/** `S_<Owner>_<Key>` or `R_<Owner>_<Key>`; the key may contain `_` (`Wealth_2`). */
const TARGET = /^([SR])_([^_\s]+)_(.+)$/

/** Splits an item into its target, the first operator and the rest. */
const ITEM = /^([^=+\-]+?)\s*([=+-])\s*(.*)$/

/** One summand: an optional sign followed by a number or `{input}`. */
const TERM = /([+-]?)\s*(?:(\d+)|\{([^}]*)\})/g

/** Forces the personal account (§4.4). */
const PRIVATE_SUFFIX = '_private'

/** `scale_direct` / `resource_direct`: the number comes from the answer. */
const FROM_ANSWER_KEYWORD = 'VALUE'

export const parseScaleImpact = (cell: string | undefined | null): ScaleImpactParse => {
  const impacts: ScaleImpact[] = []
  const problems: ScaleImpactProblem[] = []

  const text = (cell ?? '').trim()
  if (text === '') return { impacts, problems }

  for (const part of text.split(SEPARATOR)) {
    const raw = part.trim()
    if (raw === '') continue

    const item = ITEM.exec(raw)
    if (!item) {
      problems.push(describeFailure(raw))
      continue
    }

    const target = TARGET.exec((item[1] ?? '').trim())
    if (!target) {
      problems.push(describeFailure(raw))
      continue
    }

    const operator = item[2] ?? ''
    const operand = (item[3] ?? '').trim()
    const kind: ImpactKind = target[1] === 'S' ? 'skala' : 'zdroj'
    const owner = target[2] ?? ''
    const written = target[3] ?? ''

    // Only a resource has a personal counterpart; on a scale the suffix would
    // silently become part of the key and point at a scale nobody defined.
    const forcedPrivate = kind === 'zdroj' && written.endsWith(PRIVATE_SUFFIX)
    const key = forcedPrivate ? written.slice(0, -PRIVATE_SUFFIX.length) : written
    const externalId = `${target[1]}_${owner}_${key}`

    if (operator === '=' && operand === FROM_ANSWER_KEYWORD) {
      impacts.push({
        externalId,
        kind,
        owner,
        key,
        forcedPrivate,
        mode: 'absolutni',
        fromAnswer: true,
        terms: [],
        raw,
      })
      continue
    }

    const amount = parseAmount(operator === '=' ? operand : `${operator}${operand}`, raw)
    if ('problem' in amount) {
      problems.push(amount.problem)
      continue
    }

    impacts.push({
      externalId,
      kind,
      owner,
      key,
      forcedPrivate,
      mode: operator === '=' ? 'absolutni' : 'posun',
      fromAnswer: false,
      terms: amount.terms,
      raw,
    })
  }

  return { impacts, problems }
}

/** `+3`, `-{input}`, `{input1}+{input2}` — a signed sum of literals and inputs. */
const parseAmount = (
  text: string,
  raw: string,
): { terms: ImpactTerm[] } | { problem: ScaleImpactProblem } => {
  const terms: ImpactTerm[] = []
  let consumed = 0

  TERM.lastIndex = 0
  for (let match = TERM.exec(text); match !== null; match = TERM.exec(text)) {
    consumed += match[0].replace(/\s+/g, '').length
    const sign: 1 | -1 = match[1] === '-' ? -1 : 1

    if (match[2] !== undefined) {
      terms.push({ sign, literal: Number(match[2]) })
      continue
    }

    const inputKey = (match[3] ?? '').trim()
    if (inputKey === '') {
      return {
        problem: {
          raw,
          reason: 'prazdny_input',
          detail: 'prázdné `{}` — placeholder musí mít jméno, například `{input}` nebo `{input1}`',
        },
      }
    }
    terms.push({ sign, inputKey })
  }

  // Anything the term scanner skipped over is a typo, not a value: without this
  // `S_Marie_Regime+3x` would quietly import as +3.
  if (terms.length === 0 || consumed !== text.replace(/\s+/g, '').length) {
    return {
      problem: {
        raw,
        reason: 'necislo',
        detail: `čeká se celé číslo, \`{input}\` nebo \`VALUE\`, je tam „${text.trim()}"`,
      },
    }
  }

  return { terms }
}

/** Says what is wrong rather than just "invalid", so the author can fix it blind. */
const describeFailure = (raw: string): ScaleImpactProblem => {
  if (!/^[SR]_/.test(raw)) {
    return {
      raw,
      reason: 'chybi_prefix',
      detail: 'ID musí začínat na `S_` (škála) nebo `R_` (zdroj), například `R_Marie_Wealth+3`',
    }
  }
  if (!/[=+-]/.test(raw)) {
    return {
      raw,
      reason: 'chybi_znamenko',
      detail: 'chybí znaménko — čeká se `+`, `-` nebo `=`, například `S_Marie_Regime-2`',
    }
  }
  if (/^[SR]_[^_\s]+\s*[=+-]/.test(raw)) {
    return {
      raw,
      reason: 'chybi_skala',
      detail: 'ID má tvar `S_<Postava>_<Skala>` nebo `R_<Vlastnik>_<Zdroj>`, chybí druhá část',
    }
  }

  return { raw, reason: 'nezname', detail: 'nedá se přečíst jako dopad na škálu ani na zdroj' }
}

/** The literal amount, when the impact carries no `{input}` placeholders. */
export const literalAmount = (impact: ScaleImpact): number | undefined => {
  if (impact.fromAnswer) return undefined

  let total = 0
  for (const term of impact.terms) {
    if (term.literal === undefined) return undefined
    total += term.sign * term.literal
  }

  return total
}

/** Placeholder names the impact needs the org to fill in, in order (§4.4). */
export const inputKeys = (impact: ScaleImpact): string[] => {
  const keys: string[] = []
  for (const term of impact.terms) {
    if (term.inputKey !== undefined) keys.push(term.inputKey)
  }

  return keys
}

/** Splits `S_Marie_Regime` into its parts; undefined when it is not an impact ID. */
export const splitImpactId = (
  externalId: string,
): { kind: ImpactKind; owner: string; key: string } | undefined => {
  const match = TARGET.exec(externalId.trim())
  if (!match) return undefined

  return {
    kind: match[1] === 'S' ? 'skala' : 'zdroj',
    owner: match[2] ?? '',
    key: match[3] ?? '',
  }
}
