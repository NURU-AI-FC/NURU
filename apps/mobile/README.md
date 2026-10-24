# NURU mobile

The NURU app for iOS and Android, built with React Native, Expo SDK 58, expo-router and TypeScript. The screens follow the design modules in `design/src` (p03 to p18): NURU red `#E30613`, Inter, and light and dark themes.

## Run it

```bash
cd apps/mobile
npm install
npx expo start
```

- **Phone:** install **Expo Go** from the App Store or Play Store and scan the QR code that `expo start` prints. The phone and the computer must be on the same network, or run `npx expo start --tunnel`.
- **Simulator:** press `i` for the iOS simulator (needs Xcode) or `a` for an Android emulator (needs Android Studio).
- **Browser:** press `w`, or run `npm run web`.

Demo login: `demo@nuru.app` / `Nuru-Demo-2026`, then code `000000`.

## API

The app talks to the same Go API as the web app. It uses the contract in `apps/web/src/api.ts`, which is mirrored in `src/lib/api.ts`.

| Variable | Default |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://web-production-fd530.up.railway.app/api` |

To use a local API, run `EXPO_PUBLIC_API_URL=http://<your-computer-ip>:8080 npx expo start`. A phone cannot reach `localhost` on your computer. Add the app's origin to the API's `WEB_ORIGINS` when you test in a browser.

The session token is stored in `expo-secure-store` (Keychain or Keystore). On web it falls back to `sessionStorage`.

## Checks

```bash
npm run typecheck      # tsc --noEmit
npm run export:web     # static web build into dist/
```

## Builds (later)

Store builds go through EAS:

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --platform android   # or ios
```

The bundle ID is `app.nuru.mobile`, set in `app.json`. Add the production `EXPO_PUBLIC_API_URL` as an EAS environment variable rather than in code.

## Layout

```
src/app/            routes (expo-router)
  (tabs)/           Home, Insights, Ask NURU, Pay, More
  welcome, signin, signup, otp, forgot
  send              transfer flow: recipient, amount, review, PIN and face, receipt
  accounts, business, planner, notifications, history, branches
  settings/         profile, appearance, language, currency, security, privacy, help
src/components/     chat cards, transfer guard, language pill, pay helpers
src/ui/             kit (text, cards, buttons, inputs), charts, icons, keypad, sheet, tab bar
src/lib/            api client, theme tokens, app store, formatting, secure storage
src/i18n/           English, Yorùbá, Igbo and Hausa strings (shared with web)
```

## Not on mobile yet

- Face check uses a scripted placeholder that enrols the same sandbox face as the web app. No camera model runs yet.
- Passkey and Face ID sign-in, voice input and read-aloud, bills, airtime, scan to pay, the currency converter, payroll and invoice tools, and Mono bank linking all show a short note or point to the web app.
- The branch finder uses the built-in branch list with distances from Victoria Island. Live OpenStreetMap search and device location are not wired yet.
