import { CodeEditor } from "@/features/editor/code-editor";
import { useShikiHighlight } from "@/features/editor/use-shiki-highlight";
import { CodeFrame } from "@/features/preview/code-frame";
import { DEFAULT_SETTINGS } from "@/features/settings/settings";
import { shikiThemeOf } from "@/features/settings/theme";
import type { ShikiThemeName } from "@/lib/shiki";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

const PLACEHOLDER = "Paste your code here";

export function App() {
  const [settings] = useState(DEFAULT_SETTINGS);
  const [code, setCode] = useState("");

  const themeName = shikiThemeOf(settings.theme, settings.mode) as ShikiThemeName;
  const highlight = useShikiHighlight(settings.lang, themeName);
  const background = highlight?.highlighter.getTheme(themeName).bg ?? "transparent";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.mode === "dark");
  }, [settings.mode]);

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-auto p-8">
      <CodeFrame settings={settings} background={background}>
        <CodeEditor
          value={code}
          onChange={setCode}
          highlight={highlight}
          showLineNumbers={settings.lineNumbers}
          placeholderText={PLACEHOLDER}
        />
      </CodeFrame>
      <Toaster position="top-center" theme={settings.mode} />
    </div>
  );
}
