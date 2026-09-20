/**
 * One item of the `Scale and Resources Impact` column (§4.2), already parsed.
 *
 * The engine never sees the cell text: the import splits it, and this is the
 * shape it hands over. The `_private` suffix and the household ID are kept as
 * written, because which account a plain `R_Marie_Wealth` lands on is decided
 * only after the structural phase (§4.4).
 */

/**
 * One summand of an amount: a literal number, or a named `{input}` the org
 * fills in. The amount is the signed sum of the terms, so `-{input1}-{input2}`
 * is two terms and a plain `+3` is one.
 */
export interface ImpactTerm {
  sign: 1 | -1
  literal?: number
  /** `{input}` placeholder name, without braces. */
  inputKey?: string
}

export interface ImpactDefinition {
  /** Canonical ID without the `_private` suffix, e.g. `S_Marie_Regime`. */
  externalId: string
  kind: 'skala' | 'zdroj'
  /** A character, or — for a resource — a household. */
  owner: string
  key: string
  /** The author wrote `_private`: personal account even in a marriage (§4.4). */
  forcedPrivate: boolean
  /** `posun` shifts by the amount, `absolutni` sets it outright (§6.7). */
  mode: 'posun' | 'absolutni'
  /** `=VALUE`: the number comes from the org's answer, not from the sheet. */
  fromAnswer: boolean
  terms: ImpactTerm[]
  /** The text this came from, quoted in the trace and in error messages. */
  raw: string
  /**
   * The household effect this impact was derived from (§4.4). The author wrote
   * no such line, so the trace has to name the effect instead.
   */
  derivedFrom?: string
}
