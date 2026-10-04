# Orb Loop Director — plain-language README

## What this is
A design and a piece of reference code for an on-screen assistant shown as a glowing 3D ball ("orb"). You talk to or tap the orb, and a side panel on the right shows what the assistant is doing. You can change direction at any time without starting over.

## Who it's for
Designers and developers building an assistant screen that should feel continuous and responsive.

## What it does today
- Describes the assistant's steps:
  1. take in what you said or did
  2. work out what you want
  3. do it, or hand it to a helper if it's big
  4. show progress in the side panel
  5. let you redirect it at any moment
  6. finish (done, failed with a reason, waiting for your permission, or cancelled)
- Sets speed goals:
  - visible response within 0.1 seconds
  - show it understood within half a second
  - start acting within 1 second where possible
- Keeps one shared record of the session: what you first asked, what it's doing now, progress so far and what's next. Your first request is never overwritten when you redirect it.
- Reference code in `src/orbLoopDirector.ts` that isn't tied to any one web framework.
- Tests in `tests/`.

The repo description also mentions drag-to-spin, location markers and video/GIF loop export. Whether those are in this code is not yet confirmed.

## How to run it
There is no `package.json` at the top level, so the exact install and test commands are not yet confirmed. Check `.github/` for the automatic checks.

## Current status and known gaps
- Mostly a written design (`docs/RIGHT_INTERACTIVE_LOOP_SPEC.md`) plus reference code. It is not a finished app.

## Where things live
| Folder | What's in it |
|---|---|
| `src/` | Reference code |
| `docs/` | Full design write-up |
| `tests/` | Automated checks |
| `.github/` | GitHub automatic checks |

License: see `LICENSE`.
