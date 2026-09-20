/**
 * The questionnaire's extra rows as the import would fill them, built from an
 * `EngineConfig` with the keys of `fakeConfigRows` — so the questionnaire view
 * and the completion can be tested on the fixture without a database.
 */
import type { EngineConfig } from '@/engine'
import type { QuestionnaireRows } from '../types/questionnaire-rows'
import { fakeDbId } from './fake-config-rows'

export const fakeQuestionnaireRows = (config: EngineConfig): QuestionnaireRows => {
  const characterIds = new Set(config.characters.map((character) => character.id))

  const rows: QuestionnaireRows = {
    characters: config.characters.map((character) => ({
      id: fakeDbId('character', character.id),
      externalId: character.id,
      firstName: character.firstName,
      lastName: character.lastName,
    })),
    questions: [],
    answerOptions: [],
    effects: [],
    effectInputs: [],
  }

  for (const question of config.questions) {
    rows.questions.push({
      id: fakeDbId('question', question.id),
      text: question.text,
      helpText: null,
      source: 'player',
      pollQuestionId: question.pollId === undefined ? null : fakeDbId('question', question.pollId),
    })

    for (const option of question.options) {
      const optionId = fakeDbId('option', option.id)
      rows.answerOptions.push({ id: optionId, referencedCharacterId: null, isOther: option.isOther })

      let ordinal = 0
      for (const impact of option.impacts) {
        const effectId = fakeDbId('effect', `${option.id}#${ordinal}`)
        const isCharacter = characterIds.has(impact.owner)
        const isResource = impact.kind === 'resource'

        rows.effects.push({
          id: effectId,
          answerOptionId: optionId,
          ordinal,
          kind: `${impact.kind}_${impact.mode === 'absolute' ? 'set' : 'shift'}`,
          characterId: isCharacter ? fakeDbId('character', impact.owner) : null,
          relatedCharacterId: null,
          scaleId: isResource ? null : fakeDbId('scale', impact.key),
          resourceId: isResource ? fakeDbId('resource', impact.key) : null,
          resourceTarget: !isResource ? null : !isCharacter ? 'household' : impact.forcedPrivate ? 'personal' : 'routed',
          householdExternalId: isResource && !isCharacter ? impact.owner : null,
        })
        impact.terms.forEach((term, termOrdinal) => {
          if (term.inputKey === undefined) return
          rows.effectInputs.push({ effectId, ordinal: termOrdinal, inputKey: term.inputKey })
        })
        ordinal += 1
      }

      for (const effect of option.effects) {
        rows.effects.push({
          id: fakeDbId('effect', `${option.id}#${ordinal}`),
          answerOptionId: optionId,
          ordinal,
          kind: effect.kind,
          characterId: fakeDbId('character', effect.members[0]),
          relatedCharacterId: fakeDbId('character', effect.members[1]),
          scaleId: null,
          resourceId: null,
          resourceTarget: null,
          householdExternalId: null,
        })
        ordinal += 1
      }
    }
  }

  return rows
}
