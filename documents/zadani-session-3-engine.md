# Session 3: Engine pravidel

*Kompletní specifikace je v `zadani-larp-engine.md`. Ten je zdrojem pravdy.*

## Kde jsme

Schéma stojí, import `.xlsx` funguje, validace hlásí chyby, běh jde založit a přepnout. V databázi je konfigurace: postavy, škály, otázky s odpověďmi, bloky s variantami, šablony.

Chybí to hlavní — **něco, co z odpovědí spočítá nový stav.**

## Co se staví teď

**Engine. Nejrizikovější část celého projektu.** Na ní stojí všechno ostatní a nejde ji odbýt ani vypustit. Proto přichází brzy, dokud je čas ji předělat.

**Žádné UI v téhle session.** Engine se testuje testy, ne klikáním.

## Tvar, který nesmí ustoupit

```ts
evaluate(stav, odpovědi, konfigurace) → { novýStav, trace[], konflikty[] }
```

- **Čistá funkce.** Bez databáze, bez sítě, bez Reactu, bez `async`. Nic z `app/` se sem neimportuje.
- Žije ve vlastním adresáři, například `src/engine/`.
- Stejný vstup dá vždy stejný výstup. Hody kostkou přicházejí **jako součást vstupu**, engine je negeneruje (§7.4).
- `trace[]` není doplněk. Je to **hlavní výstup vedle nového stavu** a podklad pro vysvětlení „proč" v UI.

Volající kód načte data z databáze, zavolá `evaluate` a výsledek uloží. Engine o databázi neví.

## Co engine dělá

### 1. Vyhodnocování výrazů

Podmínky jsou výrazy v jedné buňce (§4.5), například:

```
A_Marie_2_1_Mirek AND S_Marie_Wealth_spolecny >= 7
!A_Marie_2_1_Mirek AND RANDOM(50)
DEFAULT
```

- **Parser nepiš.** Použij `jsep` nebo `expr-eval` a napiš vlastní vyhodnocení nad jejich stromem.
- Podporované prvky: odpovědi (`A_...`), škály se srovnáním (`S_... >= 7`), příznaky (`F_...`), `AND`, `OR`, `!`, závorky, `RANDOM(n)`, `DEFAULT`.
- Neznámý identifikátor je **chyba, ne nepravda**. Tiché vyhodnocení překlepu na `false` je nejhorší možné chování — dlouho to vypadá, že všechno funguje.

### 2. Fáze přepočtu (§7.3)

Pořadí je fixní a nesmí záviset na pořadí řádků v tabulce:

1. Sběr odpovědí
2. Vyloučení (negace)
3. **Strukturální efekty** — vznik a zánik domácností, sňatky, členství a vedení skupin
4. **Hodnotové efekty** — nejdřív absolutní nastavení z organizátorských otázek, pak posuny škál a příznaky
5. Vyhodnocení pásem
6. Detekce zbylých konfliktů

**Fáze 3 celá před fází 4.** Sdílená škála musí vědět, kdo do domácnosti patří, dřív než se do ní začnou sčítat příspěvky.

### 3. Domácnosti a sdílené škály (§4.4)

- Vlastníkem hodnoty je postava, **nebo domácnost** — podle rozsahu škály.
- Svobodná postava je domácnost o jednom členovi. **Žádná zvláštní větev v kódu.**
- Efekty členů na domácnostní škálu se **sčítají**, pokud pravidlo nenese příznak „jednou za domácnost".
- Sňatek cílí na **dvojici**: druhý člen se bere z odpovědi odkazující na ID postavy.

### 4. Výběr variant bloků (§8.2)

- Varianty se procházejí **vzestupně podle `Priority`**, použije se **první, jejíž podmínka platí**.
- `DEFAULT` je vždy pravdivá, takže stojí poslední a zaručuje výsledek.
- Prázdný `Variation Text` je platná varianta — znamená „nic se nestalo".
- Mezi variantami **nevznikají konflikty**. Priorita rozhoduje úplně.

### 5. Ořezávání škál

Hodnoty jsou celá čísla 1–10. Překročení se ořízne na hranici **a zapíše do trace** — je to signál špatně nastavených vah, ne detail k zamlčení.

### 6. Náhoda (§7.4)

`RANDOM(50)` znamená padesátiprocentní pravděpodobnost.

- Hod se provede **jednou** a uloží ke konkrétní postavě, kapitole a variantě.
- **Přepočet hod neopakuje**, použije uloženou hodnotu.
- Engine sám nic negeneruje. Dostane uložené hody na vstupu a vrátí seznam hodů, které potřebuje a ještě nemá.

## Trace

U každé změny musí jít odpovědět „proč", aniž by se kdokoli díval do kódu (§7.5, §2).

Záznam obsahuje: co se změnilo, z jaké hodnoty na jakou, které pravidlo nebo odpověď to způsobily, a **u sdílených škál od koho změna přišla**.

Cílová podoba v UI:

> −3 Wealth_spolecny, zdroj: odpověď Mirka Pokorného na Q_Mirek_2_1

Trace piš jako strukturovaná data, ne jako hotové věty. Formulace patří do UI.

## Konflikty

Dvě pravidla se stejnou prioritou a protichůdným efektem engine **neřeší sám**. Vrátí je v `konflikty[]` a rozhodne org.

Vyloučení (negace) má vždy přednost před přiřazením.

## Testy

**Tohle je ta část projektu, která se testuje.** Zbytek se odklikává ručně.

Použij `fixture-platny.xlsx` — pět postav, dvě kapitoly, sňatek, osobní i společný účet, `RANDOM`, příznak přenesený z kapitoly 1 do kapitoly 2.

Scénáře, které musí být pokryté:

1. Odpověď posune škálu, výsledek sedí
2. Absolutní nastavení z organizátorské otázky se aplikuje před posuny
3. Sňatek vytvoří domácnost, sdílená škála má jednoho vlastníka
4. Příspěvky obou manželů na sdílenou škálu se sčítají
5. Příznak z kapitoly 1 podmiňuje variantu v kapitole 2
6. Výběr varianty podle priority, `DEFAULT` zabere, když neprojde nic
7. Ořezání na hranici škály se zapíše do trace
8. Stejný vstup dvakrát dá bit po bitu stejný výstup
9. Uložený hod se při přepočtu nemění
10. Konflikt dvou pravidel se stejnou prioritou se vrátí, nezmizí

## Na co si dát pozor

- **Nepouštěj engine na databázi.** Ve chvíli, kdy potřebuje `await`, je návrh špatně.
- **Neopravuj vadná data v enginu.** Chybějící odpověď, neznámý identifikátor, blok bez `DEFAULT` — to jsou chyby, které patří do validace při importu (session 2). Engine na ně spadne nahlas.
- **Nezaokrouhluj a neodhaduj.** Kde není jasné, co se má stát, vrať konflikt.
- Trace musí vzniknout **i pro změny, které se vzájemně vyruší**. „Nic se nezměnilo" je taky odpověď, kterou org může potřebovat vysvětlit.

## Na konci

Pusť engine na `fixture-platny.xlsx` a ukaž **plný výstup pro Marii v kapitole 2** — nový stav, trace, vybrané varianty. Napiš, kde ti zadání nestačilo a co sis musel domyslet.
