// AVAR 1.0 (Normative) — compatibility contract (SPEC §6.4).
//
// One question, answered from bytes alone: may this implementation state a
// verdict about this artifact, and under whose semantics?

export const COMPAT_SPEC_ID = "avar/compat/1.0";
export const SUPPORTED_MAJORS: readonly number[] = [1];
export const READABILITY_HORIZON_YEARS = 10;

export type Readability = "readable" | "readable-with-unresolved" | "refused";

export interface UnresolvedField {
  path: string;
  class: "extension" | "unknown";
}

export interface CompatibilityReport {
  spec: typeof COMPAT_SPEC_ID;
  verdict: Readability;
  writer: string;
  semanticsInForce: string | null;
  unresolved: UnresolvedField[];
  refusalReason: "writer-major-unsupported" | "writer-version-unparseable" | null;
  detail: string;
}

interface ParsedVersion {
  family: string;
  major: number;
  minor: number | null;
}

export function parseSpecVersion(input: string): ParsedVersion | null {
  if (typeof input !== "string") return null;
  const match = /^([a-z][a-z0-9-]*)\/(\d+)(?:\.(\d+))?$/.exec(input.trim());
  if (!match) return null;
  return {
    family: match[1]!,
    major: Number(match[2]),
    minor: match[3] === undefined ? null : Number(match[3]),
  };
}

function render(v: ParsedVersion): string {
  return v.minor === null ? `${v.family}/${v.major}` : `${v.family}/${v.major}.${v.minor}`;
}

const byPath = (a: UnresolvedField, b: UnresolvedField) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0;

/** Name every field an implementation did not consume. Sorted and stable. */
export function unresolvedFieldsOf(
  record: unknown,
  knownFields: readonly string[],
  prefix = "",
): UnresolvedField[] {
  if (!record || typeof record !== "object" || Array.isArray(record)) return [];
  const known = new Set(knownFields);
  const out: UnresolvedField[] = [];
  for (const key of Object.keys(record as Record<string, unknown>)) {
    if (known.has(key)) continue;
    out.push({
      path: prefix ? `${prefix}.${key}` : key,
      class: key.startsWith("x-") ? "extension" : "unknown",
    });
  }
  return out.sort(byPath);
}

export function evaluateCompatibility(input: {
  writerSpecVersion: string;
  unresolved?: readonly UnresolvedField[];
  supportedMajors?: readonly number[];
}): CompatibilityReport {
  const supported = input.supportedMajors ?? SUPPORTED_MAJORS;
  const unresolved = [...(input.unresolved ?? [])].sort(byPath);
  const writer = parseSpecVersion(input.writerSpecVersion);

  if (!writer) {
    return {
      spec: COMPAT_SPEC_ID,
      verdict: "refused",
      writer: String(input.writerSpecVersion),
      semanticsInForce: null,
      unresolved,
      refusalReason: "writer-version-unparseable",
      detail: `Refused: spec version "${String(input.writerSpecVersion)}" cannot be interpreted.`,
    };
  }

  if (!supported.includes(writer.major)) {
    return {
      spec: COMPAT_SPEC_ID,
      verdict: "refused",
      writer: render(writer),
      semanticsInForce: null,
      unresolved,
      refusalReason: "writer-major-unsupported",
      detail: `Refused: written under ${render(writer)}; this implementation reads ${supported
        .map((m) => `${writer.family}/${m}`)
        .join(", ")}.`,
    };
  }

  const semantics = render(writer);
  if (unresolved.length === 0) {
    return {
      spec: COMPAT_SPEC_ID,
      verdict: "readable",
      writer: semantics,
      semanticsInForce: semantics,
      unresolved,
      refusalReason: null,
      detail: `Readable under ${semantics}.`,
    };
  }

  return {
    spec: COMPAT_SPEC_ID,
    verdict: "readable-with-unresolved",
    writer: semantics,
    semanticsInForce: semantics,
    unresolved,
    refusalReason: null,
    detail: `Readable under ${semantics}; ${unresolved.length} field${
      unresolved.length === 1 ? "" : "s"
    } unresolved: ${unresolved.map((u) => u.path).join(", ")}.`,
  };
}
