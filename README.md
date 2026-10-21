# NumberLink 🧩

Moderná implementácia logickej hry **NumberLink** (v digitálnom svete známa aj ako *Flow Free* alebo v Japonsku *Arukone*) s **automatickým procedurálnym generovaním herného poľa**.

Vytvorené v čistom HTML5, CSS3 a modernom JavaScripte (ES6+) bez akýchkoľvek externých knižníc.

---

## 🎮 Ako spustiť hru

Hru môžete spustiť niekoľkými jednoduchými spôsobmi:

### Možnosť 1: Dvojklikom na spúšťač (Windows)
- Spustite súbor **`start.bat`**. Automaticky spustí lokálny server a otvorí hru vo vašom predvolenom prehliadači.

### Možnosť 2: Cez Python
V termináli / príkazovom riadku v priečinku projektu zadajte:
```bash
python server.py
```
alebo:
```bash
python -m http.server 8000
```
a otvorte v prehliadači adresu [http://localhost:8000](http://localhost:8000).

### Možnosť 3: Priame otvorenie
Dvakrát kliknite na súbor **`index.html`** a otvorte ho v ľubovoľnom modernom prehliadači (Chrome, Edge, Firefox, Safari).

---

## 📜 Pravidlá hry

1. **Spojte rovnaké čísla:** Každá dvojica zhodných čísel (alebo farieb) musí byť spojená súvislou neprerušovanou čiarou.
2. **Čiary sa nesmú krížiť:** Žiadne dve čiary nesmú zdieľať to isté políčko mriežky.
3. **Pohyb len ortogonálne:** Čiary sa môžu pohybovať iba vodorovne a zvisle (nie diagonálne).
4. **100% Pokrytie plochy (Flow pravidlo):** Pre dokonalé víťazstvo s 3 hviezdičkami musia čiary vyplniť každé jedno políčko celej mriežky!

---

## 🧠 Algoritmus generovania herného poľa

Hra využíva pokročilý procedurálny generátor založený na teórii grafov:

1. **Lovászov Backbite algoritmus (Randomized Hamiltonian Walk):**
   - Inicializuje sa serpentínová cesta prechádzajúca všetkými políčkami mriežky $W \times H$.
   - Aplikujú sa tisíce stochastických lokálnych transformácií (tzv. *backbite moves*), ktoré uniformne náhodne permutujú Hamiltonovskú cestu na mriežkovom grafe.
2. **Vyvážená dekompozícia cesty:**
   - Výsledná náhodná Hamiltonovská cesta sa rozdelí na $K$ podciest podľa požadovaného počtu dvojíc čísel.
   - Algoritmus zabezpečuje minimálnu dĺžku ciest, dostatočnú vzdialenosť koncových bodov (Manhattan distance $\ge 2$) a optimálne vyváženie dĺžok jednotlivých potrubí.
3. **Garantovaná 100% riešiteľnosť:**
   - Každé vygenerované pole má matematicky zaručené aspoň jedno platné riešenie s plným 100% pokrytím mriežky.
   - Presné riešenie je uložené v pamäti a slúži pre okamžitú **Nápovedu** alebo funkciu **Vyriešiť**.

---

## ✨ Kľúčové funkcie

- **6 prednastavených úrovní obtiažnosti:**
  - 5x5 Začiatočník (4 páry)
  - 6x6 Ľahká (5 párov)
  - 7x7 Stredná (6 párov)
  - 8x8 Pokročilá (7 párov)
  - 9x9 Expert (8 párov)
  - 10x10 Majster (9 párov)
- **Vlastné herné pole (Custom Generator):**
  - Nastavenie rozmerov od 4x4 až po 12x12
  - Voľba počtu dvojíc (od 2 do 12)
  - Zadanie vlastného seedu na opakovanie alebo zdieľanie konkrétneho hlavolamu
- **Viacero režimov vizualizácie:**
  - *Čísla a Farby* (farebné krúžky s číslami 1, 2, 3...)
  - *Klasické čísla* (tradičný čiernobiely štýl japonských Nikoli hlavolamov)
  - *Iba farby* (minimalistický štýl Flow Free)
  - *Písmená* (A, B, C, D...)
  - *Symboly* (★, ▲, ●, ■, ◆...)
- **Intuitívne ovládanie a kreslenie:**
  - Plná podpora myši, dotykového displeja (mobil, tablet) aj klávesnice
  - Inteligentné cúvanie: potiahnutím späť po vlastnej čiare sa čiara skracuje
  - Automatické odstrihnutie: nakreslením cez cudziu čiaru sa kolízna čiara odstrihne
  - Zdvihnutie čiary: kliknutím na existujúcu čiaru je možné pokračovať v jej kreslení
- **Procedurálny syntetizátor zvukov (Web Audio API):**
  - Všetky zvukové efekty (kliknutia, pentatonické akordy pri spojení, fanfára víťazstva) sú generované v reálnom čase bez nutnosti sťahovania audio súborov
  - Tlačidlo na stíšenie zvukov s ukladaním preferencie
- **Pomocné nástroje:**
  - *Späť (Undo)* – história ťahov (<kbd>Ctrl+Z</kbd>)
  - *Vyčistiť (Reset)* – zmazanie nakreslených ciest (<kbd>R</kbd>)
  - *Nápoveda (Hint)* – odhalenie jedného správneho prepojenia (<kbd>H</kbd>)
  - *Vyriešiť (Solve)* – okamžité zobrazenie kompletného riešenia
  - *Zdieľať seed* – kliknutím na odznak `#seed` v záhlaví môžete skopírovať alebo nahrať kód ľubovoľnej úrovne
- **Moderný dizajn:**
  - Tmavý (Dark) a Svetlý (Light) motív
  - Čistý responzívny dizajn s efektom skla (Glassmorphism)
  - Oslavné konfety s fyzikálnou simuláciou po úspešnom vyriešení
  - Štatistiky času, počtu ťahov a percenta pokrytia plochy

---

## 📁 Štruktúra projektu

| Súbor | Účel |
|---|---|
| `index.html` | Hlavná sémantická štruktúra hry, HUD a dialógové okná |
| `style.css` | Štýly, témy, animácie a responzívny layout |
| `generator.js` | Procedurálny generátor hlavolamov (Lovász Backbite algoritmus) |
| `renderer.js` | High-DPI Canvas vykresľovač čiar, kruhov a konfiet |
| `game.js` | Jadro hernej logiky, spracovanie dotyku/myši, undo a stav |
| `audio.js` | Zvukový syntetizátor využívajúci Web Audio API oscilátory |
| `server.py` | Ľahký lokálny webový server v Pythone |
| `start.bat` | Windows dávkový súbor pre 1-klikové spustenie |

---

*Prajeme príjemnú zábavu a bystré logické myslenie!* 🧩✨
