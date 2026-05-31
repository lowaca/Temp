import React, { useState } from "react";
import { 
  Menu, Settings, Trash2, Globe, Sparkles, Sliders, ChevronDown, Check, Info, Command
} from "lucide-react";
import { ChatThread, PersonaPreset } from "../types";
import { PERSONA_PRESETS } from "../presets";
import { motion, AnimatePresence } from "motion/react";

interface HeaderProps {
  thread: ChatThread;
  onToggleSidebar: () => void;
  onClearThread: () => void;
  onToggleGrounding: () => void;
  onUpdateSystemInstruction: (instruction: string) => void;
}

export default function Header({
  thread,
  onToggleSidebar,
  onClearThread,
  onToggleGrounding,
  onUpdateSystemInstruction,
}: HeaderProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [customPromptText, setCustomPromptText] = useState(thread.systemInstruction || "");

  // Detect current persona matched to instruction, default to custom if not matching presets
  const activePersona = PERSONA_PRESETS.find(
    (p) => p.systemInstruction === thread.systemInstruction
  ) || (thread.systemInstruction ? { id: "custom", name: "Custom Space", description: "", icon: "Sliders", systemInstruction: thread.systemInstruction } : PERSONA_PRESETS[0]);

  const selectPreset = (preset: PersonaPreset) => {
    onUpdateSystemInstruction(preset.systemInstruction);
    setCustomPromptText(preset.systemInstruction);
  };

  const saveCustomPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSystemInstruction(customPromptText);
  };

  return (
    <header className="flex h-16 shrink-0 flex-col border-b border-slate-200 bg-white relative">
      {/* Primary Header Row */}
      <div className="flex flex-1 items-center justify-between px-4 md:px-6">
        
        {/* Left section: Sidebar toggle & Title */}
        <div className="flex items-center gap-3">
          <button
            id="toggle-sidebar-button"
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 active:scale-95 transition"
            title="Toggle Sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-[320px] font-sans">
              {thread.title}
            </h2>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-indigo-600 font-medium transition"
            >
              <span>{activePersona.name}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Right Section: Core Utility Toggles */}
        <div className="flex items-center gap-2">
          {/* Grounding switch controller */}
          <button
            id="btn-toggle-grounding"
            onClick={onToggleGrounding}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition active:scale-[0.97] ${
              thread.searchGrounding
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200"
            }`}
            title="Google Search Grounding (Live facts validation)"
          >
            <Globe className={`h-4 w-4 ${thread.searchGrounding ? "animate-spin-slow text-emerald-600" : "text-slate-400"}`} />
            <span className="hidden sm:inline">Search Grounding</span>
          </button>

          {/* Configuration menu toggler */}
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`rounded-lg p-2 transition cursor-pointer ${
              showConfig 
                ? "bg-slate-100 text-indigo-600" 
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
            title="Chat Configuration"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Clear Thread History action */}
          <button
            id="btn-clear-chat"
            onClick={onClearThread}
            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.95] transition cursor-pointer"
            title="Clear Chat Logs"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Slide-Down Configuration Drawer */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-16 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-lg overflow-hidden"
          >
            <div className="p-4 md:p-6 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Box 1: Predefined Curated Personas */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  <Command className="h-3.5 w-3.5" /> Curated Persona Presets
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PERSONA_PRESETS.map((p) => {
                    const isSelected = activePersona.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => selectPreset(p)}
                        className={`rounded-xl p-3 border cursor-pointer text-left transition hover:scale-[1.01] ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/50"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-800 font-sans">{p.name}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {p.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Box 2: Custom Prompt Instructions Override */}
              <form onSubmit={saveCustomPrompt} className="md:col-span-5 flex flex-col space-y-3">
                <div className="flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                  <Sliders className="h-3.5 w-3.5" /> Customize System Directives
                </div>
                <textarea
                  value={customPromptText}
                  onChange={(e) => setCustomPromptText(e.target.value)}
                  placeholder="Set custom context rules (e.g. 'You speak like a pirate', 'Answer in bulleted lists')"
                  className="flex-1 w-full min-h-[96px] text-xs font-sans rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="w-full text-center bg-slate-900 text-white rounded-xl py-2 px-3 text-xs font-medium hover:bg-slate-800 transition active:scale-[0.98] cursor-pointer"
                >
                  Apply System Context
                </button>
              </form>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
