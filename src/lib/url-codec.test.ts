import { decodeCode, encodeCode } from "@/lib/url-codec";
import { describe, expect, it } from "vite-plus/test";

describe("url-codec", () => {
  it.each([
    ["empty", ""],
    ["ascii", "const answer = 42;\n"],
    ["multibyte", '// 日本語のコメント 🎨\nconst 変数 = "値";\n'],
    ["crlf", "line one\r\nline two\r\n"],
    ["lone surrogate free emoji", "// 👩‍💻👨‍👩‍👧‍👦"],
    ["trailing whitespace", "  \t \n\n  "],
    ["large", "x".repeat(200_000)],
  ])("round-trips %s", (_name, code) => {
    expect(decodeCode(encodeCode(code))).toBe(code);
  });

  it("encodes empty input to an empty token so the param can be omitted", () => {
    expect(encodeCode("")).toBe("");
  });

  it("produces a token safe to drop straight into a query string", () => {
    const token = encodeCode("const a = { b: 1 } // ~!@#$%^&*()+=/?\n".repeat(20));
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodeURIComponent(token)).toBe(token);
  });

  it("compresses repetitive code well below its source length", () => {
    const code = "console.log('hello');\n".repeat(200);
    expect(encodeCode(code).length).toBeLessThan(code.length / 10);
  });

  it.each([
    ["not base64url", "!!!!"],
    ["valid base64 but not deflate data", "aGVsbG8gd29ybGQ"],
  ])("throws on %s rather than guessing a repair", (_name, token) => {
    expect(() => decodeCode(token)).toThrow();
  });
});
