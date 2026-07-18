# APPSTORE.md — the Ope! iOS runbook

The App Store build is a **picture frame** around the game that already exists.
`npm run build` emits one self-contained `dist/index.html`; Capacitor bundles that
file into a native iOS app that loads it fully offline over the `capacitor://`
scheme. That "it's a real, offline game, not a thin web view" is exactly what gets
a wrapper past Apple guideline 4.2 (minimum functionality).

This task (083) laid the entire rail **except the two steps only the owner's Apple
account can take**: paying the $99 enrollment and (optionally) clicking the final
TestFlight invite. Everything else — the Capacitor project, icons/splash, the
native adaptations, the privacy policy, and a live signing + upload workflow —
is committed and wired to the repo secrets that already exist.

The web deploy (`playope.com`, `.github/workflows/deploy.yml`) is **completely
independent** and unaffected by any of this.

---

## 0. TL;DR for the owner

Once you are enrolled in the Apple Developer Program and the App Store Connect
app record exists (steps 1–3 below):

1. GitHub → **Actions** → **iOS TestFlight** → **Run workflow**.
2. Wait ~15–25 min. The build signs itself (cloud-managed cert via the API key)
   and uploads to TestFlight.
3. App Store Connect → **TestFlight** → add yourself / friends as internal
   testers → install via the TestFlight app.

No Mac required for any of this — the build runs on a GitHub macOS runner.

---

## 1. Enrollment (owner-only, ~$99/yr)

- Go to <https://developer.apple.com/programs/enroll/> and enroll as an
  **Individual** ($99/year). Individual is fine for a solo project; the app will
  show your legal name as the seller. (An LLC + D-U-N-S gets you an
  "Organization" seller name instead, but that is not required and takes longer.)
- Enrollment can take a few hours to a couple of days for identity verification.
- This is the one irreplaceable step. It cannot be automated.

## 2. The App Store Connect API key & repo secrets (already done)

The owner/supervisor created an **App Store Connect API key** (App Store Connect →
Users and Access → Integrations → App Store Connect API → Team Keys) with the
**App Manager** role and set three repository **Actions secrets** on 2026-07-16:

| Secret | What it is |
| --- | --- |
| `ASC_KEY_ID` | the key's Key ID (e.g. `2X9ABC1234`) |
| `ASC_ISSUER_ID` | the team's Issuer ID (a UUID) |
| `ASC_PRIVATE_KEY_B64` | the downloaded `AuthKey_XXXX.p8`, base64-encoded |

To (re)create `ASC_PRIVATE_KEY_B64` from a fresh `.p8`:

```bash
base64 -i AuthKey_XXXXXXXXXX.p8 | tr -d '\n'   # paste the output as the secret
```

The workflow decodes it back to a `.p8` at build time and deletes it afterward.
The `.p8` is **never** committed (root `.gitignore` blocks `*.p8`).

## 3. Create the App Store Connect app record (owner-only, one time)

TestFlight needs an app record for bundle id **`com.playope.ope`**. Two ways:

- **Manual (recommended first time):** App Store Connect → **Apps** → **+** →
  **New App**. Platform iOS, name **Ope!**, primary language English, bundle id
  `com.playope.ope` (it appears in the dropdown once the identifier is
  registered under Certificates, Identifiers & Profiles → Identifiers — register
  it there if it isn't listed), SKU anything (e.g. `ope-north-side-chicago`).
- **Automated:** run the fastlane `create_app` lane once. On a Mac with the repo
  checked out and the ASC env set:

  ```bash
  export ASC_KEY_ID=...  ASC_ISSUER_ID=...  ASC_KEY_PATH=/abs/path/AuthKey.p8
  bundle install
  bundle exec fastlane ios create_app
  ```

  `produce` registers the identifier and creates the app record via the API key.

## 4. Run the TestFlight build

`.github/workflows/testflight.yml` is **manual dispatch only** (never on
push). It, on a `macos-14` runner:

1. `npm ci` + `npm run build` → the single-file `dist/index.html`.
2. `npx cap sync ios` → copies the build into the app, installs CocoaPods.
3. `node tools/cap-assets.mjs` → regenerates the icon + splash from source art.
4. `bundle exec fastlane ios beta` → archives with **cloud-managed automatic
   signing** (`-allowProvisioningUpdates`, authenticated by the ASC key), then
   `upload_to_testflight`.

The build number is GitHub's `run_number` (monotonic), applied via
`CURRENT_PROJECT_VERSION` so App Store Connect always accepts the upload. The
marketing version is `1.0` (bump `MARKETING_VERSION` in the Xcode project for a
new public version).

## 5. TestFlight invite flow

- **Internal testers** (up to 100, no Apple review): App Store Connect →
  TestFlight → Internal Testing → add users from your team → they get an email +
  the build appears in their TestFlight app. This is instant after processing.
- **External testers** (up to 10,000, needs a one-time Beta App Review per
  version): create an external group, add emails or share a public link. Our
  workflow uploads with `distribute_external: false`; flip that / add a group in
  the Fastfile when you want external testers.

---

## 6. Signing model (why there's no `match`)

The only secrets we have are the ASC API key. That is enough:

- **Automatic signing + `-allowProvisioningUpdates`** lets Xcode create and use a
  **cloud-managed distribution certificate** and the app-store provisioning
  profile on the fly, authenticated by the API key. Nothing to store, nothing to
  rotate, no `match` git repo, no `MATCH_PASSWORD`.

**Hardening (optional, later):** if you ever want fully reproducible, pinned
signing across many machines, adopt `fastlane match` (a private certs repo + one
extra `MATCH_PASSWORD` secret) and swap the `beta` lane's automatic signing for
`sync_code_signing`. Not needed for TestFlight.

---

## 7. Native build adaptations (behind the platform flag)

`src/platform.js` exposes `isNative()` (reads `window.Capacitor.isNativePlatform()`,
injected by the native runtime; `false` on web/PWA). The App Store build differs
from the web build in exactly these places, and **nowhere else**:

| Surface | Web / PWA | Native (App Store) | Why |
| --- | --- | --- | --- |
| Title-card "Support development ♥" link | shown | **hidden** | Apple 3.1.1 — no external donation links |
| ♥ Ko-fi HUD button (`#btnKofi`) | shown | **hidden** | Apple 3.1.1 |
| Wrigley-rooftop Ko-fi **QR billboard** | shown | **suppressed** | 3.1.1 — a scannable code to a donation page is the same risk |
| GoatCounter visit counting | on | **on (kept)** | cookieless, no IDFA, no tracking — allowed; see §8 |

The two DOM links are hidden **pre-paint** by an inline `<head>` script in
`index.html` that adds `html.native` before `<body>` renders (no flash). The QR
billboard is skipped in `src/packs/kofi.js` (`if (isNative()) return;`) — that
pack uses no rng, so suppressing it is determinism-safe and shifts nothing else
in the world. **Everything else in the game is byte-for-byte identical** across
web and native, and `dist/index.html` contains no Capacitor code (the native
bridge provides `window.Capacitor` at runtime).

---

## 8. App Store privacy questionnaire — the answers

Fill App Store Connect → **App Privacy** like this. The honest summary is
"**Data Not Collected**" *except* anonymous, non-tracking analytics:

- **Do you or your partners collect data from this app?** → **Yes** (because of
  GoatCounter). Then declare exactly one data type:
  - **Data type:** *Usage Data → Product Interaction* (an app-open/visit count).
    - Linked to the user's identity? **No.**
    - Used for tracking? **No.**
    - Purpose: **Analytics.**
- **Everything else** (Contact Info, Health, Financial, Location, Identifiers,
  Purchases, Contacts, User Content, Search History, Diagnostics, etc.) →
  **not collected.**
- No IDFA / no `AppTrackingTransparency` prompt is needed: GoatCounter sets no
  cookies, uses no advertising identifier, and does not track across apps/sites.
- Saves are **on-device only** (`localStorage` via `src/store.js`) and never
  leave the device — not "collected" in App Store terms.

**Privacy Policy URL** (required): **`https://playope.com/privacy`** — deployed
from `public/privacy/index.html` by the existing web workflow.

---

## 9. REVIEW-RISK REGISTER

Honest read of where App Review could push back. **None of these block
TestFlight** (internal testing is not App Review); decide before any *public*
App Store submission.

### 9a. Real-brand likenesses — guideline 5.2 (Intellectual Property) — GRAY ZONE

The game is deeply place-based and references real Chicago brands/venues by name
or likeness, e.g. **Wrigley Field, Sluggers, Old Style, Malört, Lollapalooza,
Divvy, the Bean/Cloud Gate, the CTA L**, and more. This is affectionate parody /
real-world homage, not counterfeiting, and it is normal for TestFlight. For a
**public** launch, Apple (or a rights holder) *could* object. Options, in
increasing order of caution:

1. **Fan-game / homage disclaimer** in the App Store description and an in-app
   about line ("an unofficial love letter to Chicago; not affiliated with or
   endorsed by any team, brand, or venue").
2. **Selective renames in the store build only** (behind the same platform flag
   pattern): e.g. Sluggers→"Swingers", Old Style→"Olde Style", Malört→"Malördt",
   Lollapalooza→"Lohlahpalooza". The geography and vibe survive; the trademarks
   don't ship. This is a content pass, out of scope for 083 — file a follow-up
   task if a public submission is decided.
3. **Cloud Gate / "the Bean"** is already rendered as a self-lit homage (see
   PITFALLS); keep it clearly stylized, never photographic.

Recommendation: ship to **TestFlight as-is now**; make the 5.2 call (disclaimer
vs. renames) before the public **Submit for Review**.

### 9b. External-link hygiene — guideline 3.1.1 (already mitigated)

Handled by the platform flag (§7): both Ko-fi links and the scannable Ko-fi QR
are removed from the native build. Keep it that way — if a future feature adds
any "buy/donate/subscribe" link, gate it behind `isNative()` too, or route it
through StoreKit In-App Purchase.

### 9c. Minimum functionality — guideline 4.2 (low risk, this is our strength)

A full 3D game that runs offline is comfortably above the "not just a web view"
bar. The offline bundling (no `server.url`) is the concrete evidence.

---

## 10. Where the bundle id lives (keep in sync)

If the owner corrects the bundle id from `com.playope.ope`, change it in **all
three** places (and the App Store Connect record):

1. `capacitor.config.json` → `appId`
2. `ios/App/App.xcodeproj/project.pbxproj` → both `PRODUCT_BUNDLE_IDENTIFIER`
3. `fastlane/Appfile` → `app_identifier` (and the `create_app` lane in the Fastfile)

## 11. Regenerating the native project / assets (dev)

The `ios/` project is committed. The generated/volatile bits (`Pods/`, the copied
web build, `App.xcworkspace` contents, generated config) are git-ignored and
rebuilt by CI. To work on it locally:

```bash
npm run build                 # produce dist/index.html
node tools/cap-bootstrap.mjs  # cap add ios (first time) / cap sync ios (after)
node tools/cap-assets.mjs     # regenerate AppIcon + Splash from assets/*.png
node tools/gen-ios-assets.mjs # only if you change the wordmark/source art
```

On a Mac you can then `npx cap open ios` and build/run in Xcode directly. On
Windows the scaffold generates but `pod install`/Xcode steps are skipped (the CI
macOS runner does them) — this is expected and non-fatal.

---

## 12. Status

- ✅ Capacitor iOS project in-repo, offline-bundled, `com.playope.ope`.
- ✅ Native adaptations behind `isNative()` (Ko-fi links + QR suppressed; GoatCounter kept).
- ✅ Branded app icon + light/dark splash from the title-card wordmark.
- ✅ Privacy policy deployed at `playope.com/privacy`.
- ✅ Live `fastlane` + GitHub Actions rail against `ASC_KEY_ID` / `ASC_ISSUER_ID`
     / `ASC_PRIVATE_KEY_B64` (signing + TestFlight upload are real, not stubs).
- ⏳ Owner-only: $99 enrollment, create the app record (or run `create_app`),
     dispatch the workflow, invite testers.
- 🚫 No public App Store submission in this task — the rail ends at
     TestFlight-ready.
