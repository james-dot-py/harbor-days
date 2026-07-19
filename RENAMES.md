# RENAMES.md — the de-brand pun ledger (task 094)

Owner directive (2026-07-18): "any brand names or direct proprietary references
should be changed to evoke the original name as a pun to avoid copyright stuff."

This file is the single truth for how real-world marks appear in Harbor Days.
Every builder/pack that draws a sign or writes a line uses the IN-GAME column.
Display strings only — ids, save keys, function names, file names are unchanged
(one save-load remap merges old wallet ledger buckets into the new names).

## Renamed (mark → in-game pun)

| Real mark | In-game | Where it lives |
|---|---|---|
| Wrigley Field | **Wiggly Field** | marquee, gate boards, box office, scoreboard clock, minimap/citymap, L departure boards, ride prompts/toasts, favor hints |
| Chicago Cubs / Cubs / Cubbies | **Chicago Chubs / Chubs / Chubbies** | marquee, scoreboard rows, souvenir stalls, video board, toasts, NPC lines, journal rows |
| "Fly the W" (slogan text) | **"Fly the dub"** | marquee message rotation, win toasts, NPC lines (the plain letter-W flag itself stays — see below) |
| the Friendly Confines | **the Wiggly Confines** | gate banner, arrival toasts, journal section title, NPC lines |
| Wrigley's Spearmint (gum ad card) | **Wiggly's Spearmint** | vintage L-car ad card |
| Wrigley Square (Millennium Park wall) | **Wiggly Square** | inscribed limestone wall |
| Divvy | **Dibsy** | dock signs, dock-discovery toasts, bike prompts/toasts, controls card, "Dibsy angel" favor, wallet label, journal |
| Old Style | **Olde Stylo** | rooftop billboard, window neon, can/case textures, Sluggards menu, tote item name, favor strings |
| Jeppson's Malört | **Jebson's Malörp** | tasting toasts, NPC lines, tote captions, journal row, wallet label, Lolla lineup poster (MALÖRP FACE), boat nameplate |
| Pequod's | **Pequilod's** | picnic pizza-box lid |
| Lollapalooza / Lolla | **Lallapawlooza / Lalla** | festival banners, lineup poster, journal, toasts, LALLA MERCH tent, LALLA FM radio, wallet label, citymap |
| Sluggers | **Sluggards** | bar sign band, neon, menu board, shop title, favor strings, citymap |
| Murphy's Bleachers | **Furphy's Bleachers** | fascia, blade, annex band, NPC line |
| Cubby Bear | **Chubby Bear** | storefront plate, diamond crest, GO CHUBS truss board |
| Budweiser / Bud Light | **Sudweiser / Sud Light** | Chubby Bear marquee board, window neon |
| Sports World | **Sports Whirled** | corner-store fascia |
| Sports Corner | **Sports Cornet** | Clark bar blade |
| Casey Moran's | **Casey at the Bar** | Clark bar band |
| Lucky Strike (bowling) | **Plucky Strike** | round bowling blade sign |
| Art Institute of Chicago | **Arf Institute** ("THE ARF INSTITVTE OF CHICAGO") | entablature frieze, citymap |
| Prudential (rooftop sign) | **Prudent Owl** | skyline sign crown |
| Santa Fe (rooftop sign) | **Santa Flea** | Railway Exchange rooftop sign |
| Chase Promenade | **Chassé Promenade** | inscribed plinth |
| Park Grill | **Lark Grill** | rink-wall storefront sign |
| Park Bait | **Perch Bait** | bait-shop sign, citymap |
| Culver's | **Culvert's** | NPC bump line |
| Portillo's | **Tortillo's** | wedding NPC lines |
| United Center | **untied center** | avatar blurb |
| WBMX (radio) | **WBOX · HOUSE** | boombox station cycle |
| Checkerboard Lounge | **CHECKERBIRD · BLUES** | boombox station cycle |
| WGN ("GO CUBS GO") | **WOPE · GO CHUBS GO** | boombox station cycle (flavor line de-named) |
| CTA (acronym on signs) | **THE L** wayfinding blade; "L GHOST TRAIN" poster band | corner blade, Lolla lineup poster |
| Band-Aid ("BURNT BAND-AID" toast) | **BURNT BANDAGE** | Malörp tasting toasts |
| Rolleiflex (in sign lore) | "the twin-lens camera" | Vivian Maier honorary-way lore |
| "Go, Cubs, Go" (song title in lore) | "the one the whole ballpark sings" | Steve Goodman honorary-way lore |
| Cloud Gate (artwork title in journal) | **the Bean** ("officially it's something fancier") | journal entry |

## Considered and KEPT (with reasons)

| Reference | Why it stays |
|---|---|
| Ko-fi rail (billboard, L-car placard, QR, links) | Owner's own support surfaces — explicitly in scope to keep |
| Geographic/street/park/neighborhood names (Belmont, Montrose, Waveland, Addison, Clark, Sheffield, Wrigleyville, Gallagher Way, Millennium Park, Grant Park, The 606…) | Public place names — the recognizability law |
| Honorary-way people (Steve Goodman, Vivian Maier, Studs Terkel, Del Close, Frankie Knuckles, Ann Sather, Monty & Rose…) + Wax Trax! Records blade | Real honorary designations = public street names; people stay |
| Red Line / Brown Line / "the L" / "M" transit disc / station names / 95th–Dan Ryan / Howard | Color-named transit lines and colloquialisms are generic descriptors used by many cities; renaming breaks the ride-the-L hook |
| The plain **W** win flag (letter only) | Single letter in our own toon trade dress; the slogan text is what got punned |
| "C" station roundel | Reads as the Chubs roundel now |
| EAMUS CATULI! + AC counter, 1060 W. ADDISON, HIT IT HERE, MARQUEE GATE, GAME DAY AT THE CONFINES | Plain Latin / street address / generic ballpark phrases |
| "♪ buy me some peanuts & cracker jack", "take me out to the ball game" | Public-domain 1908 lyric quoted as sung |
| The Dugout, THE DOCK, RED HOTS, Second City (boat), "go bears.", "bear down.", Chicago handshake, ORCHESTRA HALL | Generic words / city nickname / generic animal & phrase — no distinctive mark used |
| ROUTE 66 shield + "get your kicks" | Historic public highway designation |
| Chicago Park District, Chicago Police, CFD Engine Co. 78 | Municipal bodies, not commercial marks |
| Hendricks/Hottovy, Bartman-era, Coltrane, Mellencamp, Harry Caray "Holy Cow!" | Real people referenced factually, not marks |
| BP Bridge, Boeing, Exelon, AT&T Plaza, McDonald's Cycle Center, McCormick Tribune, Chase Tower massing, Willis/Hancock/Aon | Geometry/comments only — no player-visible text exists |
| USPS mailbox eagle decal | Stylized canvas shapes, no lettering |

## Laws
- New content NEVER introduces a real commercial mark as display text: check this
  table first; extend it (mark → pun, one obvious wink) when a new brand shows up.
- Word-sign canvas law still applies: longer puns must be measureText-fitted,
  never clipped (the 'NI GO' pitfall).
- Save compatibility: framework.js load remaps old wallet ledger buckets
  (Divvy→Dibsy, Wrigley→Wiggly, Lolla→Lalla, Malört→Malörp), merging counts.
