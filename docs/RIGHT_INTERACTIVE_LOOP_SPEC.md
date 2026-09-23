# Right Interactive Loop Specification

## 1. Purpose

Convert the Orb from a visual/ambient object into a persistent interaction director that keeps one continuous execution context while work moves between direct actions, tools, and agents.

The user should never need to decide which agent, workflow, or execution mode to use unless authority or safety boundaries genuinely require explicit choice.

## 2. Primary loop

```text
SENSE → UNDERSTAND → ACT → SHOW → STEER → RECONCILE → CONTINUE/CLOSE
```

### SENSE
Accepted events:
- text input
- tap/click
- voice transcript
- current-screen/context snapshot
- agent/tool event
- completion/failure event

Output: normalized `LoopEvent`.

### UNDERSTAND
Resolve:
- user intent
- active goal
- current context
- urgency
- required capability
- permissions/authority
- whether the action is direct or delegated

Rules:
- do not ask workflow questions when the system can route deterministically
- do not discard prior valid context
- prefer the smallest reversible executable next step

### ACT
Two execution paths:

**Direct path**
- local/reversible
- low latency
- deterministic enough to execute immediately

**Delegated path**
- long-running
- specialist agent/tool required
- parallel work useful
- remote system required

Delegation must preserve the same `sessionId` and state object.

### SHOW
Right rail must expose:
- current state
- interpreted intent
- execution owner
- active actions
- latest evidence
- latest result
- next action
- authority request only when required

No fake progress. Each status change must be backed by a real event or actual state transition.

### STEER
Allowed from every active state.

Examples:
- stop that
- not this one
- send it to GitHub
- make it smaller
- use the other agent
- continue but keep X
- new direction entirely

Steering does not create a new session by default.

### RECONCILE
On steering:
1. increment state revision
2. mark obsolete actions cancelled/superseded
3. preserve valid completed evidence/results
4. update active goal or next action
5. resume execution from the smallest affected point

### CONTINUE / CLOSE
Continue while executable work remains.

Allowed terminal states:
- `DONE`
- `FAILED` with evidence
- `BLOCKED_AUTHORITY`
- `CANCELLED`

Do not silently drop work.

## 3. State machine

```text
IDLE
LISTENING
UNDERSTANDING
ACTING
DISPATCHED
SHOWING_EVIDENCE
STEERING
RECONCILING
RESULT
DONE
FAILED
BLOCKED_AUTHORITY
CANCELLED
```

Important invariant:

```text
STEER is reachable from every non-terminal active state.
```

## 4. State payload

```ts
type LoopState =
  | "IDLE"
  | "LISTENING"
  | "UNDERSTANDING"
  | "ACTING"
  | "DISPATCHED"
  | "SHOWING_EVIDENCE"
  | "STEERING"
  | "RECONCILING"
  | "RESULT"
  | "DONE"
  | "FAILED"
  | "BLOCKED_AUTHORITY"
  | "CANCELLED";

type EvidenceItem = {
  id: string;
  at: string;
  source: string;
  kind: "status" | "tool" | "agent" | "result" | "error";
  message: string;
  data?: unknown;
};

type RunningAction = {
  id: string;
  owner: string;
  description: string;
  startedAt: string;
  status: "queued" | "running" | "cancelled" | "superseded";
};

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

## 5. Event contract

```ts
type LoopEvent =
  | { type: "USER_INPUT"; input: string; context?: Record<string, unknown> }
  | { type: "VOICE_INPUT"; transcript: string; context?: Record<string, unknown> }
  | { type: "AGENT_DISPATCHED"; action: RunningAction }
  | { type: "EVIDENCE"; item: EvidenceItem }
  | { type: "ACTION_RESULT"; actionId: string; result: unknown }
  | { type: "ACTION_FAILED"; actionId: string; error: unknown }
  | { type: "STEER"; instruction: string }
  | { type: "AUTHORITY_REQUIRED"; reason: string; nextAction?: string }
  | { type: "CANCEL" };
```

## 6. Right rail behavior

The right rail is not a transcript.

It is a compact live execution surface composed of:

1. **Now**
   - current state
   - one-line interpreted intent

2. **Doing**
   - execution owner
   - active actions
   - progress only when real progress exists

3. **Evidence**
   - newest verified execution events first
   - expandable history

4. **Steer**
   - persistent input
   - interrupt/cancel controls
   - shortcuts for common revisions

5. **Result / Next**
   - latest usable result
   - next action when work remains

Collapse of the rail must not terminate or reset the loop.

## 7. Routing rules

```text
IF direct + reversible + low-risk
  → execute now

ELSE IF authority required
  → BLOCKED_AUTHORITY

ELSE
  → dispatch best available agent/tool
  → preserve sessionId
  → stream evidence
```

The UI should not expose routing complexity unless useful for transparency.

## 8. Interruption semantics

New user input during execution is classified as either:

- **steer**: modifies current goal or execution
- **append**: adds work without invalidating current action
- **replace**: supersedes current goal
- **cancel**: terminates selected/all running actions

Default behavior is `steer`, not start-new-session.

## 9. Evidence requirements

Every externally visible status must map to one of:
- state transition
- tool invocation acknowledgement
- agent dispatch acknowledgement
- received tool/agent output
- verified result
- verified failure

Avoid inferred phrases such as "almost done" without measurable evidence.

## 10. Acceptance criteria

Implementation is correct when:

- the orb remains persistent throughout a task
- the right rail reflects live state without becoming a normal chat transcript
- a user can steer during any active state
- valid completed work survives steering
- agent/tool handoff preserves context and session
- no work vanishes silently
- terminal state is explicit
- evidence is truthful and attributable
- UI collapse/reopen preserves the same active loop
- routing happens without unnecessary workflow questions
