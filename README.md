# Pokédex

Een Pokédex-website met data van [PokéAPI](https://pokeapi.co), gebouwd met Next.js (App Router), TypeScript en Tailwind CSS.

## Functies

- **Infinite scroll:** 20 Pokémon bij het openen, 30 erbij per scroll.
- **Zoeken, filteren, sorteren:** zoeken op naam of nummer (`25` of `#25`), filteren op type, regio (generatie) en favorieten, sorteren op nummer, naam en op elke basisstatistiek (en het totaal), en filteren op legendarisch, mythisch of baby. Bij sorteren op een stat staat die waarde op de kaartjes. De filterbalk blijft bovenaan staan tijdens het scrollen en de keuzes staan in de URL.
- **Kaarten** kantelen naar de muis; een klik laat de kaart uitgroeien tot een detailvenster.
- **Details:** lengte, man/vrouw-percentage, abilities met uitleg, statistieken, de Pokédex-beschrijving, sterktes en zwaktes per type: offensief (Super effective, Not very effective, No effect) en defensief (Vulnerable, Resistant, Immune), telkens met de vermenigvuldiger in de badge, klikbare evolutielijn (ook vertakkingen), alternatieve vormen (Mega, regionaal, Gigantamax, …) en moves per spel (level-up, tutor, TM), elk uit te klappen voor de beschrijving, kans op effect, prioriteit en doelwit.
- **Meer in het detailvenster:** de soort ("Mouse Pokémon"), gewicht, een knop die de kreet afspeelt, en bij de gekozen game het pixel-sprite van die game (klik om het groot te zien).
- **Team** (`/team`): kies zes Pokémon en zie waar het team als geheel zwak tegen is, welke types niemand sterk raakt, en per type wie zwak of resistent is.
- **Vergelijken** (`/compare?compare=25,6`): twee Pokémon naast elkaar met stats, het onderlinge sterk/zwak en beschermd/kwetsbaar, abilities en matchups, per game. De keuze staat in de URL.
- **Typetabel** (`/types`): de volledige tabel van aanvallend tegen verdedigend type, per generatie (`?gen=1`).
- **Favorieten** per Pokémon of vorm, bewaard in de browser.
- **Talen:** Nederlands, Engels, Duits en Frans. PokéAPI heeft geen Nederlandse Pokémonnamen of -uitleg; die vallen terug op Engels.
- **Light/dark mode**, die het systeem volgt tot je zelf kiest.
- Toegankelijk met het toetsenbord, `prefers-reduced-motion` wordt gerespecteerd.

## Starten

Vereist Node.js 20.19 of hoger.

```bash
npm install
npm run dev      # http://localhost:3000
```

| Script                | Doel                                   |
| --------------------- | -------------------------------------- |
| `npm run dev`         | ontwikkelserver                        |
| `npm run build`       | productiebuild (haalt PokéAPI-data op) |
| `npm start`           | productieserver na een build           |
| `npm test`            | unit tests (Vitest)                    |
| `npm run test:watch`  | tests bij elke wijziging               |
| `npm run lint`        | ESLint                                 |
| `npm run build:index` | bouwt de stats-index (zie hieronder)   |

## Opbouw

```
src/
  app/                 pagina, layout, foutpagina en API-routes
    api/pokemon/       samenvattingen, details en moves (JSON)
  components/          UI (lijst, kaart, venster, filters, schema's, moves)
  hooks/               client-hooks (scroll, tilt, URL-staat, favorieten, taal, thema, data)
  lib/
    pokeapi/           PokéAPI-client en parsers (alles hier is puur en getest)
    pokedex/           zoeklogica, matchups, formattering, favorieten, filters
    i18n/              talen en vertalingen
```

## Hoe de data werkt

- Alle PokéAPI-aanroepen gaan via één functie (`lib/pokeapi/client.ts`) met `"use cache"` en een levensduur van een dag, dus PokéAPI wordt zo weinig mogelijk belast.
- De pagina is statisch: de volledige Pokémonlijst (naam en nummer), de typen en de regio's worden bij de build opgehaald. Filteren en sorteren gebeurt daarna volledig in de browser.
- Types, details en moves worden pas opgehaald voor wat je ziet of opent, via de routes onder `/api/pokemon`.
- Teksten in meerdere talen worden in één keer meegestuurd; de browser kiest de juiste. Taal, thema en favorieten staan in `localStorage`.

## De stats-index

PokéAPI heeft geen bulk-endpoint met stats of de legendarisch/mythisch/baby-vlag; die staan per Pokémon (ruim 2000 aanroepen voor alles). Daarom staat die data vooraf in `src/data/pokemon-stats.json`, gemaakt door `scripts/build-stats-index.ts`. Het bestand bevat alleen de standaardvorm per soort en wordt in de browser gebruikt om te sorteren en te filteren.

**Draai `npm run build:index` opnieuw als er een nieuwe generatie of nieuwe Pokémon bijkomt** (duurt ongeveer een halve minuut, vereist internet). Een Pokémon die nog niet in de index staat blijft zichtbaar in de lijst, maar komt bij sorteren op een stat onderaan en valt weg bij het filter op legendarisch/mythisch/baby. Stats uit eerdere generaties (zoals in het detailvenster) horen er niet bij; de index heeft de huidige waarden.

## Bekende beperkingen

- Zoeken werkt op de Engelse naam en op het nummer, niet op vertaalde namen.
- Spelnamen, vormlabels (zoals "Mega X") en voorwerpnamen in de evolutielijn blijven Engels.
- Bij evolutiestappen staat alleen een voorwaarde bij level, voorwerp en ruilen.
- Move-gegevens (vermogen, nauwkeurigheid, PP) zijn de huidige waarden, niet de waarden per spel.
- Favorieten gelden per browser, niet tussen apparaten.
