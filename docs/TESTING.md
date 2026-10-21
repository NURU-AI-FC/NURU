# NURU demo test checklist

Run this on the live site (https://web-production-fd530.up.railway.app) in a desktop browser, and in the app on at least one Android phone (newest APK) and one iPhone. Tick each line, and write the phone model and the time next to anything that fails so the server logs can be checked.

Demo login: `judge@nuru.app` / `Zecathon-2026`, code `000000`. The judge account has no PIN yet: the first transfer creates the PIN and sets up the face check.

## Sign up and sign in
- [ ] Sign up with a new email: the code screen appears and `000000` works in demo mode
- [ ] Sign in with the judge account and code
- [ ] Wrong password shows an error, not a blank screen
- [ ] Forgot password: the reset flow opens and returns to sign in
- [ ] Sign out, then sign back in

## Every page
- [ ] Home: balances, insights and reminders load
- [ ] Insights: charts and the 3 month comparison load
- [ ] Ask NURU: the suggested questions answer
- [ ] Pay, Accounts, History, Planner, Money, Business, Branches, Notifications, Help and Settings open from the sidebar (web) and the More menu (phone)
- [ ] Branches: the map shows pins; allowing location centres it on you
- [ ] Bank console (`staff@nuru.app`) opens for staff only

## Theme and language
- [ ] Light, dark and system theme all apply on every page
- [ ] English, Yorùbá, Igbo and Hausa: menus change and NURU answers in that language
- [ ] A Yorùbá greeting such as "Ẹ káàárọ̀" gets a greeting back, not an off-topic reply

## Voice
- [ ] Mic in Ask NURU: speak, pause, and the question sends by itself
- [ ] Speaker on: the answer is read aloud once, even when the speaker is tapped twice
- [ ] Speaker off: answers are text only
- [ ] Double tap empty space opens the voice assistant, which greets you and listens
- [ ] Phone: "Hey NURU" opens the assistant while the app is open (switch in Language and voice)
- [ ] Web: turn on "Listen for Hey NURU" in the assistant, then say it (Chrome, Edge or Safari)

## Transfer from Ask NURU
- [ ] Ask "Send ₦5,000 to Tunde": a transfer card appears
- [ ] First transfer: create a PIN, then set up the face check with the phone camera (you see yourself)
- [ ] Correct PIN and face: the transfer goes through and the balance changes
- [ ] Wrong PIN: the transfer stops and no "I know this person" button appears before the PIN and face pass
- [ ] Three wrong tries lock transfers for 30 minutes
- [ ] A new or risky recipient asks "I know this person" only after the PIN and face pass, then checks the face and PIN again

## Speed
- [ ] The phone app opens to Home in a couple of seconds after the first launch
- [ ] Spoken answers start within a few seconds

## Results

| Date | Tester | Device | Passed | Failed (with time) |
|---|---|---|---|---|
| | | | | |
