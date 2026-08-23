import { LANGUAGE_IDS, LANGUAGES } from "@/features/editor/language";
import { THEME_IDS, THEMES } from "@/features/settings/theme";
import type { ShikiThemeName } from "@/features/settings/theme";
import { ensureHighlighter, shikiLangOf } from "@/lib/shiki";
import { describe, expect, it } from "vite-plus/test";

/** One snippet per language, each exercising several token kinds. */
const SAMPLES: Record<(typeof LANGUAGE_IDS)[number], string> = {
  tsx: `export const Hi = ({ name }: { name: string }) => <p className="x">{name}</p>;`,
  ts: `export function add(a: number, b: number): number {\n  return a + b;\n}`,
  jsx: `export const Hi = ({ name }) => <p className="x">{name}</p>;`,
  js: `export function add(a, b) {\n  return a + b;\n}`,
  c: `#include <stdio.h>\nint main(void) {\n  printf("hi %d\\n", 1);\n  return 0;\n}`,
  cpp: `#include <vector>\ntemplate <typename T>\nclass Box {\npublic:\n  T get() const { return v_; }\n};`,
  cuda: `__global__ void saxpy(int n, float a, float *y) {\n  int i = blockIdx.x * blockDim.x + threadIdx.x;\n  if (i < n) y[i] = a * y[i];\n}\nsaxpy<<<32, 256>>>(n, 2.0f, d_y);`,
  rust: `pub fn main() {\n    let xs: Vec<i32> = (0..10).collect();\n    println!("{xs:?}");\n}`,
  llvm: `define i32 @add(i32 %a, i32 %b) {\nentry:\n  %sum = add nsw i32 %a, %b\n  ret i32 %sum\n}`,
};

const ALL_THEME_NAMES = THEME_IDS.flatMap((id) => [THEMES[id].light, THEMES[id].dark]);

describe("shiki registry", () => {
  it.each(LANGUAGE_IDS)("highlights %s with more than one color", async (lang) => {
    const highlighter = await ensureHighlighter(lang, "vitesse-dark");
    const { tokens } = highlighter.codeToTokens(SAMPLES[lang], {
      lang: shikiLangOf(lang),
      theme: "vitesse-dark",
    });
    const colors = new Set(tokens.flat().map((token) => token.color));
    expect(colors.size).toBeGreaterThan(1);
  });

  it.each(ALL_THEME_NAMES)("loads theme %s", async (theme) => {
    const highlighter = await ensureHighlighter("ts", theme as ShikiThemeName);
    expect(highlighter.getTheme(theme).bg).toBeTruthy();
  });

  it("gives CUDA-specific spellings their own scopes", async () => {
    const highlighter = await ensureHighlighter("cuda", "vitesse-dark");
    const { tokens } = highlighter.codeToTokens(SAMPLES.cuda, {
      lang: "cuda",
      theme: "vitesse-dark",
      includeExplanation: "scopeName",
    });
    const scopes = tokens.flat().flatMap((token) => token.explanation?.at(-1)?.scopes ?? []);
    const names = new Set(scopes.map((scope) => scope.scopeName));
    expect(names).toContain("storage.modifier.cuda");
    expect(names).toContain("variable.language.cuda");
    expect(names).toContain("keyword.operator.kernel-launch.cuda");
  });

  it("keeps every language's Shiki grammar name resolvable", () => {
    for (const id of LANGUAGE_IDS) {
      expect(LANGUAGES[id].shikiLang).toBeTruthy();
    }
  });
});
