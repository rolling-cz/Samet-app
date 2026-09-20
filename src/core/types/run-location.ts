import type { RunSection } from '../constants/routes'

/** Where inside a run the address points; every part may be absent (the run list, Správa). */
export interface RunLocation {
  section?: RunSection
  chapter?: number
  /** Registry ID of the selected character, e.g. `Marie`. */
  characterId?: string
}
