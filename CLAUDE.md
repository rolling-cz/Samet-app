# CLAUDE.md

Interní webová aplikace pro organizátory LARPu: zpracuje dotazníky z konce
kapitoly, přepočítá stav postav a vygeneruje materiály pro další kapitolu.

**Zdroj pravdy o zadání je `documents/zadani-larp-engine.md`.** Sekce označené
`[ROZHODNUTO]` se neotevírají znovu. Tenhle soubor je jen shrnutí pravidel,
která platí v každé session.

Rozsah: **23 postav, 7 skupin, 3 kapitoly, 2 souběžné běhy**, ~3 otázky na
postavu a kapitolu, jediná role (organizátor), deadline ~3 měsíce. Objem dat je
malý — **optimalizuj na srozumitelnost, ne na výkon.**

## Kde si zadání odporuje samo se sebou

Zadání vznikalo postupně a několik míst zůstalo z dřívějšího návrhu. **Platí vždy
konkrétní revidovaná sekce, ne souhrnná tabulka §16 a ne §15.** Fixtures
v `documents/` to potvrzují.

| Zastaralé místo           | Co říká                                                                    | Co platí                                                                                  |
| ------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| §16, řádek 12             | značky `{BLOK}`…`{/BLOK}` jsou párové, nevybrané bloky se mažou ze šablony | **§8.2 + §8.4:** značky jsou **nepárové**, varianty textu žijí v listu `N_Content`        |
| §16, řádek 11             | „PDF se negeneruje, tisk je v Google Docs"                                 | **§8.1 + §8.3 + §10.4:** aplikace **PDF generuje** z vygenerovaných `.md`                 |
| §15                       | „nepiš parser, začni strukturovanými sloupci"                              | **§4.5:** ten návrh je výslovně **zrušen** — autor hlasoval tím, jak tabulku píše         |
| §11 bod 6d                | příznaky (flags) jako samostatný nosič stavu                               | **§4.2 + §4.5:** listy ani jazyk podmínek příznaky neznají; stav nesou **škály a zdroje** |
| §4.4 v textu o podmínkách | `S_Marie_Wealth_osobni >= 7`                                               | **§4.2 + §4.4:** zdroj má prefix `R_` a přípona osobního účtu je `_private`               |

§8.2 i §4.5 ten obrat samy pojmenovávají. Když na některé z těch míst narazíš,
**neřiď se jím.**

## Tři architektonická pravidla

### 1. Engine pravidel je čistá funkce

```ts
evaluate(stav, odpovědi, konfigurace) → { novýStav, trace[], konflikty[] }
```

Žije v `src/engine/`. **Bez databáze, bez sítě, bez Reactu, bez `async`, bez
importů z ostatních vrstev.** Musí jít otestovat na desítkách scénářů bez
rozjetí aplikace. ESLint to hlídá (`no-restricted-imports` v
`eslint.config.mjs`): netestový soubor v `src/engine/` nesmí importovat nic mimo
`src/engine/` — aliasem `@/…`, relativní cestou ven ani `node:*`; testy enginu
smějí na `@/import` a `@/testing`. Když to pravidlo začne překážet, není chyba
v ESLintu.
Ve chvíli, kdy engine potřebuje `await`, je návrh špatně.

Volající kód načte data z databáze, zavolá `evaluate` a výsledek uloží.

- **`trace[]` je hlavní výstup vedle nového stavu**, ne doplněk. Nese **data
  s popisky, ne hotovou větu** — formulace je věc UI a musí jít změnit bez
  přepočítávání. Trace vzniká **i pro změny, které se vzájemně vyruší** — „nic
  se nezměnilo" je taky odpověď, kterou org může potřebovat vysvětlit.
- **`konflikty[]`** vrací všechno, co engine nesmí rozhodnout sám: nedopočítanou hodnotu (`unresolved_value`), sňatek do obsazené domácnosti,
  zánik neexistující domácnosti, rozdělení zůstatku, které nesedí.
  **Nezaokrouhluj a neodhaduj** — kde není jasné, co se má stát, vrať konflikt.
- **Neznámý identifikátor ve výrazu je chyba, ne nepravda.** Tiché vyhodnocení
  překlepu na `false` je nejhorší možné chování.
- **Engine vadná data neopravuje.** Chybějící odpověď, blok bez `DEFAULT`,
  neznámé ID — to patří do validace importu. Engine na ně spadne nahlas.
- **Engine nikdy negeneruje náhodu.** Uložené hody dostane na vstupu a vrátí
  seznam hodů, které potřebuje a ještě nemá.

**Tohle je nejdůležitější pravidlo v celém projektu** (§15).

### 2. `run_id` je v každé tabulce a v každém dotazu

Dva běhy hry běží současně a jejich data se **nesmí potkat** (§3.3).

- Každá tabulka s herními daty nese `run_id` (kontroluje test `src/db/schema.test.ts`).
- Každý odkaz uvnitř běhu je **složený cizí klíč** `(run_id, id)`. Databáze sama
  odmítne odpověď z běhu A navázanou na otázku z běhu B.
- Aplikační kód se k datům dostává **výhradně přes `forRun(runId)`**
  (`src/db/run-scope.ts`). Neomezené spojení `unscopedDb` není v
  `src/db/index.ts` exportované; smí ho importovat jen skripty (seed, záloha,
  migrace) a je to v diffu vidět.
- Chybí-li dotaz, který `RunScope` neumí, přidej metodu **do `RunScope`**,
  ne obcházení v aplikaci.

Izolace drží **strukturou kódu, ne kázní.**

V UI platí navíc: přepínač běhu trvale v hlavičce na každé obrazovce,
**odlišná barva rozhraní pro každý běh** (A modrá, B jantarová), potvrzovací
dialogy u zásadních akcí vždy jmenují běh („Uzamknout kapitolu 2 běhu
**2026-09-12_B**?"), název běhu je v názvu každého exportu.

**Běh je v cestě URL** (`/beh/<runId>/kapitola/<n>/<sekce>`, Správa bez kapitoly: `/beh/<runId>/sprava`), ne v cookie: dvě záložky smějí
držet dva různé běhy a sdílená cookie by jednu z nich tiše přepnula. Písmeno
běhu začíná s každým datem zahájení znovu od `A`; A/B/C jsou běhy téhož data
(`nextRunLetter`). **Ze stejného důvodu patří do cesty i kapitola a vybraná
postava** (např. `/beh/<runId>/kapitola/<n>/postavy/<id>`), ne do stavu
komponenty ani do cookie.

**Jméno z „Kdo jsi?" čte server z cookie** (`readAuthor` v
`src/core/services/auth-cookies.ts`); formuláře ho neposílají. Middleware
bez hesla i bez jména nepustí na žádnou stránku, takže audit nikdy není anonymní.

### 3. Nic se nepřepisuje destruktivně

- Každý přepočet je **nový řádek** v `computations`, nikdy update. Dry-run jde
  pustit stokrát.
- Stav postav je snapshot na kapitolu s vazbou na verzi přepočtu
  (`computation_id`). Nepřepisuje se.
- Každý nahraný `.xlsx` i `.md` se odloží **tak, jak přišel**, do archivu běhu.
- Všechny cizí klíče jsou `on delete restrict`. **Archivovaný běh se nikdy nemaže**
  a zůstává navždy prohlížitelný včetně odpovědí, stavů a trace.
- `audit_log` je **append-only** a vynucuje to databázový trigger
  (`db/sql/001_audit_append_only.sql`), ne jen konvence. U každé změny je
  zapsáno kdo (volné jméno z pole „Kdo jsi?"), kdy, co, hodnota před a po
  a které pravidlo změnu způsobilo.

Mazat smějí jen tři místa: seed skript (jen svůj lokální běh), import konfigurace
**před prvním přepočtem**, který odebere entity, jež nový soubor už neobsahuje,
a **zrušení odpovědi** v dotazníku (`RunScope.delete`).

**Zrušení odpovědi** vrací otázku do stavu „nikdo ještě neodpověděl" — překlik
u špatné postavy nebo odškrtnutá poslední volba u `multi`. Jinak by otázka
zůstala navždy zodpovězená, postava by v panelu svítila jako hotová a přepočet
by se na chybějící odpověď nezeptal. Smaže řádek v `answers` i s jeho vybranými
volbami a `{input}` hodnotami, **vždy se záznamem v `audit_log`** (hodnota před,
„po" prázdné) — historii nese audit, stejně jako u editace odpovědi. Ve vydané
kapitole platí stejná pojistka jako u editace: potvrzení, důvod, kaskáda.

## Konfigurace se nastaví jednou a pak se nemění (§6.5)

**Verzování konfigurace je zamítnuté.** Žádná tabulka verzí, žádná aktivace
verze, žádný diff dvou importů. Běh má **jednu platnou konfiguraci** (postavy,
skupiny, škály, zdroje, otázky, bloky, šablony pro všechny tři kapitoly),
připravenou celou předem.

| Kdy                   | Nahrání konfigurace                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Před prvním přepočtem | volně a opakovaně, bez ptaní — fáze ladění, ještě nic nevzniklo; entity, které nový soubor už neobsahuje, se smažou (když na ně navazují zadané odpovědi, import odmítne)    |
| Po prvním přepočtu    | konfigurace je zmrazená; nahrání je **nouzová cesta** pro opravu chyby (překlep v bloku, vadná podmínka) a nesmí odebrat nic, co autor napsal (odvozené efekty odpovědí ano) |

Nouzová oprava v rozjetém běhu:

1. vyžaduje **potvrzení a důvod**, obojí do auditu,
2. označí už spočítané kapitoly jako **`dotčené`** — stejný mechanismus jako
   oprava odpovědi (kaskáda), sama nic nepřepočítá,
3. původní soubor zůstává v archivu běhu.

Auditovatelnost místo verzí nese **archiv nahraných souborů** (`uploaded_files`,
každý přepočet na něj odkazuje `config_upload_id`) — po hře jde přesně dohledat,
z čeho se počítalo.

## Technologie [ROZHODNUTO]

| Vrstva              | Volba                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Framework           | Next.js, App Router, TypeScript                                                                                                 |
| Databáze            | Postgres (Neon), lokálně `scripts/pg.sh` nebo Docker                                                                            |
| ORM                 | Drizzle                                                                                                                         |
| UI                  | MUI (Material UI) s vlastním tématem; styly v theme `components`, jinak CSS Modules přes data atributy, bez `sx` a inline stylů |
| Testy               | Vitest, primárně na engine pravidel a import                                                                                    |
| Import tabulek      | SheetJS (`xlsx`)                                                                                                                |
| Výrazy v podmínkách | `jsep`                                                                                                                          |
| Zip                 | `jszip`                                                                                                                         |
| PDF                 | `@react-pdf/renderer`: `.md` → AST (`marked`) → PDF na serveru, bez HTML mezikroku (§8.1)                                        |
| Hosting             | Vercel, `git push` = nasazeno                                                                                                   |

**Žádné Google API.** Verze 1 komunikuje se světem výhradně přes nahrané
a stažené soubory: `.xlsx` a `.md` dovnitř, `.md`, `.pdf`, `.xlsx` a `.zip` ven.
Napojení na Google je fáze 2 a **nikdy nenahradí** souborovou cestu — ta zůstává
navždy funkční jako záložní režim. Jedinou výjimkou je stažení veřejného exportu
karty Google Docs (níže); nejde o API a souborová cesta zůstává plnohodnotná.

**Šablony z Google Docs (bez API a OAuth).** Nepovinný list `Templates`
v `.xlsx` (`Character`, `Chapter`, `URL` karty s `?tab=`; **ne** `N_Templates`
a ne v `CHAPTER_SHEET_KINDS`, jinak by přibyla kapitola) mapuje vlastníka
a kapitolu na kartu dokumentu sdíleného „kdokoli s odkazem".

- *Správa → Načíst z Google*: route `POST /beh/<runId>/sprava/sablony-google`
  **nezapisuje nic**, vrátí zip (`<ID>_<kapitola>.md` + `_stazeni.json`), který
  jde s formulářem běžným Zkontrolovat / Uložit — importní cesta zůstává jediná.
- *Výstupy → Obnovit z Google*: stáhne karty podle archivovaného `.xlsx`; karta,
  která by přidala chybu importu, se nepoužije. Co projde, se archivuje jako
  Google zip s auditem. Šablony nevstupují do přepočtu, nic se neoznačí `dotčené`.
- **Šablona z Googlu má vždy přednost** před nahranou (`templateWins`, pozná se
  podle `_stazeni.json`), v kontrole i v archivu; nahrané soubory jsou záloha.
- Export karty je nedokumentovaný, proto import hlídá, že značka míří na blok
  **téhož vlastníka z `N_Content` téže kapitoly** (`foreign_template_block`).
  Markdown z Docs escapuje `_` uvnitř značek; `parseTemplate` escapy ruší.
  Podrobnosti stahování (SSRF, jediný sledovaný skok) jsou v komentářích
  `src/core/services/download-google-templates.ts` a `classify-download.ts`.

**PDF se generuje** (obrat proti dřívějšímu návrhu, §8.1): z potvrzeného
přepočtu vznikne `.md` a z něj přímo dvě sloučená PDF podle typu (postavy,
skupiny), aby se daly rychle vytisknout. Markdown zůstává mezistupněm, který jde
ručně opravit.

## MUI (§15.1)

- **Nastavení v App Routeru:** `AppRouterCacheProvider` z `@mui/material-nextjs`,
  jinak problikne nestylovaný obsah. MUI komponenty patří do `'use client'`
  stromu, server komponenty zůstávají na načítání dat.
- **Vlastní téma, ne výchozí Material** (`src/theme/theme.ts`, `createTheme`):
  - `palette` — tlumené, mírně vybledlé odstíny; patří sem i barvy běhů A a B,
  - `typography` — menší základní písmo než výchozí MUI,
  - `components` — globálně `defaultProps: { size: 'small', margin: 'dense' }`
    pro pole a tlačítka, jinak je aplikace o třetinu rozvolněnější,
  - `colorSchemes` pro světlý a tmavý režim.
- **Uprav téma, ne jednotlivé komponenty.** První volba je vždy `components`
  v theme (`defaultProps`, `styleOverrides`, `variants`). Když mají všechna
  tlačítka vypadat jinak, změní se téma, ne tlačítka.
- **Pravidla stylování** — výkonnostní požadavek, ne preference vzhledu
  (`sx`, `styled()` i inline `style` alokují a přepočítávají styly při každém
  renderu):
  - **CSS Modules** — jeden `.module.css` na komponentu, v jejím adresáři,
  - **žádný `sx`** — nikde, ani na komponentách MUI,
  - **žádný `styled()` s dynamickými props**,
  - **žádné inline `style` objekty** — jediná výjimka je geometrie virtualizace
    (`transform`, `height`, `top`, `left`, `width`),
  - **stavové styly přes data atributy** (`data-selected={isSelected}`,
    CSS cílí `[data-selected="true"]`), ne podmíněná pole tříd,
  - `Typography` z MUI je v pořádku; **`Box`, `Stack`, `Grid` ne** ve stromech,
    které se často překreslují (seznamy, karty, tooltipy, menu).

  Pravidla platí **globálně**, ne jen v horkých cestách — hranice se během
  vývoje posouvá a rozhodovat to u každé komponenty je víc práce.

- **`DataGrid` jen v sekci Výstupy.** Jinde `Table` nebo `List`; zadávání
  odpovědí je záměrně formulářové, ne mřížkové.
- **Indikátor vyplněnosti barvou i tvarem:** ikony `RadioButtonUnchecked` /
  `Adjust` / `CheckCircle`.

## Škála a zdroj jsou dvě různé věci (§4.1, §4.2)

Tohle je nejčastější zdroj omylů v celém modelu. **Nemíchej je a nedávej je do
jedné tabulky.**

|                  | Škála (`Scale`)                                       | Zdroj (`Resource`)                             |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------- |
| ID               | `S_<Postava>_<Skala>`                                 | `R_<Postava \| Domácnost>_<Zdroj>`             |
| List             | `Scales`                                              | `Resources`                                    |
| Sloupce          | postava, škála, **`Min`**, **`Max`**, výchozí hodnota | postava nebo domácnost, zdroj, výchozí hodnota |
| Hranice          | ano, **ořez (clamp) na `Min`/`Max`**                  | **žádná horní hranice, žádný ořez**            |
| Rozsah platnosti | vždy postava                                          | `private` nebo `household`                     |
| K čemu           | vnitřní stav postavy (`Regime`, `Control`, Smutek)    | majetek a počitatelné věci (`Wealth`, `Bony`)  |

- **`Min` a `Max` jsou per dvojice postava × škála**, ne globální 1–10. Dvě
  postavy smějí mít u téže škály jiný rozsah. Typicky 1–10, ale nikdy to
  nepředpokládej v kódu — čti z `Scales`.
- **Výchozí hodnoty nejsou v listu `Characters`.** Žijí v `Scales` a `Resources`;
  jsou to počáteční hodnoty **pro kapitolu 1**, od kapitoly 2 se vychází ze
  snapshotu po předchozí kapitole.
- Jednu škálu nebo zdroj smí mít víc postav; každá dvojice je samostatný řádek.
- **Ořezává se po každém posunu.** Hodnota škály nikdy nesmí být mimo
  `Min`–`Max`, ani mezi dvěma posuny. Příklad: `Regime` 4, dva posuny `-2` →
  4 → 2 → 0, ořízne se na 1. Posuny se aplikují **ve sledu, v jakém jsou řádky**
  v tabulce.
- **Každý ořez se loguje do auditu a hlásí v trace** — je to signál špatně
  nastavených vah, ne detail. Zdroj se neořezává nikdy, jen se auditují delty
  s důvodem.
- Formát dopadu: čárkou oddělený seznam `<ID><znaménko><číslo>`, škály a zdroje
  v jednom sloupci `Scale and Resources Impact`
  (`S_Marie_Regime-2, R_Marie_Wealth+3`). Prázdná buňka = žádný dopad.

**Postavy se nad rámec škál, zdrojů a domácnosti nemodelují.** Charakterizace
(„závislý na piku") žije v pevném textu šablony, kterého se engine nedotkne.

## Peníze se směrují podle rodinného stavu (§4.4)

Jádro domácností. **Autor nepíše dvě varianty odpovědi pro vdanou a svobodnou
postavu** — napíše logické jméno a engine rozhodne, kam to spadne.

| Zápis                      | Kam to jde                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `R_Marie_Wealth+3`         | Marie v manželství → **společný účet domácnosti**; Marie svobodná → **její osobní účet** |
| `R_Marie_Wealth_private+3` | **vždy osobní účet**, i když je Marie vdaná — příjem, o kterém partner neví              |

- Přípona `_private` je **úniková cesta a má přednost** před směrováním.
  **Otázka žádný příznak `Private` nenese** — na osobní účet míří jen přípona
  u konkrétního dopadu.
- **Stejné směrování platí v podmínkách:** `R_Marie_Wealth >= 7` znamená „účet,
  do kterého Mariiny peníze tečou". Kdo chce konkrétní účet, dopíše `_private`.
- **Výjimka — absolutní nastavení musí být vždy explicitní.** Organizátorská
  otázka typu `scale_direct` / `resource_direct` nesmí použít logické jméno; org
  nastavuje konkrétní účet a nikdy se nesmí stát, že hodnota přistane jinde, než
  myslel. Hlídá to validace.
- **Rodinný stav se čte po strukturální fázi** (§7.3, fáze 2). Kdo se v téhle
  kapitole oženil, tomu už příspěvky z téže kapitoly jdou na společný účet; kdo
  se rozvedl, na osobní. Neplyne to z pořadí řádků, ale z fixního pořadí fází.
- **Příspěvky členů domácnosti se sčítají.** Když Marie i Mirek přinesou +2,
  společný účet vzroste o 4.

**Směrování je největší riziko pro princip „žádný black box"** (§2) — ze zápisu
`R_Marie_Wealth+3` není vidět, kam to spadlo. Proto trace vždy uvádí

1. **cílový účet a důvod směrování** („+3 Wealth → společný účet, Marie je
   v manželství s Mirkem Pokorným"),
2. **od koho změna přišla** („−3 Wealth, zdroj: odpověď Mirka Pokorného na
   `Q_Mirek_2_1`").

V UI je u sdíleného zdroje značka „společný účet s Mirkem Pokorným" a odkaz na
druhou postavu. Bez toho je to přesně ten black box, který §2 zakazuje.

## Domácnosti (§4.4)

- **ID domácnosti se neváže na nic v tabulce, odvozuje se ze dvou postav:** ID
  obou postav **abecedně seřazená a slepená** — `MarieMirek`, nikdy
  `MirekMarie`. Stejná dvojice má vždy stejné ID, i po rozvodu a novém sňatku,
  takže se na domácnost dá odkazovat **dřív, než vznikne**.
- **Výchozí domácnosti** (s kterými hra začíná) se nastavují ve sloupci
  `Household` v listu `Characters`: ID domácnosti (`MarieMirek`) u obou členů,
  prázdné = postava začíná bez domácnosti. Od kapitoly 2 se vychází ze
  snapshotu. **Počáteční zůstatek společného účtu** takové domácnosti je řádek
  v `Resources` s ID domácnosti místo postavy (`MarieMirek`, `R_MarieMirek_Wealth`);
  řádek smí mít jen domácnost ze sloupce `Household`. **Výchozí domácnost bez
  tohoto řádku je chyba importu** — nic se nedoplňuje nulou.
- **Postava smí být nejvýše v jedné domácnosti**; vynucuje to unikát na
  `household_memberships`, ne jen validace.
- **Osobní účet sňatkem nezaniká.** Mění se jen to, kam standardně přitékají
  peníze; co měli předtím, jim zůstává.
- **Vznik i zánik domácnosti je efekt odpovědi**, ne ruční operace nad databází.
  Zapisuje se do sloupce `Effects` jako volání funkce, **anglicky velkými
  písmeny**, argumenty jsou ID postav z registru (ne volný text):

  ```
  HOUSEHOLD_CREATE(Marie, Mirek)    sňatek
  HOUSEHOLD_DISSOLVE(Marie, Mirek)    rozvod nebo úmrtí
  ```

  Pořadí argumentů ID domácnosti neovlivní (`MarieMirek`). Víc efektů v jedné
  buňce se odděluje `;` nebo novým řádkem.

- **Efekt sám vyvolá vstupní pole a doplní dopad na zdroje** — autor
  `Scale and Resources Impact` u té odpovědi nepíše. `{input1}` je pole první
  postavy z efektu, `{input2}` druhé (v pořadí, jak je autor napsal):

  ```
  HOUSEHOLD_CREATE → R_Marie_Wealth_private-{input1}, R_Mirek_Wealth_private-{input2},
                     R_MarieMirek_Wealth+{input1}+{input2}
  HOUSEHOLD_DISSOLVE → R_MarieMirek_Wealth-{input1}-{input2},
                     R_Marie_Wealth_private+{input1}, R_Mirek_Wealth_private+{input2}
  ```

  Odvození se zatím týká jen `Wealth`. **Kolik kdo vloží do společného nebo si
  odnáší, se nikdy nedopočítává** — zadává to org. `{input}` je signál pro UI;
  stejný název = stejná hodnota, různá čísla = různá pole. Žádné tiché půlení,
  žádná strategie slévání v kódu — **rozhoduje člověk**. Trace u odvozených
  dopadů uvádí efekt a zadané hodnoty.

- **Nová domácnost začíná s nulovým společným účtem**; kolik na něj přijde
  z osobních účtů, plyne z inputů. **Po zániku žádný zůstatek nezůstává** —
  rozdělí se mezi jeden nebo víc osobních účtů podle inputů (rozvod: mezi
  bývalé manžele, úmrtí: celý na jeden účet, druhý input 0). Součet inputů se
  musí rovnat zůstatku společného účtu, jinak konflikt.
- **Sňatky a rozvody jsou organizátorské otázky**, protože se týkají víc postav
  najednou.
- **Konflikty** (`konflikty[]`, engine je nerozhodne): `HOUSEHOLD_CREATE` pro
  postavu, která už v domácnosti je; `HOUSEHOLD_DISSOLVE` domácnosti, která
  neexistuje; `HOUSEHOLD_DISSOLVE`, jehož inputy nedávají dohromady zůstatek.
  **Odmítnutý efekt nepohne ničím** (`rejectedEffectKeys`): domácnost zůstane,
  jak byla, a odvozené dopady se neaplikují — i u rozdělení, které nesedí.
- **Dopad mířící výslovně na společný účet domácnosti, která v tu chvíli
  neexistuje**, je taky konflikt `household_missing` a peníze se nepohnou —
  ať domácnost ještě nevznikla, nebo v téže kapitole zanikla
  (`R_MarieMirek_Wealth+5` od třetí postavy, `resource_direct` na ten účet).
  Import to staticky rozhodnout neumí (záleží na odpovědích), proto konflikt,
  ne chyba importu ani pád. Vlastní výplata a vklady efektu domácnosti jsou
  z toho vyjmuté. **V podmínkách se takový účet dál čte jako 0.** Logických
  jmen (`R_Marie_Wealth+3`) se to netýká, ta se směrují na existující účet.
- **Členství ve skupině a vedení skupiny se nesledují** — ani v efektech, ani
  v `Groups`. Vyjadřují je varianty bloků a jejich podmínky (§4.6).

## Tři vrstvy logiky — vyšší vrstvu ber až jako poslední

Většina hry se bez pravidel obejde. Než sáhneš po vyšší vrstvě, zkus nižší:

| Vrstva                     | Kde je                                               | Co umí                                     |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| 1. Dopad na škály a zdroje | sloupec `Scale and Resources Impact` v `N_Questions` | odpověď posune škály a zdroje              |
| 2. Efekty                  | sloupec `Effects` v `N_Questions`                    | odpověď vyvolá vznik nebo zánik domácnosti |
| 3. Varianty bloků          | sloupce `Priority` a `Conditions` v `N_Content`      | **která varianta textu se použije**        |

**Revidované zadání zná jen tyhle tři vrstvy** (§4.5). Samostatný list pravidel
(`N_Rules`) v seznamu listů (§4.2) ani ve fixtures **není** — nezakládej ho.
Kdyby se ukázalo, že něco se nevejde ani do jedné ze tří vrstev, patří to
nejdřív do zadání, teprve pak do schématu.

V databázi vrstvy 1 a 2 ústí do jedné tabulky `effects`, kde je vlastníkem
efektu `answer_option_id`. Vrstva 3 žije v `content_blocks` + `block_variations`.

## Podmínky jsou výrazy, ne strukturované sloupce (§4.5)

Autor hry píše podmínky **jako výraz v jedné buňce**:

```
A_Marie_1_1_Karel AND !(A_Marie_2_3_Postava2 OR A_Marie_2_3_Postava3)
```

**Parser nepiš. Vlastní gramatiku nepiš nikdy.** Používá se `jsep`
(`src/engine/expression/`, import jen hlásí syntaktické chyby přes
`src/import/expression.ts`); nad jeho stromem se napíše vyhodnocení. Definice
jazyka je v `src/engine/constants/expressionLanguage.ts`, aby engine i import
četly totéž.

| Prvek           | Zápis                                 | Význam                                                         |
| --------------- | ------------------------------------- | -------------------------------------------------------------- |
| Odpověď         | `A_Marie_1_1_Karel`                   | postava odpověděla takto                                       |
| Negace          | `!A_Marie_1_1_Karel`                  | neodpověděla                                                   |
| Spojky          | `AND`, `OR`                           | `AND` váže silněji                                             |
| Závorky         | `( )`                                 | priorita vyhodnocení                                           |
| Škála           | `S_Marie_Regime >= 7`                 | operátory `=`, `!=`, `>`, `<`, `>=`, `<=`                      |
| Zdroj           | `R_Marie_Wealth >= 7`                 | totéž; bez přípony se **směruje** podle rodinného stavu (§4.4) |
| Výsledek ankety | ID vítězné odpovědi z definice `poll` | platí, jen když tahle odpověď anketu vyhrála (§6.6)            |
| Náhoda          | `RANDOM(50)`                          | pravděpodobnost v procentech, hod se ukládá (§7.4)             |
| Výchozí         | `DEFAULT` **nebo prázdná buňka**      | vždy pravdivé, stojí poslední                                  |

**Prázdná podmínka a `DEFAULT` znamenají totéž.** Nerozlišuj je nikde — ani
v parseru, ani ve validacích, ani v UI.

Dvě věci, na které `jsep` sám nestačí: `AND`/`OR` se musí zaregistrovat jako
binární operátory a autorovo jednoduché `=` se před parsováním přepíše na `==`
(pozor na `<=`, `>=`, `!=`). Podmínka se ukládá **jako text** (`condition_expr`)
plus seznam nalezených referencí — formulace zůstává autorova a validace může
citovat, co napsal.

**Každý výskyt `RANDOM` má vlastní hod** (§7.6). Klíč hodu je
`(postava, kapitola, varianta, pořadí výskytu ve výrazu)`.
`RANDOM(50) AND RANDOM(50)` musí dát 25 %, ne 50 %. **`RANDOM` smí jen v podmínkách
variant bloků** (`N_Content`).

**Výrazy se vyhodnocují jen v `N_Content`.** Sloupec `Condition` v `N_Questions`
(od kapitoly 2) nese **jediné `Variation ID`**, nic jiného — žádné `AND`, `OR`,
`!`, porovnání, `RANDOM` ani `DEFAULT`; prázdná buňka = otázka se položí vždy.
Varianta musí patřit **téže postavě** a existovat v `N_Content` **téže kapitoly**
(`2_Content` rozhoduje o `2_Questions`). Import to kontroluje.

**Vybrané varianty jsou stav.** Engine je vrací, ukládají se per vlastník
a kapitola a slouží třem věcem: naplnění dokumentu, rozhodnutí o otázkách
v dotazníku a auditu. Varianty se vybírají při přepočtu předchozí kapitoly,
takže jsou známé dřív, než se dotazník otevře — žádná cykličnost.

- **Drží se pro celý běh.** `RunState.selectedVariants` po kapitole N nese výběr
  všech kapitol až po N+1 (kapitolu varianty určuje její blok, takže stačí plochý
  seznam ID per vlastník). Engine z něj pozná, které otázky se položily
  i v dřívějších kapitolách — **volající proto předává odpovědi všech dosud
  odehraných kapitol** a chybějící starší odpověď je `missing_answer`, ne tiché
  `false` v podmínce.
- **Ukládají se při přepočtu, ne při generování dokumentů.** Jakmile `evaluate`
  rozhodne, která varianta vyhrála, volající ji zapíše do `selected_variations`
  ve stejném kroku jako přepočet a snapshot (vazba na `computation_id`, nikdy
  se nepřepisuje). Blok nerozhodnutý kvůli chybějícímu hodu řádek nemá.

## Bloky a jejich varianty (§8.2)

**Varianty textu žijí v tabulce, šablona obsahuje jen značku.**

Struktura listu `N_Content`:

| Sloupec                 | Význam                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `Character`             | které postavy nebo skupiny se blok týká — **vyplněno jen na prvním řádku skupiny**                     |
| `Block ID`              | identifikátor bloku, `B_Marie_2_Historie_1` — **jen na prvním řádku**                                  |
| `Variation ID`          | identifikátor varianty, `V_Marie_2_Historie_1_A`                                                       |
| `Variation Description` | poznámka autora, do výstupu nejde                                                                      |
| `Variation Text`        | text do dokumentu; **smí být prázdný** — varianta „nic se nestalo"; smí obsahovat značku dalšího bloku |
| `Priority`              | **volitelné** číslo, nižší dřív                                                                        |
| `Conditions`            | výraz podle §4.5; prázdná buňka = `DEFAULT`                                                            |

**Vyhodnocení:** varianty téhož bloku se procházejí **vzestupně podle `Priority`;
nemá-li ji žádná varianta bloku, podle pořadí řádků** — a použije se **první,
jejíž podmínka platí**.

- **`Priority` je buď u všech variant bloku, nebo u žádné.** Částečně vyplněná
  priorita je chyba validace (pořadí by nebylo jednoznačné).
- **Fallback varianta** (`DEFAULT` nebo prázdná podmínka) je vždy pravdivá,
  takže musí stát **poslední**. Kdyby stála dřív, všechno za ní je nedosažitelné
  — to je chyba validace.
- **Blok bez fallback varianty je chyba** (nevrátil by nic).
- **Dvě varianty téhož bloku se stejnou `Priority`** jsou chyba. Všechny
  varianty bez priority jsou naopak v pořádku — autor tím říká, že rozhoduje
  pořadí řádků.

Z toho plyne: **mezi variantami nevznikají konflikty.** Priorita (nebo pořadí
řádků) rozhoduje úplně a engine nemusí nic hlásit orgovi.

## Značky v šabloně jsou nepárové a smějí se zanořovat (§8.4)

| Značka              | Význam                                           |
| ------------------- | ------------------------------------------------ |
| `{BLOK <Block ID>}` | nahradí se textem vybrané varianty z `N_Content` |

- **`{/BLOK}` neexistuje.** Text nese tabulka, ne šablona, takže není co uzavírat.
  Zavírací značka v šabloně je chyba validace.
- **Zanořování:** `Variation Text` smí obsahovat další `{BLOK …}`. Nahrazování
  proto běží **ve smyčce, dokud text obsahuje nějakou značku**. Zanořený blok se
  vyhodnocuje stejně a ve stejném kontextu (postava, kapitola) jako blok, ve
  kterém stojí.
- **Blok se nesmí přímo ani nepřímo odkazovat sám na sebe** (A → B → A). Hlídá to
  validace při importu a engine si navíc drží **horní mez počtu průchodů** —
  při jejím překročení skončí chybou, nikdy se nezacyklí.
- **Žádná značka nesmí přežít do výsledného dokumentu.** Zbylá značka = chyba
  před uložením.
- Blok v šabloně bez záznamu v `N_Content` i blok v `N_Content`, na který nevede
  žádná značka, jsou chyby validace. Blok, na který vede značka jen z jiného
  `Variation Text`, se počítá jako dosažitelný.
- Text mimo značky je pevná část šablony a aplikace se ho nedotkne. Sem patří
  charakterizace postavy, která se nemění (§4.6).
- Prázdný `Variation Text` znamená, že značka zmizí beze stopy.
- Proměnné hodnoty (jméno, příjmení) se při naplnění dokumentu dosazují taktéž
  (§8.3). **Jméno postavy nikdy natvrdo v textech** — sňatek mění příjmení
  a provázání by se rozpadlo. Totéž platí pro názvy skupin a funkcí.

## Otázky (§6.1, §4.2)

| Typ           | Popis                                                |
| ------------- | ---------------------------------------------------- |
| `bool`        | Ano / Ne                                             |
| `single`      | výběr jedné hodnoty                                  |
| `multi`       | výběr více hodnot                                    |
| `poll`        | definice ankety — společná otázka bez postavy (§6.6) |
| `poll-answer` | hlas postavy v anketě                                |

Absolutní nastavení hodnoty zadává org otázkou `scale_direct` / `resource_direct`
(§4.4, §7.3); vždy musí jmenovat **konkrétní** účet.

**U `multi` je povinná aspoň jedna vybraná odpověď.** Smí-li postava nevybrat
nic, napíše autor „nic z uvedeného" jako běžnou odpověď do tabulky. Prázdný výběr
je nezodpovězená otázka a engine ho odmítne — UI pro to nemá žádný zvláštní prvek.

**ID otázky smí zůstat prázdné** — aplikace ho doplní podle vzoru
`Q_<Postava>_<Kapitola>_<Poradi>`:

- `<Poradi>` je pořadí otázky **pro danou postavu v dané kapitole**, od 1 podle
  pořadí řádků. Každá postava začíná v každé kapitole znovu od 1.
- Počítají se **všechny** otázky postavy, včetně organizátorských a `poll-answer`.
- Ručně vyplněné ID má přednost a nepřepisuje se. **Výjimka: u `poll` je ID
  povinné a nikdy se negeneruje.**

**U `bool` otázek se ID odpovědí odvozují z textu** `Ano` / `Ne` na
`A_<Postava>_<Kapitola>_<Poradi>_Ano`, resp. `_Ne`.

- Řádky `Ano` / `Ne` slouží jen k zadání efektů. **Chybí-li řádek (nebo oba),
  aplikace ho doplní sama** — znamená to „žádné efekty", odkazovat se na tu
  odpověď v podmínkách jde dál.
- Pořadí řádků nehraje roli, odpověď se pozná podle textu. Jiný text než
  `Ano` / `Ne` u `bool` otázky je chyba validace.

**Od kapitoly 2 smí mít podmínku i sama otázka** (§4.2). **Podmíněné podotázky
zůstávají zakázané** — autoři je vědomě vyškrtli, dotazník je plochý.

**Otázky jsou vlastní pro každou postavu.** Žádná sdílená sada (kromě ankety),
~3 otázky na postavu a kapitolu. Volby odpovědí, které jmenují jinou postavu,
odkazují na **ID postavy z registru**, ne na volný text — po sňatku se jinak
provázání rozpadne.

## Ankety (§6.6)

Anketa je **jediná otázka, o které rozhodují odpovědi více postav**. Skládá se
ze dvou typů:

- **`poll` — definice.** Má vlastní ID (povinné, negeneruje se), text a odpovědi
  s jejich efekty. **Není přiřazená k žádné postavě** a nezapočítává se do
  pořadí otázek.
- **`poll-answer` — hlas postavy.** Běžná otázka postavy (ID se doplňuje, počítá
  se do pořadí). **Ve sloupci `Text` nemá text otázky, ale ID nadřazené ankety.**
  Text, odpovědi i efekty se berou z ankety — jediný zdroj, nic se neopisuje.

**Vyhodnocení je deterministické:** vyhrává odpověď s nejvíc hlasy, **při shodě
rozhoduje pořadí řádků v definici ankety** (vyhrává dřívější). Remíza tedy
**není konflikt pro orga**. Přepočet nelze spustit, dokud nehlasovaly všechny
postavy s `poll-answer`. **Anketa, ve které v téže kapitole nikdo nehlasuje, je
chyba importu** (`poll_without_votes`) — bez hlasů by vyhrál první řádek
a jeho efekty by se aplikovaly. Když se v běhu nepoloží žádná z podmíněných
hlasovacích otázek, platí totéž pravidlo jako u remízy: **vyhrává první řádek
definice i s nulou hlasů**, efekty se aplikují a konflikt to není — vědomé
rozhodnutí, neotevírat.

V podmínkách se na výsledek odkazuje **ID vítězné odpovědi**. **Efekty odpovědi
ankety se aplikují jednou za vítěznou odpověď**, ne za každého hlasujícího.

## Organizátorské otázky (§6.7)

- Chovají se **úplně stejně** jako hráčské: stejné typy, stejné dopady, stejné
  zapínání bloků. **Je to jen jiný zdroj vstupu, ne jiný mechanismus; engine
  mezi nimi nerozlišuje.**
- V UI jsou v **jednom proudu** s ostatními otázkami postavy, na svém místě
  podle pořadí, jen s decentní značkou „zadává org". **Ne oddělená sekce a ne
  druhý ukazatel postupu** — je jich málo a zvláštní sekce by rozbila plynulý
  průchod dotazníkem.
- **Sňatky a rozvody** (`HOUSEHOLD_CREATE` / `HOUSEHOLD_DISSOLVE`) patří mezi
  organizátorské otázky, protože se týkají víc postav.
- Sběr odpovědí probíhá **ve dvou vlnách** (papíry od hráčů, pak porada orgů).
  Aplikace kvůli tomu nepotřebuje nic zvláštního.
- `scale_direct` / `resource_direct` nastavuje hodnotu **absolutně** a aplikuje
  se **na začátku hodnotové fáze, před všemi posuny**. Každé absolutní nastavení
  je v trace zvlášť viditelné.

## Pořadí vyhodnocení je fixní (§7.3)

```
1. sběr odpovědí
2. STRUKTURÁLNÍ fáze — vznik a zánik domácností (nejdřív všechny
   `HOUSEHOLD_DISSOLVE`, pak `HOUSEHOLD_CREATE`)
3. HODNOTOVÁ fáze — nejprve absolutní nastavení z org otázek,
   pak posuny škál a zdrojů; tady se rozhoduje cílový účet podle fáze 2
4. detekce zbylých konfliktů
```

**Fáze 2 musí proběhnout celá před fází 3.** Sdílený zdroj potřebuje vědět, kdo
do domácnosti patří, dřív než se do něj začnou sčítat příspěvky. Kdyby se sňatek
vyhodnotil až mezi změnami hodnot, výsledek by závisel na pořadí řádků — a to
je přesně ten nedeterminismus, kterému se vyhýbáme.

Rozdělení efektů do fází je v datech (`STRUCTURAL_EFFECT_KINDS`,
`VALUE_EFFECT_KINDS` v `src/engine/constants/effectPhases.ts`), aby ho
implementace `evaluate` nešla omylem obejít.

## Import konfigurace a validace (§10.1, §11)

Kód je v `src/import/`, čisté funkce bez databáze (zápis je oddělený
v `src/import/persist/`) — celá cesta od souboru k hlášením jde otestovat na
fixtures v `documents/`. Převod na vstup enginu je `src/import/to-engine-config.ts`.

Listy konfigurace: `Characters` (registr postav: ID, jméno, příjmení,
`Household`), `Groups` (ID, název — jen pro
informaci a kontrolu šablon), `Scales`, `Resources`, `1_Questions` / `2_Questions` / `3_Questions`,
`2_Content` / `3_Content`, `Validations`.

- **Jeden `.xlsx` se všemi listy, žádný jiný formát** (Google Sheet →
  _Stáhnout → Microsoft Excel_). Nahrávání jednotlivých `.csv` je **zamítnuté** —
  druhá cesta, kterou by bylo nutné udržovat.
- **Chybná konfigurace nikdy nesmí shodit aplikaci.** Parser sbírá všechny chyby
  a vrátí je najednou, nekončí na první. Autor chce opravit dvacet překlepů
  v jednom kole.
- **Každá hláška musí říct, kde je problém: list, řádek, sloupec, hodnota.**
  „Neplatný odkaz na škálu" je nepoužitelné. „List `2_Questions`, řádek 34,
  sloupec `Scale and Resources Impact`: škála `S_Marie_Regme` neexistuje,
  mysleli jste `S_Marie_Regime`?" je použitelné.
- **Chyby blokují** použití konfigurace, **varování pustí dál**.
- **Import je idempotentní.** Opakované nahrání nesmí nic zdvojit — konfigurace
  běhu je vždy jen jedna.
- **Po prvním přepočtu je import nouzová cesta** s potvrzením, důvodem
  a označením `dotčené` (viz „Konfigurace se nastaví jednou" výše). Soubor
  se v každém případě odloží do archivu běhu.
- **Fill-down sloučených buněk.** `Character` a `Block ID` jsou vyplněné jen na
  prvním řádku skupiny; parser musí hodnotu dopěstovat dolů. Prázdný řádek
  skupinu ukončuje.
- Prázdné buňky, mezery navíc a nezlomitelné mezery ošetři tiše, ale **spočítej
  je a zmiň v přehledu importu.**
- **Diakritika v ID, názvech listů a exportech musí projít bez poškození.**

**Šablony** se nahrávají jako `.md` (víc souborů najednou nebo v zipu),
**všechny kapitoly najednou na začátku běhu**. Komu a které kapitole patří,
určuje **název souboru**: `<ID postavy>_<kapitola>.md` (`Marie_2.md`),
`<ID skupiny>_<kapitola>.md` (`Funkcionari_2.md`). Aplikace ukáže, která šablona
komu patří a která chybí; seznam skupin bere z listu `Groups`.
**Kapitola 1 šablonu nepotřebuje** — její dokumenty jsou pevný text a netisknou
se (`printedChapters` v `src/import/template-upload.ts`); soubor `_1.md` i řádek
`Templates` pro kapitolu 1 projdou s jedním varováním `template_not_printed`
a nekontrolují se.

**Co se ošetřuje tolerantně** (a hlásí jako varování, ne chyba) — vždycky proto,
že jde o zvyk autora, který by jinak blokoval desítky řádků:

| Jev                                           | Řešení                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------ |
| `Věra` ve sloupci `Character` místo ID `Vera` | dohledá se podle jména bez diakritiky; nejednoznačné jméno se **nehádá** |
| `,` i `;` jako oddělovač v dopadech           | beru oba                                                                 |
| chybějící řádek `Ano` / `Ne` u `bool` otázky  | doplní se s odvozeným ID a bez efektů                                    |
| prázdné ID otázky                             | doplní se podle vzoru `Q_<Postava>_<Kapitola>_<Poradi>`                  |

**Tolerantní naopak nebýt** u překlepu v ID škály nebo zdroje, chybějící šablony,
hodnoty mimo rozsah, odkazu na neexistující blok, anketu nebo odpověď
a nespárované závorky. Tam tolerance znamená špatná čísla v dokumentu — místo
toho nabídni „mysleli jste …?".

**Nezapomenutelné validace** (§11): `Min > Max`, výchozí hodnota mimo rozsah,
postava mimo registr, duplicitní řádek postava × škála/zdroj, duplicitní ID
otázky, `poll` bez ID, `poll-answer` na neexistující anketu, `poll` bez
hlasujících, blok bez fallback
varianty, fallback varianta jinde než poslední, částečně vyplněná `Priority`,
cyklus mezi bloky, `Condition` v `N_Questions`, které není `Variation ID` téže
postavy a kapitoly, `Household` v `Characters`, které neodpovídá dvojici
postav, řádek v `Resources` s domácností mimo `Household`, výchozí domácnost bez řádku
v `Resources`, šablona bez adresáta a adresát bez šablony (od kapitoly 2), neplatný
efekt (neznámá funkce, špatný počet argumentů, ID mimo registr).

Výrazy v `Conditions` se v importu **jen načtou, uloží a zkontrolují syntakticky
a referenčně** — vyhodnocuje je až engine. Stejně se v importu kontrolují
efekty ve sloupci `Effects`.

**Parsování formátu dopadu na škály a zdroje je čistá funkce s testy**
(`src/import/scale-impact.ts`). Je to malá věc volaná všude a její chyba se
projeví jako špatná čísla v dokumentech.

## Co se vědomě nemodeluje

- **Obecná tabulka vztahů.** Strukturně existuje jen domácnost. Kde vztah
  mechanicky rozhoduje, je zachycený jako odpověď odkazující na ID jiné
  postavy — to jsou ta data. Všechno ostatní je text v šabloně.
- **Členství ve skupině a vedení skupiny.** Nejsou stav, vyjadřují je varianty
  bloků a jejich podmínky.
- **Vášně, obavy, ambice.** Jsou to bloky šablony, ne tabulka. Mění se každou
  kapitolu tím, že se vybere jiná varianta. Když má některá ovlivnit pozdější
  kapitolu, přidá se k ní škála nebo zdroj — **text sám se do enginu nikdy
  nevrací.**
- **Podmíněné podotázky.** Autoři je vědomě vyškrtli, dotazník je plochý.
- **Popis postavy.** Vše, co engine potřebuje, plyne z odpovědí, škál a zdrojů.
- Obecné pravidlo (§4.6): **text, který se jen tiskne, není datový model; co má
  ovlivnit budoucnost, je škála nebo zdroj.**

## Doménová pravidla, na která se snadno zapomene

- **Přepočet čte konfiguraci z archivovaného `.xlsx`**, ne z tabulek: poslední
  úspěšně naimportovaná nahrávka → `importWorkbook` → `toEngineConfig`, a její ID
  jde do `config_upload_id`. Druhý převodník „tabulky → `EngineConfig`" se
  nepíše. Tabulky v databázi slouží UI; s enginem je pojí ID z tabulky autora.
- **Hod patří variantě, ne postavě a kapitole.** Klíč v `dice_rolls` je
  `(run_id, block_variation_id, occurrence)`; vlastníka (postava nebo skupina)
  i kapitolu říká blok varianty. Žádný obecný `owner_id` — neměl by cizí klíč.
- **Odpověď na otázku, která se přestala pokládat, aplikace neřeší.** Vzniknout
  by neměla (znamenalo by to opravu kapitoly 1 poté, co se vyplnila kapitola 2
  a oprava překlopila variantu `Questions` bloku). Kdyby přece: engine přepočet
  odmítne nahlas (`invalid_answer … never asked`) a řeší se to ručně. Žádné UI,
  žádné tiché vynechávání při načítání.

- **Výchozí odpovědi neexistují.** Každá odpověď je explicitně zadaná člověkem.
  Když hráč nedodá papír, org dotazník **vyklikne ručně**. Přepočet **nelze
  spustit**, dokud něco chybí; aplikace vypíše seznam chybějících. Žádné tiché
  doplňování na pozadí. Nikdy.
- **Náhoda se hodí jednou a uloží.** `RANDOM(50)` ve výrazu si vyžádá hod;
  výsledek se uloží k postavě, kapitole a variantě bloku jako běžná data.
  Přepočet hod **neopakuje**. Přehodit nebo přepsat lze jen ruční akcí orga,
  která jde do auditu včetně staré hodnoty. Engine nikdy negeneruje náhodu sám —
  dostane ji na vstupu. Žádné seedování není potřeba.
- **Mezi variantami bloku ani v anketě konflikt vzniknout nemůže**, tam je
  výsledek určený úplně.
- **Váhy patří do tabulky, ne do kódu** (§7.2).
- **Kaskáda:** změna odpovědi ve vydané kapitole (nebo nouzová oprava
  konfigurace) označí dotčené kapitoly jako `dotčené`. Aplikace **sama nic
  nepřepočítá** — vynutí si rozhodnutí orga (přepočítat / ponechat jak je).
  Při „ponechat" si zapíše, že se výpočet a vydaný stav rozcházejí, a proč.
  Během hry je zdrojem pravdy **papír v rukou hráče**, ne databáze.
- **Uzamčení kapitoly není nikdy nevratné.** Stav `vydaná` je měkká pojistka
  proti překlepu; editace vyžaduje potvrzení a důvod, obojí do auditu.
- **„Běh", ne „session".** Slovo session je v kódu obsazené přihlašovací relací.
- **Přihlášení je jedno sdílené heslo** (povinné, aplikace je na veřejném
  internetu) plus pole „Kdo jsi?". Žádné účty ani role (§3.1).
- **Zálohování je tlačítko „Zazálohovat"** — konzistentní snapshot ke stažení,
  po každé vydané kapitole. Na Drive patří snapshoty, nikdy živá databáze (§18.5).

## Rozvržení aplikace (§6.4)

**Klasická webová aplikace, ne mřížka.** Org přepisuje jeden papírový dotazník
po druhém, takže na obrazovce má být právě ta postava, jejíž papír drží v ruce.

- **Horní lišta:** přepínač běhu (barevně odlišený), kapitoly 1/2/3 se stavem,
  **pět sekcí — Postavy · Skupiny · Přepočet · Výstupy · Správa**, vpravo jméno
  z pole „Kdo jsi?". (Sedm sekcí bylo zvažováno a sloučeno na pět.)
- **Levý panel:** seznam postav se jménem a indikátorem vyplněnosti
  (**barva plus tvar**, ne jen barva), nahoře souhrn „Vyplněno 14 / 23",
  hledání a filtr „jen nevyplněné". Panel si drží pozici při přepínání.
- **Hlavní plocha:** dotazník postavy, pod ním aktuální stav **škál a zdrojů**;
  u sdíleného zdroje značka, s kým je sdílený. **Automatické ukládání** po každé
  změně s viditelným potvrzením — žádné tlačítko „Uložit".
- **Přepočet:** spuštění, konflikty k rozhodnutí, náhled změn s trace „proč".
- **Výstupy** mají dvě záložky nad jedním přepočtem: _Přehled_ (škály, zdroje
  a vybrané varianty všech postav) a _Dokumenty_
  (`.md` s tlačítkem „Kopírovat do schránky", stažení zipu, sloučená `.pdf`).
- **Správa** drží nahrání `.xlsx` a šablon, archiv nahraných souborů, výsledky
  validací a audit log.
- **Vzhled:** nástroj pro práci pod časovým tlakem. Hustá čitelná sazba, stav
  vždy viditelný bez rolování, použitelné na notebooku i tabletu, ve světlém
  i tmavém režimu. Lehká **retro stylizace** (socialistické Československo) je
  vítaná, ale **nese ji barva a typografie** — tlumené vybledlé odstíny —
  **ne textury, ozdobné rámečky ani grafika napodobující starý papír.**
  Čitelnost má přednost před stylizací.

## Výstupy

**Výstupy kapitoly N jsou dokumenty pro kapitolu N+1**, naplněné ze stavu
a variant po vydaném, jinak posledním potvrzeném přepočtu kapitoly N (rozhodnutí organizátora
23. 9. 2026). Dokumenty kapitoly 1 jsou pevný text a aplikace je netiskne;
**poslední kapitola sekci Výstupy nemá** (`chapterHasSection`,
`outputsDocumentChapter` v `src/core/constants/routes.ts`). Zip i soubory nesou
číslo kapitoly, **pro kterou** dokumenty jsou.

Jeden zip na kapitolu (§10.4), název běhu je součástí názvu souboru:

```
beh-<nazev>_kapitola-<N>.zip
├── dokumenty/
│   ├── postava_<ID>_<Prijmeni>.md
│   ├── skupina_<ID>_<Nazev>.md
│   ├── postavy.pdf
│   └── skupiny.pdf
├── vysledky.xlsx     ← stav škál, zdrojů a vybraných variant
└── beh.json          ← kompletní stav + trace, strojově čitelný archiv
```

Typy dokumentů (§8.6): **dokument postavy, dokument skupiny, sada otázek pro
další kapitolu** (sada otázek zatím nemá zadání a negeneruje se). PDF se
**slučují podle typu**, aby se daly rychle vytisknout.
U každého dokumentu navíc tlačítko **„Kopírovat do schránky"** — org pak jen
přepíná záložky a mačká Ctrl+V (§10.5).

## Jazyk a pojmenování

- UI a data jsou **česky**, včetně diakritiky v exportech. Texty nejsou
  natvrdo v JSX — žijí v `src/locales/cs/`, jeden soubor na doménu.
- Tabulky, sloupce a identifikátory v kódu jsou **anglicky** (`character_scale_values`).
  Stejně názvy efektů v `Effects` (`HOUSEHOLD_CREATE`) — velkými písmeny jako
  `RANDOM` a `DEFAULT`.
- **Čeština v kódu jen ve stringech, které vidí uživatel.** Názvy proměnných,
  typů, funkcí i hodnoty diskriminantů, kódů a databázových enumů
  (`'scale_shift'`, `'personal'`, `'in_progress'`, `'released'`) jsou anglicky.
  České popisky stavů žijí v `src/locales/cs/statuses.ts`.
- Dokumentace (`.md`) česky. **Komentáře v kódu anglicky** — viz globální
  `~/.claude/CLAUDE.md`: co nejstručněji, jen k nezjevným věcem, a vysvětlují
  **proč**, ne co kód dělá.

## Konvence ID ze zdrojové tabulky

| Typ                 | Vzor                                        | Příklad                                 |
| ------------------- | ------------------------------------------- | --------------------------------------- |
| Běh                 | `<datum>_<písmeno>`                         | `2026-09-12_A`                          |
| Otázka              | `Q_<Postava>_<Kapitola>_<Poradi>`           | `Q_Marie_1_1`                           |
| Odpověď             | `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>` | `A_Marie_1_1_Karel`                     |
| Škála               | `S_<Postava>_<Skala>`                       | `S_Marie_Regime`                        |
| Zdroj               | `R_<Postava \| Domácnost>_<Zdroj>`          | `R_Marie_Wealth`, `R_MarieMirek_Wealth` |
| Osobní účet napevno | `R_<Postava>_<Zdroj>_private`               | `R_Marie_Wealth_private`                |
| Domácnost           | ID obou postav **abecedně** slepená         | `MarieMirek`                            |
| Blok                | `B_<Postava>_<Kapitola>_<Tema>_<Poradi>`    | `B_Marie_2_Historie_1`                  |
| Varianta            | `V_<BlockID>_<Pismeno>`                     | `V_Marie_2_Historie_1_A`                |

Dopad na škály a zdroje: čárkou (nebo středníkem) oddělený seznam
`S_Marie_Regime-2, R_Marie_Wealth+3`. Prázdná buňka = žádný dopad.
U `scale_direct` / `resource_direct` se píše `S_Marie_Regime=VALUE` — číslo
přijde z odpovědi. Speciální hodnota odpovědi `_OTHER_` = volný text doplněný
orgem. `{input}` v efektu = hodnotu zadá org do vstupního pole (§4.4).

Škála i zdroj se v databázi ukládají **rozložené**: `S_Marie_Regime` = postava
`Marie` + škála `Regime`. `Min`, `Max` a výchozí hodnota jsou **per dvojice
postava × škála**.

## Postup práce

- Migrace se **negenerují ručně**: `npm run db:generate` ze schématu. Schéma
  v `src/db/schema/` je jediný zdroj pravdy o struktuře databáze.
- Co Drizzle neumí vyjádřit, patří do `db/sql/` jako **idempotentní** skript
  a pouští se `npm run db:sql` po migracích (`npm run db:setup` udělá obojí).
- **Databáze se schématem nesynchronizuje sama.** Po každé změně v
  `src/db/schema/` — vlastní i stažené pullem — je potřeba `npm run db:setup`
  (= `db:migrate` + `db:sql`). Stará databáze se neprojeví při startu, ale až
  při zápisu, jako `Failed query: insert into …`. **Když na tuhle hlášku
  narazíš, první krok je porovnat sloupce v databázi se schématem**, ne hledat
  chybu v importu. Úplně načisto: `npm run db:reset` (jen lokálně).
- **`drizzle-kit push` se tu nepoužívá.** Unikáty `(run_id, id)` jsou cílem
  kompozitních cizích klíčů, push si je chce pokaždé přegenerovat a `DROP
CONSTRAINT` na nich ztroskotá. Skončí s nulovým exit kódem a chybami ve výpisu,
  takže tiše neudělá nic. Schéma se mění **výhradně migracemi**.
- **Migrace musí jít přehrát na prázdné databázi.** `drizzle-kit` umí
  vygenerovat migraci, která nejdřív zahodí tabulku `CASCADE` a pak ruší
  constrainty, které tím už zmizely — projde na tvojí databázi a spadne na
  cizí. Po `db:generate` proto vždycky `npm run db:reset` a ověř, že migrace
  sedne načisto.
- **Unikát, na který míří cizí klíč, musí být `unique()`, ne `uniqueIndex()`.**
  Drizzle generuje `CREATE UNIQUE INDEX` až za `ALTER TABLE ADD CONSTRAINT
... FOREIGN KEY`, takže FK na `(run_id, id)` by v migraci neměl na co ukázat
  a migrace spadne. `uniqueIndex()` zůstává jen pro **částečné** unikáty
  s `.where()`, které constraint neumí (např. jeden vydaný přepočet na kapitolu).
  **Nový unikát na existující tabulce a FK, který na něj míří, patří do dvou
  migrací** (nejdřív unikát, pak `db:generate` znovu se zbytkem): v jedné
  migraci řadí Drizzle `ADD CONSTRAINT … UNIQUE` až za cizí klíče — viz
  `0001_block_variation_block_key` a `0002_selected_variations`.
- Testy pokrývají primárně **engine a import**. Zbytek se testuje ručně. Výjimka:
  `src/db/schema.test.ts` hlídá architektonické pravidlo 2.
- Fixtures pro import jsou v `documents/`: `fixture-platny.xlsx` musí projít,
  `fixture-vadny.xlsx` musí být odmítnutý se všemi chybami najednou. Pro testy
  enginu je nad nimi `src/testing/fixture-run.ts`.
- **Lokální Postgres:** `scripts/pg.sh start` (bez Dockeru a bez roota).
  Node je přes nvm, v novém shellu je potřeba `source ~/.nvm/nvm.sh`.
- Než začneš stavět další vrstvu, ověř `npm run typecheck` a `npm test`.

## Pořadí dalších kroků (§15.2)

Engine je hotový, rozvržení aplikace (hlavička, běhy, sekce, levý panel) stojí.
Dál v tomhle pořadí; kroky 1–2 mají zadání v
`documents/zadani-session-4-prepocet-jadro.md`, krok 3 v
`documents/zadani-session-5-dotaznik.md`:

1. **Navigace po postavách a kapitolách** — **hotovo.** Položky levého panelu
   a stavy kapitol v hlavičce jsou odkazy, postava i kapitola jsou v cestě URL;
   cesty skládá `src/core/constants/routes.ts`, adresu čte `useRunLocation`.
   „Lze kapitolu otevřít?" rozhoduje `loadChapterAvailability` z jádra přepočtu.
2. **Jádro přepočtu bez UI** — **hotovo**, žije v `src/computation/` (viz sekce
   „Jádro přepočtu" níže). V sekci Přepočet jsou jen tlačítka „Přepočítat"
   a „Potvrdit verzi N" (bez potvrzení nejde otevřít další kapitola); trace,
   konflikty a náhled změn přijdou v kroku 4.
3. **Zadávání odpovědí kompletně pro kapitoly 1–3** — **hotovo**, žije
   v `src/features/dotaznik/` (viz sekce „Dotazník" níže). Dotazník se na otázky
   a stav ptá jen přes metody jádra, nikdy si je neskládá sám. Celou smyčku nad
   fixture projde `scripts/questionnaire-demo.ts` (`--empty` připraví jen běh
   k ručnímu proklikání).
4. **Sekce Přepočet** — trace „proč", konflikty, náhled změn, editace.
5. **Výstupy a dokumenty** — **hotovo** (mimo úpravu `.md` v aplikaci a sadu
   otázek), žije v `src/documents/` a `src/features/vystupy/` (viz „Výstupy").

Krok 2 je před dotazníkem, protože dotazník kapitoly 2+ je lookup ve vybraných
variantách a stav pod ním je snapshot; bez uloženého přepočtu by šel napsat jen
pro kapitolu 1. Obrazovka Přepočtu je až za dotazníkem, protože konflikty se
řeší dopsáním hodnot v dotazníku. Kroky 1 a 2 na sobě nezávisí.

## Jádro přepočtu (`src/computation/`)

```
načti(runId, kapitola) → evaluate(stav, odpovědi, konfigurace) → ulož(výsledek)
```

- **`convert/` jsou čisté funkce s testy** (řádky ↔ `RunState`, řádky →
  `AnswerInput[]`, hody, otisk vstupů, smyčka hodů). Na databázi sahá jen tenká
  slupka v `services/` a `read/`, vždy přes `forRun(runId)`.
- **Mapování UUID ↔ ID z tabulky je na jednom místě** (`IdDirectory`,
  `build-id-directory.ts`), oběma směry; neznámé ID je `UnknownIdError`, nikdy
  vynechaný řádek.
- **`runComputation`** běží celé v jedné transakci a vždy založí novou verzi
  `draft`. Co nejde spočítat (chybí odpovědi, konfigurace, výchozí přepočet),
  vrací jako data (`ComputationOutcome`), ne jako výjimku.
- **Výchozí přepočet kapitoly** = vydaný, jinak poslední potvrzený; z draftu se
  nikdy nevychází (`pickBaseline`).
- **Snapshot nese `chapter_id` přepočítané kapitoly** = stav *po* ní. Stav před
  kapitolou 1 se čte z konfiguračních tabulek (`initialStateFromRows`), řádky
  `source = 'initial'` se nezapisují.
- **`selected_variations` nese u každého přepočtu výběr celého běhu**, ne jen
  bloky kapitoly N+1 — další kapitola vychází jen z tohohle snapshotu a engine
  potřebuje i starší výběry.
- **Domácnost založená ve hře** dostane řádek v `households` se
  `source = 'computation'`; import ji nepovažuje za entitu, kterou soubor odebral.
- **`{input}` hodnoty** jsou v `answer_input_values` (odpověď × volba × název pole).
- **Hody hází jádro** (1–100), ukládá je ve stejné transakci a nikdy je
  nepřehazuje; smyčka má horní mez `MAX_ROLL_ROUNDS`.
- **Dotazník a obrazovky se na otázky a stav ptají jen přes** `loadAskedQuestions`,
  `loadCharacterState`, `loadChapterAvailability`, `loadComputationBlockers`,
  `loadQuestionnaire` (položené otázky postavy se zněním, volbami, `{input}` poli,
  cílem `*_direct`, uloženou odpovědí a stavem před kapitolou),
  `loadChapterCompletion` (vyplněnost všech postav kapitoly jedním průchodem)
  a `loadChapterStaleness` (je přepočet starší než poslední změna odpovědi?).
- **Vyplněnost se měří tím, co by zastavilo přepočet** (`answerState`,
  `chapterCompletion`): chybějící odpověď, `multi` bez volby, chybějící číslo
  u `*_direct`, prázdné `{input}` vybrané volby. Odpověď na nepoloženou otázku
  se nepočítá; postava bez otázek je hotová.
- **Zastaralost přepočtu se čte z `audit_log`**, ne z `answers` — zrušená odpověď
  po sobě řádek nenechá. Akce `answer.change` / `answer.cancel` proto žijí
  v `src/computation/constants/audit-actions.ts`.
- **Kontext kapitoly (konfigurace + výchozí přepočet) se v rámci jednoho
  požadavku načítá jednou** (`cache` z Reactu v `load-chapter-context.ts`);
  zápis odpovědi ani jedno z toho nemění.
- Ořez škály a každý nový hod jdou do `audit_log` při přepočtu (i nanečisto),
  s vazbou na `computation_id`.

## Dotazník (`src/features/dotaznik/`)

- **Jedna změna = jeden zápis jedné otázky** (`saveAnswer`). Formulář posílá
  koncept (`AnswerDraft`, čísla jako text), server si otázku znovu načte z jádra
  a koncept převede stejnou čistou funkcí jako formulář (`toAnswerWrite`):
  `write` / `cancel` / `invalid`. Koncept, který není odpovědí (`multi` bez
  volby, vymazané číslo, „zrušit odpověď"), odpověď **smaže** — vždy s auditem.
- **Audit nese hodnotu před a po ve workbookových ID** (`StoredAnswerValue`);
  zápis beze změny se neprovede a do auditu nejde.
- **Vydaná kapitola:** server bez důvodu vrátí `reason_required`; UI se na důvod
  zeptá jednou za otevřenou postavu (`useReleasedReason`) a posílá ho s každou
  změnou. Kaskádu dělá `touchChapters` (`src/core/services/`), sdílená
  s nouzovou opravou konfigurace.
- **Vyplněnost sdílí panel a dotazník přes `CompletionProvider`** (`src/core/`):
  layout běhu načte všechny kapitoly, každé uložení a každé otevření postavy
  pošle čerstvý stav kapitoly — indikátory se hýbou bez načtení stránky.
- **`Questionnaire` má `key` z kapitoly a postavy** — každá otázka drží svůj
  koncept od připojení, jiná postava musí být jiná instance.
- **Neuložená hodnota (chyba, neplatné číslo) drží odchod** (`useLeaveGuard`);
  rozepsané pole se uloží při opuštění pole i při odchodu z postavy.

## Rozsah MVP (§14)

Do prvního běhu musí být, **bez jakéhokoli napojení na Google**:

1. Import konfigurace z `.xlsx` + validace
2. Nahrání šablon jako Markdown
3. Rozvržení aplikace a zadávání odpovědí
4. Engine: podmínky, efekty, priority variant, váhy, ankety
5. Trace „proč" u každé změny
6. JSON mezivýstup → editace → `.md` a `.pdf` dokumenty + zip a „Kopírovat do schránky"

Fáze 2 (jen když zbude čas): napojení na Google, vizualizace životních stromů
postav, pokročilé kontroly. **Google vrstva je poslední, ne první** — je to
jediná část, kterou lze při skluzu vypustit a hra se přesto odehraje.
