# Session 5: Zadávání odpovědí

_Kompletní specifikace je v `zadani-larp-engine.md` (hlavně §6.1, §6.3, §6.4, §6.6, §6.7, §3.2, §4.4), pravidla platná v každé session v `CLAUDE.md`. Navazuje na `zadani-session-4-prepocet-jadro.md`, které musí být hotové._

## Kde jsme

Aplikace má rozvržení a navigaci: běh, kapitola i vybraná postava jsou v adrese (`/beh/<runId>/kapitola/<n>/postavy/<characterId>`). Jádro přepočtu umí načíst stav a odpovědi, pustit `evaluate`, uložit přepočet se snapshotem a vybranými variantami a potvrdit ho. Nabízí čtecí metody: otázky položené postavě v kapitole, stav postavy před kapitolou, zda lze kapitolu otevřít, co brání přepočtu.

Chybí to, kvůli čemu aplikace existuje — **kam org přepíše papír.**

## Co se staví teď

**Dotazník postavy, kompletně pro všechny tři kapitoly**, a k němu levý panel s vyplněností.

Org drží v ruce papírový dotazník jedné postavy, najde ji v panelu, vykliká ~3 otázky a jde na další. Dvacet tři postav, pod časovým tlakem mezi kapitolami. Všechno v téhle session se měří tím, jak rychle a bezchybně tohle jde.

**Sekce Přepočet se nestaví.** Spouští se tlačítkem ze session 4; trace, konflikty a náhled změn jsou session 6.

## Tvar, který nesmí ustoupit

- **Dotazník si otázky ani stav neskládá sám.** Ptá se jádra ze session 4. Které otázky se pokládají, je lookup ve vybraných variantách — ne vyhodnocení podmínky v UI. Kdyby dotazník potřeboval něco, co jádro neumí, přidá se to do jádra.
- **Výchozí odpovědi neexistují (§6.3).** Žádný ovládací prvek nesmí mít předvybranou hodnotu a žádný stav prvku nesmí jít zaměnit s odpovědí. Nezodpovězená otázka vypadá jinak než zodpovězená — vždy.
- **Automatické ukládání, žádné tlačítko „Uložit" (§6.4).** Ukládá se **po jedné otázce**, nikdy celý formulář najednou: orgů je víc a přepis celého dotazníku by smazal práci kolegy.
- **Nic se neztrácí potichu.** Neuložená změna je vidět a jde zopakovat.
- **Formulář, ne mřížka.** `DataGrid` patří jen do Výstupů.
- **Každá změna odpovědi jde do `audit_log`**: kdo (`readAuthor`), kdy, která otázka, hodnota před a po.

## Co dotazník dělá

### 1. Ovládání podle typu otázky (§6.1)

| Typ | Ovládání | Na co si dát pozor |
| --- | -------- | ------------------ |
| `bool` | dvě volby **Ano / Ne** vedle sebe | **ne zaškrtávátko** — nezaškrtnuté by se nedalo odlišit od nezodpovězeného |
| `single` | skupina voleb, jedna vybraná | |
| `multi` | zaškrtávátka | **povinná aspoň jedna volba**; bez zaškrtnutí je otázka nezodpovězená |
| `poll-answer` | jako `single`; text otázky i volby se berou **z definice ankety** | značka „anketa"; `poll` sám se v dotazníku neobjeví |
| `scale_direct` | pole na celé číslo | ukaž `Min`–`Max` a současnou hodnotu té škály |
| `resource_direct` | pole na celé číslo | ukaž, **který účet** se nastavuje (osobní / společný s kým) |

- **Volba `_OTHER_`** otevře textové pole; text jde do `text_value`. Prázdný text je varování, přepočet neblokuje.
- **Volba, která jmenuje jinou postavu**, zobrazí její **aktuální jméno a příjmení**, ne holé ID — po sňatku se příjmení mění.
- **Pořadí otázek je pořadí z tabulky** (`ordinal`), organizátorské otázky stojí **na svém místě v jednom proudu** s decentní značkou „zadává org" (§6.7). Žádná oddělená sekce, žádný druhý ukazatel postupu.

**`multi` bez vybrané volby [ROZHODNUTO].** Je to nezodpovězená otázka. Smí-li postava nevybrat nic, napíše autor „nic z uvedeného" jako běžnou odpověď do tabulky a org ji zaškrtne. **UI pro to nemá žádný zvláštní prvek** a engine prázdný výběr odmítne. Odškrtne-li org poslední volbu, odpověď přestává existovat (viz bod 4).

### 2. Vstupní pole efektů domácností (§4.4)

Vybere-li org odpověď s `HOUSEHOLD_CREATE` nebo `HOUSEHOLD_DISSOLVE`, **pod ní se objeví pole `{input1}` a `{input2}`.**

- Popisek pole je **jméno postavy**, ne `input1`: `{input1}` patří první postavě z efektu, `{input2}` druhé, v pořadí, jak je autor napsal.
- Popisek říká i směr: u sňatku „kolik vloží Marie na společný účet", u zániku „kolik si Marie odnáší".
- Jen **celá nezáporná čísla.** Prázdné pole není nula — je to nezadaná hodnota a engine by vrátil `unresolved_value`.
- **U `HOUSEHOLD_DISSOLVE` ukaž zůstatek společného účtu a průběžný součet** („rozděleno 7 z 10"). Součet se musí rovnat zůstatku, jinak přepočet skončí konfliktem `payout_mismatch` a rozvod neproběhne. Rozhoduje pořád engine; UI jen ušetří jedno kolo.
- **Nic nedopočítávej.** Žádné „zbytek druhému", žádné půlení, žádné předvyplnění. Rozhoduje člověk.
- Stejný název pole = stejná hodnota: objeví-li se `{input}` ve víc dopadech jedné odpovědi, je to jedno pole.
- Hodnoty se ukládají do tabulky založené v session 4.

### 3. Automatické ukládání (§6.4)

- Volby se ukládají **hned po kliknutí**, číselná a textová pole po krátké prodlevě a při opuštění pole. Prodleva je pojmenovaná konstanta.
- U každé otázky viditelný stav: **ukládám → uloženo (kdo, kdy) → neuloženo, zkusit znovu**. Barva plus ikona, ne jen barva.
- Neuložená změna **drží hodnotu v poli** a nabídne opakování. Přechod na jinou postavu s neuloženou změnou na ni upozorní.
- U zodpovězené otázky je vidět **kdo a kdy ji naposledy upravil** (`answered_by`, `answered_at`).
- Při návratu na postavu se data **načtou znovu ze serveru** — kolega je mezitím mohl změnit.
- Jméno autora čte server z cookie; formulář ho neposílá.

### 4. Zrušení odpovědi [ROZHODNUTO]

U každé zodpovězené otázky je malé tlačítko **„zrušit odpověď"**, které otázku vrátí do stavu **„nikdo ještě neodpověděl"**.

Proč: org má otevřenou Marii, ale v ruce drží papír Mirka, a klikne u její otázky na „Ano". Přepnout na „Ne" může — ale ani jedno není Mariina odpověď, její papír ještě nedorazil. Bez zrušení by otázka zůstala navždy zodpovězená: Marie by v panelu svítila jako hotová a přepočet by se na chybějící odpověď nezeptal (§6.3).

- **Smaže řádek v `answers`** i s vybranými volbami a `{input}` hodnotami, v jedné transakci. Je to třetí legitimní mazání vedle seedu a importu (`CLAUDE.md`, pravidlo 3); v komentáři u `RunScope.delete` to doplň.
- **Vždy záznam v `audit_log`**: kdo, kdy, která otázka, hodnota před, „po" prázdné. Historii nese audit, stejně jako u editace.
- **Odškrtnutí poslední volby u `multi` je totéž** — podle bodu 1 je to nezodpovězená otázka, takže se odpověď zruší, nezůstává řádek s prázdným výběrem.
- **Ve vydané kapitole** platí stejná pojistka jako u editace (bod 5): potvrzení jmenující běh, důvod, kaskáda.
- Tlačítko je decentní a **nesmí jít zaměnit s volbou odpovědi**; po zrušení se vyplněnost postavy v panelu hned přepočítá.

### 5. Stav kapitoly a pojistky (§3.2)

| Stav kapitoly | Editace odpovědí |
| ------------- | ---------------- |
| `in_progress` | volně |
| `computed` | volně; dotazník **upozorní, že přepočet je starší než poslední změna odpovědi**. Aplikace sama nic nepřepočítá. |
| `released` | **měkká pojistka:** potvrzovací dialog, který **jmenuje běh i kapitolu** („Upravit odpověď ve vydané kapitole 1 běhu **2026-09-12_B**?") a vyžaduje **důvod**. Obojí do auditu. |

**Kaskáda.** Změna odpovědi ve vydané kapitole označí **všechny následující kapitoly jako `dotčené`** (`is_touched`). Aplikace **nic nepřepočítá** — rozhodnutí „přepočítat / ponechat" je věc sekce Přepočet (session 6). Tady stačí, že příznak vznikne, je vidět v hlavičce a je v auditu.

Důvod se zadává **jednou za sezení úprav téže postavy**, ne u každého kliknutí — jinak pojistku orgové začnou odklikávat naslepo. Do auditu jde ke každé změně.

**Kapitola, kterou nejde otevřít** (chybí potvrzený přepočet předchozí): místo dotazníku vysvětlení, co chybí, a odkaz do sekce Přepočet předchozí kapitoly. **Nikdy neukazuj „všechny otázky" jako náhradu.**

### 6. Odpovědi na otázky, které se už nepokládají — neřeší se [ROZHODNUTO]

Vzniknout by neměly: znamenalo by to opravit kapitolu 1 až poté, co se vyplnila kapitola 2, a to tak, že oprava překlopí variantu `Questions` bloku. **Žádné UI pro to nestav.** Kdyby k tomu přece došlo, engine přepočet odmítne nahlas (`invalid_answer … never asked`) a řeší se to ručně. Jediné, co platí i tady: **při načítání takové odpovědi tiše nevynechávej.**

### 7. Stav postavy pod dotazníkem (§6.4, §4.4)

- **Škály** s hodnotou a rozsahem `Min`–`Max` té postavy. **Zdroje** bez hranic.
- Nadpis říká, **ke kterému okamžiku stav platí**: „Stav před kapitolou 2". Nepřepočítává se podle právě zadaných odpovědí — to by byl engine v prohlížeči.
- **U sdíleného zdroje značka „společný účet s Mirkem Pokorným"** a odkaz na druhou postavu (zachová kapitolu). Osobní účet je vedle něj vidět taky — sňatkem nezaniká.
- Jméno partnera vždy z registru, nikdy natvrdo.

### 8. Levý panel (§6.4)

- **Indikátor vyplněnosti barvou i tvarem:** `RadioButtonUnchecked` (nevyplněno) / `Adjust` (rozpracováno) / `CheckCircle` (hotovo). Platí pro **kapitolu z adresy**.
- **Hotovo** = zodpovězené všechny **položené** otázky včetně čísel u `scale_direct` / `resource_direct` a všech `{input}` polí vybraných odpovědí. Měří se tím, co by zastavilo přepočet nebo skončilo jako `unresolved_value`.
- Postava, které se v kapitole nepokládá žádná otázka, je hotová — a má to být poznat („bez otázek").
- Nahoře souhrn **„Vyplněno 14 / 23"**.
- **Hledání podle jména** bez ohledu na diakritiku a velikost písmen. **Filtr „jen nevyplněné"** (nevyplněno + rozpracováno).
- Hledání a filtr jsou pohodlí jednoho uživatele, ne stav aplikace — do adresy nemusí.
- Panel si **drží pozici rolování** při přepínání postav. Po uložení odpovědi se indikátor postavy aktualizuje bez nového načtení stránky.
- Výpočet vyplněnosti je **jeden dotaz na kapitolu**, ne dotaz na postavu.

### 9. Průchod pod časovým tlakem

- Celý dotazník jde vyplnit **z klávesnice**: Tab mezi otázkami, šipky ve skupině voleb, mezerník pro výběr.
- Tlačítka **„Předchozí" / „Další"** postava a **„Další nevyplněná"**. Pořadí je pořadí panelu.
- Po otevření postavy je fokus na první nezodpovězené otázce.
- Hustá sazba: tři otázky a stav postavy se na notebooku vejdou **bez rolování**. Použitelné i na tabletu, ve světlém i tmavém režimu.

## Pravidla pro kód

- **MUI podle `CLAUDE.md`:** styly v theme `components`, jinak CSS Modules a data atributy. **Žádné `sx`, `styled()` s dynamickými props ani inline `style`.** `Box`, `Stack`, `Grid` do seznamu otázek a do panelu nepatří.
- **Texty v `src/locales/cs/`**, jeden soubor na doménu. Žádný český řetězec v JSX.
- **Server komponenty načítají, `'use client'` strom kreslí.** Ukládání přes server akce; každá jde přes `forRun(runId)`.
- **Feature neimportuje z jiné feature.** Panel i dotazník potřebují vyplněnost — sdílená část patří do `src/core/`.
- **`data-testid`** na každé otázce, volbě, poli a indikátoru, vázané na doménové ID (`question--Q_Marie_1_1`, `option--A_Marie_1_1_Karel`).
- Běh je v každém dotazu. Odpověď se nikdy neuloží k otázce z jiného běhu — hlídá to složený cizí klíč, nespoléhej jen na něj.

## Testy

UI se odklikává ručně. **Čisté funkce se testují:**

1. Vyplněnost postavy: nevyplněno / rozpracováno / hotovo; chybějící `{input}` a chybějící číslo u `*_direct` znamenají rozpracováno; postava bez otázek je hotová
2. Souhrn „Vyplněno X / Y" počítá jen položené otázky
3. Převod hodnoty z formuláře na zápis do databáze pro každý typ otázky, včetně `_OTHER_` s textem; `multi` bez výběru není odpověď
4. Validace číselného pole: celé číslo, u `{input}` nezáporné; prázdné není nula
5. Popisky `{input1}` / `{input2}` jdou ve sledu argumentů efektu, i když je ID domácnosti abecedně obráceně (`HOUSEHOLD_CREATE(Mirek, Marie)`)
6. Průběžný součet u `HOUSEHOLD_DISSOLVE` proti zůstatku
7. Hledání bez diakritiky: „vera" najde Věru
8. Zrušení odpovědi: vyplněnost se vrátí na rozpracováno / nevyplněno; odškrtnutí poslední volby u `multi` dá totéž co zrušení

## Na co si dát pozor

- **Nevyhodnocuj podmínky v UI.** Ani „jen pro náhled". Které otázky se pokládají, ví jádro.
- **Nepočítej stav v prohlížeči.** Pod dotazníkem je snapshot, ne odhad po právě zadaných odpovědích.
- **Žádná předvybraná hodnota.** Ani „Ne" u `bool`, ani první volba u `single`, ani 0 v číselném poli.
- **Neukládej celý formulář.** Jedna změna = jeden zápis jedné otázky.
- **Nespouštěj přepočet sám** — ani po poslední vyplněné postavě, ani po opravě ve vydané kapitole.
- **Org je postava v registru** (ve `fixture-platny.xlsx` `Organizatori`) a má v panelu svůj řádek jako každá jiná; sňatky a rozvody se zadávají tam.
- **Dialogy u zásadních akcí jmenují běh.** Barva běhu (A modrá, B jantarová) musí být na obrazovce dotazníku vidět pořád.
- **Nestav sekci Přepočet.** Seznam konfliktů a trace jsou session 6.

## Na konci

Projdi nad `fixture-platny.xlsx` celou smyčku a popiš, co se stalo:

1. Vyplň kapitolu 1 všem postavám, včetně ankety a organizátorských otázek. Panel ukazuje „Vyplněno N / N".
2. Přepočítej a potvrď kapitolu 1 (tlačítko ze session 4).
3. Otevři kapitolu 2: Marii se pokládají otázky podle vybraných variant, stav pod dotazníkem je snapshot po kapitole 1, společný účet nese značku.
4. Zadej rozvod s rozdělením, které **nesedí**, přepočítej — konflikt `payout_mismatch`. Oprav čísla, přepočítej — projde.
5. Zadej odpověď u špatné postavy a zruš ji: otázka je znovu nezodpovězená, postava v panelu není hotová, v auditu je hodnota před.
6. Uprav odpověď ve vydané kapitole (stav nastav ručně v databázi): dialog jmenuje běh, vyžádá důvod, následující kapitoly jsou `dotčené`, vše je v auditu.

Napiš, co jsi musel přidat do jádra ze session 4 a kde ti zadání nestačilo.
