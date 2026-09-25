# Zadání: Webová aplikace pro řízení mezikapitolových událostí na LARPu

> Dokument je určen jako vstup pro AI (návrh UX + implementace webové aplikace).
> Sekce **[ROZHODNUTO]** jsou závazné. Sekce **[PŘEDPOKLAD]** jsou návrh autora zadání — potvrdit nebo přepsat.
> Sekce **[OTEVŘENÉ]** je nutné doplnit před implementací.

---

## 1. Kontext a cíl

LARP má **3 kapitoly** oddělené časovými skoky (roky života postav). Na konci každé kapitoly hráči vyplní dotazník o tom, co se jim ve hře stalo. Organizátoři tyto odpovědi zpracují a na jejich základě vygenerují pro každou postavu nové materiály pro další kapitolu (jak se vyvinul její život, majetek, vztahy, postavení ve skupinách).

Dnes se to dělá ručně v tabulkách. Při **23 postavách ve dvou souběžných bězích** je to neúnosné a chybové.

**Cílem je nástroj, který:**

1. Sesbírá odpovědi na konci kapitoly.
2. Deterministicky přepočítá vnitřní stav každé postavy (škály, příznaky).
3. Vygeneruje editovatelný mezivýstup (např. ve formátu JSON) {?} a z něj tisknutelné dokumenty pro hráče.
4. Umožní kdykoli — i po hře — dohledat **proč** došlo k dané změně.

**Inspirace / podobné systémy:** aplikace „Fin" (motlík app), LARP „Národ sobě" (řešeno divokým Google Sheetem).

---

## 2. Klíčové principy [ROZHODNUTO]

Tyto principy mají přednost před funkční bohatostí. Když je konflikt, vyhrávají ony.

1. **Žádný black box.** Ke každé změně stavu musí jít zobrazit, které pravidlo ji způsobilo a z jaké odpovědi vzniklo.
2. **Auditovatelnost i po hře.** Kompletní historie všech běhů zůstává dohledatelná. Nic se nepřepisuje destruktivně, změny se verzují.
3. **Determinismus.** Stejný vstup = stejný výstup. Náhoda je povolená, ale hozené číslo se ukládá jako data a přepočet ho neopakuje (viz §7.4).
4. **Nezávislost na programátorech.** Otázky, škály, váhy a texty edituje autor hry v tabulce, ne v kódu.
5. **Web, ne desktop.** Běží v prohlížeči na běžné adrese, ne jako aplikace zamčená na jednom PC (§18).
6. **Člověk má poslední slovo.** Engine navrhuje, org potvrzuje. Před generováním tisku jde vše ručně přepsat.

---

## 3. Uživatelské role a běhy [ROZHODNUTO]

**Aplikace má jedinou roli: organizátor.** Žádný systém oprávnění, žádné hráčské účty.

- Odpovědi hráčů zadávají **vždy orgové** (z papírových dotazníků). Hráč se do aplikace nedostane.
- Autor hry a game master jsou tentýž typ uživatele, jen v jiné fázi práce.

### 3.1 Přihlášení [ROZHODNUTO]

Jedno **sdílené heslo** na vstupu do aplikace. Žádné účty, žádná registrace, žádné role.

**Plus jedno pole navíc: „Kdo jsi?"** — volný text, bez ověřování, uloží se do prohlížeče. Aby audit log uměl říct, **kdo** změnu udělal.

### 3.2 Běh jako kontext práce [ROZHODNUTO]

Po přihlášení si uživatel vybere nebo založí **běh**.

**Pozor na pojmenování: „běh", ne „session".** Slovo session je v kódu obsazené přihlašovací relací a míchání obou významů je spolehlivá cesta ke zmatkům.

**Identifikátor:** datum zahájení + písmeno, tedy `2026-09-12_A`, `2026-09-12_B`. Generuje se automaticky. Vedle něj **volitelný popisný název**, který si org může přepsat („Podzimní běh, sobotní parta").

**Životní cyklus běhu:**

```
založen → aktivní → [kapitola 1 vydána] → [kapitola 2 vydána] → [kapitola 3 vydána] → archivován
```

**Stavy kapitoly [ROZHODNUTO]:**

| Stav           | Význam                                    | Lze editovat?                     |
| -------------- | ----------------------------------------- | --------------------------------- |
| `rozpracovaná` | Sbírají se odpovědi                       | Ano, volně                        |
| `spočítaná`    | Přepočet proběhl, výstup existuje         | Ano, přepočet lze opakovat        |
| `vydaná`       | Dokumenty jsou vytištěné a rozdané hráčům | Ano, ale s odůvodněním (viz níže) |

**Uzamčení není definitivní [ROZHODNUTO].** Nic se nikdy nezamyká nevratně. Stav `vydaná` je **měkká pojistka proti překlepu**, ne zámek — chrání před nechtěnou změnou kapitoly, jejíž papíry už drží hráči v ruce.

Editace vydané kapitoly: {?}

- Vyžaduje **potvrzení a důvod** (volný text), obojí do auditu.
- Nikdy se nic nepřepisuje destruktivně. Předchozí výsledek přepočtu zůstává uložený jako verze.

**Kaskáda: nejdůležitější pravidlo [ROZHODNUTO]**

Když se změní odpověď v kapitole, která už je vydaná, přestává platit výchozí stav všech následujících kapitol.

Aplikace v takové situaci **nesmí nic přepočítat sama**. Označí následující kapitoly jako **`dotčené`** a vynutí si vědomé rozhodnutí orga:

1. **Přepočítat znovu** — aplikace vyrobí nový výstup. Org musí vyřešit, co s už rozdanými papíry.
2. **Ponechat jak je** — org potvrdí, že rozdaná realita platí a oprava se týká jen záznamu. Aplikace si poznamená, že se výpočet a vydaný stav rozcházejí, a proč.

Důvod tohoto pravidla: **během hry je zdrojem pravdy papír v rukou hráče, ne databáze.** Aplikace, která by po tiché opravě začala počítat z jiného stavu, než jaký hráči dostali, by rozbila hru a nikdo by si toho nevšiml až do konce.

Archivovaný běh zůstává **navždy prohlížitelný** včetně všech odpovědí, stavů, verzí přepočtu a trace (§2, bod 2). Nikdy se nemaže {?}.

**Každý běh má vlastní konfiguraci, nahranou při jeho založení** (§6.5). Dva souběžné běhy tak mohou mít různé otázky, pokud vznikly v jiný čas.

### 3.3 Oddělení dat běhů [ROZHODNUTO]

Dva běhy poběží současně a **jejich data se nesmí potkat**.

**Na úrovni dat:** každá tabulka nese `run_id`. Přístup k datům vede přes jedinou vrstvu, která **vyžaduje `runId` jako povinný argument** — dotaz bez něj nejde napsat. Izolace tak drží strukturou kódu, ne kázní při psaní dotazů.

**Na úrovni UI** — a tohle je důležitější, než se zdá: protože se všichni hlásí stejným heslem, aplikace nepozná z přihlášení, kdo v jakém běhu pracuje. Riziko, že org zapíše odpovědi z běhu A do běhu B, je reálné a jeho následky se špatně opravují.

Opatření:

1. **Přepínač běhu trvale viditelný v hlavičce**, na každé obrazovce.
2. **Odlišná barva rozhraní pro každý běh**. Nejlevnější a nejúčinnější pojistka — pozná se periferním viděním.
3. **Potvrzovací dialog u zásadních akcí** (přepočet, vydání kapitoly, export) vždy **jmenuje běh**: „Uzamknout kapitolu 2 běhu **2026-09-12_B**?"
4. Název běhu je součástí názvu každého exportovaného souboru (§10.4).

---

## 4. Doménový model

### 4.1 Entity

- **Běh (Run)** — jedna instance hry, viz §3.2. Nejvyšší úroveň izolace dat. Dva běhy probíhají současně a **nesmí** se navzájem vidět ani ovlivňovat.
- **Kapitola (Chapter)** — 1, 2, 3. Každý běh prochází kapitolami sekvenčně.
- **Postava (Character)** — v rámci běhu. Má stav (viz níže) a přiřazeného hráče.
- **Skupina (Group)** — organizace/parta. Má vlastní dokument (šablonu). **Členy ani vedení skupiny aplikace nesleduje** — vyjadřují je varianty bloků (§4.6).
- **Škála (Scale)** — číselná osa reprezentující vnitřní stav postavy. Každá postava může mít různé škály.
  Příklady: Regime`(přesvědčení o komunismu),`Control`(kontrola nad organizací),`, Smutek `(blízkost k sebevraždě)`.
  **Rozsah: celá čísla, hranice `Min` a `Max` jsou definované pro každou škálu každé postavy v listu `Scales`** (typicky 1–10). Hodnoty mimo rozsah se ořezávají na hranici (clamp), ne obtáčejí. **Ořezává se po každém posunu — hodnota škály nikdy nejde mimo rozsah**, ani mezi dvěma posuny. Každý ořez se zapíše do auditu.
- **Zdroj (Resource)** — číselná hodnota bez horní hranice, např. stav účtu.
  Na rozdíl od Škály se **neořezává** (žádný clamp). Patří postavě nebo domácnosti.
  Každá změna se zapíše do auditu (delta + důvod).
- **Domácnost (Household)** — postavy sdílející majetek === manželé. Viz §4.4.
- **Vztah mezi postavami** — **není samostatná entita**, viz §4.6. Strukturně existuje jen domácnost (§4.4). Členství ve skupině ani vedení skupiny se nemodelují (§4.6).
- **Otázka (Question)** a **Odpověď (Answer)** — viz §6.
- **Dokument (Document)** — vygenerovaný výstup pro tisk, viz §8.

### 4.2 Struktura zdrojové tabulky [ROZHODNUTO]

Zdrojem konfigurace je Google Sheet s tabulkami (per kapitola):

- **`Characters`** _(doplnit do tabulky)_ — registr postav: ID, jméno, příjmení, `Household`
  - `Household` (domácnost) slouží k nastavení **výchozích domácností, se kterými hra začíná**. Hodnota je ID domácnosti podle §4.2 (např. `MarieMirek`), vyplněné u obou členů; prázdné = postava začíná bez domácnosti.
- `Groups` — registr skupin: ID, název. **Slouží jen pro informaci a pro kontrolu**, že je pro každou skupinu nahraná šablona (§10.2, §11). Členy ani vedení nenese — viz §4.6.
- `Scales` — seznam postav a škál, které mají (viz níže)
- `Resources` — seznam postav a zdrojů, které mají (viz níže)
- `1_Questions`, `2_Questions`, `3_Questions` — otázky + odpovědi + jejich dopady na škály a zdroje. Od listu #2 i sloupec `Condition` (`Variation ID`, §4.5)
- `2_Content`, `3_Content` — bloky, verze a jejich podmínky, texty do šablon

#### Listy `Scales` a `Resources` [ROZHODNUTO]

**Defaultní (počáteční) hodnoty škál a zdrojů nejsou v listu `Characters`.** Žijí v listech `Scales` a `Resources`, které obsahují seznam postav a to, jaké škály a zdroje která postava má:

| List        | Obsah pro každou dvojici postava × škála / zdroj                                         |
| ----------- | ---------------------------------------------------------------------------------------- |
| `Scales`    | postava, škála, **`Min`**, **`Max`**, **defaultní hodnota**                              |
| `Resources` | postava **nebo domácnost**, zdroj, **defaultní hodnota** (zdroje nemají `Min` ani `Max`) |

- `Min` a `Max` mají **jen škály** (zdroje jsou bez horní hranice, §4.1). Každá škála každé postavy tak může mít jiný rozsah.
- Defaultní hodnota je **počáteční stav pro kapitolu 1**. Od kapitoly 2 se vychází ze snapshotu stavu po předchozí kapitole (§4.3).
- Jednu škálu nebo zdroj lze mít u více postav; každá dvojice postava × škála / zdroj je samostatný řádek.
- **Řádek v `Resources` smí místo postavy nést ID domácnosti** (např. `MarieMirek`, zdroj `R_MarieMirek_Wealth`). Defaultní hodnota je pak **počáteční zůstatek společného účtu výchozí domácnosti** (ze sloupce `Household` v `Characters`, viz níže). Řádek smí mít jen domácnost, která ve sloupci `Household` je.

**Postavy se v aplikaci nepopisují [ROZHODNUTO].** Vše, co engine potřebuje k rozhodnutí o vývoji postavy, plyne **výhradně z odpovědí na otázky a ze škál a zdrojů**. Charakterizace postavy (povaha, minulost, fixní rysy typu „závislý na piku") žije v **pevných odstavcích šablony Google Docu**, kterých se engine nikdy nedotkne — není to datový model.

**Konvence ID (dodržet):**

| Typ       | Vzor                                                                    | Příklad               |
| --------- | ----------------------------------------------------------------------- | --------------------- |
| Otázka    | `Q_<Postava>_<Kapitola>_<Poradi>`                                       | `Q_Marie_1_1`         |
| Odpověď   | `A_<Postava>_<Kapitola>_<Otazka>_<Hodnota>`                             | `A_Marie_1_1_Karel`   |
| Škála     | `S_<Postava>_<Skala>`                                                   | `S_Marie_Regime`      |
| Zdroj     | `R_<Postava/Domácnost>_<Zdroj>`                                         | `R_MarieMirek_Wealth` |
| Domácnost | `<PostavaA><PostavaB>` — ID obou postav **abecedně seřazená** a slepená | `MarieMirek`          |

**ID domácnosti se neváže na nic v tabulce, odvozuje se ze dvou postav:** ID postavy, která je abecedně první, následované ID postavy, která je abecedně druhá. `MarieMirek`, nikdy `MirekMarie`. Stejný vzorec vždy vyrobí stejné ID, takže se na domácnost dá odkazovat i v `R_…` zápisech dřív, než vznikne (§4.4). Důsledek: stejná dvojice postav má vždy stejné ID domácnosti, i kdyby se rozvedla a znovu vzala.

**ID otázky (`N_Questions`, sloupec `ID`) smí zůstat prázdné [ROZHODNUTO].** Aplikace si ho při importu doplní sama podle vzoru `Q_<Postava>_<Kapitola>_<Poradi>` z tabulky výše.

- `<Poradi>` je pořadí otázky **pro danou postavu v dané kapitole**, počítané od 1 podle pořadí řádků v listu. Každá postava tedy v každé kapitole začíná znovu od 1.
- Do pořadí se počítají všechny otázky postavy, včetně organizátorských (§6.7) a anketních odpovědí `poll-answer` (§6.6).
- Autor smí ID vyplnit ručně; vyplněné ID má přednost a nepřepisuje se. **Výjimka: u otázek typu `poll` je ID povinné a nikdy se negeneruje** (§6.6).

**Formát sloupce dopadu na škály:** čárkou oddělený seznam `<ScaleID><znaménko><číslo>`, např. `S_Marie_Job+3, S_Marie_Regime-2`. Prázdná buňka = žádný dopad.

**Formát sloupce dopadu na zdroje:** čárkou oddělený seznam `<ResourceID><znaménko><číslo>`, např. `R_Marie_Wealth+3, S_Marie_Stocks-2`. Prázdná buňka = žádný dopad.

**Speciální hodnota odpovědi:** `_OTHER_` — volný text, který org doplní ručně. {?}

### 4.3 Stav postavy

Stav postavy v kapitole N = `{ škály: {…}, zdroje: {…}, household: "…" }`. {?}
Výchozí `household` pro kapitolu 1 je ze sloupce `Household` v listu `Characters` (§4.2).
Součástí stavu jsou i **vybrané varianty** (`Variation ID`) každé postavy a skupiny v dané kapitole. Vznikají při přepočtu (§7.3), naplňují dokumenty (§8.3) a rozhodují, které otázky se v té kapitole položí (§4.5). Aplikace je proto musí umět vyhledat podle dvojice vlastník × kapitola.
**Výběr se drží pro celý běh, ne jen pro aktuální kapitolu**: stav po kapitole N nese varianty všech kapitol až po N+1. Engine díky tomu ví, které otázky se v dřívějších kapitolách položily, a chybějící starší odpověď je hlasitá chyba, ne podmínka tiše vyhodnocená jako nepravda.
**Ukládají se hned při přepočtu** — jakmile přepočet rozhodne, která varianta vyhrála, uloží se spolu s ním (`selected_variations`, vazba na `computation_id`), ne až při generování dokumentů.

Stav se **ukládá jako snapshot po každé kapitole**, nikdy se nepřepisuje. Historie stavů je součástí auditu.

---

### 4.4 Domácnosti a sdílené zdroje [ROZHODNUTO]

Některé postavy sdílejí majetek — manželé mají společný účet (to je zdroj). Sdílené hodnoty nesmí být řešené kopírováním mezi postavami; potřebují vlastního vlastníka.

**Zavádí se entita `Domácnost` (Household).** Je to skupina postav, které sdílejí ekonomické hodnoty. Vzniká sňatkem (nebo je nastavená od začátku hry, §4.2), může zaniknout rozvodem nebo úmrtím.

**Postava smí být v jednu chvíli nejvýše v jedné domácnosti.** Kontrola konzistence (§11).

**Osobní účet manželům nezaniká.** Sňatkem se jen změní, kam standardně přitékají peníze; to, co měli předtím, jim zůstává na osobním účtu.

#### Rozsahy platnosti škály

Zdroj má v definici (`Resources`) uvedený rozsah {?}:

| Rozsah      | Význam                                                              | Příklad             |
| ----------- | ------------------------------------------------------------------- | ------------------- |
| `private`   | Hodnota patří jedné postavě                                         | `Regime`, `Control` |
| `household` | **Dvojice účtů, engine podle stavu postavy vybere, do kterého jde** | `Wealth`, `Bony`    |

#### Směrování finančních příspěvků [ROZHODNUTO]

Tohle je jádro celé sekce:

- **Postava v manželství** → její finanční příspěvky jdou **do domácnosti**, na společný účet.
- **Postava svobodná** → její příspěvky jdou **na její osobní účet**.
- **Výjimka:** dopad zapsaný s příponou `_private` jde **vždy na osobní účet**, i když je postava vdaná (`R_Marie_Wealth_private+3`). Na to se zapisují příjmy, o kterých partner neví, nebo které si postava vědomě nechává stranou. **Otázka žádný příznak `Private` nenese** — na osobní účet míří jen přípona u konkrétního dopadu.

{?}

- jak indikovat, že při vzniku manželství vznikne daný zdroj i pro domácnost?
  - defaultně všechny, protože momentálně budeme mít jen "Wealth" / bankovní účet
  - household v sloupci
- jak v dopadech na škály/zdroje indikovat, že mají jít na soukromý účet, a ne do domácnosti?: \_private

```
R_Marie_Wealth+3
R_Marie_Wealth_private+3
```

Engine při přepočtu rozhodne, jestli to přistane na `Wealth` postavy nebo domácnosti. **Autor nemusí psát dvě varianty odpovědi pro vdanou a svobodnou postavu** — a přesně kvůli tomu tenhle mechanismus existuje. Bez něj by u každé finanční otázky musela být podmínka na rodinný stav.

Explicitní zápis s příponou (`S_Marie_Wealth_private+3`) zůstává **možný a má přednost** před směrováním. Je to úniková cesta pro případy, které do pravidla nezapadají.

{?} - jak kontrolovat podmínky na wealth? sčítat účty?
**Stejné směrování platí i v podmínkách.** `S_Marie_Wealth >= 7` znamená „účet, do kterého Mariiny peníze tečou". Kdo chce konkrétní účet, napíše `S_Marie_Wealth_osobni >= 7`.

**Výjimka — absolutní nastavení musí být vždy explicitní.** Organizátorská otázka typu `scale_direct` / `resource_direct` (§6.7) nesmí používat logické jméno. Org nastavuje konkrétní účet a nikdy se nesmí stát, že se hodnota nevědomky zapíše jinam, než myslel. Validace to hlídá.

#### Kdy se rodinný stav vyhodnocuje {?}

Směrování se řídí stavem postavy **po strukturální fázi přepočtu** (§7.3, fáze 2), tedy po vyhodnocení sňatků a rozvodů dané kapitoly. (Součást vyhodnocení sňatků a rozvodů musí být nastavení stavu zdrojů organizátorem)

Prakticky to znamená: **kdo se v téhle kapitole oženil, tomu už příspěvky z téže kapitoly jdou na společný účet.** Kdo se rozvedl, tomu jdou na osobní. Je to logičtější než počítat s loňským stavem a zároveň to plyne z fixního pořadí fází — nemůže to záviset na pořadí řádků v tabulce.

#### Jak se sdílená hodnota mění

Výchozí chování: **příspěvky členů domácnosti se sčítají.** Když Marie i Mirek odpoví tak, že každý přinese +2 na `Wealth`, společný účet vzroste o 4. Oba do něj vydělávají, takže je to správně.

#### Vznik a zánik domácnosti [ROZHODNUTO]

Obojí je **efekt odpovědi** (§6.7), ne ruční operace nad databází. Efekt se zapisuje do sloupce `Effects` v `N_Questions` jako volání funkce. Názvy efektů jsou **anglicky, velkými písmeny** (jako `RANDOM` a `DEFAULT`), argumenty jsou **ID postav z registru `Characters`**, nikdy volný text:

| Efekt                      | Význam                                 | Příklad                            |
| -------------------------- | -------------------------------------- | ---------------------------------- |
| `HOUSEHOLD_CREATE(A, B)`   | Sňatek. Vznikne domácnost obou postav. | `HOUSEHOLD_CREATE(Marie, Mirek)`   |
| `HOUSEHOLD_DISSOLVE(A, B)` | Rozvod nebo úmrtí. Domácnost zaniká.   | `HOUSEHOLD_DISSOLVE(Marie, Mirek)` |

- ID domácnosti se odvozuje podle §4.2 (`MarieMirek`) a **nezávisí na pořadí argumentů**.
- Více efektů v jedné buňce se odděluje středníkem nebo novým řádkem.
- Sňatky a rozvody jsou **organizátorské otázky** (§6.7), protože se týkají víc postav najednou.

**Efekt sám vyvolá vstupní pole a doplní dopad na zdroje.** Autor `Scale and Resources Impact` u takové odpovědi nepíše — aplikace ho odvodí z efektu. `{input1}` je pole první postavy z efektu, `{input2}` druhé (v pořadí, v jakém je autor napsal). Kolik kdo vloží do společného účtu, resp. kolik si z něj odnáší, je **rozhodnutí orga zadané do inputu**, ne tiché dopočítání.

| Efekt                              | Odvozený dopad                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `HOUSEHOLD_CREATE(Marie, Mirek)`   | `R_Marie_Wealth_private-{input1}, R_Mirek_Wealth_private-{input2}, R_MarieMirek_Wealth+{input1}+{input2}` |
| `HOUSEHOLD_DISSOLVE(Marie, Mirek)` | `R_MarieMirek_Wealth-{input1}-{input2}, R_Marie_Wealth_private+{input1}, R_Mirek_Wealth_private+{input2}` |

- **Sňatek.** Osobní účty obou zůstávají. Nová domácnost začíná s **nulovým společným účtem**; kolik na něj přijde z osobních účtů manželů, zadává org do inputů.
- **Rozvod nebo úmrtí.** Po zániku **žádný zůstatek společného účtu nezůstává** — rozdělí se mezi jeden nebo víc osobních účtů podle inputů. Zatím platí: při rozvodu mezi bývalé manžele, při úmrtí celý na jeden účet (druhý input je 0). Ne tiché dopočítání: **součet inputů se musí rovnat zůstatku společného účtu**, jinak je to konflikt.
- Odvození se zatím týká jen zdroje `Wealth` (viz {?} výše).
- **Výchozí domácnost** (sloupec `Household` v `Characters`, §4.2) má počáteční zůstatek společného účtu v listu `Resources`: řádek s ID domácnosti místo postavy.
- **Chybí-li výchozí domácnosti řádek v `Resources` pro některý zdroj** (zatím jen `Wealth`), **import skončí chybou.** Nic se tiše nedoplňuje nulou.
- **Konflikty (engine je nevyřeší sám, §7.3):** `HOUSEHOLD_CREATE` pro postavu, která už v domácnosti je; `HOUSEHOLD_DISSOLVE` domácnosti, která neexistuje; `HOUSEHOLD_DISSOLVE`, jehož inputy nedávají dohromady zůstatek společného účtu. **Odmítnutý efekt nepohne ničím:** domácnost zůstane, jak byla, a odvozené dopady se neaplikují — platí to i pro rozdělení, které nesedí (jinak by peníze vznikly nebo zmizely).
- **Dopad mířící výslovně na společný účet domácnosti, která v tu chvíli neexistuje** — ještě nevznikla, nebo v téže kapitole zanikla (`R_MarieMirek_Wealth+5` od třetí postavy, `resource_direct` na ten účet) — je rovněž konflikt a peníze se nepohnou; kam mají jít, rozhodne org. Import to předem poznat nemůže, záleží na odpovědích. Vlastní výplata a vklady efektu domácnosti jsou z pravidla vyjmuté. **V podmínkách se takový účet čte jako 0.** Příspěvků zapsaných logickým jménem (`R_Marie_Wealth+3`) se to netýká, ty se směrují na účet, který existuje.
- Syntaxi efektů hlídá validace importu (§11, bod 10).

#### Dopad na transparentnost

Sdílené zdroje jsou **největší riziko pro princip „žádný black box"** (§2). Mariiny peníze se změní, aniž by to šlo vysvětlit z jejích odpovědí. Směrování to riziko ještě zvyšuje, protože ze zápisu `S_Marie_Wealth+3` není na první pohled vidět, kam to spadlo.

Proto:

1. Trace u směrované zdroje **vždy uvádí cílový účet a důvod směrování**: „+3 Wealth → společný účet, Marie je v manželství s Mirkem Pokorným".
2. Trace u sdíleného zdroje **vždy uvádí, od koho změna přišla**: „−3 Wealth_spolecny, zdroj: odpověď Mirka Pokorného na Q_Mirek_2_1".
3. Trace u dopadů odvozených z efektu domácnosti **uvádí efekt a zadané hodnoty**: „−500 Wealth (soukromý účet) → společný účet, HOUSEHOLD_CREATE(Marie, Mirek) na Q_Organizatori_1_1".

---

### 4.5 Kde jsou pravidla [ROZHODNUTO]

Autor hry podmínky píše jako **výrazy v jedné buňce**, například `A_Marie_1_1_Karel AND !(A_Marie_2_3_Postava2 OR A_Marie_2_3_Postava3)`.

**Podmínky jsou výrazy. Parser se nepíše, použije se knihovna** (`jsep` nebo `expr-eval`) a nad jejím stromem se napíše vlastní vyhodnocení. Vlastní gramatiku nepsat ani teď.

#### Jazyk podmínek

| Prvek   | Zápis                        | Význam                                                                                                                            |
| ------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Odpověď | `A_Marie_1_1_Karel`          | Postava odpověděla takto                                                                                                          |
| Negace  | `!A_Marie_1_1_Karel`         | Neodpověděla                                                                                                                      |
| Spojky  | `AND`, `OR`                  | Logické spojení                                                                                                                   |
| Závorky | `( )`                        | Priorita vyhodnocení                                                                                                              |
| Škála   | `S_Marie_Wealth >= 7`        | Porovnání, operátory `=`, `!=`, `>`, `<`, `>=`, `<=`                                                                              |
| Náhoda  | `RANDOM(50)`                 | Pravděpodobnost v procentech, hod se ukládá (§7.4)                                                                                |
| Výchozí | `DEFAULT` nebo prázdná buňka | Vždy pravdivé, použije se, když neprojde nic jiného. **Prázdná podmínka a `DEFAULT` znamenají totéž** — fallback varianta (§8.2). |

Tenhle jazyk platí **jen pro sloupec `Conditions` v `N_Content`**. Podmínka otázky je jiná věc — viz níže.

#### Kde podmínky žijí

| Vrstva | Kde                                                  | K čemu                                         |
| ------ | ---------------------------------------------------- | ---------------------------------------------- |
| 1      | Sloupec `Scale and Resources Impact` v `N_Questions` | Odpověď posune škály                           |
| 2      | Sloupec `Effects` v `N_Questions` (§4.4)             | Odpověď vyvolá vznik nebo zánik domácnosti     |
| 3      | Sloupce `Priority` a `Conditions` v `N_Content`      | **Která varianta bloku se použije** — viz §8.2 |
| 4      | Sloupec `Condition` v `N_Questions` (od kapitoly 2)  | **Jestli se otázka položí** — viz níže         |

#### Podmínka otázky [ROZHODNUTO]

**Ve sloupci `Condition` v `N_Questions` není výraz, ale jediné `Variation ID`** (§8.2). Výrazy se vyhodnocují pouze v `N_Content`; tam se rozhodne, která varianta bloku vyhrála, a otázka se pak odkáže na vítěze.

| Zápis                     | Význam                                               |
| ------------------------- | ---------------------------------------------------- |
| `V_Marie_1_Questions_1_A` | Otázka se položí, jen když je tahle varianta vybraná |
| prázdná buňka             | Otázka se položí vždy                                |

- **Jen holé ID.** Žádné `AND`, `OR`, `!`, závorky, porovnání, `RANDOM` ani `DEFAULT`.
- **Varianta musí patřit téže postavě**, jejíž je otázka — typicky bloku, který autor založil právě kvůli rozhodnutí o otázkách (konvence `B_<Postava>_<Kapitola>_Questions_<N>`, §8.2).
- **Čísla kapitol si odpovídají:** `2_Content` rozhoduje o otázkách v `2_Questions`. Varianty se vybírají při přepočtu předchozí kapitoly, takže jsou známé dřív, než se dotazník otevře.
- Kapitola 1 podmínky nemá — `1_Content` neexistuje.
- Chce-li autor podmínku „nestalo se X", napíše ji jako výraz do `Conditions` u varianty bloku a otázku naváže na tu variantu.

### 4.6 Text není stav [ROZHODNUTO]

Obecné pravidlo, které řeší celou třídu otázek:

> **Text, který se jen tiskne, nikdy není datový model. Co má ovlivnit budoucnost, jsou škály, zdroje, variace.**

**Důsledek: členství ve skupině a vedení skupiny nejsou stav.** Kdo je členem a kdo skupinu vede, se nesleduje ani v listu `Groups`, ani v efektech. Vyjadřují to **varianty bloků**: jejich podmínky (odkazy na odpovědi, škály a zdroje) určují, jaký text o členství a vedení se dostane do dokumentu. List `Groups` slouží jen k tomu, aby aplikace znala seznam skupin a mohla zkontrolovat, že každá skupina má šablonu (§10.2, §11).

---

## 5. Hlavní workflow (cyklus kapitoly)

```
[1] Import konfigurace z tabulky (.xlsx) a šablon (.md)
        ↓
[2] Sběr odpovědí ve dvou vlnách: papíry od hráčů, pak organizátorské otázky (§6.7)
        ↓
[3] Validace vstupů (chybějící, konfliktní)
        ↓
[4] PŘEPOČET — engine aplikuje pravidla
        ↓
[5] Náhled výsledku + trace „proč"          ← org kontroluje
        ↓
[6] Editovatelný JSON mezivýstup             ← org ručně opravuje
        ↓
[7] Potvrzení → vygenerování .md a pdf dokumentů (§10.4)
        ↓
[8] Snapshot stavu + označení kapitoly jako vydané (§3.2)
```

Krok [4] musí jít spustit **opakovaně a nedestruktivně** (dry-run) — org si může přepočet pustit stokrát, než ho potvrdí.

---

## 6. Vstupy

### 6.1 Typy otázek [ROZHODNUTO]

| Typ           | Popis                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| `bool`        | Ano / Ne                                                                |
| `single`      | Výběr jedné hodnoty ze seznamu (např. „Komu věnuješ své auto?")         |
| `multi`       | Výběr více hodnot ze seznamu                                            |
| `poll`        | Definice ankety: společná otázka bez postavy (§6.6)                     |
| `poll-answer` | Otázka postavy, která odkazuje na anketu (`poll`) a hlasuje v ní (§6.6) |

**U `multi` je povinná aspoň jedna vybraná odpověď.** Smí-li postava nevybrat nic, napíše autor „nic z uvedeného“ jako běžnou odpověď do tabulky. Prázdný výběr je nezodpovězená otázka — žádné výchozí odpovědi (§6.3) — a engine ho odmítne.

#### Odpovědi u `bool` otázek [ROZHODNUTO]

U otázek typu `bool` mohou v tabulce (v `Responses`) existovat **dva řádky odpovědí, s textem `Ano` a `Ne`**. Jejich **ID se nemusí vyplňovat** — aplikace ho odvodí sama:

| Text | Odvozené ID odpovědi                  |
| ---- | ------------------------------------- |
| Ano  | `A_<Postava>_<Kapitola>_<Poradi>_Ano` |
| Ne   | `A_<Postava>_<Kapitola>_<Poradi>_Ne`  |

Příklad: `A_Marie_1_2_Ano`, `A_Marie_1_2_Ne`. `<Poradi>` je pořadí otázky u postavy v kapitole, stejně jako u ID otázky (§4.2). V podmínkách se tato ID používají jako u kterékoli jiné odpovědi (§4.5).

- **Řádky s `Ano` / `Ne` slouží k zadání efektů** (`Scale and Resources Impact`, `Effects`) dané odpovědi.
- **Chybí-li řádek (nebo oba), aplikace ho doplní sama** s textem `Ano` / `Ne` a odvozeným ID. Znamená to, že odpověď **nemá žádné efekty** k vyhodnocování; dá se na ni stále odkazovat v podmínkách.
- Pořadí řádků nehraje roli, odpověď se pozná podle textu.

**Explicitně NEIMPLEMENTOVAT:** podmíněné podotázky („pokud X → zobraz podotázku Y"). Autoři je vědomě vyškrtli. Dotazník je plochý.

### 6.2 Zdroje vstupů

1. **Odpovědi hráčů** — hlavní zdroj, na konci každé kapitoly.
2. **Odpovědi od orgů** — otázky stejné jako od hráčů. "Organizátor" bude v dotazníku jako 1 z postav
3. **Náhoda** — hod kostkou tam, kde to podmínka vyžaduje (§7.4).

### 6.3 Chybějící data [ROZHODNUTO]

**Výchozí odpovědi neexistují.** Každá odpověď je vždy explicitně zadaná člověkem.

Když postava nedodá odpověď (hráč nedorazil, ztracený papír), **game master dotazník vyklikne ručně** podle toho, jaký outcome chce.

Důsledky:

- Přepočet kapitoly **nelze spustit**, dokud nejsou zodpovězené všechny otázky. Aplikace vypíše seznam chybějících.
- Žádné tiché doplňování hodnot na pozadí. Nikdy.

### 6.4 Rozvržení aplikace a zadávání odpovědí [ROZHODNUTO]

**Klasické rozvržení webové aplikace**

**Horní lišta**

- Přepínač běhu, **barevně odlišený** (§3.3).
- Kapitoly 1 / 2 / 3 se stavem (`probíhající` / `spočítaná` / `vydaná`).
- Sekce, **pět** [ROZHODNUTO]: **Postavy · Skupiny · Přepočet · Výstupy · Správa**.
- Vpravo jméno z pole „Kdo jsi?" (§3.1).

**Levý panel — seznam postav**

- Jméno a **indikátor vyplněnosti**: nevyplněno / rozpracováno / hotovo. Barva plus tvar, ne jen barva.
- Nahoře souhrn: **„Vyplněno 14 / 23"**.
- Hledání podle jména a filtr „jen nevyplněné".
- Panel si drží pozici při přepínání postav — org projíždí seznam shora dolů.

**Hlavní plocha**

- Dotazník vybrané postavy: ~3 otázky, každá se svým typem ovládání (§6.1).
- Pod dotazníkem aktuální stav škál a zdrojů postavy, ať je vidět kontext. U sdílených zdrojů značka, s kým jsou sdílené (§4.4).
- **Automatické ukládání** po každé změně, s viditelným potvrzením. Žádné tlačítko „Uložit", na které se dá zapomenout.

**Ostatní sekce**

- **Skupiny** — seznam skupin z listu `Groups` a stav šablon (která skupina má nahranou šablonu v které kapitole, §10.2)
- **Přepočet** — spuštění, konflikty k rozhodnutí (§7.3), náhled změn s trace „proč" (§7.5).
- **Výstupy** — dvě záložky nad jedním výsledkem přepočtu:
  - _Přehled_ — stavy škál, zdroje a variace všech postav. Tady tabulka smysl dává.
  - _Dokumenty_ — vygenerované `.md` (tlačítko „Kopírovat do schránky" (§10.5), stažení zipu), `.pdf` (všechny dokumenty v 1)
- **Správa** — nahrání `.xlsx` a šablon, archiv nahraných souborů, výsledky validací (§11), audit log. Věci, které se nedělají denně.

Sedm sekcí bylo zvažováno a **sloučeno na pět**. Výsledky a Dokumenty jsou dva pohledy na jeden výstup; Konfigurace a Audit jsou obojí správa, ne denní práce. Lišta se sedmi položkami se navíc nevejde do rozumné šířky.

**Vzhled**
Nástroj pro práci pod časovým tlakem, ne prezentační web. Hustá, dobře čitelná sazba, žádné velké prázdné plochy, stav vždy viditelný bez rolování. Musí být použitelné na notebooku i na tabletu, ve světlém i tmavém režimu.

Aplikace **smí být hezká a mít lehkou retro stylizaci** odkazující na prostředí hry (socialistické Československo) — hlavně v **barevné paletě**, tlumenými a mírně vybledlými odstíny, případně střídmou volbou písma. **Čistota a čitelnost mají ale přednost před stylizací.** Retro nese barva a typografie, ne textury, ozdobné rámečky ani grafika napodobující starý papír.

### 6.5 Konfigurace se nastaví jednou a pak se nemění [ROZHODNUTO]

**Verzování konfigurace bylo zvažováno a zamítnuto jako nadbytečné.**

```
Příprava celé hry v tabulce (všechny tři kapitoly)
        ↓
Založení běhu → nahrání .xlsx a šablon → validace → chyby? → oprava v tabulce → nahrát znovu
                                                   → v pořádku → běh startuje
```

**Před prvním přepočtem** se dá konfigurace nahrávat znovu a znovu bez ptaní. Je to fáze ladění, nic se nepřepisuje, protože ještě nic nevzniklo.

**Po prvním přepočtu** je konfigurace zmrazená. Otázky, škály ani bloky se v rozjetém běhu nemění.

Aplikace si drží **jednu platnou konfiguraci na běh**.

#### Archiv místo verzí [ROZHODNUTO]

Aby zůstala zachovaná auditovatelnost (§2, bod 2), aplikace si u každého importu **odloží nahraný soubor tak, jak přišel** — `.xlsx` i `.md` šablony, jako přílohy běhu.

Je to levnější a úplnější než diff: po hře jde přesně dohledat, z čeho se počítalo, a nikdo nemusel psát porovnávací logiku.

#### Když se konfigurace přece jen změnit musí

**Celý běh je připravený předem.** Obsah všech tří kapitol, včetně šablon a bloků, je hotový dřív, než běh začne. Dopisování obsahu za chodu se nepočítá.

Zbývá jediný důvod ke změně: **oprava chyby, která se ukáže až v průběhu** — překlep v textu bloku, špatně napsaná podmínka. Tu musí jít opravit, jinak by se s ní musel dohrát zbytek hry.

Nahrání opravené konfigurace do rozjetého běhu proto **je možné**, ale:

1. Vyžaduje potvrzení a důvod, obojí do auditu.
2. Aplikace označí už spočítané kapitoly jako **`dotčené`** a nechá orga rozhodnout, co s nimi — stejný mechanismus jako u opravy odpovědi (§3.2).
3. Původní soubor zůstává v archivu běhu.

Je to nouzová cesta, ne součást běžného postupu.

### 6.6 Otázky jsou per postava [ROZHODNUTO]

Neexistuje sdílená sada otázek. **Každá z 23 postav má vlastní ~3 otázky na kapitolu** (~69 otázek na kapitolu, ~207 na celou hru).

Důsledky pro implementaci:

- Otázka je vždy navázaná na konkrétní postavu (viz konvence ID `Q_Marie_1_1`).
- Volby odpovědí často odkazují na **jiné postavy** („Karel", „Mirek"). Musí odkazovat na **ID postavy z registru**, ne na volný text — jinak se po sňatku nebo přejmenování rozpadne provázání (§8.8).
- Autorský objem je velký a ručně psaný → kontroly konzistence (§11) jsou o to důležitější.

#### Výjimka: anketní otázky [ROZHODNUTO]

Anketa je jediná otázka, o které se rozhoduje z odpovědí **více postav** najednou. Skládá se ze dvou typů otázek (§6.1):

**`poll` — definice ankety**

- Má **ID, text a responses** (odpovědi). ID se **negeneruje automaticky**, autor ho vyplňuje sám (např. `Q_Group_Funkcionari_Nastupce`).
- **Není přiřazená k žádné postavě.** Nezapočítává se do pořadí otázek žádné postavy.

**`poll-answer` — hlas postavy v anketě**

- Je to běžná otázka postavy (ID se doplňuje automaticky podle §4.2, počítá se do pořadí otázek postavy).
- Ve sloupci `Text` **nemá text otázky, ale ID nadřazené ankety** (`poll`).
- **Text otázky a responses se doplní z nadřazené ankety.** Díky tomu se u každé hlasující postavy neopisuje totéž.
- ID odpovědí a jejich efekty se přebírají z ankety — mají jediný zdroj.

**Vyhodnocení**

- Výsledek ankety se vyhodnocuje **z odpovědí všech postav**, které mají `poll-answer` na tutéž anketu.
- Vyhrává odpověď s nejvíce hlasy.
- **Efekty odpovědi ankety se aplikují jednou za vítěznou odpověď**, ne za každého hlasujícího.
- **Při shodě hlasů rozhoduje pořadí odpovědí (řádků) v definici ankety** — vyhrává dřívější. Remíza tedy není konflikt, který by engine vracel orgovi (§7.3): výsledek je deterministický.
- **Stejně se řeší i anketa bez jediného hlasu** (žádná z podmíněných hlasovacích otázek se v běhu nepoložila): vyhrává první řádek definice, jeho efekty se aplikují a konflikt to není. Anketu, ve které podle tabulky vůbec nikdo hlasovat nemůže, odmítne už import (§11, bod 8).
- Přepočet kapitoly nelze spustit, dokud nehlasovaly všechny postavy (§6.3).

**Odkaz na výsledek v podmínkách [ROZHODNUTO].** V podmínkách (§4.5) se na výsledek ankety odkazuje **ID vítězné odpovědi** z definice ankety. Výraz platí, jen když tato odpověď anketu vyhrála (včetně rozhodnutí remízy podle pořadí výše).

### 6.7 Organizátorské otázky [ROZHODNUTO]

Některá rozhodnutí nedělají hráči, ale orgové mezi kapitolami.

Organizátorská otázka se chová úplně stejně jako hráčská: stejné typy (§6.1), stejné dopady na škály, stejné zapínání bloků a příznaků, stejná pravidla. **Je to jen jiný zdroj vstupu, ne jiný mechanismus** — engine mezi nimi nerozlišuje.

#### Sňatky a rozvody [ROZHODNUTO]

Sňatky a rozvody patří mezi organizátorské otázky, protože se týkají víc postav najednou. Nesou efekt `HOUSEHOLD_CREATE` / `HOUSEHOLD_DISSOLVE` (§4.4), který v dotazníku sám vyvolá vstupní pole a dopad na zdroje.

#### Zobrazení v UI [ROZHODNUTO]

Organizátorské otázky jsou **v jednom proudu s ostatními otázkami postavy**, na svém místě podle pořadí — ne v odděleném bloku. Je jich málo, takže zvláštní sekce by byla víc práce než užitku a rozbila by plynulý průchod dotazníkem.

Z téhož důvodu **jeden ukazatel postupu** v levém panelu, ne dva. Organizátorské otázky se počítají jako každé jiné.

---

## 7. Engine pravidel („střeva")

### 7.2 Váhy

Faktory mají různou váhu. **Váha je číslo u dopadu odpovědi** (sloupec `Scale and Resources Impact`): `+3` posune hodnotu silněji než `+1`. Nic dalšího se nenásobí. Váhy musí být editovatelné v tabulce, ne v kódu.

Škála se ořezává **po každém posunu** na `Min`/`Max`, takže hodnota nikdy nejde mimo rozsah. Zdroj se neořezává. Posuny se aplikují **ve sledu, v jakém jsou řádky** v tabulce.

Příklad: Marie začíná s `Wealth` 4 a `Regime` 4, škála `Regime` má rozsah 1–10.

| Odpověď               | Dopad                                |
| --------------------- | ------------------------------------ |
| `Q_Marie_1_1` = Karel | `R_Marie_Wealth+3, S_Marie_Regime-2` |
| `Q_Marie_1_3` = Ano   | `S_Marie_Regime-2`                   |

- `Wealth`: 4 + 3 = 7. Zdroj se neořezává.
- `Regime`: 4 − 2 = 2, potom 2 − 2 = 0, což se ořízne na 1. Ořez se zapíše do auditu.

### 7.3 Konflikty a pořadí vyhodnocení [ROZHODNUTO]

Engine nehádá: co nesmí rozhodnout sám, vrátí jako konflikt do UI a nechá rozhodnout orga. Konflikty domácností jsou popsané v §4.4.

#### Pořadí vyhodnocení (fixní)

1. Sběr všech odpovědí
2. **Strukturální efekty** — vznik a zánik domácností. Nejdřív všechny `HOUSEHOLD_DISSOLVE`, potom `HOUSEHOLD_CREATE` (rozvod a nový sňatek v jedné kapitole tak nevyrobí dvě domácnosti); mezi efekty téhož druhu na pořadí nezáleží.
3. **Hodnotové efekty** — nejprve absolutní nastavení hodnot z input otázek (§6.7), pak změny škál a zdrojů. **U směrovaných škál se tady rozhoduje cílový účet podle rodinného stavu z fáze 2** (§4.4). U škál s rozsahem `household` se efekty členů sčítají.
4. Detekce a nahlášení zbylých konfliktů

**Fáze 2 musí proběhnout celá před fází 3.** Sdílená škála potřebuje vědět, kdo do domácnosti patří, dřív než se do ní začnou sčítat příspěvky. Kdyby se sňatek vyhodnotil až mezi změnami škál, výsledek by závisel na pořadí řádků — a to je přesně ten nedeterminismus, kterému se vyhýbáme.

### 7.4 Náhoda [ROZHODNUTO]

Model je jednoduchý: **hoď digitální kostkou a výsledek ulož jako data.**

1. Výraz si vyžádá hod — funkce `RANDOM(50)` v podmínce znamená padesátiprocentní pravděpodobnost. Aplikace vygeneruje číslo.
2. Výsledek se **uloží ke konkrétní postavě, kapitole a variantě bloku** jako běžná hodnota — stejně jako odpověď hráče. V databázi se hod váže **jen na variantu** (a pořadí `RANDOM` ve výrazu): vlastníka — postavu nebo skupinu — i kapitolu říká její blok, takže se neukládají zvlášť.
3. **Přepočet hod NEOPAKUJE.** Použije uložené číslo. Přehodit lze jen výslovnou akcí orga („Přehodit"), která se zapíše do auditu včetně staré hodnoty.
4. Org může hozené číslo ručně přepsat. I to jde do auditu.
5. `RANDOM` se používá **jen v podmínkách variant bloků** (`N_Content`). Ve sloupci `Condition` v `N_Questions` je jen `Variation ID` (§4.5), takže tam být nemůže.

Tím je dohledatelnost splněná bez jakéhokoli seedování — v datech prostě stojí, co padlo.

### 7.5 Čitelnost logiky [ROZHODNUTO]

Logika algoritmu musí být **human-readable**. Pravidla se v UI zobrazují v přirozeném jazyce, ne jako kód. Např.:

> _„Protože Marie odpověděla ‚Karel' na Q_Marie_1_1 (+3 Wealth), její Wealth vzrostl z 4 na 7"_

---

## 8. Výstupy

### 8.1 PDF [ROZHODNUTO] {WIP}

Aplikace **vygeneruje PDF pomocí html ze schválených .md souborů**. HTML šablony

### 8.2 Bloky a jejich varianty [ROZHODNUTO]

**Varianty textu žijí v tabulce**, šablona obsahuje jen značku, ID bloku.

Struktura listu `N_Content`:

| Sloupec                 | Význam                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Character`             | Které postavy nebo skupiny se blok týká. Vyplněno jen na prvním řádku skupiny.                                                                          |
| `Block ID`              | Identifikátor bloku, např. `B_Marie_1_Historie_1`. Vyplněno jen na prvním řádku.                                                                        |
| `Variation ID`          | Identifikátor varianty, např. `V_Marie_1_Historie_1_A`                                                                                                  |
| `Variation Description` | Poznámka autora, do výstupu nejde                                                                                                                       |
| `Variation Text`        | Text, který se vloží do dokumentu. Smí být prázdný — varianta „nic se nestalo".                                                                         |
| `Priority`              | Volitelné číslo. Pokud ho varianty bloku mají, řadí se podle něj **vzestupně** (nižší číslo dřív). Pokud ho žádná nemá, řadí se podle **pořadí řádků**. |
| `Conditions`            | Výraz, §4.5. **Prázdná buňka i výraz `DEFAULT` znamenají totéž** — fallback varianta.                                                                   |

**Vyhodnocení bloku:** varianty téhož bloku se procházejí **vzestupně podle čísel v `Priority`; pokud žádná varianta bloku číslo nemá, podle pořadí řádků** — a použije se **první, jejíž podmínka platí**.

**Fallback varianta.** Varianta s prázdnou podmínkou nebo s podmínkou `DEFAULT` je vždy pravdivá. Proto musí stát **poslední**: zaručuje, že blok vždy něco vrátí. Kdyby stála dřív, všechny varianty za ní by se nikdy nepoužily (§11, 6f).

**Bloky se mohou zanořovat.** `Variation Text` smí obsahovat značku jiného bloku (`{BLOK <Block ID>}`, §8.4). Postup nahrazování je v §8.3.

Z toho plyne: **žádné konflikty mezi variantami nevznikají.** Priorita je rozhoduje úplně, engine nemusí nic hlásit orgovi.

**Blok, který rozhoduje o otázce.** Blok nemusí sloužit k naplnění dokumentu. Autor smí založit blok jen proto, aby se jeho vyhodnocením rozhodlo, která otázka se v další kapitole položí (§4.5). Takový blok:

- má varianty s **prázdným `Variation Text`**,
- **nemá značku v šabloně** ani v `Variation Text` jiného bloku,
- **není osiřelý** — je „použitý" tím, že se na jeho variantu odkazuje sloupec `Condition` v `N_Questions` (§11, kontrola 6).

Konvence pojmenování je `B_<Postava>_<Kapitola>_Questions_<N>`, ale rozhoduje odkaz z `Condition`, ne název.

**Jeden blok = jedno rozhodnutí.** Blok vrací právě jednu variantu, takže na jeho variantách může viset víc otázek jen tehdy, když se navzájem vylučují. Nezávislé otázky potřebují každá svůj blok.

### 8.3 Naplnění dokumentu [ROZHODNUTO]

Šablona je Markdown se značkami. Aplikace v ní **nahradí značky textem vybraných variant** a proměnné hodnotami.

```
[1] Org stáhne šablonu z Google Docu jako Markdown a nahraje do aplikace
[2] Aplikace zpracuje text:
      - u každé značky {BLOK B_...} vybere variantu podle priority a podmínek
      - vloží její Variation Text (prázdný text = značka zmizí beze stopy)
      - opakuje, dokud text obsahuje nějakou značku {BLOK ...} (zanořené bloky)
[3] Org potvrdí převod na pdf. Vygenerují se 3 pdf soubory - sloučí se dokumenty dle typu, ať se lehce a rychle tisknou (viz 8.6).
```

### 8.4 Značky v šabloně [ROZHODNUTO]

| Značka              | Význam                                           |
| ------------------- | ------------------------------------------------ |
| `{BLOK <Block ID>}` | Nahradí se textem vybrané varianty z `N_Content` |

Značky jsou **jednoduché, nepárové** — text nese tabulka, ne šablona.

Pravidla:

- **Žádná značka nesmí přežít do výsledného dokumentu.** Zbylá značka = chyba, aplikace ji nahlásí před uložením.
- Blok, který je v šabloně a chybí v `N_Content`, i blok v `N_Content`, na který nevede značka = chyba validace (§11).
- Text mimo značky je fixní část šablony a aplikace se ho nedotkne. Sem patří charakterizace postavy, která se nemění (§4.6).

#### Zanořené bloky [ROZHODNUTO]

`Variation Text` vybrané varianty **smí obsahovat další značku `{BLOK <Block ID>}`**. Nahrazování se proto provádí **ve smyčce: dokud výsledný text obsahuje nějakou značku bloku, nahrazuje se dál.** Zanořený blok se vyhodnocuje stejně jako každý jiný (priority, podmínky, `DEFAULT`, §8.2) a ve stejném kontextu (postava, kapitola) jako blok, ve kterém stojí.

Pojistka: **blok se nesmí přímo ani nepřímo odkazovat sám na sebe** (A → B → A). Taková smyčka by se nikdy neukončila. Hlídá to validace při importu (§11, 6g) a engine si navíc drží horní mez počtu průchodů; při jejím překročení skončí chybou, nezacyklí se.

### 8.6 Typy dokumentů

1. **Dokument postavy**
2. **Dokument skupiny**
3. **Sada otázek pro další kapitolu** — dotazníky k tisku.

---

## 9. Šablona postavy

- **Odstavce** — část napevno, část podle voleb (podmíněné bloky).

---

## 10. Vstupy a výstupy jako soubory

### 10.1 Vstup: konfigurace

**Jeden `.xlsx` soubor, žádný jiný formát [ROZHODNUTO].** Google Sheet se stáhne přes _Soubor → Stáhnout → Microsoft Excel_, což zachová **všechny listy v jednom souboru**, a nahraje se do aplikace.

Po importu je zdrojem pravdy databáze aplikace. Do prvního přepočtu jde nahrávat opakovaně a volně, pak už jen výjimečně (§6.5). Chybná konfigurace nesmí aplikaci shodit — vypíše se seznam chyb s odkazem na řádek a list.

### 10.2 Vstup: šablony dokumentů

Šablony jsou Google Docs se značkami (§8.4). Do aplikace se dostanou jako **Markdown soubory**: _Soubor → Stáhnout → Markdown_, pak nahrát do aplikace (víc souborů najednou nebo v zipu).

**Šablona je zvlášť pro každou kapitolu, ale všechny se nahrávají najednou na začátku běhu.** Nahrávají se tedy **jednou za běh** (šablony všech kapitol dohromady). **Kapitola 1 šablonu nepotřebuje** — její dokumenty jsou pevný text rozdaný předem a aplikace je netiskne (výstupy kapitoly N jsou dokumenty pro N+1). Soubor `_1.md` nebo řádek listu `Templates` pro kapitolu 1 nic neblokuje, jen se nepoužije (varování).

**Pojmenování souboru [ROZHODNUTO]** určuje, komu a které kapitole šablona patří:

| Šablona pro | Název souboru                      | Příklad            |
| ----------- | ---------------------------------- | ------------------ |
| Postavu     | `<ID postavy>_<číslo kapitoly>.md` | `Marie_2.md`       |
| Skupinu     | `<ID skupiny>_<číslo kapitoly>.md` | `Funkcionari_2.md` |

Aplikace si šablony pamatuje a ukáže, které postavě nebo skupině a v které kapitole která šablona patří a která chybí. Seznam skupin se bere z listu `Groups`.

### 10.4 Výstup: jeden zip

Po potvrzení přepočtu aplikace nabídne ke stažení **jeden archiv**:

```
beh-<nazev>_kapitola-<N>.zip
├── dokumenty/
│   ├── postava_<ID>_<Prijmeni>.md
│   ├── skupina_<ID>_<Nazev>.md
│   ├── postavy.pdf
│   ├── skupiny.pdf
├── vysledky.xlsx          ← stav škál, vybrané bloky, příznaky
└── beh.json               ← kompletní stav + trace, strojově čitelný archiv
```

Pojmenování je odvozené strojově, konzistentní napříč kapitolami i běhy.

---

## 11. Kontrola konzistence

Sada automatických kontrol (list `Validations`), spuštitelná kdykoli:

1. Otázka bez odpovědí / odpověď bez otázky
2. Odkaz na neexistující škálu, postavu nebo skupinu
3. Nedosažitelné pravidlo (podmínka nemůže nikdy nastat)
4. _(zrušeno — revidovaný model nemá pravidla s prioritou; číslování kontrol zůstává)_
5. Textový blok, na který nevede žádná cesta / postava bez dokumentu
6. Blok v šabloně bez odpovídajícího záznamu v `N_Content`, nebo blok v `N_Content`, na který nevede žádná značka (§8.4) **ani odkaz ze sloupce `Condition` v `N_Questions`** (§8.2)
   6b. **Blok bez fallback varianty** (s podmínkou `DEFAULT` nebo prázdnou) — hrozí, že neprojde žádná podmínka a blok nevrátí nic (§8.2)
   6c. **Syntakticky vadný výraz v `Conditions`** — chybějící závorka, neznámý operátor. V ukázkovém listu už jeden takový je: `!(A_Marie_2_3_Postava2 OR A_Marie_2_3_Postava3` bez uzavírací závorky.
   6d. **Odkaz ve výrazu na neexistující škálu nebo zdroj** (chyba). Neexistující odpověď nebo nedopsané `???` je **varování** a čte se jako nevybraná odpověď — autor píše podmínky jedné postavy dřív, než existují otázky ostatních (rozhodnutí organizátora 25. 9. 2026). Odpověď z pozdější kapitoly zůstává chybou.
   6e. **Dvě varianty téhož bloku se stejnou `Priority`** — výsledek by závisel na pořadí řádků. Všechny varianty bez priority ("") jsou OK - autor chce, aby výsledek záležel na pořadí řádků.
   6f. **Fallback varianta (`DEFAULT` / prázdná podmínka) není poslední v pořadí vyhodnocení** — všechny varianty za ní jsou nedosažitelné (§8.2)
   6g. **Cyklus mezi bloky** — blok se přímo nebo přes jiné bloky odkazuje sám na sebe (§8.4). Blok, na který vede značka jen z `Variation Text` jiného bloku, se u kontroly 6 počítá jako dosažitelný.
   6h. **Blok, kde má `Priority` jen část variant** — pořadí není jednoznačné (§8.2). Buď mají číslo všechny varianty bloku, nebo žádná.
   6i. **Vadný sloupec `Condition` v `N_Questions`** (§4.5): cokoli jiného než jediné `Variation ID` (výraz, ID odpovědi, porovnání škály, `RANDOM`, `DEFAULT`), `Variation ID`, které v `N_Content` téže kapitoly neexistuje, nebo které patří jiné postavě či skupině
7. **Škály a zdroje** (`Scales`, `Resources`, §4.2): `Min` větší než `Max`, defaultní hodnota mimo rozsah `Min`–`Max`, postava neuvedená v registru `Characters`, duplicitní řádek postava × škála / zdroj, `Household` v `Characters`, které neodpovídá ID domácnosti dvou postav se stejnou hodnotou, řádek v `Resources` s ID domácnosti, která není ve sloupci `Household`, výchozí domácnost bez řádku v `Resources`
8. **ID otázek a ankety** (§4.2, §6.6): `poll` bez vyplněného ID, `poll-answer` odkazující na neexistující anketu, `poll`, ve které v téže kapitole nikdo nehlasuje (bez hlasů by vyhrál první řádek a jeho efekty by se aplikovaly), duplicitní ID otázky (ručně zadané i automaticky doplněné), řádek odpovědi u `bool` otázky s textem jiným než `Ano` / `Ne`
9. **Šablony** (§10.2): soubor, jehož název neodpovídá žádné dvojici postava / skupina × kapitola, a postava nebo skupina, které chybí šablona v některé tištěné kapitole, tj. od kapitoly 2 (seznam skupin se bere z listu `Groups`)
10. **Efekty** (`Effects`, §4.4): neznámý efekt, špatný počet argumentů, argument, který není ID postavy z registru `Characters`, oba argumenty téže postavy

---

## 12. Vizualizace [NICE TO HAVE]

- Životní stromy každé z postav. Které cesty jsou možné, které už ne.

---

## 13. Nefunkční požadavky

| Požadavek             | Detail                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Nasazení**          | Cloud s normální adresou (§18.1). Bez Dockeru, bez tajných klíčů.                                                                                  |
| **Síťové závislosti** | V1 žádné mimo aplikaci samotnou (§10.1). Záložním režimem při výpadku je papír.                                                                    |
| **Izolace běhů**      | 2 běhy současně. `run_id` v každé tabulce, datová vrstva ho vyžaduje povinně, barevné odlišení v UI (§3.3).                                        |
| **Škála**             | 23 postav a 7 skupin na běh × 3 kapitoly. Přepočet celého běhu do jedné sekundy. Objem dat je malý — optimalizovat na srozumitelnost, ne na výkon. |
| **Perzistence**       | Postgres (§18.1). Plný export dat do souborů.                                                                                                      |
| **Audit log**         | Append-only. Kdy, co se změnilo, jaká byla hodnota před a po, které pravidlo to způsobilo.                                                         |
| **Jazyk UI a dat**    | Čeština, včetně diakritiky v ID a exportech.                                                                                                       |
| **Autentizace**       | Jedno sdílené heslo + nepovinné pole „Kdo jsi?" pro audit (§3.1).                                                                                  |

---

## 14. Rozsah MVP

**V1 (musí být do prvního běhu):**

1. Import konfigurace z nahraného `.xlsx` + validace
2. Nahrání šablon jako Markdown souborů
3. Rozvržení aplikace a zadávání odpovědí (§6.4)
4. Engine: podmínky, efekty, priority variant, váhy
5. Trace „proč" u každé změny
6. JSON mezivýstup → editace →`.md` a `.pdf` dokumenty

---

## 15. Doporučený stack [ROZHODNUTO]

| Vrstva             | Volba                                | Proč                                                                                                                                                                 |
| ------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**      | **Next.js** (App Router, TypeScript) | React, který vývojář zná, plus server v jednom procesu. Jeden příkaz na spuštění, žádné oddělené backendové repo.                                                    |
| **Databáze**       | **Postgres** (Neon)                  | §18.1. **Přístup k datům drž za tenkou vrstvou**, aby se dal poskytovatel vyměnit bez přepisování aplikace.                                                          |
| **Přístup k DB**   | **Drizzle ORM** nebo prosté SQL      | Malé schéma, není potřeba nic těžkého.                                                                                                                               |
| **Import tabulky** | **SheetJS (`xlsx`)**                 | Čte všechny listy `.xlsx` bez konfigurace.                                                                                                                           |
| **Google API**     | **V1 se nepoužívá** (§10.1)          | Fáze 2. Až na to dojde: `googleapis` + service account.                                                                                                              |
| **Zip**            | `jszip` nebo `archiver`              | Sbalení výstupních `.md` a `.xlsx` do jednoho archivu.                                                                                                               |
| **UI**             | **MUI (Material UI)**                | Hotové komponenty pro rozvržení z §6.4: `AppBar`, `Tabs`, `Drawer`, `List`, formulářová pole. `DataGrid` pro tabulku v sekci Výstupy. Šetří čas, který patří enginu. |
| **Testy**          | **Vitest** — jen na engine pravidel  | Zbytek se testuje ručně, engine ne. Viz níže.                                                                                                                        |

**Architektonické pravidlo (nejdůležitější v tomhle dokumentu):**
Engine pravidel (§7) je **čistá funkce v TypeScriptu**, bez databáze, bez sítě, bez Reactu:

```
evaluate(stav, odpovědi, pravidla) → { novýStav, trace[] }
```

Díky tomu jde otestovat na desítkách scénářů bez rozjetí aplikace a `trace[]` je rovnou podklad pro vysvětlení „proč" (§7.5). Kdyby engine sahal do databáze, ztratíš obojí.

**Podmínky pravidel — nepiš parser.** Začni **strukturovanými sloupci** v tabulce (`subjekt | operátor | hodnota | spojka | skupina`), ne textovými výrazy typu `S_X > 5 AND flag_Y`. Vyhneš se psaní vlastního jazyka. Pokud se to autorovi ukáže jako neúnosně kostrbaté, teprve pak přidej malou knihovnu na výrazy (`expr-eval`). Vlastní parser nepiš nikdy.

**Nasazení:** propojené GitHub repo, `git push` = nasazeno (§18.1). Lokálně `npm run dev`.

### 15.1 MUI — na co si dát pozor [ROZHODNUTO]

**Nastavení v Next.js App Routeru.** MUI potřebuje `AppRouterCacheProvider` z balíčku `@mui/material-nextjs`, jinak při načtení stránky problikne nestylovaný obsah. Komponenty MUI používají React Context, takže patří do `'use client'` stromu — server komponenty nechej na načítání dat.

**Vlastní téma, ne výchozí Material.** Výchozí vzhled MUI je rozpoznatelný Material Design a neodpovídá tomu, co chceme (§6.4: hustá sazba, lehká retro paleta). Proto hned na začátku vytvoř `theme.ts` přes `createTheme`:

- `palette` — tlumené, mírně vybledlé odstíny místo výchozí modré. Sem patří i barvy běhů A a B (§3.3).
- `typography` — menší základní velikost písma, než má MUI ve výchozím stavu.
- `components` — globální `defaultProps: { size: 'small', margin: 'dense' }` pro pole a tlačítka. Bez toho bude aplikace o třetinu rozvolněnější, než potřebujeme.
- `colorSchemes` pro světlý a tmavý režim.

**Uprav téma, ne jednotlivé komponenty.** První volba je vždy `theme.ts` — `palette`, `typography` a hlavně `components` s `defaultProps` a `styleOverrides`. Když mají všechna tlačítka vypadat jinak, změní se téma, ne tlačítka. Aplikace zůstane jednotná a změna vzhledu je záležitost jednoho souboru.

#### Pravidla stylování [ROZHODNUTO]

Nejsou to preference vzhledu, ale **výkonnostní požadavky**. `sx`, `styled()` s dynamickými props i inline `style` alokují nové objekty a spouštějí přepočet stylů při každém renderu. Ve stromech, které se překreslují často a po položkách — seznamy, karty, grafy, tooltipy, menu — se to sčítá do viditelného sekání na starším železe.

- **Jen CSS Modules** — jeden `.module.css` na komponentu, vedle ní v jejím adresáři.
- **Žádný `sx` prop** — zakázaný všude, i na komponentách MUI.
- **Žádný `styled()` s dynamickými props** — žádné generování stylů za běhu v render cestě.
- **Žádné inline `style` objekty v JSX.** Jediná výjimka je geometrie virtualizace (`transform`, `height`, `top`, `left`, `width` na absolutně pozicovaných řádcích) — to jsou hodnoty známé až za běhu, které do CSS Modules nepatří.
- **Stavové styly přes data atributy**, ne přes podmíněné pole tříd:

  ```tsx
  <div
    data-selected={isSelected}
    data-compact={isCompact}
    data-cancelled={isCancelled}
    data-filtered-out={isFilteredOut}
  >
  ```

  CSS cílí `[data-selected="true"]`. Čisté a bez režie v JS.

Pravidla uplatňuj **globálně, ne jen v kritických místech.** Určovat u každé komponenty, jestli ještě leží v horké cestě, je víc práce než psát všechno stejně — a hranice se v průběhu vývoje stejně posouvá.

**`DataGrid` jen v sekci Výstupy.** Je to velká komponenta; jinde stačí obyčejná `Table` nebo `List`. Zadávání odpovědí přes `DataGrid` nedělej — rozvržení z §6.4 je záměrně formulářové, ne mřížkové.

**Indikátory vyplněnosti barvou i tvarem** (§6.4). MUI ikony to umožňují — `RadioButtonUnchecked`, `Adjust`, `CheckCircle` se liší tvarem, ne jen barvou.

### 15.2 Harmonogram

| Týdny | Cíl                                                                                   |
| ----- | ------------------------------------------------------------------------------------- |
| —     | ~~Test round-tripu (§8.5)~~ — **hotovo, prošlo.** Návrh výstupní vrstvy je potvrzený. |
| 1–2   | Datové schéma + import tabulky + validace importu                                     |
| 3–5   | Engine pravidel jako čistá funkce + testy. **Nejrizikovější část, dělej ji brzy.**    |
| 6     | Navigace po postavách a kapitolách (postava i kapitola v cestě URL) + **jádro přepočtu bez UI**: načíst stav a odpovědi, `evaluate`, v jedné transakci uložit přepočet, snapshot a vybrané varianty |
| 7–8   | Zadávání odpovědí **kompletně pro kapitoly 1–3** (§6.4): podmíněné otázky, `{input}` pole, ankety, vyplněnost, stav postavy pod dotazníkem |
| 9     | Sekce Přepočet: trace „proč", konflikty, náhled změn + JSON mezivýstup + editace     |
| 10    | Naplňování dokumentů — mazání bloků v Markdownu lokálně, bez Googlu                   |
| 11    | Zip výstupu, „Kopírovat do schránky", kontroly konzistence                            |
| 12    | Rezerva, zkušební průchod celou kapitolou na reálných datech                          |

**Proč je jádro přepočtu před dotazníkem** (změna proti původnímu pořadí „zadávání odpovědí → trace"): dotazník kapitoly 2 a 3 je lookup ve vybraných variantách a stav pod ním je snapshot — obojí vzniká až přepočtem předchozí kapitoly (§4.3, §4.5). Bez uloženého přepočtu by šel dotazník napsat jen pro kapitolu 1 a pak přepisovat. Rozvržení aplikace (hlavička, běhy, sekce, levý panel) už stojí. Obrazovka Přepočtu naopak zůstává až za dotazníkem: konflikty (`unresolved_value`, rozdělení, které nesedí) se řeší dopsáním hodnot v dotazníku a trace se má ladit nad odpověďmi zadanými v aplikaci, ne nad seedem.

## 16. Zodpovězeno

| #   | Otázka                    | Odpověď                                                                                                                  |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Kdo zadává odpovědi?      | Vždy orgové. Jediná role, žádné hráčské účty.                                                                            |
| 2   | Vztah ke Google Workspace | **V1 žádný.** Komunikace přes soubory: `.xlsx` dovnitř, `.md` ven. Napojení až fáze 2 (§10.1).                           |
| 3   | Offline provoz            | Vyřešeno tím, že v1 nemá síťové závislosti. Při výpadku se píše na papír.                                                |
| 4   | Rozsah                    | 23 postav, 7 skupin, ~3 otázky na postavu a kapitolu.                                                                    |
| 5   | Výchozí hodnoty odpovědí  | Neexistují, vše se zadává ručně.                                                                                         |
| 6   | Škály                     | Celá čísla, `Min` / `Max` pro každou škálu každé postavy v listu `Scales` (typicky 1–10), clamp.                         |
| 7   | Otázky                    | Každá postava má vlastní otázky, žádná sdílená sada.                                                                     |
| 8   | Počáteční stav postav     | Registr v `Characters`, defaultní hodnoty škál a zdrojů v `Scales` + `Resources`. Nic dalšího se o postavách nemodeluje. |
| 11  | PDF                       | Negeneruje se, tisk je v Google Docs.                                                                                    |
| 12  | Značky v šabloně          | Párové `{BLOK <ID>}`…`{/BLOK}` a `{PROMENNA}`. Nevybrané bloky se **mažou**, nic se nevkládá.                            |
| 14  | Round-trip přes Markdown  | **Otestováno, formátování se zachovalo.** Postup §8.3 platí.                                                             |
| 13  | Google disk               | **Sdílený disk (Shared Drive)** → ve fázi 2 autentizace přes service account, žádný OAuth.                               |
| 15  | Nasazení                  | Server od začátku (cloud, §18.1), aby bylo kam ve fázi 2 přidat Google. Varianta bez serveru zamítnuta.                  |
| 16  | Přihlášení a běhy         | Sdílené heslo + pole „Kdo jsi?". Běh = `2026-09-12_A`, viz §3.1–3.3.                                                     |
| 17  | Uzamykání kapitol         | **Nikdy nevratné.** Měkká pojistka s odůvodněním, následující kapitoly se značí jako dotčené (§3.2).                     |

## 17. [OTEVŘENÉ] Zbývá doplnit

---

## 18. Nasazení a provoz

Protože v1 nemá žádnou síťovou závislost ani tajné klíče (§10.1), nasazení se výrazně zjednodušuje.

### 18.1 Model A: cloud (doporučeno)

**Aplikace běží na běžném hostingu, orgové ji otevřou na normální adrese.** Žádné IP adresy, žádný terminál, žádné „musíš být na naší wifi". To je zásadní pro to, aby ji ostatní organizátoři vůbec chtěli používat.

| Vrstva   | Volba                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Hosting  | **Vercel** — od tvůrců Next.js, nasazení propojením GitHub repa, `git push` = nasazeno. Nejblíž tomu, co znáš z GitHub Pages. |
| Databáze | **Neon (Postgres)** — Vercel ho připojí na pár kliknutí, má free tier.                                                        |

**Proč ne SQLite ve Vercelu:** nemá trvalý disk, každé nasazení začíná s prázdným souborovým systémem. _(Alternativa se SQLite: **Fly.io** nebo **Railway** s připojeným diskem — levnější provoz, víc konfigurace.)_

**Přístup:** aplikace je na veřejném internetu, takže **jedno sdílené heslo je povinné**, ne volitelné.

**Když vypadne signál:** orgové zapíšou odpovědi na papír a zadají je později. Žádná synchronizace se nepíše. Pauzy mezi kapitolami trvají hodiny, hodinový výpadek se v nich ztratí — a dokumenty se stejně tisknou z Google Docs, což bez signálu taky nejde.

### 18.2 Varianta bez serveru — zamítnuta [ROZHODNUTO]

Zvažována a **zamítnuta**, i když v1 nemá tajné klíče a technicky by na GitHub Pages běžela.

Důvody:

1. **Server je od začátku, aby bylo kam ve fázi 2 přidat Google** (§10.6). Přidat `googleapis` do existující serverové aplikace je práce na odpoledne; předělat statickou aplikaci na serverovou je přepis.
2. **Dva souběžné běhy a víc orgů** potřebují jedno sdílené místo pro data. Stav v souboru, který si někdo stáhne a příště nahraje, by se při dvou bězích a více lidech nevyhnutelně rozešel.
3. **Data v prohlížeči jednoho člověka nejsou archiv** (§2, bod 2).

### 18.5 Zálohování [ROZHODNUTO]

**Tlačítko „Zazálohovat":**

1. Vytvoří konzistentní snapshot databáze (`pg_dump`, případně vlastní export všech tabulek běhu do JSON).
2. Nabídne ho ke stažení. Org ho odloží na Sdílený disk nebo flashku.

**Zálohovat po každé vydané kapitole.** Poslední snapshot spolu s `beh.json` a exportem konfigurace je kompletní archiv běhu (§2, bod 2).

### 18.6 Databázový soubor nepatří na Google Drive [ROZHODNUTO]

Netýká se zvoleného řešení (Postgres v cloudu), ale platí, kdyby kdokoli později sáhl po SQLite: **nechat `.db` soubor ve složce synchronizované Google Drivem, Dropboxem nebo OneDrivem vede ke ztrátě dat.** Sync klient nepodporuje zamykání částí souboru, neumí sloučit binární konflikt a dokáže nahrát rozepsaný stav uprostřed transakce.

Na Drive patří **snapshoty** (§18.5), ne živá databáze.

### 18.7 Verzování a archiv

- Kód v gitu.
- Pro každý běh se uloží: snapshot databáze, `beh.json`, importovaná konfigurace a výstupní zipy jednotlivých kapitol.
