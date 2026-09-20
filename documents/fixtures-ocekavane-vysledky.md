# Fixtures pro import konfigurace — očekávané výsledky

Testovací data, **ne skutečná hra**. Postavy, skupiny a texty jsou vymyšlené (jména převzatá z ukázkové tabulky). Čísla řádků platí pro soubory v téhle sadě — po ruční úpravě xlsx se posunou.

| Soubor | K čemu |
|---|---|
| `fixture-platny.xlsx` + `sablony-platne.zip` | musí projít bez chyb (varování jsou povolená) |
| `fixture-vadny.xlsx` + `sablony-vadne.zip` | musí být odmítnutý; všechny chyby najednou |

Šablony se nahrávají zvlášť (§10.2), proto jsou kontroly bloků vůči šablonám (§11.6, §11.9) rozdělené mezi xlsx a zip.

## Platný

**Očekávání:** 0 chyb (v xlsx i v šablonách). Očekávaná varování — každé je zvyk autora, který se má tolerovat, ne blokovat:

| Kód | Počet | Význam | Kde (list: řádky) |
|---|---|---|---|
| `W-CHARNAME` | 1 | jméno (`Antonín`) ve sloupci Character místo ID (`Antonin`) | `1_Questions`: 10 |
| `W-AUTOID` | 19 | prázdné ID otázky se doplní podle vzoru | `1_Questions`: 5, 9, 10, 12, 14, 15, 18, 19, 20, 21; `2_Questions`: 3, 7, 9, 10, 12, 14, 16; `3_Questions`: 3, 5 |
| `W-BOOLID` | 8 | prázdné ID odpovědi u bool se odvodí (`_Ano` / `_Ne`) | `1_Questions`: 9, 19; `2_Questions`: 7, 8, 9, 16; `3_Questions`: 3, 4 |
| `W-BOOLROW` | 4 | chybějící řádek Ano / Ne u bool se doplní bez efektů | `1_Questions`: 9, 19; `2_Questions`: 9, 16 |
| `W-SEMI` | 1 | středník jako oddělovač dopadů | `1_Questions`: 7 |
| `W-WS` | 4 | mezera / nezlomitelná mezera / zalomení řádku na kraji buňky | `Characters`: 5; `Scales`: 4; `1_Questions`: 5; `2_Content`: 27 |

Pokrývá: všechny typy otázek (`bool` s oběma i jedním řádkem Ano/Ne, `single`, `multi` s `_OTHER_`, `poll` + 2× `poll-answer`, org `scale_direct` / `resource_direct`), ruční i prázdné ID otázky (poll-answer se počítá do pořadí), škály s různým rozsahem (1–10, 1–8), osobní účet `_private`, efekty `HOUSEHOLD_CREATE` a `HOUSEHOLD_DISSOLVE` s prázdným sloupcem dopadů (dopad se odvozuje z efektu, §4.4), podmínky s `AND`/`OR`/`!`/závorkami/`RANDOM`/porovnáním škály i zdroje/`DEFAULT`, výsledek ankety v podmínce, `DEFAULT` i prázdnou podmínku jako fallback, blok bez priorit (pořadí řádků), fallback na řádku první ale s nejvyšším číslem `Priority`, zanořené bloky, prázdný `Variation Text`, blok jen z fallbacku, **podmínky otázek jako `Variation ID`** (viz níže), list `NOTES` (ignoruje se), diakritiku, fill-down `Character` / `Block ID`, prázdný řádek jako konec skupiny.

### Podmínky otázek (§4.5)

Sloupec `Condition` v `N_Questions` nese jen `Variation ID` z `N_Content` téže kapitoly a téže postavy, nebo je prázdný.

| Otázka | `Condition` | Rozhoduje blok |
|---|---|---|
| `2_Questions`:3 Ekofilm | `V_Marie_1_Questions_1_A` | `B_Marie_1_Questions_1` (bez `Priority` — pořadí řádků) |
| `2_Questions`:7 vystoupení proti režimu | `V_Marie_1_Questions_2_A` | `B_Marie_1_Questions_2` |
| `2_Questions`:9 stávkový fond | `V_Marie_1_Questions_3_A` | `B_Marie_1_Questions_3` |
| `2_Questions`:12 ekologická stávka | `V_Antonin_1_Questions_1_A` | `B_Antonin_1_Questions_1` |
| `3_Questions`:5 návrat do zaměstnání | `V_Antonin_2_Questions_1_A` | `B_Antonin_2_Questions_1` |
| `2_Questions`:10, 14, 16; `3_Questions`:3 | prázdné | otázka se položí vždy |

Všech pět `…_Questions_…` bloků má **prázdný `Variation Text`** a **žádnou značku v šabloně**. Osiřelé přesto nejsou — vede na ně odkaz ze sloupce `Condition` (§11, kontrola 6). To je hlavní věc, kterou platný fixture na nové kontrole ověřuje: importér nesmí hlásit `TPL_ORPHAN_BLOCK`.

## Vadný

**Očekávání:** import odmítnutý, **38 chyb v xlsx + 5 v šablonách** nahlášených najednou (každá s listem, řádkem, sloupcem a hodnotou). Stejná tolerovaná varování jako u platného (jen s jinými řádky) nebrání hlášení chyb.

### Chyby v `fixture-vadny.xlsx`

| # | Kód | Kontrola | List | Řádek | Sloupec | Hodnota | Co je špatně |
|---|---|---|---|---|---|---|---|
| 1 | `SCALE_MIN_GT_MAX` | §11.7 | `Scales` | 7 | Min | `8` | Min (8) je větší než Max (3) |
| 2 | `SCALE_DEFAULT_RANGE` | §11.7 | `Scales` | 8 | Default | `12` | výchozí hodnota 12 leží mimo rozsah 1–10 |
| 3 | `CHAR_NOT_IN_REGISTRY` | §11.7 | `Scales` | 9 | Character | `Ondra` | postava Ondra není v registru Characters |
| 4 | `DUP_SCALE` | §11.7 | `Scales` | 10 | ID | `S_Marie_Regime` | duplicitní dvojice postava × škála (první výskyt: řádek 3) |
| 5 | `DUP_RESOURCE` | §11.7 | `Resources` | 6 | ID | `R_Marie_Wealth` | duplicitní dvojice postava × zdroj (první výskyt: řádek 3) |
| 6 | `CHAR_NOT_IN_REGISTRY` | §11.7 | `Resources` | 7 | Character | `Ondra` | postava Ondra není v registru Characters |
| 7 | `UNKNOWN_REF` | §11.2 / §11.6d | `1_Questions` | 3 | Scale and Resources Impact | `S_Marie_Wealth+3, S_Marie_Regime-2` | škála S_Marie_Wealth neexistuje — Wealth je zdroj, správně R_Marie_Wealth |
| 8 | `CHAR_NOT_IN_REGISTRY` | §11.2 | `1_Questions` | 4 | Scale and Resources Impact | `R_Marie_Wealth+1, R_Ondra_Wealth+2` | zdroj R_Ondra_Wealth: postava Ondra není v registru |
| 9 | `DUP_QID` | §11.8 | `1_Questions` | 5 | ID | `Q_Marie_1_1` | duplicitní ID otázky (první výskyt: řádek 3) |
| 10 | `IMPACT_FORMAT` | §4.2 (formát dopadu) | `1_Questions` | 6 | Scale and Resources Impact | `S_Marie_Regime+x` | neplatný formát dopadu: za znaménkem chybí číslo |
| 11 | `UNKNOWN_REF` | §11.2 / §11.6d | `1_Questions` | 9 | Scale and Resources Impact | `S_Marie_Regme-2` | škála S_Marie_Regme neexistuje, mysleli jste S_Marie_Regime? |
| 12 | `BOOL_TEXT` | §11.8 | `1_Questions` | 10 | Text response | `Možná` | u bool otázky smí být jen 'Ano' / 'Ne', ne 'Možná' |
| 13 | `DUP_QID` | §11.8 | `1_Questions` | 15 | ID | *(prázdná)* | automaticky doplněné ID `Q_Antonin_1_3` koliduje s ručně zadaným na řádku 13 |
| 14 | `UNKNOWN_TYPE` | §6.1 — odvozeno | `1_Questions` | 16 | Type | `radio` | neznámý typ otázky 'radio' |
| 15 | `POLL_ANSWER_UNKNOWN` | §11.8 | `1_Questions` | 19 | Text | `Q_Group_Funkcionari_Nastupcce` | anketa neexistuje, mysleli jste Q_Group_Funkcionari_Nastupce? |
| 16 | `NO_ANSWERS` | §11.1 | `1_Questions` | 20 | Text | `Komu odkážeš dílnu?` | otázka typu single nemá žádný řádek odpovědi |
| 17 | `HOUSEHOLD_ORDER` | §4.2 (ID domácnosti) — odvozeno | `1_Questions` | 21 | Scale and Resources Impact | `R_Marie_Wealth_private-{input}, R_MirekMarie_Wealth+{input}` | ID domácnosti musí být abecedně: MarieMirek, ne MirekMarie |
| 18 | `DIRECT_LOGICAL` | §4.4 (absolutní nastavení) | `1_Questions` | 23 | Scale and Resources Impact | `R_Antonin_Wealth=VALUE` | resource_direct musí jmenovat konkrétní účet (R_Antonin_Wealth_private) |
| 19 | `POLL_NO_ID` | §11.8 | `1_Questions` | 28 | ID | *(prázdná)* | u poll je ID povinné a negeneruje se |
| 20 | `ORPHAN_ANSWER` | §11.1 | `1_Questions` | 31 | ID Answer | `A_Sirotek_1_1_X` | řádek odpovědi bez otázky (před ním je prázdný řádek) |
| 21 | `COND_SYNTAX` | §11.6c | `2_Content` | 2 | Conditions | `A_Marie_1_1_Antonin AND OR S_Marie_Regime >= 5` | dva operátory za sebou (AND OR) |
| 22 | `COND_SYNTAX` | §11.6c | `2_Content` | 3 | Conditions | `A_Marie_1_1_Antonin AND !(A_Marie_1_2_Mirek OR A_Marie_1_2_Antonin` | chybí uzavírací závorka |
| 23 | `COND_REF` | §11.6d | `2_Content` | 12 | Conditions | `A_Antonin_1_1_Duchdo` | odpověď neexistuje, mysleli jste A_Antonin_1_1_Duchod? |
| 24 | `COND_REF` | §11.6d | `2_Content` | 18 | Conditions | `S_Antonin_Activty >= 5` | škála neexistuje, mysleli jste S_Antonin_Activity? |
| 25 | `BLOCK_NO_FALLBACK` | §11.6b | `2_Content` | 25 | Block ID | `B_Mirek_1_Historie_2` | blok nemá fallback variantu (DEFAULT / prázdná podmínka) |
| 26 | `BLOCK_DUP_PRIO` | §11.6e | `2_Content` | 28 | Priority | `1` | dvě varianty bloku mají Priority 1 (první výskyt: řádek 27) |
| 27 | `FALLBACK_NOT_LAST` | §11.6f | `2_Content` | 30 | Conditions | `DEFAULT` | fallback stojí před jinou variantou — ta je nedosažitelná |
| 28 | `BLOCK_PARTIAL_PRIO` | §11.6h | `2_Content` | 32 | Priority | `1` | Priority má jen část variant bloku |
| 29 | `BLOCK_CYCLE` | §11.6g | `2_Content` | 35 | Variation Text | `Text. {BLOK B_Mirek_1_Cyklus_2}` | cyklus B_Mirek_1_Cyklus_1 → 2 → 1 (hlášen může být kterýkoli člen) |
| 30 | `BLOCK_CYCLE` | §11.6g | `2_Content` | 37 | Variation Text | `Text. {BLOK B_Mirek_1_Cyklus_3}` | blok se odkazuje sám na sebe |
| 31 | `TPL_ORPHAN_BLOCK` | §11.6 | `2_Content` | 38 | Block ID | `B_Mirek_1_Sirotek_1` | nevede na něj značka v šabloně, ve `Variation Text` ani odkaz z `Condition` |
| 32 | `QCOND_UNKNOWN` | §11.6i | `2_Questions` | 3 | Condition | `V_Marie_1_Questions_9_A` | varianta v `2_Content` neexistuje |
| 33 | `QCOND_NOT_VARIATION` | §11.6i | `2_Questions` | 7 | Condition | `S_Marie_Regime >= 5 AND (A_Marie_1_2_Antonin OR A_Marie_1_2_Mirek)` | výraz místo jediného `Variation ID` |
| 34 | `QCOND_NOT_VARIATION` | §11.6i | `2_Questions` | 9 | Condition | `A_Marie_1_3_Ano` | ID odpovědi místo `Variation ID` |
| 35 | `QCOND_FOREIGN` | §11.6i | `2_Questions` | 10 | Condition | `V_Marie_1_Questions_1_A` | varianta patří Marii, otázka je Antonínova |
| 36 | `QCOND_NOT_VARIATION` | §11.6i | `2_Questions` | 14 | Condition | `DEFAULT` | `DEFAULT` v podmínce otázky nemá smysl (prázdná buňka = vždy) |
| 37 | `QCOND_NOT_VARIATION` | §11.6i | `2_Questions` | 16 | Condition | `RANDOM(50)` | `RANDOM` smí jen v `Conditions` v `N_Content` (§7.4) |
| 38 | `COND_REF` | §11.6d | `3_Content` | 9 | Conditions | `Q_Antonin_2_2_Ano` | odkaz začíná Q_ (ID otázky), v podmínce patří ID odpovědi A_Antonin_2_2_Ano |

### Chyby v `sablony-vadne.zip`

| # | Kód | Kontrola | Soubor | Řádek | Co je špatně |
|---|---|---|---|---|---|
| 1 | `TPL_UNKNOWN_BLOCK` | §11.6 | `Marie_2.md` | 11 | blok B_Marie_1_Neexistuje_1 není v `2_Content` |
| 2 | `TPL_CLOSING_TAG` | CLAUDE.md, Značky v šabloně | `Mirek_2.md` | 15 | zavírací značka {/BLOK} neexistuje — značky jsou nepárové |
| 3 | `TPL_NAME` | §11.9 | `Ondra_2.md` | — | soubor nepatří žádné postavě ani skupině |
| 4 | `TPL_NAME` | §11.9 | `Marie_4.md` | — | kapitola 4 neexistuje |
| 5 | `TPL_MISSING` | §11.9 | `SrdceParty_3.md` (chybí) | — | skupina SrdceParty nemá šablonu v kapitole 3 |

> Kód `TPL_ORPHAN_BLOCK` (#31) je v tabulce xlsx (řádek bloku), ale jde ověřit až po nahrání šablon — a nově i po načtení sloupce `Condition`.

### Platné podmínky ve vadném souboru

`V_Antonin_1_Questions_1_A` (`2_Questions`:12) a `V_Antonin_2_Questions_1_A` (`3_Questions`:5) jsou správně. Importér je hlásit nesmí — vadný soubor tím ověřuje, že se chyby nesypou plošně na celý sloupec. Oba jejich bloky (`2_Content`:21, `3_Content`:12) nemají značku v šabloně a osiřelé být nesmějí.

### Na co si dát pozor při psaní testů

- **Odvozené kontroly** (v §11 výslovně nejsou): `HOUSEHOLD_ORDER`, `UNKNOWN_TYPE`. Pokud je nechceš, smaž ten řádek z fixture i z tabulky.
- **Tři kódy `QCOND_*`** jsou jen rozdělení kontroly §11.6i na třídy. Když je importér hlásí pod jedním kódem, sedí počet (6), ne kódy.
- **Řádek 17** (`HOUSEHOLD_ORDER`): v revidovaném modelu by sňatek měl mít efekt `HOUSEHOLD_CREATE` a **prázdný** sloupec dopadů (dopad se odvozuje, §4.4). Ručně psaný dopad je tu schválně — jestli chceš i kontrolu „dopad u odpovědi s efektem domácnosti“, přibude na tomhle řádku druhá chyba.
- **`SCALE_MIN_GT_MAX`**: u `Min 8 / Max 3` může přibýt i „výchozí hodnota mimo rozsah“ — jedna nebo dvě hlášení na tomtéž řádku.
- **Duplicity** (`DUP_*`) jsou vedené u druhého výskytu; parser smí hlásit i první.
- **`BLOCK_CYCLE`** u dvojice `B_Mirek_1_Cyklus_1` ↔ `_2` smí být hlášen u kteréhokoli člena.
- Navazující hlášení jsou možná (např. odpovědi pod duplicitním ID otázky); za očekávané se považují jen ty v tabulkách výše.

## Předpoklady, které podklady neurčují

- **Hlavičky.** Ukázková tabulka je nejednotná (`ID Answer` × `ID Response`, `Scale Impact` × `Scale and Resources Impact`), použil jsem `ID Answer`, `Text response`, `Condition`, `Scale and Resources Impact`, `Effects`. Layout podle vzorku: u Questions a Scales dva řádky hlavičky (název dopadu jen v řádku 1), u `N_Content` jeden.
- **Nové listy** (ve vzorku nejsou): `Characters` = `ID`, `Name`, `Surname`, `Household`; `Groups` = `ID`, `Name` (členy ani vedení už nenese, §4.6); `Resources` = `Character`, `ID`, `Default`.
- **Číslo kapitoly v ID bloku** = kapitola odpovědí, ze kterých blok vychází (`2_Content` → `B_Marie_1_…`), jako ve vzorku a §8.2.
- **Ankety** podle §6.6 (`poll` / `poll-answer`, ID vítězné odpovědi v podmínce). `poll` nemá v `Character` nic (stojí za prázdným řádkem).
- **Org otázky `*_direct`** mají jeden řádek odpovědi „Nová hodnota“ s efektem `S_…=VALUE` / `R_…_private=VALUE`.
- **Bloky `…_Questions_…`** jsou konvence, ne formální typ. O platnosti podmínky otázky rozhoduje odkaz z `Condition`, ne název bloku.
- **Nemodelováno, protože syntaxe v podkladech chybí:** proměnné `{PROMENNA}` v šablonách, obsah listu `Validations`, výchozí domácnost ve sloupci `Household` (ve fixture je prázdný) a k ní odpovídající řádek v `Resources`.
