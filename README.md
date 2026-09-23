# Sametový LARP — engine mezikapitolových událostí

Interní nástroj organizátorů. Zpracovává dotazníky vyplněné hráči na konci každé
ze tří kapitol, deterministicky přepočítává vnitřní stav postav a generuje
materiály pro další kapitolu.

Rozsah: 23 postav, 7 skupin, 3 kapitoly, 2 souběžné běhy hry, 3–5 uživatelů.

Kompletní zadání je v [zadani-larp-engine.md](zadani-larp-engine.md) — **to je zdroj
pravdy**. Architektonická pravidla, která platí v každé session, jsou v
[CLAUDE.md](CLAUDE.md).

## Stav projektu

Hotové je datové schéma, přihlášení sdíleným heslem s polem „Kdo jsi?",
založení a přepínání běhů, kostra rozhraní (horní lišta s pěti sekcemi, panel
postav), sekce Správa (import `.xlsx` a šablon, validace, archiv nahraných
souborů), engine pravidel, jádro přepočtu, dotazník kapitol 1–3 a **generování
dokumentů** v sekci Výstupy včetně načítání šablon z Google Docs (viz níže).

Zbývá obrazovka Přepočtu (trace „proč", konflikty, náhled změn), úprava `.md`
v aplikaci, třetí typ dokumentu (sada otázek pro další kapitolu) a úklid
nepoužívaných tabulek `templates`, `character_variables` a sloupce
`characters.birth_year` — viz harmonogram v §15.2 zadání.

## Co je potřeba mít

- **Node.js 22** (viz `.nvmrc`). Přes nvm: `nvm install`.
- **Postgres pro lokální vývoj** — jedna ze tří cest:
  - **nainstalovaný Postgres bez Dockeru** (`sudo pacman -S postgresql`) a cluster
    pod tvým uživatelem, viz `scripts/pg.sh` níže. Nepotřebuje root ani systemd
    službu, celý cluster je v `~/.local/share/samet-larp/`.
  - **Docker** a `docker compose up -d` podle `docker-compose.yml`.
  - **dev větev na [Neonu](https://neon.tech)** — pak stačí `DATABASE_URL` v `.env`.

Všechny tři varianty poslouchají na portu **5433**, takže `.env` platí pro kteroukoli.

## Lokální spuštění

```bash
# 1) závislosti
nvm install                 # Node podle .nvmrc
npm install

# 2) prostředí
cp .env.example .env

# 3) databáze — varianta bez Dockeru
npm run pg init             # založí cluster, spustí ho a vyrobí databázi samet_larp
#    nebo varianta s Dockerem
docker compose up -d

# 4) schéma a data
npm run db:setup            # migrace z drizzle/ + SQL, které Drizzle neumí (append-only audit)
npm run db:seed             # ukázková data: běh 2026-09-12_A, Marie Balážová

# 5) aplikace
npm run dev                 # http://localhost:3000
```

Cluster se pak ovládá `npm run pg start` / `stop` / `status`, a `npm run pg psql`
otevře konzoli nad `samet_larp`. Autentizace je `trust` na loopbacku — heslo
v `DATABASE_URL` server ignoruje.

Po každé změně schématu: `npm run db:generate` vyrobí novou migraci, `npm run
db:setup` ji aplikuje i s ručním SQL z `db/sql/`.

### Po každém pullu, který sáhl na schéma

**Schéma v `src/db/schema/` se s databází nesynchronizuje samo.** Když stáhneš
commit, který mění schéma, a databázi necháš být, aplikace se rozjede a spadne
až při zápisu — hláškou `Failed query: insert into …`. Typicky to potká import
konfigurace. Proto po každém pullu se změnou v `src/db/schema/` nebo `drizzle/`:

```bash
npm run db:setup            # db:migrate + db:sql
```

Když je databáze rozhozená tak, že migrace nesednou, nebo prostě chceš začít
načisto:

```bash
npm run db:reset            # zahodí VŠECHNA data, postaví schéma znovu, doplní db/sql/
npm run db:seed             # volitelně ukázkový běh
```

`db:reset` odmítne běžet proti jinému než lokálnímu serveru; na Neon ho lze
pustit jen vědomě přes `npm run db:reset -- --force`.

### Proč se tu nepoužívá `db:push`

`drizzle-kit push` na tomhle schématu **neprojde**. Každý unikát `(run_id, id)`
je cílem kompozitních cizích klíčů (architektonické pravidlo 2), push si je
pokaždé chce přegenerovat a `ALTER TABLE … DROP CONSTRAINT` na nich ztroskotá
na závislých FK. Push skončí s nulovým exit kódem a hromadou chyb ve výpisu,
takže to vypadá, že se něco stalo — nestalo. **Jedinou cestou ke změně schématu
jsou migrace**, `db:push` zůstává ve skriptech jen jako nouzová sonda.

## Šablony a generování dokumentů

### Šablony

Šablona je Markdown pojmenovaný `<ID postavy nebo skupiny>_<kapitola>.md`
(`Marie_2.md`, `Funkcionari_2.md`). Text mimo značky se tiskne beze změny.

| Značka | Nahradí se |
|---|---|
| `{BLOK B_Marie_1_Historie_1}` | textem varianty vybrané přepočtem (smí obsahovat další `{BLOK …}`) |
| `{JMENO}`, `{PRIJMENI}` / `{NAZEV}` | jménem postavy / názvem skupiny z registru |
| `{S_Regime}`, `{R_Wealth}`, `{R_Wealth_private}` | hodnotou škály nebo zdroje; `R_…` bez přípony čte účet podle rodinného stavu |

Šablona smí tisknout jen bloky svého vlastníka z listu své kapitoly (`2_Content`
pro `*_2.md`). Značka, která by přežila do dokumentu, je chyba už při nahrání.

Do běhu se šablony dostanou dvěma cestami, obě končí v archivu `uploaded_files`,
ze kterého se generuje:

1. **Nahráním** ve Správě spolu s `.xlsx` — víc `.md` najednou nebo zip.
2. **Z Google Docs** podle nepovinného listu `Templates` v `.xlsx` (`Character`,
   `Chapter`, `URL` karty zkopírovaná s otevřenou kartou, `?tab=…`). Dokument
   musí být sdílený „kdokoli s odkazem"; stahuje se veřejný export karty, bez API
   a bez OAuth.
   - *Správa → Načíst z Google* stáhne karty podle vybraného `.xlsx` a přidá je
     k nahrávce; uloží se běžným *Uložit konfiguraci*.
   - *Výstupy → Obnovit z Google* (u dokumentu nebo pro celou kapitolu) stáhne
     karty podle už nahraného `.xlsx`, bez přenahrání čehokoli. Karta, která by
     přidala chybu importu, se nepoužije a zůstane dosavadní šablona.

Pro dvojici vlastník × kapitola platí **šablona z Googlu vždy před nahranou**
(nahrané soubory jsou záloha pro karty, které se nestáhly), jinak novější před
starší.

### Výstupy

**Výstupy kapitoly N jsou dokumenty pro kapitolu N+1**, naplněné ze stavu
a vybraných variant po **potvrzeném** přepočtu kapitoly N. Poslední kapitola
Výstupy nemá; dokumenty kapitoly 1 jsou pevný text a aplikace je netiskne.

- *Přehled* — škály, zdroje (osobní i společný účet) a vybrané varianty všech
  postav a skupin.
- *Dokumenty* — u každého „Kopírovat do schránky", `.md`, `.pdf`, náhled textu,
  odkud je šablona a „Obnovit z Google".
- `.md` jde stáhnout vždy, **`.pdf` a zip jen když žádný dokument nemá problém
  a nechybí žádná šablona**.
- Nic se neukládá: každé stažení se vyrobí z archivu a potvrzeného přepočtu, takže
  odpovídá tomu, co je na obrazovce.

```
beh-<běh>_kapitola-<N+1>.zip
├── dokumenty/      postava_<ID>_<Příjmení>.md, skupina_<ID>_<Název>.md, postavy.pdf, skupiny.pdf
├── vysledky.xlsx   škály, zdroje a varianty (listy Skaly, Zdroje, Varianty)
└── beh.json        přepočet se stavem, trace a konflikty + přehled a dokumenty
```

PDF vzniká přímo z Markdownu (`marked` → vlastní AST → `@react-pdf/renderer`),
vzhled je v `src/documents/pdf/document-theme.ts`, fonty a logo
v `src/documents/pdf/assets/`. Skripty PDF vyrobit neumí (react-pdf je jen ESM,
skripty běží v CommonJS), ověřují ho testy.

## Skripty

| Příkaz | Co dělá |
|---|---|
| `npm run dev` | Next.js v dev režimu |
| `npm run build` / `start` | produkční build a jeho spuštění |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, včetně kontroly, že engine nesahá do DB a Reactu |
| `npm test` | Vitest — primárně engine pravidel |
| `npm run pg init` / `start` / `stop` / `status` / `psql` | lokální Postgres cluster bez Dockeru |
| `npm run db:generate` | vygeneruje SQL migraci z Drizzle schématu |
| `npm run db:migrate` | aplikuje migrace |
| `npm run db:push` | nouzová sonda; na tomhle schématu neprojde, viz výše |
| `npm run db:sql` | pustí ruční SQL z `db/sql/` (idempotentní) |
| `npm run db:setup` | `db:migrate` + `db:sql` — po každém pullu se změnou schématu |
| `npm run db:reset` | zahodí všechna data a postaví schéma načisto (jen lokálně) |
| `npm run db:seed` | naplní ukázkový běh |
| `npm run db:studio` | Drizzle Studio nad databází |
| `npx tsx scripts/documents-demo.ts [--write] [--config <xlsx>]` | běh `2026-01-03_A` s potvrzenou kapitolou 1 a vypsanými dokumenty pro kapitolu 2 |

## Struktura

```
src/
├── engine/          čistá funkce evaluate + typy. Bez DB, sítě a Reactu.
├── db/
│   ├── schema/      Drizzle schéma — jediný zdroj pravdy o struktuře DB
│   ├── client.ts    připojení; jediné místo vázané na poskytovatele Postgresu
│   ├── run-scope.ts přístup k datům, který vyžaduje runId
│   └── index.ts     veřejné rozhraní datové vrstvy (bez neomezeného spojení)
├── computation/     jádro přepočtu: načti → evaluate → ulož
├── documents/       plnění šablon, přehled, PDF a zip (pdf/ a zip/ mimo barrel — ESM)
├── import/          čtení .xlsx a šablon, validace, export z Google Docs, zápis konfigurace
├── core/            sdílená infrastruktura: routy, přihlášení, běhy v URL, stahování z Googlu
├── features/        behy, pristup, postavy, dotaznik, prepocet, vystupy, sprava — jedna složka na doménu
├── components/      sdílené UI (horní lišta, dialogy)
├── theme/           MUI téma, paleta včetně barev běhů
├── middleware.ts    sdílené heslo před celou aplikací
└── app/             Next.js App Router: /prihlaseni, /, /beh/[runId]/<sekce>

db/sql/              ruční SQL mimo Drizzle (append-only audit)
scripts/             seed, správa lokálního Postgresu, pomocné skripty
drizzle/             vygenerované migrace — patří do gitu
```

## Nasazení

Běží na **https://samet-app.vercel.app**.

Vercel propojený s GitHub repem, `git push` na `main` = nasazeno. Databáze Neon
(Postgres). Preview deploye jsou vypnuté přes *Ignored Build Step* — na ostrá data
smí jen `main`.

Ve Vercelu jsou nastavené dvě proměnné pro Production: `DATABASE_URL` (Neon
**pooled** string, host s `-pooler`) a `APP_PASSWORD` (sdílené heslo, §3.1).
`DATABASE_URL` musí existovat i při buildu — `src/db/client.ts` se připojuje už
na úrovni modulu; databáze přitom dosažitelná být nemusí.

`.github/workflows/ci.yml` pouští na každý push i PR `lint`, `typecheck` a testy.
Po merge do `main` navíc přehraje **migrace proti produkci** (`npm run db:setup`)
z GitHub secretu `NEON_DIRECT_URL` — to je Neon **direct** string bez `-pooler`,
protože DDL přes PgBouncer nepatří. Po změně schématu tedy stačí
`npm run db:generate`, commitnout migraci a pushnout; ručně se proti produkci nic
nespouští.

Verze 1 **nemá napojení na Google API** a komunikuje se světem přes nahrané
a stažené soubory: `.xlsx` a `.md` dovnitř; `.md`, `.pdf`, `.xlsx` a `.zip` ven.
Jediné síťové volání je stažení veřejného exportu karet Google Docs (viz Šablony).
