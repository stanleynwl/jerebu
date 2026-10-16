# Jerebu 🇲🇾🚬

**Malaysia's haze, in cigarettes.** Live Air Pollutant Index (API / IPU) readings from the
Department of Environment, turned into "how many cigarettes is breathing this air for 24 hours".

A Malaysian take on [SecondHand](https://secondhand.sangsara.net) (Singapore).

## What's on the page

- **Animated scene.** The view from a mamak table. The hand holds today's number of cigarettes, each with a
  glowing tip and rising smoke. Haze thickens and the backdrop fades as the API climbs, and the sky follows the
  actual time in Malaysia.
- **A backdrop for every city.** About 35 scenes built in code, crossfading as you switch city. Examples:
  Petronas & Merdeka 118 (KL), Blue Mosque (Shah Alam), Putra Mosque on the lake (Putrajaya), Komtar and Penang Hill,
  Penang Bridge, Ipoh station and limestone hills, Christ Church and the windmill (Melaka), Mount Kinabalu and a water
  village (KK), the DUN building on the Sarawak River (Kuching), Crystal Mosque (Kuala Terengganu), wau kites (Kota Bharu),
  paddy fields and Gunung Jerai (Kedah), the Mat Cincang cable car (Langkawi), plus ports, refineries, rainforest,
  longhouses, beaches and kampung. Boats bob, ships and cars move, kites sway, chimneys smoke, and fireflies and
  lighthouse beams come out at night. Planes, eagles, hornbills or egrets fly by depending on the place.
- **Brand picker.** Eight cigarette styles under the site's own parody house brand (Classic, Red, Menthol, Kretek with
  crackling sparks, Nipah leaf, Gold slim, Black, Cigar). They restyle the sticks, the butts in the ashtray, and the
  "Jerebu" pack on the table. No real tobacco brands are used, since Malaysia bans promoting smoking products.
- **State → city.** Pick any of the 16 states and federal territories, then a city within it. Stations are grouped
  into the cities people know (e.g. Tasek Ipoh + Pegoh Ipoh → Ipoh), biggest city first, or you can view the state average.
- **Hold the map.** Hold the *Hold* button (or the `M` key) to see a paper map of Malaysia with every station
  and each state's number. A quick tap pins the map open.
- **Near me** picks your nearest station, using your browser's location.
- **Last 24 hours** sparkline, a **Smokiest cities right now** ranking, and a **Simulate** slider (API 0–500).
- **English / Bahasa Melayu** toggle.

## How the number is calculated

1. DOE publishes the hourly **API** for each station
   ([APIMS](https://eqms.doe.gov.my/APIMS/main)).
2. API is converted to an estimated **PM2.5 concentration** (µg/m³) with a piecewise-linear table:
   API 100 ↔ 35 µg/m³, the Malaysian Ambient Air Quality Standard 2020 PM2.5 24-hour limit. From API 200 up it
   follows the US PSI breakpoints, which Malaysia's upper bands mirror. See [`js/aqi.js`](js/aqi.js).
3. **Berkeley Earth's** rule of thumb: breathing 22 µg/m³ of PM2.5 for a day ≈ smoking 1 cigarette.

The PM2.5 figure is an estimate, not a measurement. This is satire, not medical advice.

## Architecture

There is no build step: plain HTML, CSS and ES modules, plus two Vercel serverless functions.

```
index.html, css/, js/       static site
  js/scene.js               animated SVG and canvas scene (sky, hand, smoke, haze)
  js/themes.js              city backdrops + city → theme mapping
  js/brands.js              cigarette styles for the brand picker
  js/map.js                 paper map overlay (Natural Earth outline, Mercator)
  js/aqi.js                 API → PM2.5 → cigarettes, bands, states, city grouping
  js/app.js                 data loading, UI, i18n
api/air.js                  GET /api/air: proxies DOE mapcaqm (DOE's CORS only allows its own origin)
api/trend.js                GET /api/trend?states=…: last 24 h per station
api/_lib.js                 shared fetch helpers + Open-Meteo fallback
data/snapshot.json          last-resort offline data
```

- Responses are cached at Vercel's edge for 5–10 minutes, so DOE gets very little traffic.
- If DOE is unreachable, `/api/air` falls back to modelled PM2.5 from [Open-Meteo](https://open-meteo.com/) (CAMS),
  and the page shows a badge saying so.
- Functions run in `sin1` (Singapore), the region closest to Malaysia.

## Run locally

```bash
node dev.mjs
```

Then open http://localhost:5173. Add `?hour=21` to preview the scene at a given Malaysian hour.

## Deploy

```bash
npx vercel --prod
```

Or import the GitHub repo in the Vercel dashboard. There's no framework, and the defaults work.

## Credits

- Air quality data: Jabatan Alam Sekitar Malaysia (DOE), APIMS
- Cigarette equivalence: Berkeley Earth
- Map outline: Natural Earth via `world-atlas`
- Concept: SecondHand by sangsara
