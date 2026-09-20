import { householdExternalId, type RunState } from '@/engine'
import { HOUSEHOLD_INPUT_KEYS, HOUSEHOLD_TRANSFER_RESOURCE_KEY } from '@/import/constants/household-effects'
import { groupBy } from '@/utils/group-by'
import { UnknownIdError } from '../errors/unknownIdError'
import type { AskedQuestion } from '../types/asked-question'
import type { ConfigRows } from '../types/config-rows'
import type { IdDirectory } from '../types/id-directory'
import type { EnteredAnswerRows, QuestionnaireRows } from '../types/questionnaire-rows'
import type {
  AnswerView,
  DirectTargetView,
  HouseholdEffectView,
  InputFieldView,
  OptionView,
  PersonView,
  QuestionView,
  QuestionnaireView,
} from '../types/questionnaire-view'
import { characterStateView } from './character-state-view'
import { inputKeysByOption } from './input-keys-by-option'

type EffectRow = QuestionnaireRows['effects'][number]
type OptionRow = ConfigRows['answerOptions'][number]

const byOrdinal = (a: { ordinal: number | null }, b: { ordinal: number | null }): number =>
  (a.ordinal ?? 0) - (b.ordinal ?? 0)

const isHouseholdEffect = (effect: EffectRow): effect is EffectRow & { kind: HouseholdEffectView['kind'] } =>
  effect.kind === 'household_create' || effect.kind === 'household_dissolve'

interface ViewContext {
  config: ConfigRows
  directory: IdDirectory
  state: RunState
  people: ReadonlyMap<string, PersonView>
  effectsByOption: ReadonlyMap<string, EffectRow[]>
  inputKeys: ReadonlyMap<string, string[]>
  optionDetails: ReadonlyMap<string, QuestionnaireRows['answerOptions'][number]>
}

const personOf = (context: ViewContext, characterDbId: string): PersonView => {
  const person = context.people.get(characterDbId)
  if (!person) throw new UnknownIdError('character', characterDbId, 'to_config')

  return person
}

/** `{input1}` is the first member of the effect as the author wrote it, whatever the household ID's order (§4.4). */
const householdMembers = (context: ViewContext, effect: EffectRow): [PersonView, PersonView] | undefined =>
  effect.characterId === null || effect.relatedCharacterId === null
    ? undefined
    : [personOf(context, effect.characterId), personOf(context, effect.relatedCharacterId)]

const optionView = (context: ViewContext, option: OptionRow): OptionView => {
  const details = context.optionDetails.get(option.id)
  const effects = [...(context.effectsByOption.get(option.id) ?? [])].sort(byOrdinal)
  const householdEffect = effects.find(isHouseholdEffect)
  const members = householdEffect ? householdMembers(context, householdEffect) : undefined

  const inputs: InputFieldView[] = (context.inputKeys.get(option.id) ?? []).map((key) => {
    const memberIndex = (HOUSEHOLD_INPUT_KEYS as readonly string[]).indexOf(key)
    const person = members?.[memberIndex]

    return person ? { key, person } : { key }
  })

  const view: OptionView = {
    id: option.externalId,
    label: option.label,
    isOther: details?.isOther ?? false,
    inputs,
  }
  if (details?.referencedCharacterId) view.referencedPerson = personOf(context, details.referencedCharacterId)
  if (householdEffect && members) {
    const householdId = householdExternalId(members[0].id, members[1].id)
    const jointBalance = context.state.households[householdId]?.resources[HOUSEHOLD_TRANSFER_RESOURCE_KEY]
    view.householdEffect =
      jointBalance === undefined
        ? { kind: householdEffect.kind, householdId }
        : { kind: householdEffect.kind, householdId, jointBalance }
  }

  return view
}

const scaleTarget = (context: ViewContext, effect: EffectRow, questionCharacterId: string): DirectTargetView => {
  const ownerDbId = effect.characterId ?? questionCharacterId
  const pair = context.config.characterScales.find(
    (row) => row.characterId === ownerDbId && row.scaleId === effect.scaleId,
  )
  if (!pair || effect.scaleId === null) throw new UnknownIdError('scale pair', effect.id, 'to_config')

  const owner = personOf(context, ownerDbId)
  const key = context.directory.scales.toExternal(effect.scaleId)
  const value = context.state.characters[owner.id]?.scales[key]
  if (value === undefined) throw new UnknownIdError('scale value', pair.externalId, 'to_config')

  return {
    _type: 'scale',
    externalId: pair.externalId,
    label: context.config.scales.find((scale) => scale.id === effect.scaleId)?.label ?? key,
    owner,
    min: pair.minValue,
    max: pair.maxValue,
    value,
  }
}

const resourceTargetView = (context: ViewContext, effect: EffectRow, questionCharacterId: string): DirectTargetView => {
  if (effect.resourceId === null) throw new UnknownIdError('resource', effect.id, 'to_config')

  const key = context.directory.resources.toExternal(effect.resourceId)
  const label = context.config.resources.find((resource) => resource.id === effect.resourceId)?.label ?? key

  if (effect.resourceTarget === 'household' && effect.householdExternalId !== null) {
    const household = context.state.households[effect.householdExternalId]
    const members = (household?.memberIds ?? []).map((memberId) =>
      personOf(context, context.directory.characters.toDb(memberId)),
    )
    const account = { _type: 'household' as const, householdId: effect.householdExternalId, members }
    const value = household?.resources[key]

    return value === undefined ? { _type: 'resource', label, account } : { _type: 'resource', label, account, value }
  }

  // An absolute setting never uses a routed name (§4.4); the import checks it.
  const owner = personOf(context, effect.characterId ?? questionCharacterId)
  const value = context.state.characters[owner.id]?.resources[key]
  const account = { _type: 'personal' as const, owner }

  return value === undefined ? { _type: 'resource', label, account } : { _type: 'resource', label, account, value }
}

const directTarget = (
  context: ViewContext,
  question: AskedQuestion,
  ownOptions: readonly OptionRow[],
): DirectTargetView | undefined => {
  if (question.characterId === null) return undefined

  for (const option of ownOptions) {
    for (const effect of context.effectsByOption.get(option.id) ?? []) {
      if (question.type === 'scale_direct' && effect.kind === 'scale_set') {
        return scaleTarget(context, effect, question.characterId)
      }
      if (question.type === 'resource_direct' && effect.kind === 'resource_set') {
        return resourceTargetView(context, effect, question.characterId)
      }
    }
  }

  return undefined
}

const answerViews = (entered: EnteredAnswerRows, directory: IdDirectory): Map<string, AnswerView> => {
  const selectedByAnswer = groupBy(entered.selectedOptions, (row) => row.answerId)
  const inputsByAnswer = groupBy(entered.inputValues, (row) => row.answerId)
  const views = new Map<string, AnswerView>()

  for (const answer of entered.answers) {
    const inputValues: AnswerView['inputValues'] = {}
    for (const row of inputsByAnswer.get(answer.id) ?? []) {
      const optionId = directory.answerOptions.toExternal(row.answerOptionId)
      inputValues[optionId] = { ...inputValues[optionId], [row.inputKey]: row.value }
    }

    views.set(answer.questionId, {
      boolValue: answer.boolValue,
      numericValue: answer.numericValue,
      textValue: answer.textValue,
      selectedOptionIds: (selectedByAnswer.get(answer.id) ?? []).map((row) =>
        directory.answerOptions.toExternal(row.answerOptionId),
      ),
      inputValues,
      answeredBy: answer.answeredBy,
      answeredAt: answer.answeredAt.toISOString(),
    })
  }

  return views
}

/**
 * One character's questionnaire: the asked questions in sheet order with
 * everything the form shows, and the state before the chapter under it. The
 * questions come in already decided — nothing here evaluates a condition.
 */
export const questionnaireView = (
  characterId: string,
  asked: readonly AskedQuestion[],
  config: ConfigRows,
  details: QuestionnaireRows,
  entered: EnteredAnswerRows,
  state: RunState,
  directory: IdDirectory,
): QuestionnaireView => {
  const people = new Map<string, PersonView>(
    details.characters.map((row) => [row.id, { id: row.externalId, firstName: row.firstName, lastName: row.lastName }]),
  )
  const context: ViewContext = {
    config,
    directory,
    state,
    people,
    effectsByOption: groupBy(details.effects, (effect) => effect.answerOptionId),
    inputKeys: inputKeysByOption(details),
    optionDetails: new Map(details.answerOptions.map((option) => [option.id, option])),
  }

  const questionDetails = new Map(details.questions.map((question) => [question.id, question]))
  const optionsByQuestion = groupBy(config.answerOptions, (option) => option.questionId)
  const answers = answerViews(entered, directory)

  const questions: QuestionView[] = []
  for (const question of [...asked].sort(byOrdinal)) {
    if (question.characterExternalId !== characterId || question.type === 'poll') continue

    const own = questionDetails.get(question.id)
    if (!own) throw new UnknownIdError('question', question.id, 'to_config')

    // A vote shows its poll: one source of text, options and effects (§6.6).
    const shownId = own.pollQuestionId ?? question.id
    const shown = questionDetails.get(shownId)
    if (!shown) throw new UnknownIdError('question', shownId, 'to_config')

    const options = [...(optionsByQuestion.get(shownId) ?? [])].sort(byOrdinal)
    const view: QuestionView = {
      id: question.externalId,
      ordinal: question.ordinal ?? 0,
      type: question.type,
      source: own.source,
      text: shown.text,
      helpText: shown.helpText,
      options: options.map((option) => optionView(context, option)),
    }
    if (own.pollQuestionId !== null) view.pollId = directory.questions.toExternal(own.pollQuestionId)

    const target = directTarget(context, question, options)
    if (target) view.target = target

    const answer = answers.get(question.id)
    if (answer) view.answer = answer

    questions.push(view)
  }

  const stateView = characterStateView(state, characterId, config, directory)

  return {
    character: personOf(context, directory.characters.toDb(characterId)),
    questions,
    state: stateView,
    partners: (stateView.household?.partnerIds ?? []).map((partnerId) =>
      personOf(context, directory.characters.toDb(partnerId)),
    ),
  }
}
