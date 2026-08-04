// AVAR 1.0 (Normative) — Bundle layer (SPEC §5) and Verification Result (SPEC §6).
//
// A Bundle is packaging over Entries, never a second object model. This module
// reads the ZIP container with the platform's own inflate, so the reference
// implementation stays dependency-free and auditable end to end.

import { inflateRawSync } from "node:zlib";
import { canonicalize } from "./canonicalize.js";
import {
  GENESIS_PREV_HASH,
  GENESIS_PREV_STEP_HASH,
  deviceFingerprintOf,
  entryHashOf,
  sha256Hex,
  signedBody,
  stepHashOf,
  verifyBytes,
  verifyCanonical,
} from "./chain.js";
import { ENTRY_FIELDS_1_0, type Entry, type Step } from "./entry.js";
import {
  evaluateCompatibility,
  unresolvedFieldsOf,
  type CompatibilityReport,
  type UnresolvedField,
} from "./compat.js";

export const SPEC_VERSION = "avar/1";

export type IssueKind =
  | "spec-version-mismatch"
  | "manifest-invalid"
  | "entries-parse-failed"
  | "entries-sha256-mismatch"
  | "fingerprint-mismatch"
  | "signature-invalid"
  | "signature-unsupported"
  | "chain-broken"
  | "partial-step-chain"
  | "step-chain-broken"
  | "agent-signature-invalid"
  | "agent-key-unresolved"
  | "closure-invalid"
  | "closure-duplicate"
  | "closure-violated";

export interface Issue {
  index: number;
  kind: IssueKind;
  detail?: string;
}

export interface BundleManifest {
  format: string;
  generatedAt?: string;
  producer?: { name?: string; version?: string };
  entryCount?: number;
  entriesSha256?: string;
  chainHead?: { entryHash: string; index: number };
  devicePublicKeys?: string[];
}

export interface Bundle {
  specVersion: string;
  manifest: BundleManifest;
  entries: Entry[];
  entriesNdjsonBytes: Uint8Array;
}

export type Verdict = "valid" | "valid-with-warnings" | "closed" | "invalid";

export interface VerificationReport {
  formatOk: boolean;
  entriesSha256Ok: boolean;
  chainOk: boolean;
  perStepChainOk: boolean;
  signaturesOk: boolean;
  fingerprintsOk: boolean;
  agentSignaturesOk: boolean;
  agentSignaturesChecked: number;
  agentSignaturesUnresolved: number;
  entryCount: number;
  signedCount: number;
  unsignedCount: number;
  unchainedCount: number;
  chainHead: { entryHash: string; index: number };
  issues: Issue[];
  closure?: {
    workspaceId: string;
    reason: string;
    closedAt: number;
    closedEntryCount: number;
    index: number;
  };
  compatibility: CompatibilityReport;
  verdict: Verdict;
}

// ---------------------------------------------------------------- ZIP reader

/** Minimal reader for the stored/deflated ZIP entries AVAR bundles use. */
export function readZip(bytes: Uint8Array): Record<string, Uint8Array> {
  const buf = Buffer.from(bytes);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a ZIP archive: end-of-central-directory not found");

  const count = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);
  const out: Record<string, Uint8Array> = {};

  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) throw new Error("corrupt central directory");
    const method = buf.readUInt16LE(ptr + 10);
    const compressedSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString("utf8", ptr + 46, ptr + 46 + nameLen);

    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) out[name] = new Uint8Array(raw);
    else if (method === 8) out[name] = new Uint8Array(inflateRawSync(raw));
    else throw new Error(`unsupported ZIP compression method ${method} for ${name}`);

    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** SPEC §5 — parse a `.avar.zip` container into its three layers. */
export function parseBundle(bytes: Uint8Array): Bundle {
  const files = readZip(bytes);
  const decoder = new TextDecoder();

  const specFile = files["SPEC-VERSION"];
  const manifestFile = files["manifest.json"];
  const entriesFile = files["entries.ndjson"];
  if (!manifestFile) throw new Error("bundle is missing manifest.json");
  if (!entriesFile) throw new Error("bundle is missing entries.ndjson");

  const manifest = JSON.parse(decoder.decode(manifestFile)) as BundleManifest;
  const text = decoder.decode(entriesFile);
  const entries: Entry[] = text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Entry);

  return {
    specVersion: specFile ? decoder.decode(specFile).trim() : "",
    manifest,
    entries,
    entriesNdjsonBytes: entriesFile,
  };
}

// ------------------------------------------------------------- verification

/** SPEC §6 — verify a parsed Bundle. No network I/O, ever. */
export function verifyBundle(bundle: Bundle): VerificationReport {
  const issues: Issue[] = [];

  // 1. Compatibility (SPEC §6.4).
  const unresolved: UnresolvedField[] = [];
  const seen = new Set<string>();
  for (const entry of bundle.entries) {
    for (const field of unresolvedFieldsOf(entry, ENTRY_FIELDS_1_0, "entry")) {
      if (seen.has(field.path)) continue;
      seen.add(field.path);
      unresolved.push(field);
    }
  }
  const compatibility = evaluateCompatibility({
    writerSpecVersion: bundle.specVersion,
    unresolved,
  });

  // 2. Format.
  let formatOk = true;
  if (bundle.specVersion.trim() !== SPEC_VERSION) {
    formatOk = false;
    issues.push({
      index: -1,
      kind: "spec-version-mismatch",
      detail:
        compatibility.verdict === "refused"
          ? compatibility.detail
          : `Expected "${SPEC_VERSION}", got "${bundle.specVersion}".`,
    });
  }
  if (bundle.manifest.format !== SPEC_VERSION) {
    formatOk = false;
    issues.push({
      index: -1,
      kind: "manifest-invalid",
      detail: `manifest.format expected "${SPEC_VERSION}", got "${String(bundle.manifest.format)}".`,
    });
  }

  // 3. Envelope integrity.
  const actualSha = sha256Hex(bundle.entriesNdjsonBytes);
  const entriesSha256Ok = actualSha === bundle.manifest.entriesSha256;
  if (!entriesSha256Ok) {
    issues.push({
      index: -1,
      kind: "entries-sha256-mismatch",
      detail: `Expected ${String(bundle.manifest.entriesSha256)}, got ${actualSha}.`,
    });
  }

  const entries = bundle.entries;

  // 4-6. Fingerprints and entry signatures.
  let signaturesOk = true;
  let fingerprintsOk = true;
  let signedCount = 0;
  let unsignedCount = 0;

  entries.forEach((entry, index) => {
    const signed = typeof entry.signature === "string" && typeof entry.devicePubKey === "string";
    if (!signed) {
      unsignedCount++;
      return;
    }
    signedCount++;

    if (typeof entry.deviceFingerprint === "string") {
      const expected = deviceFingerprintOf(entry.devicePubKey!);
      if (expected !== entry.deviceFingerprint) {
        fingerprintsOk = false;
        issues.push({
          index,
          kind: "fingerprint-mismatch",
          detail: `Expected ${expected}, got ${entry.deviceFingerprint}.`,
        });
      }
    }

    if (!verifyCanonical(signedBody(entry), entry.signature!, entry.devicePubKey!)) {
      signaturesOk = false;
      issues.push({ index, kind: "signature-invalid" });
    }
  });

  // 7. Agent signatures (SPEC §3.3.3).
  let agentSignaturesOk = true;
  let agentSignaturesChecked = 0;
  let agentSignaturesUnresolved = 0;

  entries.forEach((entry, index) => {
    if (typeof entry.agentSignature !== "string") return;
    const key = entry.agentIdentity?.publicKey;
    if (typeof key !== "string" || key.length === 0) {
      agentSignaturesUnresolved++;
      issues.push({
        index,
        kind: "agent-key-unresolved",
        detail: "agentSignature present but agentIdentity.publicKey missing.",
      });
      return;
    }
    agentSignaturesChecked++;
    const accepted = tailStepHashes(entry).some((tail) =>
      verifyBytes(tail, entry.agentSignature!, key),
    );
    if (!accepted) {
      agentSignaturesOk = false;
      issues.push({
        index,
        kind: "agent-signature-invalid",
        detail: `entry ${index}: agentSignature does not verify against agentIdentity.publicKey.`,
      });
    }
  });

  // 8. Entry chain (SPEC §4.1, §4.3).
  let chainOk = true;
  let unchainedCount = 0;
  let expectedPrev = GENESIS_PREV_HASH;
  let seededPrev = false;

  entries.forEach((entry, index) => {
    if (!entry.entryHash || !entry.prevHash) {
      unchainedCount++;
      expectedPrev = GENESIS_PREV_HASH;
      seededPrev = false;
      return;
    }
    if (!seededPrev) {
      expectedPrev = entry.prevHash;
      seededPrev = true;
    }
    if (entry.prevHash !== expectedPrev) {
      chainOk = false;
      issues.push({ index, kind: "chain-broken", detail: `prevHash mismatch at entry ${index}.` });
    }
    if (entryHashOf(entry, entry.prevHash) !== entry.entryHash) {
      chainOk = false;
      issues.push({
        index,
        kind: "chain-broken",
        detail: `entryHash mismatch at entry ${index} (body modified after signing).`,
      });
    }
    expectedPrev = entry.entryHash;
  });

  // 9. Step chain (SPEC §4.2).
  const perStepChainOk = verifyStepChains(entries, issues);

  // 10. Closure (SPEC §4.4).
  const closureResult = verifyClosure(entries, issues);

  // 11. Chain head.
  const chainHead = headOf(entries);

  // 12. Verdict (SPEC §6.3).
  const hardFail =
    !formatOk ||
    !entriesSha256Ok ||
    !chainOk ||
    !perStepChainOk ||
    !signaturesOk ||
    !fingerprintsOk ||
    !agentSignaturesOk ||
    !closureResult.ok;

  const warnings = unsignedCount > 0 || unchainedCount > 0 || agentSignaturesUnresolved > 0;

  const verdict: Verdict = hardFail
    ? "invalid"
    : warnings
      ? "valid-with-warnings"
      : closureResult.closure
        ? "closed"
        : "valid";

  return {
    formatOk,
    entriesSha256Ok,
    chainOk,
    perStepChainOk,
    signaturesOk,
    fingerprintsOk,
    agentSignaturesOk,
    agentSignaturesChecked,
    agentSignaturesUnresolved,
    entryCount: entries.length,
    signedCount,
    unsignedCount,
    unchainedCount,
    chainHead,
    issues,
    ...(closureResult.closure ? { closure: closureResult.closure } : {}),
    compatibility,
    verdict,
  };
}

/** Convenience: verify raw `.avar.zip` bytes. */
export function verifyBundleBytes(bytes: Uint8Array): VerificationReport {
  let bundle: Bundle;
  try {
    bundle = parseBundle(bytes);
  } catch (err) {
    return unreadable((err as Error).message);
  }
  return verifyBundle(bundle);
}

// ------------------------------------------------------------------ helpers

function tailStepHashes(entry: Entry): string[] {
  const steps = Array.isArray(entry.steps) ? entry.steps : [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const hash = steps[i]?.stepHash;
    if (typeof hash === "string" && hash.length > 0) return [hash];
  }
  return [GENESIS_PREV_STEP_HASH, GENESIS_PREV_HASH];
}

function chained(step: Step): boolean {
  return typeof step.prevStepHash === "string" && typeof step.stepHash === "string";
}

function verifyStepChains(entries: Entry[], issues: Issue[]): boolean {
  let ok = true;
  entries.forEach((entry, index) => {
    const steps = Array.isArray(entry.steps) ? entry.steps : [];
    if (steps.length === 0) return;

    const some = steps.some(chained);
    const all = steps.every(chained);
    if (some && !all) {
      ok = false;
      issues.push({ index, kind: "partial-step-chain" });
      return;
    }
    if (!some) return;

    let prev = GENESIS_PREV_STEP_HASH;
    steps.forEach((step, j) => {
      if (step.prevStepHash !== prev) {
        ok = false;
        issues.push({
          index,
          kind: "step-chain-broken",
          detail: `entry ${index} step ${j}: prevStepHash mismatch.`,
        });
      }
      if (stepHashOf(step, step.prevStepHash!) !== step.stepHash) {
        ok = false;
        issues.push({
          index,
          kind: "step-chain-broken",
          detail: `entry ${index} step ${j}: stepHash mismatch (step body modified).`,
        });
      }
      prev = step.stepHash!;
    });
  });
  return ok;
}

function verifyClosure(
  entries: Entry[],
  issues: Issue[],
): { ok: boolean; closure?: VerificationReport["closure"] } {
  const markers = entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => !!entry.closure);
  if (markers.length === 0) return { ok: true };

  let ok = true;
  const closedBy = new Map<string, number>();

  for (const { entry, index } of markers) {
    const closure = entry.closure!;
    const prior = closedBy.get(closure.workspaceId);
    if (prior !== undefined) {
      ok = false;
      issues.push({
        index,
        kind: "closure-duplicate",
        detail: `workspace "${closure.workspaceId}" already closed by entry ${prior}.`,
      });
    } else {
      closedBy.set(closure.workspaceId, index);
    }

    if (typeof entry.signature !== "string" || typeof entry.devicePubKey !== "string") {
      ok = false;
      issues.push({ index, kind: "closure-invalid", detail: "closure marker is unsigned." });
    }
    if (closure.workspaceId !== entry.workspaceId) {
      ok = false;
      issues.push({
        index,
        kind: "closure-invalid",
        detail: `closure.workspaceId "${closure.workspaceId}" does not match the marker's own workspaceId.`,
      });
    }
    if (closure.finalEntryHash !== (entry.prevHash ?? GENESIS_PREV_HASH)) {
      ok = false;
      issues.push({
        index,
        kind: "closure-invalid",
        detail: "closure.finalEntryHash does not match the marker's prevHash.",
      });
    }
    if (!Number.isFinite(closure.closedAt) || !Number.isFinite(closure.closedEntryCount)) {
      ok = false;
      issues.push({
        index,
        kind: "closure-invalid",
        detail: "closure.closedAt and closure.closedEntryCount must be finite numbers.",
      });
    }

    for (let j = index + 1; j < entries.length; j++) {
      if (entries[j]?.workspaceId !== closure.workspaceId) continue;
      ok = false;
      issues.push({
        index: j,
        kind: "closure-violated",
        detail: `entry appended to workspace "${closure.workspaceId}" after its closure marker at ${index}.`,
      });
      break;
    }
  }

  if (!ok) return { ok: false };

  const last = markers[markers.length - 1]!;
  const closure = last.entry.closure!;
  return {
    ok: true,
    closure: {
      workspaceId: closure.workspaceId,
      reason: closure.reason,
      closedAt: closure.closedAt,
      closedEntryCount: closure.closedEntryCount,
      index: last.index,
    },
  };
}

function headOf(entries: Entry[]): { entryHash: string; index: number } {
  for (let i = entries.length - 1; i >= 0; i--) {
    const hash = entries[i]?.entryHash;
    if (typeof hash === "string" && hash.length > 0) return { entryHash: hash, index: i };
  }
  return { entryHash: "", index: -1 };
}

function unreadable(detail: string): VerificationReport {
  return {
    formatOk: false,
    entriesSha256Ok: false,
    chainOk: false,
    perStepChainOk: false,
    signaturesOk: false,
    fingerprintsOk: false,
    agentSignaturesOk: false,
    agentSignaturesChecked: 0,
    agentSignaturesUnresolved: 0,
    entryCount: 0,
    signedCount: 0,
    unsignedCount: 0,
    unchainedCount: 0,
    chainHead: { entryHash: "", index: -1 },
    issues: [{ index: -1, kind: "manifest-invalid", detail }],
    compatibility: evaluateCompatibility({ writerSpecVersion: "" }),
    verdict: "invalid",
  };
}

/** Canonical JSON of a Verification Result, for byte-comparable conformance. */
export function canonicalReport(report: VerificationReport): string {
  return canonicalize(report as unknown as Record<string, unknown>);
}
