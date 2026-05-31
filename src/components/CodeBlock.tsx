import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  language?: string;
  code: string;
}

export default function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between bg-slate-800/80 px-4 py-2 text-xs font-mono text-slate-300">
        <span className="capitalize">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded bg-slate-700/50 px-2 py-1 transition hover:bg-slate-700 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="overflow-x-auto p-4 text-sm leading-relaxed text-slate-100 font-mono scrollbar-thin">
        <pre>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
