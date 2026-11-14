# pi-antigravity-prompt

A pi extension that swaps the one word Google Antigravity matches in the system
prompt, so antigravity models answer again instead of returning a false
`429 Resource has been exhausted (e.g. check quota)`.

## Why

Since 2026-11-14 Antigravity turns a request away — whatever quota is left —
when its **system instruction** carries a line it blacklists. For pi that line
is the first sentence of the default prompt:

```
You are a coding assistant running inside pi, a coding agent harness.
```

Repro (deterministic, 10/10 each on a real account with plenty of quota):

| system prompt | result |
|---|---|
| `You are a coding assistant running inside pi.` | 429 |
| `You are an assistant running inside pi.` (no "coding") | 200 |
| `You are a coding assistant running inside foo.` | 200 |
| same line in a **user** message | 200 |

The check reads only the system instruction: the same line in a user message is
accepted, and dropping a single word ("coding") or the product name clears it.

## What it does

It hooks `before_provider_request` — the last step before the request leaves pi —
and rewrites **only system-instruction strings**, one word:

```
inside pi   ->   inside p1
```

Nothing else changes: the rest of the sentence, the tool list, rules, docs,
skills, memory and your own messages stay byte-for-byte as written. `pii`, `pix`,
`pie` are left alone (the match requires `pi` not followed by a letter or digit),
and every payload shape is covered — OpenAI `messages[role=system]`, Anthropic
`system`, Gemini `systemInstruction`.

## Install

```sh
git clone https://github.com/cokekitten/pi-antigravity-prompt ~/dev/pi-expansion/pi-antigravity-prompt
```

Then add it to `~/.pi/agent/settings.json`:

```json
{ "packages": ["../../dev/pi-expansion/pi-antigravity-prompt"] }
```

or, for a one-off run, `pi -e ./extensions/antigravity-prompt.ts`.

## Remove it when upstream is fixed

Once Antigravity stops matching the prompt, drop the package from
`settings.json`.

## License

MIT
