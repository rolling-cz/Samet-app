# Session 3 — doplněk: podmínky otázek přes `Variation ID`

_Navazuje na `zadani-session-3-engine.md`, které je už zpracované. Mění se jedna věc: jak se rozhoduje, že se otázka položí. Zdrojem pravdy zůstávají `zadani-larp-engine.md` (§4.3, §4.5, §8.2, §11) a `CLAUDE.md`._

## Co se mění

Dosud stálo ve sloupci `Condition` v `N_Questions` totéž co v `Conditions` v `N_Content` — výraz s odpověďmi, škálami a `RANDOM`. **Nově tam je jediné `Variation ID`.**

Výrazy se vyhodnocují **jen v `N_Content`**. Tam se rozhodne, která varianta bloku vyhrála, a otázka se pak odkáže na vítěze.

| Sloupec                       | Obsah                                  |
| ----------------------------- | -------------------------------------- |
| `Conditions` v `N_Content`    | výraz (§4.5) — beze změny              |
| `Condition` v `N_Questions`   | **jediné `Variation ID`**, nebo prázdné |

- Jen holé ID. Žádné `AND`, `OR`, `!`, závorky, porovnání, `RANDOM` ani `DEFAULT`.
- Prázdná buňka = otázka se položí vždy.
- Varianta musí patřit **téže postavě** a existovat v `N_Content` **téže kapitoly**: `2_Content` rozhoduje o `2_Questions`.
- Kapitola 1 podmínky nemá, `1_Content` neexistuje.

Tím mizí i cykličnost, která tu dosud byla. Varianty se vybírají při přepočtu **předchozí** kapitoly, takže jsou známé dřív, než se dotazník otevře. Dosavadní věta „podmínky otázek se vyhodnocují společně s bloky nad hotovým stavem“ už neplatí — podmínka otázky se nevyhodnocuje, jen se hledá ID v uložené množině.

## Bloky, které rozhodují o otázce

Autor smí založit blok jen proto, aby jeho výsledek řídil otázku. Takový blok má varianty s **prázdným `Variation Text`** a **nemá značku v šabloně**. Konvence pojmenování je `B_<Postava>_<Kapitola>_Questions_<N>`, ale rozhoduje odkaz z `Condition`, ne název.

**Blok vrací právě jednu variantu.** Na jeho variantách může viset víc otázek jen tehdy, když se navzájem vylučují. Nezávislé otázky potřebují každá svůj blok — v `fixture-platny.xlsx` má proto Marie tři bloky `B_Marie_1_Questions_1` až `_3`.

**Důsledek pro kontrolu osiřelých bloků** (§11, kontrola 6): blok je osiřelý, jen když na něj nevede značka v šabloně, značka z `Variation Text` jiného bloku **ani odkaz ze sloupce `Condition`**.

## Co to znamená pro engine

- **Vybrané varianty jsou součástí stavu** (§4.3), ne jen meziproduktem generování dokumentů. `evaluate` je vrací jako **množinu `Variation ID` per vlastník** (postava nebo skupina) a volající je ukládá spolu se snapshotem.
- Sestavení dotazníku kapitoly N je pak **lookup**, ne vyhodnocení: otázka se položí, když je její `Variation ID` ve výběru téže postavy pro kapitolu N (nebo když je `Condition` prázdná).
- Vyhodnocování výrazů (`jsep`) se tím nemění, jen se používá **jen na `N_Content`**.
- Pořadí fází (§7.3) se nemění.

## Co ubývá ze zadání session 3

- Bod v seznamu podporovaných prvků, že `RANDOM` nesmí v podmínce otázky — nově je to jen speciální případ pravidla „musí to být `Variation ID`“.
- Věta v sekci o výběru variant, že se podmínky otázek vyhodnocují společně s bloky nad hotovým stavem.

## Validace importu

`Condition` v `N_Questions` je chyba, když:

1. není to jediné `Variation ID` (výraz, ID odpovědi, porovnání škály, `RANDOM`, `DEFAULT`),
2. `Variation ID` v `N_Content` téže kapitoly neexistuje,
3. `Variation ID` patří jiné postavě nebo skupině.

## Testy navíc

Ke scénářům z původního zadání přibývají:

1. Otázka s prázdnou `Condition` se položí vždy.
2. Otázka se položí, právě když je její `Variation ID` mezi vybranými variantami téže postavy a kapitoly.
3. Dvě otázky navázané na dvě varianty **téhož** bloku se nikdy nepoloží obě.
4. Změna odpovědi v kapitole 1, která překlopí variantu `Questions` bloku, změní sadu otázek v kapitole 2.
5. Blok bez značky v šabloně, na který vede odkaz z `Condition`, **není** hlášen jako osiřelý; blok bez značky i bez odkazu hlášen je.
6. Import odmítne všechny tři třídy vadné `Condition` z `fixture-vadny.xlsx`.

## Fixtures

Oba soubory jsou upravené.

**`fixture-platny.xlsx`**

- `2_Content`: Marie má `B_Marie_1_Questions_1` až `_3`, Antonín `B_Antonin_1_Questions_1`. Výrazy, které dřív stály v `2_Questions`, se přesunuly sem.
- `3_Content`: přibyl `B_Antonin_2_Questions_1`.
- `2_Questions` a `3_Questions`: `Condition` je `Variation ID`, nebo prázdná. `DEFAULT` u Antonínovy otázky o skladu se změnil na prázdnou buňku.
- Bloky `…_Questions_…` mají prázdný `Variation Text` a **nemají značku v šabloně** — šablony proto není potřeba měnit.

**`fixture-vadny.xlsx`** — v `2_Questions` je šest vadných podmínek, po dvou od každé třídy:

| Podmínka                                       | Chyba                                  |
| ---------------------------------------------- | -------------------------------------- |
| `S_Marie_Regime >= 5 AND (…)`                  | výraz místo `Variation ID`             |
| `A_Marie_1_3_Ano`                              | ID odpovědi místo `Variation ID`       |
| `DEFAULT`                                      | v podmínce otázky nemá smysl           |
| `RANDOM(50)`                                   | `RANDOM` smí jen v `N_Content`         |
| `V_Marie_1_Questions_9_A`                      | varianta neexistuje                    |
| `V_Marie_1_Questions_1_A` u Antonínovy otázky  | varianta patří jiné postavě            |

Platné podmínky jsou tam taky (`V_Antonin_1_Questions_1_A` ve 2. a 3. kapitole), aby bylo vidět, že se hlásí jen to vadné.
