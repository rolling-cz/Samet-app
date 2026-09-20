# Session 4: Navigace a jádro přepočtu

_Kompletní specifikace je v `zadani-larp-engine.md`, pravidla platná v každé session v `CLAUDE.md` (včetně sekce „Pořadí dalších kroků"). Kde si zadání odporuje samo se sebou, platí konkrétní revidovaná sekce (tabulka na začátku `CLAUDE.md`)._

## Kde jsme

Engine je hotový a otestovaný (`src/engine/`, čistá funkce). Import `.xlsx` a šablon funguje, konfigurace je v databázi. Aplikace má rozvržení: hlavičku s přepínačem běhu, stavy kapitol, pět sekcí a levý panel se seznamem postav.

Dvě věci chybí:

- **Nejde se nikam dostat.** Postavy v levém panelu nejsou odkazy, stavy kapitol v hlavičce jsou jen popisky, stránka Postavy je zástupná.
- **`evaluate` nikdo nevolá.** Mimo `src/engine/`, testy a `scripts/engine-demo.ts` neexistuje kód, který by načetl stav a odpovědi z databáze, pustil engine a výsledek uložil.

## Co se staví teď

Dvě na sobě nezávislé části. Začni navigací — je krátká.

1. **Navigace po postavách a kapitolách.**
2. **Jádro přepočtu bez UI** — vrstva mezi databází a enginem.

**Žádná obrazovka přepočtu v téhle session.** Trace „proč", řešení konfliktů, náhled změn a editace mezivýstupu jsou session 6. Nanejvýš jedno tlačítko „Přepočítat" v sekci Přepočet, které vypíše verzi, počet konfliktů a počet chybějících odpovědí.

**Dotazník taky ne.** Ten je session 5 a staví na tom, co vznikne tady.

Proč tohle pořadí: dotazník kapitoly 2 a 3 je lookup ve vybraných variantách a stav pod ním je snapshot — obojí vzniká až uloženým přepočtem předchozí kapitoly (§4.3, §4.5). Bez jádra přepočtu by šel dotazník napsat jen pro kapitolu 1.

---

## Část 1: Navigace

### Tvar, který nesmí ustoupit

**Běh, kapitola i vybraná postava jsou v cestě URL.** Ne v cookie, ne ve stavu komponenty, ne v `localStorage`. Důvod je stejný jako u běhu: dvě záložky smějí držet dvě různé kapitoly nebo postavy a sdílený stav by jednu z nich tiše přepnul.

Doporučený tvar:

```
/beh/<runId>/kapitola/<n>/postavy/<characterId>
/beh/<runId>/kapitola/<n>/postavy
/beh/<runId>/kapitola/<n>/skupiny
/beh/<runId>/kapitola/<n>/prepocet
/beh/<runId>/kapitola/<n>/vystupy
/beh/<runId>/sprava
```

Postavy, Skupiny, Přepočet a Výstupy se týkají konkrétní kapitoly. **Správa kapitolu nemá** — konfigurace, archiv a audit patří běhu. Odchýlíš-li se od tohohle tvaru, napiš proč.

`<characterId>` v cestě je **ID postavy z registru** (`Marie`), ne databázové UUID. Adresa má jít přečíst a poslat kolegovi.

### Co navigace dělá

- **Stavy kapitol v hlavičce jsou odkazy.** Přepnutí kapitoly **zachová sekci i vybranou postavu**: z `kapitola/1/postavy/Marie` na `kapitola/2/postavy/Marie`.
- **Položky levého panelu jsou odkazy** na tutéž kapitolu a sekci Postavy. Vybraná postava je v panelu vyznačená (data atribut, ne podmíněná třída).
- **Přepnutí sekce zachová kapitolu.**
- **Přepnutí běhu** vede na stejnou sekci a kapitolu druhého běhu, **bez postavy** — ID postav se mezi běhy shodovat nemusí.
- **Panel si drží pozici rolování** při přepínání postav i kapitol (§6.4). Žije v layoutu běhu; ověř, že ho změna kapitoly neodmontuje.
- **Výchozí adresy:** `/beh/<runId>` přesměruje na **první kapitolu, která není `released`** (jsou-li vydané všechny, na poslední). `/kapitola/<n>/postavy` bez postavy ukáže výzvu k výběru, nikoho nevybírá sám.
- **Neplatná kapitola nebo neznámá postava v adrese** je `not-found`, ne pád a ne tiché přesměrování.
- **Kapitola, kterou ještě nejde otevřít** (kapitola 2 bez potvrzeného přepočtu kapitoly 1), **není `not-found`**. Stránka existuje a říká, co chybí. V téhle session stačí zástupný text; rozhodovací metodu dodá část 2.

Stará adresa `/beh/<runId>/postavy` (a další sekce bez kapitoly) přesměruje na výchozí kapitolu, ať nezůstanou mrtvé odkazy.

---

## Část 2: Jádro přepočtu

### Tvar, který nesmí ustoupit

```
načti(runId, kapitola) → { stav, odpovědi, konfigurace, hody }
evaluate(stav, odpovědi, konfigurace) → výsledek
ulož(výsledek) — jedna transakce, nový řádek, nic se nepřepisuje
```

- **Žije mimo `src/engine/`.** Engine o databázi neví a ESLint nepustí import ven ani dovnitř.
- **K datům jen přes `forRun(runId)`.** Chybí-li dotaz, přidej metodu do `RunScope` (`src/db/run-scope.ts`), ne obcházení.
- **Převody mezi databází a enginem jsou čisté funkce.** „Řádky → `RunState`", „řádky → `AnswerInput[]`", „`EvaluateResult` → řádky k zápisu" nesahají na databázi a dají se otestovat bez ní. Na databázi sahá jen tenká slupka, která je volá.
- **Engine mluví ID z tabulky** (`Marie`, `Q_Marie_1_1`, `V_Marie_2_Historie_1_A`), **databáze UUID.** Mapování je na jednom místě, oběma směry, a neznámé ID je hlasitá chyba.
- **Každý přepočet je nový řádek v `computations`**, nikdy update (pravidlo 3). `version` roste per kapitola. Dry-run jde pustit stokrát.
- **Jedna transakce.** Buď je uložené všechno (přepočet, snapshot, vybrané varianty, nové hody, audit), nebo nic.

### 1. Načtení vstupů

**Konfigurace [ROZHODNUTO]: z archivovaného `.xlsx`, ne z tabulek.** `toEngineConfig` bere `ParsedConfig` z naparsovaného souboru. Jádro vezme **poslední úspěšně naimportovanou nahrávku** z `uploaded_files`, pustí `importWorkbook` + `toEngineConfig` a její ID zapíše do `config_upload_id` — přepočet tak dostane přesně ten soubor, na který pak ukazuje. Druhý převodník „tabulky → `EngineConfig`" se nepíše (~200 řádků duplicitní logiky včetně odvozených dopadů efektů domácností). Nahrávka s chybami se nikdy nepoužije. Tabulky v databázi slouží UI; s enginem je pojí ID z tabulky autora.

**Stav.**

- Kapitola 1: `createInitialState(config)`.
- Kapitola N ≥ 2: snapshot **výchozího přepočtu** kapitoly N−1 (viz níže) — škály, osobní účty, členství v domácnostech, společné účty a **vybrané varianty celého běhu** (`RunState.selectedVariants` nese všechny kapitoly až po N).

**Výchozí přepočet kapitoly** = ten, ze kterého vychází další kapitola: vydaný (`is_released`), jinak poslední potvrzený (`status = 'confirmed'`). **Z draftu se nikdy nevychází** — je to dry-run. Nemá-li kapitola N−1 výchozí přepočet, kapitolu N nejde ani přepočítat, ani pro ni sestavit dotazník.

**Odpovědi.** Všech kapitol **až po N včetně**, ne jen kapitoly N — podmínky čtou starší odpovědi a engine díky uloženým variantám pozná, že některá chybí. Převod podle typu:

| Typ | Odkud |
| --- | ----- |
| `bool` | `bool_value` → ID odpovědi `…_Ano` / `…_Ne` |
| `single`, `multi`, `poll-answer` | `answer_selected_options` |
| `scale_direct`, `resource_direct` | `numeric_value` jako `value` + jediná volba otázky |
| `_OTHER_` | `text_value` jako `freeText` |
| `{input}` hodnoty | **tabulka chybí**, viz „Schéma" |

**Hody.** Všechny uložené z `dice_rolls`.

### 2. Hody kostkou (§7.4)

Engine náhodu negeneruje; vrátí `missingRolls`. **Hází volající vrstva:**

1. `evaluate` vrátí chybějící hody.
2. Jádro je hodí (1–100), uloží do `dice_rolls` a pustí `evaluate` znovu.
3. Opakuje se, dokud něco chybí — další hod se může objevit až po rozhodnutí předchozího. **S horní mezí počtu kol**; při překročení chyba, nikdy smyčka.

Uložený hod se **nikdy nepřehazuje** přepočtem. „Přehodit" a ruční přepis jsou akce orga pro pozdější session.

### 3. Uložení výsledku

V jedné transakci:

- **`computations`**: nový řádek, `version` + 1, `status = 'draft'`, `result_json` (celý `EvaluateResult.state`), `trace_json`, `conflicts_json`, `engine_version`, `config_upload_id`, `input_hash`, `created_by` z `readAuthor`.
- **Snapshot** s `computation_id`: `character_scale_values` (u oříznuté škály `was_clamped` + `raw_value` z trace), `character_resource_values`, `household_memberships`, `household_resource_values`.
- **`selected_variations`** — **hned při přepočtu**, ne až při generování dokumentů. Jeden řádek na rozhodnutý blok kapitoly N+1. Blok nerozhodnutý kvůli hodu řádek nemá (po kroku 2 by žádný takový zbýt neměl).
- **Nové hody** z kroku 2.
- **`audit_log`**: kdo, kdy, která kapitola, která verze.

`input_hash` je otisk vstupů (stav + odpovědi + konfigurace + hody). Stejný vstup s jiným výsledkem je poplach (§2).

### 4. Potvrzení

`confirmComputation(computationId)`:

- **odmítne**, má-li přepočet neprázdné `conflicts` — konflikt rozhoduje org, ne kód,
- nastaví `status = 'confirmed'`, `confirmed_at`, `confirmed_by` a kapitolu na `computed`,
- zapíše audit.

Vydání kapitoly (`released`) sem **nepatří** — přijde s výstupy.

### 5. Čtení pro dotazník

Session 5 se na otázky a stav ptá **výhradně** přes tyhle metody, nic si neskládá sama. Patří do `RunScope` nebo do `src/core/` — tam, kam dosáhne víc feature.

| Metoda | Vrací |
| ------ | ----- |
| otázky položené postavě v kapitole N | kapitola 1: všechny její otázky. Kapitola N ≥ 2: otázky bez `Condition` + ty, jejichž `Variation ID` je ve vybraných variantách **výchozího přepočtu kapitoly N−1**. `poll` sám se nevrací, `poll-answer` ano. |
| stav postavy před kapitolou N | škály s `Min`/`Max`, osobní účty, domácnost a její společné účty, s kým je sdílí. Kapitola 1: výchozí hodnoty z konfigurace. |
| lze kapitolu N otevřít? | `ano`, nebo důvod (chybí výchozí přepočet kapitoly N−1) |
| co brání přepočtu kapitoly N | seznam položených a nezodpovězených otázek per postava |

**Když výchozí přepočet kapitoly N−1 chybí, metoda pro otázky nevrací „všechny otázky".** Vrací, že dotazník sestavit nejde. Ukázat všechno by znamenalo zeptat se na otázky, které se pokládat neměly.

### Schéma — co chybí

Ověř proti `src/db/schema/` a doplň migrací (`npm run db:generate`, pak `npm run db:reset` — migrace musí sednout načisto):

1. **Hodnoty `{input}` polí nemají kam.** `effect_inputs` popisuje pole na straně konfigurace, zadané číslo se neukládá nikde. Přitom je to **součást odpovědi**, stejně jako číslo u `scale_direct` (`numeric_value`): org ho zadá v dotazníku, přepočet se pouští jindy a jinde a **opakovaně** — každý dry-run i přepočet po opravě ho musí najít znovu, a po hře má jít dohledat, kolik kdo do společného vložil. Potřeba je tabulka odpověď × volba × název pole → celé číslo (`run_id`, složené cizí klíče, unikát na trojici; vázaná na `answers` a `answer_options`, ne na `answer_selected_options` — sňatek je `bool` otázka a ta vybrané volby neukládá). Dotazník ji začne plnit v session 5; jádro ji musí umět číst už teď.
2. **`dice_rolls` [ROZHODNUTO]: hod patří variantě.** Sloupce `character_id` a `chapter_id` se **ruší**, unikát je `(run_id, block_variation_id, occurrence)`. Vlastníka (postava **nebo skupina**) i kapitolu říká blok varianty, takže se nic neukládá dvakrát a hod skupinového bloku má kam. Obecný `owner_id` ne — neměl by cizí klíč a pravidlo 2 chce každý odkaz uvnitř běhu jako složený cizí klíč. Vlastníka pro engine (`RollOwner`) jádro odvodí z bloku.

Pozor na pořadí migrací: nový unikát a cizí klíč, který na něj míří, patří do dvou migrací (viz „Postup práce" v `CLAUDE.md`).

## Testy

Čisté převody se testují, zápis do databáze se ověřuje ručně.

1. Řádky výchozího stavu → `RunState` shodný s `createInitialState` nad `fixture-platny.xlsx`
2. `RunState` → řádky snapshotu → `RunState` je identita (včetně domácností a vybraných variant)
3. Převod odpovědí pro každý typ otázky: `bool`, `single`, `multi` s `_OTHER_`, `poll-answer`, `scale_direct`, `resource_direct`, odpověď s `{input1}` / `{input2}`
4. Neznámé ID při mapování (oběma směry) je chyba, ne vynechaný řádek
5. Oříznutá škála se do snapshotu zapíše s `was_clamped` a `raw_value`
6. Otázky položené v kapitole 2 odpovídají `EvaluateResult.questions` z přepočtu kapitoly 1 (`src/testing/fixture-run.ts`)
7. Bez výchozího přepočtu kapitoly N−1 metoda pro otázky nevrací otázky, ale důvod
8. `input_hash`: stejný vstup → stejný otisk, změna jedné odpovědi → jiný
9. Smyčka hodů skončí po konečném počtu kol a při překročení meze vyhodí chybu

## Na co si dát pozor

- **Nepouštěj databázi do enginu a engine do databáze.** Slupka načte, čisté funkce převedou, engine spočítá, slupka uloží.
- **Neopravuj vstupy.** Chybí-li odpověď, engine vyhodí `missing_answer`. Jádro chybu **přeloží na seznam chybějících** (§6.3) a přepočet nespustí — nikdy nic nedoplní.
- **Chyba enginu nesmí shodit aplikaci.** `EngineInputError` nese seznam problémů; akce ho vrátí jako data, ne jako pád stránky.
- **Nic nepřepisuj.** Žádný update snapshotu ani přepočtu. Výjimkou je stav kapitoly a potvrzení přepočtu.
- **`run_id` všude.** Každá nová tabulka ho nese a odkazy uvnitř běhu jsou složené cizí klíče; hlídá to `src/db/schema.test.ts`.
- **Nestav UI přepočtu.** Jakmile začneš kreslit trace, jsi v session 6.
- **Jméno autora čte server z cookie** (`readAuthor`), formulář ho neposílá.

## Na konci

Rozšiř `scripts/seed.ts` (nebo přidej `scripts/compute-demo.ts`) tak, aby nad `fixture-platny.xlsx` zadal odpovědi kapitoly 1, pustil přepočet **přes jádro, ne přímo přes `evaluate`**, potvrdil ho a vypsal:

- verzi přepočtu, počet konfliktů a hozené hody,
- Mariin stav před kapitolou 2 přečtený **z databáze**,
- otázky, které se Marii v kapitole 2 položí.

Výsledek musí sedět s `scripts/engine-demo.ts`. Napiš, jak jsi vyřešil obě změny schématu a kde ti zadání nestačilo.
