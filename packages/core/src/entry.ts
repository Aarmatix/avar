// AVAR 1.0 (Normative) — Entry, the canonical atom of the standard.
//
// Written from the public normative specification (SPEC.md §3). Structural
// types only: an implementation of the standard must be able to read every
// field the standard defines, and must treat everything else as opaque.

export type Outcome = "ok" | "error" | "aborted";

export interface StepBase {
  ts: number;
  prevStepHash?: string;
  stepHash?: string;
  [k: string]: unknown;
}

export interface ToolStep extends StepBase {
  kind: "tool";
  tool: string;
  argsRedacted?: unknown;
  outputPreview?: string;
  ok?: boolean;
}

export interface TextStep extends StepBase {
  kind: "text";
  preview: string;
}

export interface DecisionStep extends StepBase {
  kind: "decision";
  tool: string;
  decision: string;
  source: string;
}

export type Step = ToolStep | TextStep | DecisionStep | StepBase;

export interface ClosureBlock {
  workspaceId: string;
  reason: string;
  closedAt: number;
  finalEntryHash: string;
  closedEntryCount: number;
  note?: string;
}

export interface AgentIdentity {
  agentId?: string;
  alg?: string;
  fingerprint?: string;
  publicKey?: string;
}

export interface Entry {
  id: string;
  ts: number;
  workspaceId: string;
  queryRedacted?: string;
  steps?: Step[];
  outcome?: Outcome;

  deviceFingerprint?: string;
  prevHash?: string;
  entryHash?: string;
  signature?: string;
  devicePubKey?: string;

  agentIdentity?: AgentIdentity;
  agentSignature?: string;
  closure?: ClosureBlock;

  [k: string]: unknown;
}

/**
 * Field names AVAR 1.0 defines for an Entry. Anything outside this set is
 * reported as unresolved (SPEC §6.4) — named, never dropped, never fatal.
 */
export const ENTRY_FIELDS_1_0: readonly string[] = [
  "agentColor",
  "agentEmoji",
  "agentId",
  "agentIdentity",
  "agentName",
  "agentSignature",
  "closure",
  "costUsd",
  "delegationChain",
  "deviceFingerprint",
  "devicePubKey",
  "entryHash",
  "finishedAt",
  "frameworks",
  "governance",
  "id",
  "inputTokens",
  "intent",
  "intentHash",
  "lineage",
  "model",
  "origin",
  "outcome",
  "outputTokens",
  "parentReceipt",
  "parentTraceId",
  "policyFingerprint",
  "policyIssuer",
  "prevHash",
  "provider",
  "queryRedacted",
  "seatId",
  "seed",
  "signature",
  "steps",
  "systemFingerprint",
  "ts",
  "workspaceId",
];
