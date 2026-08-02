import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { canonicalize } from "../dist/index.js";
import {
  verifyRecoveryPoint,
  computeRecoveryPointIdentity,
  recoveryPointSignedBody,
  dedupeRecoveryPoints,
  RECOVERY_POINT_KIND,
  type RecoveryPoint,
} from "../dist/index.js";

const hex = (c: string) => c.repeat(64);

function b64u(b: Buffer) {
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function mint(overrides: Partial<RecoveryPoint> = {}): RecoveryPoint {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const rawPub = publicKey.export({ format: "der", type: "spki" }).subarray(12);
  const rp = {
    kind: RECOVERY_POINT_KIND,
    version: 1,
    workspaceId: "ws_demo",
    refs: {
      policyBundleHash: hex("a"),
      authorityFrameVersion: "7",
      identityVersion: "3",
      receiptChainHead: hex("b"),
      configurationDigest: hex("c"),
    },
    identityDigest: "",
    envelope: {
      createdAt: "2026-07-31T00:00:00.000Z",
      provenance: "manual",
      deviceFingerprint: "abc123def456",
      devicePubKey: b64u(Buffer.from(rawPub)),
      signature: "",
    },
    ...overrides,
  } as RecoveryPoint;
  rp.identityDigest = computeRecoveryPointIdentity(rp);
  rp.envelope.signature = b64u(
    edSign(null, Buffer.from(canonicalize(recoveryPointSignedBody(rp)), "utf8"), privateKey),
  );
  return rp;
}

test("verifies a well-formed recovery point", async () => {
  const report = await verifyRecoveryPoint(mint());
  assert.equal(report.ok, true);
  assert.equal(report.digestMatches, true);
  assert.equal(report.signatureVerified, true);
  assert.deepEqual(report.issues, []);
});

test("detects a tampered identity digest", async () => {
  const rp = mint();
  rp.identityDigest = hex("d");
  const report = await verifyRecoveryPoint(rp);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.code === "GRP_DIGEST_MISMATCH"));
});

test("detects a tampered ref", async () => {
  const rp = mint();
  rp.refs.policyBundleHash = hex("e");
  const report = await verifyRecoveryPoint(rp);
  assert.equal(report.ok, false);
});

test("rejects unknown ref keys and secret-shaped fields", async () => {
  const rp = mint() as unknown as Record<string, any>;
  rp.refs.apiKey = "nope";
  const report = await verifyRecoveryPoint(rp);
  assert.equal(report.ok, false);
  assert.ok(report.issues.some((i) => i.code === "GRP_UNKNOWN_REF"));
  assert.ok(report.issues.some((i) => i.code === "GRP_FORBIDDEN_FIELD"));
});

test("rejects the wrong kind", async () => {
  const report = await verifyRecoveryPoint({ ...mint(), kind: "something-else" });
  assert.ok(report.issues.some((i) => i.code === "GRP_WRONG_KIND"));
});

test("dedupes identical governance state deterministically", async () => {
  const a = mint();
  const b = { ...a, envelope: { ...a.envelope, createdAt: "2026-08-01T00:00:00.000Z" } };
  const out = dedupeRecoveryPoints([b, a]);
  assert.equal(out.length, 1);
  assert.equal(out[0].envelope.createdAt, a.envelope.createdAt);
});
