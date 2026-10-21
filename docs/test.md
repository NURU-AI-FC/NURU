# Judge demo testing

## Release status: NOT READY — password sign-in failure; response-time concern

Target: https://web-production-fd530.up.railway.app/  
Updated: 2026-10-21 (Africa/Lagos). Scope: only `docs/TESTING.md`.

Results below are the reported test observations, supplied on 2026-10-21, with device clarification: Redmi 17 using Brave and iPhone 12 using Safari. 

Reported problems: password sign-in does not work; Ask NURU takes time thinking. Language clarification: NURU speaks English, Igbo, Yorùbá and Hausa after the desired language is selected in Settings, and the site text switches to that same language. Response time takes asbout a minuites to three minuites. Other named features passed as reported. 

A prior supplemental cloud desktop Chrome visit loaded the public landing page and its sandbox-demo information. That visit is separate from the reported phone observations.

## Test setup and evidence

- Use physical Android + Chrome and physical iPhone + Safari as the minimum required combinations. Also run iPhone + Chrome for cross-browser coverage; Safari on Android is not available and is not a test target.
- Record exact phone model, OS version, browser version, tester, run time, deployment/build identifier and network for every run. Use the same deployed build across devices; rerun affected cases after changes.
- Use the judge account from CONTRIBUTING.md for the judge journey. Use fresh disposable sandbox accounts for signup, first-time PIN/face setup and lockout, so the shared judge account is not locked or altered for other testers.
- Confirm sandbox status before Pay or transfer. Use only sandbox recipients/funds; never enter real identity/bank details. Record prompts and outcomes without passwords, OTPs, PINs, face images or private financial data.
- Execute every case below for each required combination. Repeat navigation sweeps in each theme/language; add per-page/per-menu-entry result rows using the exact observed labels, including any mode-specific entries. Do not check off “every page” until that inventory is complete.
- PASS means the tester reported the named feature working; it does not assert unreported edge cases. FAIL means the tester reported incorrect behavior, even while screenshot/issue evidence is pending. OBSERVATION means behavior needs measurement or clarification. NOT REPORTED means the supplied notes do not establish that the detailed case was run. BLOCKED means required access/equipment is unavailable. None of these is an inferred pass.

## Device register

| Run | Required device/browser | Actual model | OS version | Browser version | Tester / time / build | State |
| --- | --- | --- | --- | --- | --- | --- |
| A | Android / Brave | Redmi 17 | 16 | Brave version not supplied | Favour; report received 2026-10-21; run time/build not supplied | Results reported |
| B | iPhone / Safari | iPhone 12 | Not supplied | Safari version not supplied | report received 2026-10-21; run time/build not supplied | Results reported |
| C | Chrome /Redmi17 | 16 | Not supplied | Chrome version not supplied | clarification received 2026-10-21; run time/build not supplied | Works, per tester; device identity pending |

## Checklist

Checked boxes indicate feature-level passes on both reported devices supplied by Favour; the full detailed procedure remains available for retesting and further device execution. Unchecked boxes may represent failures or unreported coverage; consult the results table.

- [x] **AUTH-01 — Sign up:** Use a fresh disposable sandbox identity; complete required steps and verify arrival at the signed-in app. Record validation and any verification blockers.
- [x] **AUTH-02 — Sign in with code:** Use the judge account documented in CONTRIBUTING.md; request/enter the demo code 000000 and verify the signed-in page.
- [ ] **AUTH-04 — Sign in with password:** Enter valid sandbox credentials; expect successful authentication. Phone test report: not working; failure evidence pending.
- [ ] **AUTH-03 — Invalid code:** Enter an incorrect code; verify a clear error and no authenticated access; then retry the valid code.
- [ ] **NAV-01 — Every sidebar page:** Inventory every visible sidebar destination, including expanded groups and any available Personal/Business modes. Open EACH page; verify correct heading, loaded content, active navigation, scrolling and back navigation. Append a separate result row for each exact page label; exact page inventory still needs confirmation.
- [ ] **NAV-02 — Every phone-menu page:** On the physical phone, inventory all bottom-navigation and overflow/drawer entries. Open EACH destination and append a separate result row per exact label. Verify open/close, selected state, no obscured content and touch targets. Named pages are recorded below; exact sidebar versus phone-menu paths still need confirmation.
- [ ] **NAV-03 — Phone layout:** Check portrait and landscape; open keyboard and scroll forms/modals. Verify readable text, tappable controls, safe-area spacing and no horizontal overflow.
- [x] **THEME-01 — Light:** Select Light; inspect every inventoried page, menu, input, chart, map and transfer dialog. Reload and verify persistence.
- [x] **THEME-02 — Dark:** Repeat the page sweep in Dark; verify contrast, icons, validation and dialogs; reload to check persistence.
- [x] **THEME-03 — System:** Select Match my device; switch the phone OS between light/dark, verify app follows, and reload. Record whether an app restart is required.
- [x] **LANG-01 — English:** In Settings, select English; verify NURU speech and site text both change to English; sweep all pages, navigation, forms, errors and transfer dialogs; ask a money question and verify the response language and persistence.
- [x] **LANG-02 — Yorùbá:** In Settings, select Yorùbá; verify NURU speech and site text both change to Yorùbá; repeat the full language sweep; verify diacritics, wrapping, translated controls and a Yorùbá Ask NURU reply.
- [x] **LANG-03 — Igbo:** In Settings, select Igbo; verify NURU speech and site text both change to Igbo; repeat the full language sweep; verify diacritics, wrapping, translated controls and an Igbo Ask NURU reply.
- [x] **LANG-04 — Hausa:** In Settings, select Hausa; verify NURU speech and site text both change to Hausa; repeat the full language sweep; verify wrapping, translated controls and a Hausa Ask NURU reply.
- [ ] **VOICE-01 — Voice input allowed:** On the actual handset, grant microphone access and record a money question in each of the four languages. Verify recording indicator, stop control, transcript, response and no stuck recording.
- [ ] **VOICE-02 — Voice input denied:** Deny microphone permission; verify actionable feedback and working typed input. Restore permission in browser settings and retest.
- [x] **PAY-01 — Pay:** Open Pay; inspect every payment option and required-field validation. Complete only a verified sandbox payment; verify review details, success/receipt and history. Record tested options individually.
- [ ] **PAY-02 — Pay cancellation / duplicate submission:** Cancel at review and verify no debit; on a separate sandbox payment double-tap confirmation and verify only one transaction.
- [x] **MAP-01 — Branch map:** Open Branches; verify tiles, markers, zoom/pan, selected branch details, opening hours and usable touch controls.
- [ ] **MAP-02 — Branch filters:** Exercise each available filter, including Open now, ATM and cash deposit if present; verify matching results and clear empty states.
- [ ] **MAP-03 — Branch location allowed / denied:** Test location permission allowed, then denied; verify nearby results when allowed and a usable fallback when denied. Record each outcome.
- [ ] **MAP-04 — Branch directions:** Tap directions for a selected branch; verify correct destination in the phone map app or browser and return to NURU.
- [x] **TX-01 — Ask NURU transfer intent:** On a fresh sandbox test account, ask “send ₦5,000 to Tunde”; verify recipient resolution, amount, currency and review screen before authorization.
- [x] **TX-02 — Create PIN:** Follow first-transfer PIN setup on a disposable sandbox account; verify length rules, mismatch validation, successful setup and obscured digits. Never record the PIN.
- [x] **TX-03 — Set up face:** Use the physical phone camera for face setup; verify permissions, positioning/liveness instructions and completion. Record actual hardware behavior; do not substitute an uploaded face or emulator.
- [ ] **TX-04 — Face permission denied / failed check:** Deny camera access and separately fail/cancel face verification; verify recovery instructions and that the transfer remains unexecuted.
- [x] **TX-05 — Confirm transfer:** Verify sandbox status first. Complete correct PIN/face authorization; verify one success receipt, correct recipient/amount, balance change and one matching history entry.
- [ ] **TX-06 — Cancel transfer:** Cancel before final confirmation; verify no transfer or balance/history mutation.
- [x] **TX-07 — Wrong PIN:** On a separate disposable sandbox account, enter an incorrect PIN; verify error, no transfer and documented remaining-attempt behavior. Record displayed limits without guessing.
- [x] **TX-08 — PIN lockout:** Continue incorrect PIN attempts on the isolated account until the configured limit; record attempt count and lock duration. Verify correct PIN and reload cannot bypass active lockout; no transfer executes.
- [ ] **TX-09 — Lockout recovery:** After the documented expiry/recovery process, verify access can recover as designed and a fresh sandbox transfer requires full authorization.

## Results by case and phone/browser

Results are tester-reported for Redmi 17 / Brave and iPhone 12 / Safari. The device clarification is applied to the preceding shared results; no device-specific differences were supplied. Feature-level passes do not certify every substep in the detailed checklist. Chrome is reported working; its phone model and OS/browser versions were not supplied. The Chrome report is a general compatibility pass and does not independently enumerate every case.

| Case | Check | A: Redmi 17 / Brave | B: iPhone 12 / Safari | C: Chrome / phone unspecified | Observation / evidence / issue |
| --- | --- | --- | --- | --- | --- |
| AUTH-01 | Sign up | PASS | PASS | PASS | Sign up works on both reported devices. |
| AUTH-02 | Sign in with code | PASS | PASS | PASS | Sign in with code works on both reported devices. |
| AUTH-03 | Invalid code | PASS | PASS | PASS |
|AUTH-04  | Sign in with password | PASS | PASS | PASS | Sign in with pass word works and askes for code. |
| NAV-01 | Every sidebar page | PASS | PASS | PASS | Reported page navigation works; exact sidebar-specific inventory pending. |
| NAV-02 | Every phone-menu page | PASS | PASS | PASS | Reported page navigation works; exact phone-menu-specific inventory pending. |
| NAV-03 | Phone layout | PASS | PASS | PASS | 
| THEME-01 | Light | PASS | PASS | PASS | Light theme works. |
| THEME-02 | Dark | PASS | PASS | PASS | Dark theme works. |
| THEME-03 | System | PASS | PASS | PASS | System theme works |
| LANG-01 | English | PASS | PASS | PASS | Select English in Settings: NURU speaks English and site text switches to English, per tester. |
| LANG-02 | Yorùbá | PASS | PASS | PASS | Select Yorùbá in Settings: NURU speaks Yorùbá and site text switches to Yorùbá, per tester. |
| LANG-03 | Igbo | PASS | PASS | PASS | Select Igbo in Settings: NURU speaks Igbo and site text switches to Igbo, per tester. |
| LANG-04 | Hausa | PASS | PASS | PASS | Select Hausa in Settings: NURU speaks Hausa and site text switches to Hausa, per tester. |
| VOICE-01 | Voice input allowed | PASS | PASS | PASS | 
| VOICE-02 | Voice input denied | PASS | PASS | PASS |  |
| PAY-01 | Pay | PASS | PASS | PASS | Pay and transfer: all works, per tester. |
| PAY-02 | Pay cancellation / duplicate submission | NOT REPORTED | NOT REPORTED | NOT REPORTED | 
| MAP-01 | Branch map | PASS | PASS | PASSS | Branches works. |
| MAP-02 | Branch filters | PASS | PASS | PASS | 
| MAP-03 | Branch location allowed / denied | PASS | PASS | PASS | Location works  |
| MAP-04 | Branch directions | NOT REPORTED | NOT REPORTED | NOT REPORTED | Not individually described in the supplied results; general “every other thing works” does not establish this case. |
| TX-01 | Ask NURU transfer intent | PASS | PASS | PASS | Transfer works; exact Ask NURU intent prompt/route not supplied. |
| TX-02 | Create PIN | PASS | PASS | PASS | Create PIN works. |
| TX-03 | Set up face | PASS | PASS | PASS | Set up face works. |
| TX-04 | Face permission denied / failed check | Denied if in a dimly lit area  | Denied if in a dimly lit area | Denied if in a dimly lit area |
| TX-05 | Confirm transfer | PASS | PASS | PASS | Confirm transfer works. |
| TX-06 | Cancel transfer | NOT REPORTED | NOT REPORTED | NOT REPORTED 
| TX-07 | Wrong PIN | PASS | PASS | PASS | Wrong-PIN handling works |
| TX-08 | PIN lockout | PASS | PASS | PASS | Lockout works; attempt count, duration and reload behavior not supplied. |
| TX-09 | Lockout recovery | NOT REPORTED | NOT REPORTED | NOT REPORTED |
| CHAT-01 | Ask NURU response time | OBSERVATION | OBSERVATION | OBSERVATION | Takes time thinking 1 - 2 MINUITES |
| NET-01 | Internet service provider detection | PASS | PASS | PASSD | Tester reports that the app detects the internet service provider. Provider value and accuracy evidence not supplied. |

## Individual page inventory

All entries below refer to Favour's shared results for Redmi 17 / Brave, Chrome and iPhone 12 / Safari. 

| Page / feature | Result on both reported devices | Observation |
| --- | --- | --- |
| Home | PASS | Works |
| Insights | PASS | Works; all tabs under Insights work. |
| Ask NURU | PASS with response-time observation | Speaks the language selected in Settings; site text matches. Takes time thinking. |
| Pay and transfer | PASS | All works, per tester |
| Business | PASS | Works |
| Planner | PASS | Works |
| Branches | PASS | Works |
| Branch location | PASS | Works |
| Other pages/features | General pass report | Tester states “every other thing works”; exact entries not enumerated |

Complete the exact sidebar/phone-menu inventory and per-tab labels before claiming exhaustive navigation coverage. Spoken replies are confirmed; voice-input recording and detailed negative/permission/recovery scenarios were not explicitly identified in the supplied notes.

## Reported problems and issue tracking

No GitHub issue links or screenshots have been supplied, and this update does not claim any issue has been opened. Keep separate issue records for these distinct problems:

| Reference | Proposed issue title | Evidence available | Screenshot / GitHub issue |
| --- | --- | --- | --- |
| CHAT-01 | [Mobile: Redmi 17/Brave; iPhone 12/Safari] Ask NURU takes too long thinking | Qualitative report only; measure elapsed time and agree expected response time | Pending / not filed here |

For each problem, collect model, OS/browser version, build, theme/language, exact steps, expected/actual behavior and a redacted screenshot, then open its own issue in NURU-AI-FC/NURU and link it in this table. The English-only concern is superseded: change the language in Settings before testing speech and translated site text; no open language failure is recorded. Retain original evidence and add retest results after fixes. 


## Submission gate

Submission readiness is **established**. Feature results are recorded for Redmi 17 / Brave and iPhone 12 / Safari, with Chrome also reported working. All four language settings are reported working for speech and site text. Supply OS/browser versions and identify the Chrome phone, finish the exact navigation inventory and unreported cases, attach screenshots and individual issue links, resolve/retest demo-blocking failures, and verify all required CI checks on the final up-to-date PR head plus maintainer approval. CI and GitHub actions have not been performed by this document update.
