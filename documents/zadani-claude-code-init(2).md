# Inicializace projektu — zadání pro Claude Code

*Kompletní specifikace je v souboru `zadani-larp-engine.md`. Ten je zdrojem pravdy; tenhle dokument je jen startovní úkol.*

## Kontext

Stavíme interní webovou aplikaci pro organizátory LARPu. Zpracovává dotazníky vyplněné hráči na konci každé ze tří kapitol, přepočítává vnitřní stav postav a generuje materiály pro další kapitolu.

Rozsah: 23 postav, 7 skupin, 3 kapitoly, 2 souběžné běhy hry. Uživatelé jsou 3–5 organizátorů. Deadline ~3 měsíce.

## Než začneš

1. Přečti si `zadani-larp-engine.md` celý.
2. Ptej se jen na to, co v něm chybí nebo si odporuje. Kde je rozhodnutí označené `[ROZHODNUTO]`, neotevírej ho znovu.
3. Napiš `CLAUDE.md` se shrnutím architektonických pravidel z bodů níže, ať je máme po ruce v každé další session.

## Technologie [ROZHODNUTO]

| Vrstva | Volba |
|---|---|
| Framework | Next.js, App Router, TypeScript |
| Databáze | Postgres (Neon), lokálně přes Docker nebo Neon dev větev |
| ORM | Drizzle |
| UI | **MUI (Material UI)** — `@mui/material`, `@mui/icons-material`, `@mui/x-data-grid` |
| Testy | Vitest, primárně na engine pravidel |
| Import tabulek | SheetJS (`xlsx`) |
| Zip | `jszip` nebo `archiver` |
| Hosting | Vercel |

Žádné Google API. Verze 1 komunikuje se světem **výhradně přes nahrané a stažené soubory**.

## Tři architektonická pravidla, která platí od prvního commitu

**1. Engine pravidel je čistá funkce.**

```ts
evaluate(stav, odpovědi, pravidla) → { novýStav, trace[] }
```

Bez databáze, bez sítě, bez Reactu, bez importů z `app/`. Žije ve vlastním adresáři (např. `src/engine/`) a jde otestovat bez rozjetí aplikace. `trace[]` je zároveň podkladem pro vysvětlení „proč" v UI. Tohle je nejdůležitější pravidlo v celém projektu.

**2. `run_id` je v každé tabulce a v každém dotazu.**

Dva běhy hry běží současně a jejich data se nesmí potkat. Přístup k datům vede přes jedinou vrstvu, která **vyžaduje `runId` jako povinný argument** — dotaz bez něj nesmí jít napsat. Izolace drží strukturou kódu, ne kázní.

**3. Nic se nepřepisuje destruktivně.**

Každý přepočet se ukládá jako nová verze. Audit log je append-only a u každé změny je zapsáno kdo (volné jméno z pole „Kdo jsi?"), kdy, co, hodnota před a po, a které pravidlo změnu způsobilo.

## Úkol pro tuhle session

Založ projekt a navrhni datové schéma. **Zatím žádné UI a žádný engine** — chci nejdřív vidět datový model a prodiskutovat ho.

1. **Inicializace projektu**: Next.js + TypeScript + MUI + Drizzle + Vitest. `.gitignore`, `.nvmrc`, `README.md` s postupem lokálního spuštění.
   U MUI rovnou nastav `AppRouterCacheProvider` z `@mui/material-nextjs` a založ `theme.ts` s vlastní paletou a hustějším rozvržením — výchozí Material vzhled neodpovídá §6.4. Styluje se **jen přes CSS Modules a data atributy** — `sx`, `styled()` s dynamickými props ani inline `style` se nepoužívají. Detaily v §15.1.
2. **Schéma databáze** v Drizzle, pokrývající:
   - `runs` — běh hry. ID ve tvaru `2026-09-12_A`, popisný název, stav `založen` / `aktivní` / `archivován`. **Jen schéma** — obrazovka na zakládání a přepínání běhů vzniká až v session 2
   - `chapters` — kapitola v rámci běhu, stav `rozpracovaná` / `spočítaná` / `vydaná`, příznak `dotčená`
   - `characters` — postava v běhu: jméno, příjmení, skupina, ID šablony
   - `groups` — skupina, členové, vedoucí
   - `households` a `household_members` — postavy sdílející majetek (manželé). Vzniká sňatkem, zaniká rozvodem či úmrtím. Postava smí být nejvýše v jedné (§4.4)
   - `scales` — definice škál včetně prahů a názvů pásem (název pásma je vlastní pro každou škálu), **rozsahu platnosti (`postava` / `domácnost`)** a strategie sloučení a rozdělení
   - `scale_values` — hodnota škály v kapitole, celé číslo 1–10. Vlastníkem je **postava, nebo domácnost** podle rozsahu škály — ne dvě různé tabulky
   - `flags` — příznaky událostí u postavy
   - `dice_rolls` — uložené hody. Klíč je **postava, kapitola, varianta nebo pravidlo a pořadí výskytu `RANDOM` ve výrazu** (§7.6), ne jen `rule_id`
   - `questions`, `answer_options` — otázky jsou **vlastní pro každou postavu**, žádná sdílená sada. Odpověď nese dopady na škály, **příznaky** a **efekty** (§4.5, vrstva 1 a 2). Otázka má navíc pole **`zdroj`: `hráč` nebo `org`** — organizátorské otázky se netisknou do dotazníku a vyplňuje je org v aplikaci (§6.7)
   - `answers` — odpověď postavy v kapitole, příznak „doplněno orgem", uložený hod kostkou
   - `rules` a `rule_conditions` — **dvě tabulky**, pravidlo má proměnný počet podmínek (§4.5, vrstva 3). Pravidlo: efekt, priorita, váha, vyloučení, „jednou za domácnost". Podmínka: subjekt, operátor, hodnota, spojka, skupina pro závorkování
   - `templates` — šablona dokumentu jako Markdown se značkami `{BLOK ID}` … `{/BLOK}` a `{PROMENNA}`
   - `computations` — verze přepočtu: běh, kapitola, verze, kdo, důvod, výsledek, trace
   - `audit_log` — append-only
   - `config_files` — archiv nahraných souborů (`.xlsx`, `.md`) tak, jak přišly. **Žádná tabulka verzí a žádný řetěz revizí** — běh má vždy právě jednu platnou konfiguraci (§6.5)
3. **TypeScript typy pro engine** — vstupní a výstupní tvary funkce `evaluate`, včetně tvaru záznamu v `trace[]`.
4. **Migrace** a seed skript s ukázkovými daty (postava Marie Balážová, skupina „Srdce party", škály Wealth / Regime / Control).

## Na co si dát pozor

- **Škály jsou celá čísla 1–10 s ořezáním na hranicích.** Ořez se loguje — je to signál špatně nastavených vah.
- **Pásma škál** mají prahy i názvy definované v datech, nikdy v kódu. Výchozí rozdělení 1–3 / 4–5 / 6–8 / 9–10, ale počet i hranice jsou per škála.
- **Výchozí odpovědi neexistují.** Každá odpověď je explicitně zadaná člověkem. Přepočet nelze spustit, dokud něco chybí.
- **Náhoda se hodí jednou a uloží.** Přepočet hod neopakuje, použije uloženou hodnotu. Přehodit lze jen ruční akcí do auditu.
- **Vrstva 3 pravidel je potvrzeně potřeba** — sňatky a vznik domácností bez ní nejdou vyjádřit (§4.5). Efekt musí umět cílit na **dvojici postav**, ne jen na tu, která odpověděla: druhý člen se bere z odpovědi odkazující na ID jiné postavy.
- **Strukturní efekty (domácnosti, členství) se vyhodnocují v samostatné fázi před změnami škál** (§7.3). Sdílená škála musí vědět, kdo do domácnosti patří, dřív než se do ní začnou sčítat příspěvky.
- **Sňatky, rozvody a stavy účtů zadávají orgové** přes organizátorské otázky (§6.7). Pro engine je to obyčejná odpověď — **žádný zvláštní mechanismus**, jen jiný zdroj vstupu.
- **Otázka typu `scale_direct` nastavuje hodnotu absolutně.** Absolutní nastavení se aplikuje na začátku hodnotové fáze, **před všemi posuny** (§6.7).
- **Párová otázka** (sňatek) má v datech **jednu odpověď**, ne dvě zrcadlené. Otázka nese příznak `párová`, odpověď odkazuje na ID druhé postavy a UI ji zobrazí provázaně u obou. Validace hlídá, že postava není cílem víc než jednoho sňatku v kapitole a není ve víc než jedné domácnosti.
- **Podmínky pravidel neparsuj z textu.** Ukládej je strukturovaně (subjekt, operátor, hodnota, spojka, skupina). Vlastní jazyk na výrazy nepiš.
- Postavy se nemodelují nad rámec škál, příznaků a členství. Charakterizace žije v pevném textu šablony.
- **Vztahy mezi postavami nemodeluj jako obecnou tabulku.** Strukturně existuje jen členství ve skupině, vedení skupiny a domácnost. Zbytek je text v šabloně (§4.6).
- **Vášně, obavy a ambice nejsou tabulka**, jsou to bloky šablony. Platí obecně: text, který se jen tiskne, není datový model; co má ovlivnit budoucnost, je škála nebo příznak.
- **Sdílené škály řeš vlastnictvím hodnoty, ne kopírováním mezi postavami.** Vlastníkem je postava, nebo domácnost — podle rozsahu škály. Svobodná postava je domácnost o jednom členovi, žádná zvláštní větev v kódu. Trace u sdílené škály musí uvádět, od koho změna přišla.
- **Manželé mají soukromý i společný účet zároveň** — jsou to **dvě samostatné škály** (`Wealth_osobni` s rozsahem `postava`, `Wealth_spolecny` s rozsahem `domácnost`), ne jedna škála přepínaná do sdíleného režimu. Převod mezi nimi je jeden efekt nad dvěma škálami. Kolik kdo vloží do společného při sňatku je **otázka v dotazníku**, ne dopočítaná hodnota (§4.4).

## Co udělat na konci

Shrň schéma v přehledu vztahů a napiš, kde sis musel domyslet rozhodnutí, které v zadání nebylo. Pak počkej na moji zpětnou vazbu — engine budeme stavět až v další session.
