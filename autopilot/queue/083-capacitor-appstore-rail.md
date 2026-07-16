---
id: 083
area: shell
type: build
model: opus
turns: 120
title: APP STORE RAIL — Capacitor iOS project + CI build to TestFlight-ready
acceptance: >
  Owner (2026-07-16): "How do we get this on the app store?" The sanctioned
  interim path (owner strategy 2026-07-04) is a native WRAPPER, not a port:
  Capacitor around the existing build. This task builds the rail as far as
  automation can go WITHOUT the owner's Apple Developer account; the final
  signing/upload steps activate when the owner's enrollment lands. (1)
  CAPACITOR PROJECT in-repo (ios/ + capacitor.config): app id
  com.playope.ope (or owner-corrected), the game loads from the BUNDLED
  build (fully offline — our single-file architecture is the App Store 4.2
  strength: a real game, not a thin web view), status-bar/safe-area/
  orientation config matching 077's PWA work, icons + splash generated
  from the title-card art. (2) iOS-BUILD ADAPTATIONS behind a platform
  flag: HIDE the Ko-fi links in the native build (Apple 3.1.1 external-
  donation risk — web/PWA keep them), keep GoatCounter (no IDFA, no
  tracking — privacy questionnaire: 'data not collected' except anonymous
  analytics; document the answers in APPSTORE.md). (3) PRIVACY POLICY page
  deployed at playope.com/privacy (App Store requirement — plain-language:
  anonymous visit counting, no accounts, no personal data, local-only
  saves). (4) CI: a GitHub Actions macOS workflow (manual dispatch) that
  builds the Capacitor iOS app and — once secrets exist — signs via
  fastlane with an App Store Connect API key and uploads to TestFlight;
  until then it runs through the unsigned build step green and documents
  the 3 secrets the owner will paste (API key id/issuer/key). (5)
  APPSTORE.md: the owner's runbook — enrollment steps ($99/yr individual),
  App Store Connect app creation, the secrets, TestFlight invite flow,
  and the honest REVIEW-RISK register: real-brand likenesses (Sluggers/
  Old Style/Malört/Lollapalooza — guideline 5.2 gray zone; fine for
  TestFlight, decide before public submission; options listed: fan-game
  disclaimer, selective renames in the store build) and the external-link
  hygiene above. NO submission in this task — rail ends at
  TestFlight-ready. Web deploy unaffected; single-file build still green.
refs:
  - autopilot/queue/077-mobile-first-experience.md (PWA/meta groundwork this reuses)
  - .github/workflows/deploy.yml (CI precedent)
  - index.html + vite config (the bundled-build packaging)
---

Philosophy: the App Store build is a picture frame — the game inside is
already done and already offline-capable, which is precisely what gets
wrappers approved. The owner's only irreplaceable step is the $99
enrollment; everything else is plumbing this task lays in advance. PWA
(077) ships the home-screen experience YEARS earlier than review does —
the store is for discoverability, not necessity.
