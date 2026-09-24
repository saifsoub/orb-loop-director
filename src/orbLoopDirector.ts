export type LoopState =
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

export type EvidenceItem = {
  id: string;
  at: string;
  source: string;
  kind: "status" | "tool" | "agent" | "result" | "error";
  message: string;
  data?: unknown;
};

export type RunningAction = {
  id: string;
  owner: string;
  description: string;
  startedAt: string;
  status: "queued" | "running" | "cancelled" | "superseded";
};

export type OrbLoopState = {
  sessionId: string;
  state: LoopState;
  originalIntent?: string;
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

export type LoopEvent =
  | { type: "USER_INPUT"; input: string; context?: Record<string, unknown> }
  | { type: "VOICE_INPUT"; transcript: string; context?: Record<string, unknown> }
  | { type: "AGENT_DISPATCHED"; action: RunningAction }
  | { type: "EVIDENCE"; item: EvidenceItem }
  | { type: "ACTION_RESULT"; actionId: string; result: unknown }
  | { type: "ACTION_FAILED"; actionId: string; error: unknown }
  | { type: "STEER"; instruction: string }
  | { type: "AUTHORITY_REQUIRED"; reason: string; nextAction?: string }
  | { type: "CANCEL" };

export function createOrbLoopState(sessionId: string): OrbLoopState {
  return {
    sessionId,
    state: "IDLE",
    currentContext: {},
    actionsRunning: [],
    evidence: [],
    needsUserAuthority: false,
    revision: 0,
  };
}

export function reduceOrbLoop(
  state: OrbLoopState,
  event: LoopEvent,
): OrbLoopState {
  switch (event.type) {
    case "USER_INPUT":
    case "VOICE_INPUT": {
      const input =
        event.type === "USER_INPUT" ? event.input : event.transcript;

      return {
        ...state,
        state: "UNDERSTANDING",
        originalIntent: state.originalIntent ?? input,
        intent: input,
        activeGoal: input,
        currentContext: {
          ...state.currentContext,
          ...(event.context ?? {}),
        },
        needsUserAuthority: false,
        revision: state.revision + 1,
      };
    }

    case "AGENT_DISPATCHED":
      return {
        ...state,
        state: "DISPATCHED",
        executionOwner: event.action.owner,
        actionsRunning: [...state.actionsRunning, event.action],
      };

    case "EVIDENCE":
      return {
        ...state,
        state: "SHOWING_EVIDENCE",
        evidence: [event.item, ...state.evidence],
      };

    case "ACTION_RESULT":
      if (!state.actionsRunning.some(
        (action) => action.id === event.actionId && action.status === "running",
      )) return state;
      return {
        ...state,
        state: "RESULT",
        actionsRunning: state.actionsRunning.filter(
          (action) => action.id !== event.actionId,
        ),
        latestResult: event.result,
      };

    case "ACTION_FAILED":
      if (!state.actionsRunning.some(
        (action) => action.id === event.actionId && action.status === "running",
      )) return state;
      return {
        ...state,
        state: "FAILED",
        actionsRunning: state.actionsRunning.filter(
          (action) => action.id !== event.actionId,
        ),
        latestResult: event.error,
      };

    case "STEER":
      return {
        ...state,
        state: "RECONCILING",
        intent: event.instruction,
        activeGoal: event.instruction,
        actionsRunning: state.actionsRunning.map((action) =>
          action.status === "running"
            ? { ...action, status: "superseded" }
            : action,
        ),
        revision: state.revision + 1,
      };

    case "AUTHORITY_REQUIRED":
      return {
        ...state,
        state: "BLOCKED_AUTHORITY",
        needsUserAuthority: true,
        nextAction: event.nextAction,
        latestResult: event.reason,
      };

    case "CANCEL":
      return {
        ...state,
        state: "CANCELLED",
        actionsRunning: state.actionsRunning.map((action) => ({
          ...action,
          status: "cancelled",
        })),
        nextAction: undefined,
      };

    default:
      return state;
  }
}

export function canSteer(state: OrbLoopState): boolean {
  return !["DONE", "FAILED", "CANCELLED"].includes(state.state);
}

export function completeLoop(
  state: OrbLoopState,
  result?: unknown,
): OrbLoopState {
  return {
    ...state,
    state: "DONE",
    latestResult: result ?? state.latestResult,
    actionsRunning: [],
    nextAction: undefined,
  };
}
