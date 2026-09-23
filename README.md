# Orb Loop Director

Orb Loop Director turns the visual 3D orb into a **continuous right-side interaction and execution surface**.

The orb is not a chat button. It is the persistent control point for a live loop:

```text
SENSE → UNDERSTAND → ACT → SHOW → STEER → CONTINUE / CLOSE
```

The right rail explains and controls execution. The orb preserves continuity.

## Core interaction contract

1. **Sense** input from tap, text, voice transcript, current-screen context, or agent events.
2. **Understand** intent, context, urgency, permissions, and the smallest executable next action.
3. **Act** immediately for small/reversible work. Dispatch an agent/tool for substantial work.
4. **Show** live execution evidence in the right rail.
5. **Steer** from any active state. User intervention is a steering signal, not a new request.
6. **Reconcile** only the affected delta. Preserve valid completed work.
7. **Continue** execution without forcing a new conversation.
8. **Close** only as done, failed-with-evidence, blocked-for-authority, or explicitly cancelled.

## UX states

```text
IDLE
  ↓
LISTENING
  ↓
UNDERSTANDING
  ↓
ACTING ──────────────┐
  ↓                  │
SHOWING_EVIDENCE     │
  ↓                  │
RESULT               │
                     │
ANY ACTIVE STATE ── STEER
                     ↓
                  RECONCILE
                     ↓
                   RESUME
```

For long-running work:

```text
ACTING → DISPATCHED → LIVE_EVIDENCE → RESULT → NEXT_ACTION
```

## Timing targets

- 0–100 ms: visible acknowledgement
- <500 ms: interpreted intent or state transition visible
- <1 s: begin executable action when possible
- During execution: evidence streams continuously
- At any moment: steering input takes priority over the previous plan

## State object

The loop carries one compact state object across direct actions and agent handoffs:

```ts
type OrbLoopState = {
  sessionId: string;
  state: LoopState;
  intent?: string;
  currentContext: Record<string, unknown>;
  activeGoal?: string;
  executionOwner?: string;
  actionsRunning: RunningAction[];
  evidence: EvidenceItem[];
  latestResult?: unknown;
  confidence?: number;
  needsUserAuthority: boolean;
  nextAction?: string;
  revision: number;
};
```

See:

- `docs/RIGHT_INTERACTIVE_LOOP_SPEC.md` for the full process and UX contract.
- `src/orbLoopDirector.ts` for a framework-neutral reference implementation.

## Design rule

> User interaction is a steering signal, not the beginning of a new request.

The orb remains persistent. The right rail can expand and collapse, but the execution state survives that presentation change.
