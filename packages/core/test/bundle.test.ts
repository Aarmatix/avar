// AVAR 1.0 Bundle layer — conformance smoke tests.
// Builds a stored (uncompressed) ZIP in-memory so the test exercises the
// reader, the manifest binding, and the verdict rules without fixtures.

import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync, crc32 } from "node:zlib";
import { canonicalize, sha256Hex, verifyBundleBytes, parseBundle, SPEC_VERSION } from "../dist/index.js";

function storedZip(files: Record<string, Buffer>): Uint8Array {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const [name, data] of Object.entries(files)) {
    const nameBytes = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);
    locals.push(local, data);

    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 10); // stored
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt32LE(offset, 42);
    nameBytes.copy(cd, 46);
    central.push(cd);

    offset += local.length + data.length;
  }

  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(central.length, 8);
  eocd.writeUInt16LE(central.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, cdBuf, eocd]));
}

function bundleOf(entries: Record<string, unknown>[], overrides: Record<string, unknown> = {}) {
  const ndjson = entries.map((e) => canonicalize(e)).join("\n") + (entries.length ? "\n" : "");
  const ndjsonBuf = Buffer.from(ndjson, "utf8");
  const manifest = {
    format: SPEC_VERSION,
    generatedAt: "2026-01-01T00:00:00.000Z",
    producer: { name: "test", version: "0.0.0" },
    entryCount: entries.length,
    entriesSha256: sha256Hex(new Uint8Array(ndjsonBuf)),
    chainHead: { entryHash: "", index: -1 },
    devicePublicKeys: [],
    ...overrides,
  };
  return storedZip({
    "SPEC-VERSION": Buffer.from(`${SPEC_VERSION}\n`, "utf8"),
    "manifest.json": Buffer.from(canonicalize(manifest), "utf8"),
    "entries.ndjson": ndjsonBuf,
    "pubkeys.json": Buffer.from(canonicalize({ keys: [] }), "utf8"),
  });
}

test("empty bundle is valid", () => {
  const report = verifyBundleBytes(bundleOf([]));
  assert.equal(report.verdict, "valid");
  assert.equal(report.entryCount, 0);
  assert.equal(report.compatibility.verdict, "readable");
});

test("unsigned entry downgrades to valid-with-warnings", () => {
  const report = verifyBundleBytes(
    bundleOf([{ id: "a", ts: 1, workspaceId: "w", queryRedacted: "", steps: [], outcome: "ok" }]),
  );
  assert.equal(report.verdict, "valid-with-warnings");
  assert.equal(report.unsignedCount, 1);
});

test("manifest digest mismatch is invalid", () => {
  const report = verifyBundleBytes(
    bundleOf([{ id: "a", ts: 1, workspaceId: "w", steps: [] }], {
      entriesSha256: "0".repeat(64),
    }),
  );
  assert.equal(report.verdict, "invalid");
  assert.ok(report.issues.some((i) => i.kind === "entries-sha256-mismatch"));
});

test("unknown fields are named, never fatal", () => {
  const report = verifyBundleBytes(
    bundleOf([{ id: "a", ts: 1, workspaceId: "w", steps: [], "x-extra": 1 }]),
  );
  assert.equal(report.compatibility.verdict, "readable-with-unresolved");
  assert.deepEqual(
    report.compatibility.unresolved.map((u) => u.path),
    ["entry.x-extra"],
  );
});

test("a deflated container round-trips through the reader", () => {
  const payload = Buffer.from("hello".repeat(200), "utf8");
  assert.ok(deflateRawSync(payload).length < payload.length);
  const parsed = parseBundle(bundleOf([]));
  assert.equal(parsed.specVersion, SPEC_VERSION);
  assert.equal(parsed.entries.length, 0);
});
