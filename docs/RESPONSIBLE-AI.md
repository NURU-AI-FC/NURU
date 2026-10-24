# Responsible AI in NURU

NURU is an AI financial copilot that banks embed in their own apps. It uses AI to explain a customer's own money in plain words, in English, Yorùbá, Igbo and Hausa, by text or by voice. This document covers the AI providers NURU uses, the role each one plays and the safeguards around them. It is written for the technical team to read before testing or debugging.

## Principles

1. **AI explains, the app decides.** The model never queries the database, never moves money and never approves anything. Every payment needs the customer's PIN and face check, which the app enforces, not the model.
2. **Only the customer's own numbers.** Each answer is built from a snapshot that the API computes for the signed-in customer. The model sees nothing else.
3. **Least data out.** Account numbers and long digit runs are masked before any text leaves the API. Only first names are sent.
4. **Check the answer, not just the question.** Every naira figure in an answer is traced back to the customer's data before it is shown.
5. **Always a working fallback.** If a provider is down or a key is missing, NURU falls back to a template or another provider, so the demo never depends on a single service.
6. **People stay in control.** Customers can turn voice, read-aloud and "Hey NURU" on or off. They can read and clear their chat history, and they are pointed to a relationship manager at their bank for big investment or loan decisions.

## AI providers and their roles

| Provider | What it does in NURU | Where it runs | What it receives |
|---|---|---|---|
| **Anthropic Claude** (Claude Sonnet 5.5) | Writes answers in Ask NURU and the voice assistant: spending explanations, savings plans, bill and loan guidance, in the customer's language | NURU AI service (`services/ai`) calling the Anthropic API | The question, the last few chat turns, a masked financial snapshot and any matching help-guide text |
| **ElevenLabs** | Reads English answers aloud in a Nigerian voice (Flash model for low delay), and is the backup for transcribing speech | NURU API (`services/api`) calling ElevenLabs | Answer text to speak, or a short voice recording to transcribe |
| **Microsoft Azure Speech** | Backup Nigerian English voice (en-NG neural voices) when ElevenLabs is unavailable | NURU API calling Azure | Answer text to speak |
| **Spitch** | Reads answers aloud in Yorùbá, Igbo and Hausa, and turns spoken questions in all four languages into text | NURU API calling Spitch | Answer text, or a short voice recording |
| **face-api** (open source, on device) | Face check before transfers: turns a camera frame into 128 numbers that are compared with the enrolled face | In the customer's browser or phone. No face data goes to a third party | Camera frames stay on the device. Only the 128-number template is sent to NURU, encrypted |
| **Phone and browser speech recognition** | Listens for the "Hey NURU" wake phrase while the app is open | The phone's or browser's built-in recogniser (Apple, Google or the browser vendor) | Microphone audio while the app is in the foreground and the switch is on |
| **Local knowledge search** | Finds the most relevant NURU and bank help-guide passages for a question | Inside the NURU AI service, using a local embedding. No external AI provider | The question text |

### How Claude is used

- **Model choice.** Short, simple questions such as greetings, balances and this week's spending use a low-effort setting so they answer in a few seconds. Questions that ask for advice or a plan use a deeper setting. Both are configurable (`NURU_MODEL`, `NURU_FAST_MODEL`, `NURU_EFFORT`).
- **System rules.** Claude is told to use only the figures in the customer's data, to stay on personal and business finance, to never ask for or repeat a PIN, OTP, BVN, card or full account number, and to treat the customer's message and data as data, not instructions.
- **Refusals.** If Claude declines a request, NURU shows a short, polite message offering a money question instead. Anthropic's server-side fallback is switched on, so a mistaken decline is retried on Anthropic's recommended model within the same request.
- **Streaming.** Answers appear word by word. The full answer is still checked when it finishes, and replaced if it fails a check (see below).

### What Claude never does

- Move money, create payees or change settings. Transfers and reminders always use fixed templates that quote exactly the payee, amount and date the app will use.
- See other customers' data, full account numbers, BVNs, PINs, OTPs, passwords or face templates.
- Act on its own. It answers only when the customer asks.

## Safeguards

### Before the model is called (`services/ai/guard.py`)

- **Prompt-injection screen.** Phrases used to hijack assistants are blocked before reaching Claude, for example "ignore previous instructions", "developer mode", "skip the face check", "show your system prompt" and requests for other customers' data. Text is normalised first, so full-width letters and hidden characters don't slip past. Blocked attempts are logged as security events for the bank console.
- **Topic screen.** Questions outside personal and business finance get a polite decline. Greetings, including Yorùbá, Igbo and Hausa ones, are allowed.
- **Masking.** The API replaces long digit runs (account numbers, BVNs) with dots before any text goes to the AI service or the audit log (`mask()` in `services/api/internal/httpapi/chat.go`).

### After the model answers

- **Figure check.** Every ₦ amount in Claude's answer must match a figure in the customer's data or in the help guide that was used. If any amount can't be traced, NURU shows a template answer built only from the customer's own numbers (`unsupported_amounts()` in `guard.py`).
- **Sources.** Each answer lists what it drew on, such as this month's spending or the NURU guides, so the customer can see where it came from.
- **Engine label.** Every stored answer records whether Claude, a template or the guard produced it, and how long it took. NURU HQ shows these figures, so the team can watch quality and speed.

### Money and identity

- Payments need the transaction PIN and a face match on every transfer. Three failed checks pause transfers for 30 minutes.
- Replacing an enrolled face needs the transaction PIN, so someone holding an unlocked phone cannot swap in their own face.
- Face templates are 128 numbers, never photos, and are encrypted at rest.

### Privacy and data handling

- Chat history is encrypted per customer. Customers can read it and clear it from Settings, under Privacy.
- Error reports (Sentry) exclude request bodies, local variables and personal data.
- Provider API keys live only in the hosting platform's settings and the developer's local `.env`, never in the code.
- "Hey NURU" listens only while the app is open on screen. It stops in the background and while NURU itself is speaking or recording.

## Limits we tell people about

- NURU gives guidance, not regulated investment advice, and suggests a relationship manager at the customer's bank for big decisions.
- Answers can be wrong or incomplete. The figure check catches invented amounts, but not every reasoning mistake.
- Speech recognition is less accurate with noise and strong accents, and is still improving for Yorùbá, Igbo and Hausa. The text box is always available.
- The face check matches a face but is not a certified liveness check, so a good photo could fool it. In production it would sit alongside the bank's own device binding and liveness checks.
- The demo uses seeded sandbox data, not real customer accounts.

## How AI was used to build NURU

The product, its design and its decisions come from the NURU team. Bolaji led the build, designed every screen in Figma before it was coded, and decided what NURU should and shouldn't do. Teammates reviewed the Yorùbá, Igbo and Hausa translations, wrote the help articles and customer personas, tested on real phones and prepared the pitch.

We used an AI coding assistant (Anthropic's Claude) the way many engineering teams do now: to help write and refactor code, explain errors, draft tests and speed up debugging. The team set the requirements, reviewed the changes, tested every flow on web, Android and iPhone, and owns the result.

## For the technical team: where to look when debugging

| Symptom | Start here |
|---|---|
| Answer looks generic or like a template | The `engine` field on the chat reply: `template` means Claude was unavailable or the figure check replaced the answer. Check the AI service logs for "untraceable amounts" |
| Question was declined unexpectedly | `guard.classify()` in `services/ai/guard.py`, plus the security events in the bank console |
| Slow answers | The `latency_ms` on stored chats (NURU HQ), and `NURU_MODEL` / `NURU_EFFORT` on the AI service |
| Voice silent or robotic | `GET /api/voice/status` shows which voice providers have keys. The API logs show which provider served each request |
| Face check fails for the right person | `faceMatch` in `services/api/internal/httpapi/security.go` (0.5, lower is stricter), plus lighting and camera |
| "Hey NURU" doesn't respond | The switch under Language and voice, microphone and speech permissions, and that the app is open in the foreground |
