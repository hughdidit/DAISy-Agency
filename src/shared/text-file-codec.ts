export type SupportedTextFileEncoding = "utf-8" | "utf-16le" | "utf-16be";

export type DecodedTextFile =
  | {
      textEditable: true;
      textContent: string;
      encoding: SupportedTextFileEncoding;
      includeBom: boolean;
    }
  | {
      textEditable: false;
      textError: string;
    };

const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
const UTF16LE_BOM = new Uint8Array([0xff, 0xfe]);
const UTF16BE_BOM = new Uint8Array([0xfe, 0xff]);

function startsWithBytes(input: Uint8Array, prefix: Uint8Array): boolean {
  if (input.length < prefix.length) {
    return false;
  }
  for (let index = 0; index < prefix.length; index += 1) {
    if (input[index] !== prefix[index]) {
      return false;
    }
  }
  return true;
}

function sliceBom(
  input: Uint8Array,
  encoding: SupportedTextFileEncoding,
): { bytes: Uint8Array; includeBom: boolean } {
  if (encoding === "utf-8" && startsWithBytes(input, UTF8_BOM)) {
    return { bytes: input.subarray(UTF8_BOM.length), includeBom: true };
  }
  if (encoding === "utf-16le" && startsWithBytes(input, UTF16LE_BOM)) {
    return { bytes: input.subarray(UTF16LE_BOM.length), includeBom: true };
  }
  if (encoding === "utf-16be" && startsWithBytes(input, UTF16BE_BOM)) {
    return { bytes: input.subarray(UTF16BE_BOM.length), includeBom: true };
  }
  return { bytes: input, includeBom: false };
}

function countDisallowedControlChars(value: string): number {
  let count = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const allowed =
      code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code !== 0x7f);
    if (!allowed) {
      count += 1;
    }
  }
  return count;
}

function hasSuspiciousControlChars(value: string): boolean {
  if (!value) {
    return false;
  }
  const controlChars = countDisallowedControlChars(value);
  return controlChars > 0 && controlChars / Math.max(value.length, 1) > 0.02;
}

function decodeText(bytes: Uint8Array, encoding: SupportedTextFileEncoding): string {
  return new TextDecoder(encoding, { fatal: true }).decode(bytes);
}

function guessUtf16Encoding(bytes: Uint8Array): SupportedTextFileEncoding | null {
  if (bytes.length < 4 || bytes.length % 2 !== 0) {
    return null;
  }
  const sampleLength = Math.min(bytes.length, 256);
  let zeroEven = 0;
  let zeroOdd = 0;
  let pairCount = 0;
  for (let index = 0; index + 1 < sampleLength; index += 2) {
    if (bytes[index] === 0x00) {
      zeroEven += 1;
    }
    if (bytes[index + 1] === 0x00) {
      zeroOdd += 1;
    }
    pairCount += 1;
  }
  if (pairCount === 0) {
    return null;
  }
  const evenRatio = zeroEven / pairCount;
  const oddRatio = zeroOdd / pairCount;
  if (oddRatio >= 0.3 && evenRatio <= 0.05) {
    return "utf-16le";
  }
  if (evenRatio >= 0.3 && oddRatio <= 0.05) {
    return "utf-16be";
  }
  return null;
}

function tryDecode(
  input: Uint8Array,
  encoding: SupportedTextFileEncoding,
): DecodedTextFile | undefined {
  const { bytes, includeBom } = sliceBom(input, encoding);
  try {
    const textContent = decodeText(bytes, encoding);
    if (hasSuspiciousControlChars(textContent)) {
      return undefined;
    }
    return { textEditable: true, textContent, encoding, includeBom };
  } catch {
    return undefined;
  }
}

export function decodeTextFile(input: Uint8Array): DecodedTextFile {
  if (input.length === 0) {
    return {
      textEditable: true,
      textContent: "",
      encoding: "utf-8",
      includeBom: false,
    };
  }

  if (startsWithBytes(input, UTF8_BOM)) {
    return (
      tryDecode(input, "utf-8") ?? {
        textEditable: false,
        textError: "File is not editable as text.",
      }
    );
  }
  if (startsWithBytes(input, UTF16LE_BOM)) {
    return (
      tryDecode(input, "utf-16le") ?? {
        textEditable: false,
        textError: "File is not editable as text.",
      }
    );
  }
  if (startsWithBytes(input, UTF16BE_BOM)) {
    return (
      tryDecode(input, "utf-16be") ?? {
        textEditable: false,
        textError: "File is not editable as text.",
      }
    );
  }

  const guessedUtf16 = guessUtf16Encoding(input);
  if (guessedUtf16) {
    const decoded = tryDecode(input, guessedUtf16);
    if (decoded) {
      return decoded;
    }
  }

  const utf8Decoded = tryDecode(input, "utf-8");
  if (utf8Decoded) {
    return utf8Decoded;
  }

  return {
    textEditable: false,
    textError: "File is not editable as text.",
  };
}

function encodeUtf16(content: string, littleEndian: boolean): Uint8Array {
  const bytes = new Uint8Array(content.length * 2);
  for (let index = 0; index < content.length; index += 1) {
    const codeUnit = content.charCodeAt(index);
    const offset = index * 2;
    if (littleEndian) {
      bytes[offset] = codeUnit & 0xff;
      bytes[offset + 1] = codeUnit >> 8;
    } else {
      bytes[offset] = codeUnit >> 8;
      bytes[offset + 1] = codeUnit & 0xff;
    }
  }
  return bytes;
}

export function encodeTextFile(params: {
  content: string;
  encoding?: SupportedTextFileEncoding;
  includeBom?: boolean;
}): Uint8Array {
  const encoding = params.encoding ?? "utf-8";
  const includeBom = params.includeBom === true;

  let body: Uint8Array;
  let bom = new Uint8Array();
  if (encoding === "utf-8") {
    body = new TextEncoder().encode(params.content);
    bom = includeBom ? UTF8_BOM : bom;
  } else if (encoding === "utf-16le") {
    body = encodeUtf16(params.content, true);
    bom = includeBom ? UTF16LE_BOM : bom;
  } else {
    body = encodeUtf16(params.content, false);
    bom = includeBom ? UTF16BE_BOM : bom;
  }

  const out = new Uint8Array(bom.length + body.length);
  out.set(bom, 0);
  out.set(body, bom.length);
  return out;
}
