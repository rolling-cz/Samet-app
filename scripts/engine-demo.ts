/**
 * Runs the engine over `documents/fixture-platny.xlsx` and prints everything it
 * says about Marie in chapter 2: her state, every trace entry that touches her,
 * her blocks for chapter 3 and her chapter 3 questionnaire.
 *
 *   npx tsx scripts/engine-demo.ts
 */
import { runFixture } from '../src/testing/fixture-run'
import type { TraceEntry } from '../src/engine'

const CHARACTER = 'Marie'

const concerns = (entry: TraceEntry): boolean => {
  switch (entry.kind) {
    case 'anketa':
      return entry.tally.some((row) => row.voterIds.includes(CHARACTER))
    case 'domacnost_vznik':
    case 'domacnost_zanik':
      return entry.memberIds.includes(CHARACTER)
    case 'nastaveni_skaly':
    case 'zmena_skaly':
    case 'orez':
      return entry.characterId === CHARACTER
    case 'nastaveni_zdroje':
    case 'zmena_zdroje':
      return entry.account.kind === 'osobni'
        ? entry.account.characterId === CHARACTER
        : entry.account.memberIds.includes(CHARACTER)
    case 'varianta':
    case 'otazka':
      return entry.characterId === CHARACTER
    case 'konflikt':
      return true
  }
}

const { chapter1, chapter2 } = runFixture()
const show = (title: string, value: unknown): void => {
  console.log(`\n=== ${title} ===`)
  console.log(JSON.stringify(value, null, 2))
}

show(`Stav ${CHARACTER} po kapitole 1`, { ...chapter1.state.characters[CHARACTER], households: chapter1.state.households })
show(`Stav ${CHARACTER} po kapitole 2`, { ...chapter2.state.characters[CHARACTER], households: chapter2.state.households })
show('Trace kapitoly 2 (jen záznamy týkající se Marie)', chapter2.trace.filter(concerns))
show('Konflikty', chapter2.conflicts)
show('Chybějící hody', chapter2.missingRolls)
show('Vybrané varianty pro kapitolu 3', chapter2.variants.filter((variant) => variant.characterId === CHARACTER))
show('Otázky kapitoly 3', chapter2.questions.filter((gate) => gate.characterId === CHARACTER))
