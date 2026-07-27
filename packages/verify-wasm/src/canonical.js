// Canonical JSON serializer for AVAR — reimplemented from the AVAR
// spec (§ Canonicalization) inside this package. NOT imported from
// @avar-standard/verify: canonicalization defects are the most likely
// source of interoperability bugs, so this package MUST have its own.
//
// Rules (AVAR spec, canonical form):
//   - Objects: keys sorted lexicographically (UTF-16 code units).
//   - Arrays: order preserved.
//   - Strings: JSON-escaped, minimum escapes.
//   - Numbers: finite only; integers rendered without decimal;
//     non-integers use the shortest round-trip form.
//   - null, true, false: literal.
//   - No whitespace between tokens.
//   - undefined / functions / symbols: rejected (throws).

export function canonicalize(value) {
  const out = [];
  encode(value, out);
  return out.join("");
}

function encode(v, out) {
  if (v === null) return out.push("null");
  const t = typeof v;
  if (t === "boolean") return out.push(v ? "true" : "false");
  if (t === "number") {
    if (!Number.isFinite(v)) throw new Error("canonical: non-finite number");
    return out.push(Number.isInteger(v) ? v.toFixed(0) : String(v));
  }
  if (t === "string") return out.push(encodeString(v));
  if (Array.isArray(v)) {
    out.push("[");
    for (let i = 0; i < v.length; i++) {
      if (i > 0) out.push(",");
      encode(v[i], out);
    }
    return out.push("]");
  }
  if (t === "object") {
    const keys = Object.keys(v).sort();
    out.push("{");
    for (let i = 0; i < keys.length; i++) {
      if (i > 0) out.push(",");
      out.push(encodeString(keys[i]));
      out.push(":");
      encode(v[keys[i]], out);
    }
    return out.push("}");
  }
  throw new Error("canonical: unsupported value type: " + t);
}

function encodeString(s) {
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
