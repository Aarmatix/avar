// RFC-8785 JSON Canonicalization Scheme (JCS).
// Implemented from the public IETF RFC-8785 text, referenced by
// AVAR RFC-0009 §3. No code lineage from any commercial implementation.
//
// Rules (RFC-8785):
//  - Object keys sorted by UTF-16 code unit
//  - No insignificant whitespace
//  - Strings serialized per RFC-8259 with minimum escaping
//  - Numbers serialized per ECMAScript Number.prototype.toString (§3.2.2.2)

export function canonicalize(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return canonicalNumber(value);
  if (typeof value === "string") return canonicalString(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined);
    // UTF-16 code-unit sort (default JS string compare is code-unit)
    keys.sort();
    const parts = keys.map(
      (k) => canonicalString(k) + ":" + canonicalize(obj[k]),
    );
    return "{" + parts.join(",") + "}";
  }
  throw new TypeError(`unsupported value type: ${typeof value}`);
}

function canonicalNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new RangeError("non-finite numbers not permitted by RFC-8785");
  }
  if (n === 0) return "0";
  // ECMAScript Number.prototype.toString produces the shortest round-trip form.
  return String(n);
}

function canonicalString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x22) out += '\\"';
    else if (c === 0x5c) out += "\\\\";
    else if (c === 0x08) out += "\\b";
    else if (c === 0x09) out += "\\t";
    else if (c === 0x0a) out += "\\n";
    else if (c === 0x0c) out += "\\f";
    else if (c === 0x0d) out += "\\r";
    else if (c < 0x20) out += "\\u" + c.toString(16).padStart(4, "0");
    else out += s[i];
  }
  return out + '"';
}
