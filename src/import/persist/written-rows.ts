/** Database IDs the import wrote, per table; any other config row is stale. */
export interface WrittenRows {
  groups: Set<string>
  households: Set<string>
  characters: Set<string>
  scales: Set<string>
  characterScales: Set<string>
  resources: Set<string>
  characterResources: Set<string>
  householdResources: Set<string>
  contentBlocks: Set<string>
  blockVariations: Set<string>
  questions: Set<string>
  answerOptions: Set<string>
  effects: Set<string>
  effectInputs: Set<string>
}

export const createWrittenRows = (): WrittenRows => ({
  groups: new Set(),
  households: new Set(),
  characters: new Set(),
  scales: new Set(),
  characterScales: new Set(),
  resources: new Set(),
  characterResources: new Set(),
  householdResources: new Set(),
  contentBlocks: new Set(),
  blockVariations: new Set(),
  questions: new Set(),
  answerOptions: new Set(),
  effects: new Set(),
  effectInputs: new Set(),
})
