import { HOUSEHOLD_MEMBERS } from '../constants/household-members'
import {
  ANSWER_EFFECTS,
  EFFECT_ARGUMENT_SEPARATOR,
  EFFECT_SEPARATOR,
  type AnswerEffectName,
} from '../constants/sheet-vocabulary'
import type { IssueCollector } from '../issue-collector'
import type { IssueLocation } from '../types/issue'
import type { ParsedAnswerEffect } from '../types/parsed-question'

/** `HOUSEHOLD_CREATE(Marie, Mirek)` in the `Effects` column (§4.4). */
const EFFECT_CALL = /^([A-Z_]+)\s*\(([^)]*)\)$/

/**
 * The `Effects` column (§4.4, layer 2).
 *
 * Only the syntax is settled here — whether the arguments are characters the
 * registry knows is a validation question, so one unknown ID does not cost the
 * author the rest of the report.
 */
export const parseAnswerEffects = (
  cell: string,
  answerId: string,
  location: IssueLocation,
  issues: IssueCollector,
): ParsedAnswerEffect[] => {
  const effects: ParsedAnswerEffect[] = []

  for (const part of cell.split(EFFECT_SEPARATOR)) {
    const raw = part.trim()
    if (raw === '') continue

    const match = EFFECT_CALL.exec(raw)
    if (!match) {
      issues.error(
        'invalid_effect',
        location,
        `Efekt „${raw}" u odpovědi \`${answerId}\` se nedá přečíst — čeká se tvar \`NAZEV(Postava1, Postava2)\`, například \`HOUSEHOLD_CREATE(Marie, Mirek)\`.`,
        { value: raw },
      )
      continue
    }

    const name = match[1] ?? ''
    if (!isKnownEffect(name)) {
      issues.error(
        'invalid_effect',
        location,
        `Neznámý efekt \`${name}\` u odpovědi \`${answerId}\` — k dispozici jsou ${ANSWER_EFFECTS.join(', ')}.`,
        { value: name },
      )
      continue
    }

    const args = splitArguments(match[2] ?? '')
    if (args.length !== HOUSEHOLD_MEMBERS) {
      issues.error(
        'invalid_effect',
        location,
        `Efekt \`${raw}\` u odpovědi \`${answerId}\` má ${args.length} argumentů — \`${name}\` jich čeká ${HOUSEHOLD_MEMBERS}, ID obou postav domácnosti.`,
        { value: raw },
      )
      continue
    }

    effects.push({ name, args, raw, location })
  }

  return effects
}

const isKnownEffect = (name: string): name is AnswerEffectName =>
  (ANSWER_EFFECTS as readonly string[]).includes(name)

const splitArguments = (list: string): string[] => {
  const args: string[] = []
  for (const part of list.split(EFFECT_ARGUMENT_SEPARATOR)) {
    const argument = part.trim()
    if (argument !== '') args.push(argument)
  }

  return args
}
