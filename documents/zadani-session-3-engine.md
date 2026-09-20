# Session 3: Engine pravidel

_Kompletní specifikace je v `zadani-larp-engine.md`, pravidla platná v každé session v `CLAUDE.md`. Kde si zadání odporuje samo se sebou, platí konkrétní revidovaná sekce (tabulka na začátku `CLAUDE.md`)._

## Kde jsme

Schéma stojí, import `.xlsx` funguje, validace hlásí chyby, běh jde založit a přepnout. V databázi je konfigurace: postavy (i s výchozími domácnostmi), škály, zdroje, otázky s odpověďmi, bloky s variantami, šablony.

Chybí to hlavní — **něco, co z odpovědí spočítá nový stav.**

## Co se staví teď

**Engine. Nejrizikovější část celého projektu.** Na ní stojí všechno ostatní a nejde ji odbýt ani vypustit. Proto přichází brzy, dokud je čas ji předělat.

**Žádné UI v téhle session.** Engine se testuje testy, ne klikáním.

## Tvar, který nesmí ustoupit

```ts
evaluate(stav, odpovědi, konfigurace) → { novýStav, trace[], konflikty[] }
```

- **Čistá funkce.** Bez databáze, bez sítě, bez Reactu, bez `async`. Nic z `app/` ani z ostatních vrstev se sem neimportuje; hlídá to ESLint (`no-restricted-imports`).
- Žije v `src/engine/`.
- Stejný vstup dá vždy stejný výstup. Hody kostkou přicházejí **jako součást vstupu**, engine je negeneruje (§7.4).
- `trace[]` není doplněk. Je to **hlavní výstup vedle nového stavu** a podklad pro vysvětlení „proč“ v UI.

Volající kód načte data z databáze, zavolá `evaluate` a výsledek uloží. Engine o databázi neví.

**Vstup**

- `stav` — škály a zdroje postav, společné účty domácností a domácnost každé postavy (§4.3). Pro kapitolu 1 vychází z `Scales`, `Resources` a sloupce `Household` v `Characters`, od kapitoly 2 ze snapshotu po předchozí kapitole.
- `odpovědi` — odpovědi včetně hodnot zadaných do inputů (`{input}`, `=VALUE`) a uložených hodů.
- `konfigurace` — převod z databáze (`src/import/to-engine-config.ts`).

## Co engine dělá

### 1. Vyhodnocování výrazů

Podmínky jsou výrazy v jedné buňce (§4.5), například:

```
A_Marie_1_1_Mirek AND R_Marie_Wealth >= 7
!A_Marie_1_1_Mirek AND RANDOM(50)
R_Marie_Wealth_private >= 7
DEFAULT
```

- **Parser nepiš.** Použij `jsep` a napiš vlastní vyhodnocení nad jeho stromem. Definice jazyka je v `src/engine/constants/expressionLanguage.ts`, ze které čte i import.
- `AND` a `OR` se registrují jako binární operátory (`AND` váže silněji). Autorovo jednoduché `=` se před parsováním přepíše na `==`, pozor na `<=`, `>=`, `!=`.
- Podporované prvky:
  - odpovědi (`A_...`) a negace `!`,
  - škály se srovnáním (`S_Marie_Regime >= 7`),
  - zdroje se srovnáním (`R_Marie_Wealth >= 7`) — bez přípony se **směrují** stejně jako dopady (§3 níže), `_private` míří na osobní účet,
  - výsledek ankety — ID vítězné odpovědi z definice `poll` (§5 níže),
  - `AND`, `OR`, závorky,
  - `RANDOM(n)` — **jen v podmínkách variant bloků**, v podmínkách otázek nikdy,
  - `DEFAULT` nebo prázdná buňka — vždy pravdivé, oba zápisy jsou totéž.
- **Příznaky (`F_...`) žádné nejsou.** Stav nesou škály a zdroje.
- Neznámý identifikátor je **chyba, ne nepravda**. Tiché vyhodnocení překlepu na `false` je nejhorší možné chování — dlouho to vypadá, že všechno funguje.

### 2. Fáze přepočtu (§7.3)

Pořadí fází je fixní a nesmí záviset na pořadí řádků v tabulce:

1. Sběr odpovědí
2. **Strukturální efekty** — vznik a zánik domácností. Nejdřív všechny `HOUSEHOLD_DISSOLVE`, potom `HOUSEHOLD_CREATE`.
3. **Hodnotové efekty** — nejdřív absolutní nastavení z organizátorských otázek, pak posuny škál a zdrojů (včetně dopadů odvozených z efektů domácností)
4. Detekce zbylých konfliktů

Potom se nad hotovým stavem vyberou varianty bloků a vyhodnotí podmínky otázek (§6 níže).

**Fáze 2 celá před fází 3.** Zdroje musí vědět, kdo do domácnosti patří, dřív než se do nich začnou sčítat příspěvky. Kdo se v téhle kapitole oženil, tomu už příspěvky z téže kapitoly jdou na společný účet; kdo se rozvedl, na osobní.

Rozdělení efektů do fází je v datech (`STRUCTURAL_EFFECT_KINDS`, `VALUE_EFFECT_KINDS` v `src/engine/constants/effectPhases.ts`), aby ho implementace `evaluate` nešla omylem obejít.

### 3. Zdroje, domácnosti a směrování (§4.4)

- **Škála patří vždy postavě.** **Zdroj** patří postavě (osobní účet) **nebo domácnosti** (společný účet). Obojí existuje vedle sebe a **osobní účet sňatkem nezaniká**.
- Postava svobodná zapisuje na osobní účet.
- **Směrování dopadu na zdroj** podle stavu po fázi 2:

  | Zápis                      | Kam to jde                                                                 |
  | -------------------------- | -------------------------------------------------------------------------- |
  | `R_Marie_Wealth+3`         | Marie v domácnosti → společný účet; jinak její osobní účet                 |
  | `R_Marie_Wealth_private+3` | **vždy osobní účet** — má přednost před směrováním                         |
  | `R_MarieMirek_Wealth+3`    | společný účet domácnosti (ID domácnosti = ID obou postav abecedně slepená) |

- **Otázka žádný příznak `Private` nenese** — na osobní účet míří jen přípona `_private` u konkrétního dopadu.
- **Absolutní nastavení musí být vždy explicitní.** `scale_direct` / `resource_direct` (`S_Marie_Regime=VALUE`, `R_Marie_Wealth_private=VALUE`) nesmí použít logické jméno zdroje. Hlídá to validace.
- **Příspěvky členů domácnosti se sčítají.** Když Marie i Mirek přinesou +2, společný účet vzroste o 4.
- **Zdroje se neořezávají.** Každá delta jde do trace.
- Postava smí být nejvýše v jedné domácnosti.

### 4. Efekty domácností (§4.4)

Sloupec `Effects` zná jen dva efekty. Sňatky a rozvody jsou **organizátorské otázky**, protože se týkají víc postav.

| Efekt                    | Význam                                 |
| ------------------------ | -------------------------------------- |
| `HOUSEHOLD_CREATE(A, B)` | Sňatek. Vznikne domácnost obou postav. |
| `HOUSEHOLD_DISSOLVE(A, B)` | Rozvod nebo úmrtí. Domácnost zaniká.   |

- Argumenty jsou ID postav z registru. ID domácnosti je abecedně (`MarieMirek`) a **nezávisí na pořadí argumentů**.
- **Efekt sám vyvolá vstupní pole a dopad na zdroje** — autor `Scale and Resources Impact` u takové odpovědi nepíše. `{input1}` je pole první postavy z efektu, `{input2}` druhé:

  ```
  HOUSEHOLD_CREATE(Marie, Mirek) →
    R_Marie_Wealth_private-{input1}, R_Mirek_Wealth_private-{input2},
    R_MarieMirek_Wealth+{input1}+{input2}

  HOUSEHOLD_DISSOLVE(Marie, Mirek) →
    R_MarieMirek_Wealth-{input1}-{input2},
    R_Marie_Wealth_private+{input1}, R_Mirek_Wealth_private+{input2}
  ```

- **Kolik kdo vloží do společného nebo si odnáší, zadává org.** Engine to nikdy nedopočítává ani nepůlí.
- **Nová domácnost začíná s nulovým společným účtem.** Účet se zvýší o součet inputů.
- **Po zániku žádný zůstatek nezůstává.** Zůstatek společného účtu se rozdělí mezi jeden nebo víc osobních účtů podle inputů — při rozvodu mezi bývalé manžele, při úmrtí celý na jeden účet (druhý input je 0). **Součet inputů se musí rovnat zůstatku**, jinak je to konflikt.

### 5. Ankety (§6.6)

- Anketa se skládá z `poll` (definice, není přiřazená k postavě) a `poll-answer` (hlas postavy).
- Vyhrává odpověď s **nejvíce hlasy**. **Při shodě rozhoduje pořadí řádků v definici ankety** (vyhrává dřívější). Remíza **není konflikt** — výsledek je deterministický.
- V podmínkách se na výsledek odkazuje ID vítězné odpovědi. Výraz platí, jen když tahle odpověď anketu vyhrála.
- **Efekty odpovědi ankety se aplikují jednou za vítěznou odpověď**, ne za každého hlasujícího.
- Nehlasovaly-li všechny postavy s `poll-answer`, přepočet nelze spustit — engine na to spadne nahlas.

### 6. Výběr variant bloků a podmínky otázek (§8.2)

- Varianty se procházejí **vzestupně podle `Priority`**; pokud ji nemá žádná varianta bloku, podle **pořadí řádků**. Použije se **první, jejíž podmínka platí**.
- `DEFAULT` (nebo prázdná podmínka) je vždy pravdivá, takže stojí poslední v pořadí vyhodnocení a zaručuje výsledek.
- Prázdný `Variation Text` je platná varianta — znamená „nic se nestalo“.
- Mezi variantami **nevznikají konflikty**. Priorita (nebo pořadí řádků) rozhoduje úplně.
- Zanořený blok se vyhodnocuje stejně jako každý jiný a ve stejném kontextu (postava, kapitola) jako blok, ve kterém stojí (§8.4).
- **Podmínky otázek** (`Condition` v `N_Questions`, od kapitoly 2) se vyhodnocují **společně s bloky**, stejným způsobem jako výběr varianty, nad hotovým stavem po hodnotové fázi. Vidí tedy i hodnotu, kterou org nastavil v téže kapitole.

### 7. Ořezávání škál

Rozsah `Min`–`Max` je **per dvojice postava × škála** (z listu `Scales`), hodnoty jsou celá čísla. Nikdy nepředpokládej 1–10. **Ořezává se po každém posunu** — hodnota škály nikdy není mimo rozsah, ani mezi dvěma posuny. Posuny se aplikují **ve sledu, v jakém jsou řádky** v tabulce. Překročení se ořízne na hranici (clamp) **a zapíše do trace** — je to signál špatně nastavených vah, ne detail k zamlčení.

### 8. Náhoda (§7.4)

`RANDOM(50)` znamená padesátiprocentní pravděpodobnost.

- **Každý výskyt `RANDOM` má vlastní hod.** Klíč hodu je `(postava, kapitola, varianta, pořadí výskytu ve výrazu)`. `RANDOM(50) AND RANDOM(50)` musí dát 25 %, ne 50 %.
- Hod se provede **jednou** a uloží. **Přepočet hod neopakuje**, použije uloženou hodnotu. Přehodit nebo přepsat ho lze jen ruční akcí orga.
- Engine sám nic negeneruje. Dostane uložené hody na vstupu a vrátí seznam hodů, které potřebuje a ještě nemá.

## Trace

U každé změny musí jít odpovědět „proč“, aniž by se kdokoli díval do kódu (§7.5, §2).

Záznam obsahuje: co se změnilo, z jaké hodnoty na jakou, jaká odpověď nebo efekt to způsobily, a **u sdílených zdrojů od koho změna přišla**. Navíc:

- u směrovaného zdroje **cílový účet a důvod směrování**,
- u dopadů odvozených z efektu domácnosti **efekt a zadané hodnoty**,
- každé **absolutní nastavení** z organizátorské otázky zvlášť viditelné,
- každý **ořez** škály.

Cílová podoba v UI:

> +3 Wealth → společný účet, Marie je v manželství s Mirkem Pokorným
>
> −3 Wealth, zdroj: odpověď Mirka Pokorného na Q_Mirek_2_1

Trace piš jako strukturovaná data, ne jako hotové věty. Formulace patří do UI.

## Konflikty

Co engine **nesmí rozhodnout sám**, vrátí v `konflikty[]` a rozhodne org:

- nedopočítaná hodnota (`unresolved_value`),
- `HOUSEHOLD_CREATE` pro postavu, která už v domácnosti je,
- `HOUSEHOLD_DISSOLVE` domácnosti, která neexistuje, a dopad výslovně na společný účet domácnosti, která v tu chvíli neexistuje,
- `HOUSEHOLD_DISSOLVE`, jehož inputy nedávají dohromady zůstatek společného účtu.

**Nejsou to konflikty:** shoda hlasů v anketě (řeší pořadí řádků) a výběr varianty bloku (řeší priorita).

## Testy

**Tohle je ta část projektu, která se testuje.** Zbytek se odklikává ručně.

Použij `fixture-platny.xlsx` a nad ním `src/testing/fixture-run.ts`.

Scénáře, které musí být pokryté:

1. Odpověď posune škálu, výsledek sedí
2. Absolutní nastavení z organizátorské otázky (`scale_direct` / `resource_direct`) se aplikuje před posuny
3. Postava bez domácnosti: dopad na `R_..._Wealth` jde na osobní účet
4. `HOUSEHOLD_CREATE` vytvoří domácnost (ID abecedně i při opačném pořadí argumentů); příspěvky členů z téže kapitoly už jdou na společný účet, `_private` pořád na osobní
5. Příspěvky obou manželů na společný zdroj se sčítají, trace říká od koho
6. Dopady odvozené z `HOUSEHOLD_CREATE` (nový společný účet začíná na 0) a `HOUSEHOLD_DISSOLVE` (po zániku žádný zůstatek) se zadanými inputy sedí; osobní účet nezaniká
7. Rozvod a nový sňatek téže postavy v jedné kapitole (`DELETE` před `CREATE`) neskončí konfliktem
8. Odpověď z kapitoly 1 podmiňuje variantu i otázku v kapitole 2; podmínka vidí hodnotu nastavenou orgem v téže kapitole
9. Výběr varianty podle priority (i když je pořadí řádků jiné), `DEFAULT` zabere, když neprojde nic, prázdný `Variation Text`
10. Ořezání na hranici škály (per postava) po každém posunu se zapíše do trace (např. `Regime` 4, dva posuny `-2` → 2 → oříznuto na 1); posuny se aplikují ve sledu řádků (`Regime` 2: `-2` a potom `+1` dá 1 → 2, opačné pořadí řádků 3 → 1)
11. Anketa: vyhrává nejvíc hlasů, při shodě dřívější řádek definice; podmínka na ID vítězné odpovědi; efekt vítězné odpovědi se aplikuje jednou
12. Uložený hod se při přepočtu nemění; `RANDOM(50) AND RANDOM(50)` spotřebuje dva hody; engine vrátí hody, které potřebuje a nemá
13. Stejný vstup dvakrát dá bit po bitu stejný výstup
14. Konflikty se vrátí a nezmizí: `HOUSEHOLD_CREATE` pro postavu už v domácnosti, `HOUSEHOLD_DISSOLVE` neexistující domácnosti, `HOUSEHOLD_DISSOLVE` se součtem inputů jiným než zůstatek
15. Neznámý identifikátor ve výrazu shodí engine nahlas, nevyhodnotí se na `false`
16. Změny, které se vzájemně vyruší (+2 a −2), mají trace

## Na co si dát pozor

- **Nepouštěj engine na databázi.** Ve chvíli, kdy potřebuje `await`, je návrh špatně.
- **Neopravuj vadná data v enginu.** Chybějící odpověď, neznámý identifikátor, blok bez `DEFAULT`, absolutní nastavení s logickým jménem — to jsou chyby, které patří do validace při importu. Engine na ně spadne nahlas.
- **Nezaokrouhluj a neodhaduj.** Kde není jasné, co se má stát, vrať konflikt.
- **Nezaváděj příznaky, list `N_Rules` ani členství a vedení skupin.** Revidovaný model zná jen škály, zdroje, domácnosti a varianty bloků (§4.5, §4.6). Skupiny jsou jen text v šabloně.
- Trace musí vzniknout **i pro změny, které se vzájemně vyruší**. „Nic se nezměnilo“ je taky odpověď, kterou org může potřebovat vysvětlit.

## Na konci

Pusť engine na `fixture-platny.xlsx` a ukaž **plný výstup pro Marii v kapitole 2** — nový stav, trace, vybrané varianty. Napiš, kde ti zadání nestačilo a co sis musel domyslet.
