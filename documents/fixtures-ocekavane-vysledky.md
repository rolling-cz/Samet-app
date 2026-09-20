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
| `W-WS` | 4 | mezera / nezlomitelná mezera / zalomení řádku na kraji buňky | `Characters`: 5; `Scales`: 4; `1_Questions`: 5; `2_Content`: 21 |

Pokrývá: všechny typy otázek (`bool` s oběma / jedním / bez řádků Ano/Ne, `single`, `multi` s `_OTHER_`, `poll` + 2× `poll-answer`, org `scale_direct` / `resource_direct`), ruční i prázdné ID otázky (poll-answer se počítá do pořadí), škály s různým rozsahem (1–10, 1–8, 1–5), osobní účet `_private`, efekty `HOUSEHOLD_CREATE` / `HOUSEHOLD_DISSOLVE` v org otázkách (dopad na zdroje se z nich odvodí, autor ho nepíše), podmínky s `AND`/`OR`/`!`/závorkami/`RANDOM`/porovnáním škály i zdroje/`DEFAULT`, výsledek ankety v podmínce, `DEFAULT` i prázdnou podmínku jako fallback, blok bez priorit (pořadí řádků), fallback na řádku první ale s nejvyšším číslem `Priority`, zanořené bloky, prázdný `Variation Text`, blok jen z fallbacku, list `NOTES` (ignoruje se), diakritiku, fill-down `Character` / `Block ID`, prázdný řádek jako konec skupiny.

## Vadný

**Očekávání:** import odmítnutý, **37 chyb v xlsx + 5 v šablonách** nahlášených najednou (každá s listem, řádkem, sloupcem a hodnotou). Stejná tolerovaná varování jako u platného (jen s jinými řádky) nebrání hlášení chyb.

### Chyby v `fixture-vadny.xlsx`

| # | Kód | Kontrola | List | Řádek | Sloupec | Hodnota | Co je špatně |
|---|---|---|---|---|---|---|---|
| 1 | `SCALE_MIN_GT_MAX` | §11.7 | `Scales` | 7 | Min | `8` | Min (8) je větší než Max (3) |
| 2 | `SCALE_DEFAULT_RANGE` | §11.7 | `Scales` | 8 | Default | `12` | výchozí hodnota 12 leží mimo rozsah 1–10 |
| 3 | `CHAR_NOT_IN_REGISTRY` | §11.7 / §11.2 | `Scales` | 9 | Character | `Ondra` | postava Ondra není v registru Characters |
| 4 | `DUP_SCALE` | §11.7 | `Scales` | 10 | ID | `S_Marie_Regime` | duplicitní dvojice postava × škála (první výskyt: řádek 3) |
| 5 | `DUP_RESOURCE` | §11.7 | `Resources` | 6 | ID | `R_Marie_Wealth` | duplicitní dvojice postava × zdroj (první výskyt: řádek 3) |
| 6 | `CHAR_NOT_IN_REGISTRY` | §11.7 / §11.2 | `Resources` | 7 | Character | `Ondra` | postava Ondra není v registru Characters |
| 7 | `UNKNOWN_REF` | §11.2 / §11.6d | `1_Questions` | 3 | Scale and Resources Impact | `S_Marie_Wealth+3, S_Marie_Regime-2` | škála S_Marie_Wealth neexistuje — Wealth je zdroj, správně R_Marie_Wealth |
| 8 | `CHAR_NOT_IN_REGISTRY` | §11.7 / §11.2 | `1_Questions` | 4 | Scale and Resources Impact | `R_Marie_Wealth+1, R_Ondra_Wealth+2` | zdroj R_Ondra_Wealth: postava Ondra není v registru |
| 9 | `DUP_QID` | §11.8 | `1_Questions` | 5 | ID | `Q_Marie_1_1` | duplicitní ID otázky (první výskyt: řádek 3) |
| 10 | `IMPACT_FORMAT` | §4.2 (formát dopadu) | `1_Questions` | 6 | Scale and Resources Impact | `S_Marie_Regime+x` | neplatný formát dopadu: za znaménkem chybí číslo |
| 11 | `UNKNOWN_REF` | §11.2 / §11.6d | `1_Questions` | 9 | Scale and Resources Impact | `S_Marie_Regme-2` | škála S_Marie_Regme neexistuje, mysleli jste S_Marie_Regime? |
| 12 | `BOOL_TEXT` | §11.8 | `1_Questions` | 10 | Text response | `Možná` | u bool otázky smí být jen 'Ano' / 'Ne', ne 'Možná' |
| 13 | `DUP_QID` | §11.8 | `1_Questions` | 15 | ID | *(prázdná)* | automaticky doplněné ID koliduje s ručně zadaným ID na jiném řádku (první výskyt: řádek 13) |
| 14 | `UNKNOWN_TYPE` | §6.1 — odvozeno | `1_Questions` | 16 | Type | `radio` | neznámý typ otázky 'radio' |
| 15 | `POLL_ANSWER_UNKNOWN` | §11.8 | `1_Questions` | 19 | Text | `Q_Group_Funkcionari_Nastupcce` | anketa Q_Group_Funkcionari_Nastupcce neexistuje, mysleli jste Q_Group_Funkcionari_Nastupce? |
| 16 | `NO_ANSWERS` | §11.1 | `1_Questions` | 20 | Text | `Komu odkážeš dílnu?` | otázka typu single nemá žádný řádek odpovědi |
| 17 | `HOUSEHOLD_ORDER` | §4.2 (ID domácnosti) — odvozeno | `1_Questions` | 21 | Scale and Resources Impact | `R_Marie_Wealth_private-{input}, R_MirekMarie_Wealth+{input}` | ID domácnosti musí být abecedně: MarieMirek, ne MirekMarie |
| 18 | `DIRECT_LOGICAL` | §4.4 (absolutní nastavení) | `1_Questions` | 23 | Scale and Resources Impact | `R_Antonin_Wealth=VALUE` | resource_direct musí jmenovat konkrétní účet (R_Antonin_Wealth_private), ne logické jméno |
| 19 | `POLL_NO_ID` | §11.8 | `1_Questions` | 28 | ID | *(prázdná)* | u poll je ID povinné a negeneruje se |
| 20 | `ORPHAN_ANSWER` | §11.1 | `1_Questions` | 31 | ID Answer | `A_Sirotek_1_1_X` | řádek odpovědi bez otázky (před ním je prázdný řádek) |
| 21 | `COND_SYNTAX` | §11.6c | `2_Content` | 2 | Conditions | `A_Marie_1_1_Antonin AND OR S_Marie_Regime >= 5` | dva operátory za sebou (AND OR) |
| 22 | `COND_SYNTAX` | §11.6c | `2_Content` | 3 | Conditions | `A_Marie_1_1_Antonin AND !(A_Marie_1_2_Mirek OR A_Marie_1_2_A…` | chybí uzavírací závorka |
| 23 | `COND_REF` | §11.6d | `2_Content` | 12 | Conditions | `A_Antonin_1_1_Duchdo` | odpověď A_Antonin_1_1_Duchdo neexistuje, mysleli jste A_Antonin_1_1_Duchod? |
| 24 | `COND_REF` | §11.6d | `2_Content` | 18 | Conditions | `S_Antonin_Activty >= 5` | škála S_Antonin_Activty neexistuje, mysleli jste S_Antonin_Activity? |
| 25 | `BLOCK_NO_FALLBACK` | §11.6b | `2_Content` | 23 | Block ID | `B_Mirek_1_Historie_2` | blok nemá fallback variantu (DEFAULT / prázdná podmínka) |
| 26 | `BLOCK_DUP_PRIO` | §11.6e | `2_Content` | 26 | Priority | `1` | dvě varianty bloku mají Priority 1 (první výskyt: řádek 25) |
| 27 | `FALLBACK_NOT_LAST` | §11.6f | `2_Content` | 28 | Conditions | `DEFAULT` | fallback stojí před jinou variantou — ta je nedosažitelná |
| 28 | `BLOCK_PARTIAL_PRIO` | §11.6h | `2_Content` | 30 | Priority | `1` | Priority má jen část variant bloku |
| 29 | `BLOCK_CYCLE` | §11.6g | `2_Content` | 33 | Variation Text | `Text. {BLOK B_Mirek_1_Cyklus_2}` | cyklus B_Mirek_1_Cyklus_1 → 2 → 1 (hlášen může být kterýkoli člen cyklu) |
| 30 | `BLOCK_CYCLE` | §11.6g | `2_Content` | 35 | Variation Text | `Text. {BLOK B_Mirek_1_Cyklus_3}` | blok se odkazuje sám na sebe |
| 31 | `TPL_ORPHAN_BLOCK` | §11.6 | `2_Content` | 36 | Block ID | `B_Mirek_1_Sirotek_1` | na blok nevede žádná značka v šabloně ani ve Variation Text |
| 32 | `COND_SYNTAX` | §11.6c | `2_Questions` | 7 | Condition | `S_Marie_Regime >= 5 AND (A_Marie_1_2_Antonin OR A_Marie_1_2_…` | chybí uzavírací závorka |
| 33 | `COND_REF` | §11.6d | `2_Questions` | 9 | Condition | `R_Marie_Welth >= 7` | zdroj R_Marie_Welth neexistuje, mysleli jste R_Marie_Wealth? |
| 34 | `COND_REF` | §11.6d | `2_Questions` | 10 | Condition | `NONE` | neznámý identifikátor NONE (prázdná buňka nebo DEFAULT) |
| 35 | `COND_REF` | §11.6d | `2_Questions` | 14 | Condition | `A_Antonin_1_9_Ano` | odpověď A_Antonin_1_9_Ano neexistuje (otázka Q_Antonin_1_9 není) |
| 36 | `COND_SYNTAX` | §11.6c | `2_Questions` | 16 | Condition | `A_Marie_1_???_Ano` | zástupné '???' není platný identifikátor (syntaxe nebo odkaz) |
| 37 | `COND_REF` | §11.6d | `3_Content` | 9 | Conditions | `Q_Antonin_2_2_Ano` | odkaz začíná Q_ (ID otázky), v podmínce patří ID odpovědi A_Antonin_2_2_Ano |

### Chyby v `sablony-vadne.zip`

| # | Kód | Kontrola | Soubor | Řádek | Co je špatně |
|---|---|---|---|---|---|
| 1 | `TPL_UNKNOWN_BLOCK` | §11.6 | `Marie_2.md` | 11 | blok B_Marie_1_Neexistuje_1 není v 2_Content |
| 2 | `TPL_CLOSING_TAG` | CLAUDE.md, Značky v šabloně | `Mirek_2.md` | 15 | zavírací značka {/BLOK} neexistuje — značky jsou nepárové |
| 3 | `TPL_NAME` | §11.9 | `Ondra_2.md` | — | soubor nepatří žádné postavě ani skupině |
| 4 | `TPL_NAME` | §11.9 | `Marie_4.md` | — | kapitola 4 neexistuje |
| 5 | `TPL_MISSING` | §11.9 | `SrdceParty_3.md (chybí)` | — | skupina SrdceParty nemá šablonu v kapitole 3 |

> Kód `TPL_ORPHAN_BLOCK` je v tabulce xlsx (řádek bloku), ale jde ověřit jen po nahrání šablon.

### Na co si dát pozor při psaní testů

- **Odvozené kontroly** (v §11 výslovně nejsou): `HOUSEHOLD_ORDER`, `UNKNOWN_TYPE`. Pokud je nechceš, smaž ten řádek z fixture i z tabulky.
- **`???`** (`COND_SYNTAX`) může parser hlásit jako syntaxi i jako neznámý odkaz — test by měl akceptovat obojí.
- **`SCALE_MIN_GT_MAX`**: u `Min 8 / Max 3` může přibýt i „výchozí hodnota mimo rozsah“ — jedna nebo dvě hlášení na tomtéž řádku.
- **Duplicity** (`DUP_*`) jsou vedené u druhého výskytu; parser smí hlásit i první.
- **`BLOCK_CYCLE`** u dvojice `B_Mirek_1_Cyklus_1` ↔ `_2` smí být hlášen u kteréhokoli člena.
- Navazující hlášení jsou možná (např. odpovědi pod duplicitním ID otázky); za očekávané se považují jen ty v tabulkách výše.

## Předpoklady, které podklady neurčují

- **Hlavičky.** Ukázková tabulka je nejednotná (`ID Answer` × `ID Response`, `Scale Impact` × `Scale and Resources Impact`), použil jsem `ID Answer`, `Text response`, `Condition`, `Scale and Resources Impact`, `Effects`. Layout podle vzorku: u Questions / Scales dva řádky hlavičky (název dopadu jen v řádku 1), u `N_Content` jeden.
- **Nové listy** (ve vzorku nejsou): `Characters` = `ID`, `Name`, `Surname`, `Household`; `Groups` = `ID`, `Name` (členy ani vedení skupiny aplikace nesleduje, §4.6); `Resources` = `Character`, `ID`, `Default`. Sloupec `Household` je v obou fixtures prázdný — hra v nich začíná bez výchozí domácnosti, takže se netestuje ani řádek `Resources` s ID domácnosti.
- **Číslo kapitoly v ID bloku** = kapitola odpovědí, ze kterých blok vychází (`2_Content` → `B_Marie_1_…`), jako ve vzorku a §8.2. CLAUDE.md uvádí příklad `B_Marie_2_…`.
- **Ankety** podle §6.6 (`poll` / `poll-answer`, ID vítězné odpovědi v podmínce). CLAUDE.md má vedle toho starší §4.7 (sloupec `Anketa`, `VITEZ()`, shoda hlasů = konflikt), který vzorek nepotvrzuje. `poll` nemá v `Character` nic (stojí za prázdným řádkem).
- **Org otázky `*_direct`** mají jeden řádek odpovědi „Nová hodnota“ s efektem `S_…=VALUE` / `R_…_private=VALUE`.
- **Nemodelováno, protože syntaxe v podkladech chybí:** příznak `Private`, proměnné `{PROMENNA}` v šablonách, obsah listu `Validations`. Vadné efekty (neznámý název, špatný počet argumentů, ID mimo registr) ve `fixture-vadny.xlsx` nejsou — pokrývají je testy nad ručně postavenými sešity.

