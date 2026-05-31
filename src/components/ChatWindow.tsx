import React, { useState, useRef, useEffect } from "react";
import { 
  Send, Bot, User, Globe, ExternalLink, Sparkles, 
  Trash2, Search, Compass, ShieldAlert, ArrowDown, HelpCircle, Code
} from "lucide-react";
import Markdown from "react-markdown";
import { ChatThread, Message } from "../types";
import { PROMPT_STARTERS } from "../presets";
import CodeBlock from "./CodeBlock";
import { motion, AnimatePresence } from "motion/react";

interface ChatWindowProps {
  thread: ChatThread;
  onSendMessage: (text: string) => void;
  onClearThread: () => void;
  isLoading: boolean;
  onSelectPromptStarter: (text: string, grounding: boolean) => void;
}

export default function ChatWindow({
  thread,
  onSendMessage,
  onClearThread,
  isLoading,
  onSelectPromptStarter,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  // Auto-scroll to bottom of messages
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("smooth");
  }, [thread.messages, isLoading]);

  // Handle container scrolling visibility of "scroll-down" badge
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // Show scroll button if scrolled up more than 150px
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollDown(isScrolledUp);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div id="chat-window-container" className="flex flex-1 flex-col bg-white overflow-hidden relative">
      
      {/* Scroll Down Floating Indicator */}
      {showScrollDown && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute right-6 bottom-32 z-30 flex items-center justify-center p-2 rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 transition duration-150 animate-bounce cursor-pointer"
        >
          <ArrowDown className="h-5 w-5" />
        </button>
      )}

      {/* Main Messages List/Canvas Area */}
      <div
        id="chat-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6"
      >
        {thread.messages.length === 0 ? (
          /* Blank state greeting with beautiful prompt starters */
          <div className="max-w-3xl mx-auto py-12 md:py-20 flex flex-col items-center justify-center">
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-4 text-white shadow-md mb-6"
            >
              <Sparkles className="h-10 w-10 animate-spin-slow" />
            </motion.div>

            <motion.h1
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-3xl font-sans font-bold tracking-tight text-slate-900 text-center sm:text-4xl"
            >
              How can I help you today?
            </motion.h1>
            
            <motion.p
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-3 text-sm font-sans text-slate-500 text-center max-w-lg"
            >
              This workspace is powered by **Gemini 3.5 Flash**. Toggle real-time web grounding below or select one of the templates directly to begin.
            </motion.p>

            {/* Prompt templates grid */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {PROMPT_STARTERS.map((starter, index) => {
                const IconComponent = starter.icon === "Search" ? Search : starter.icon === "Code" ? Code : Compass;
                return (
                  <motion.div
                    key={starter.id}
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 + index * 0.08 }}
                    onClick={() => onSelectPromptStarter(starter.text, !!starter.grounding)}
                    className="group border border-slate-200 hover:border-indigo-400 rounded-2xl p-4 cursor-pointer text-left bg-slate-50 hover:bg-indigo-50/50 shadow-2xs hover:shadow-xs hover:scale-[1.01] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2 text-indigo-600">
                      <IconComponent className="h-4.5 w-4.5" />
                      <span className="text-xs font-semibold uppercase tracking-wider font-sans">{starter.title}</span>
                      {starter.grounding && (
                        <span className="ml-auto inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-mono font-medium text-indigo-700 uppercase">
                          <Globe className="h-2.5 w-2.5" /> Search
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm font-sans font-normal leading-normal line-clamp-2">
                      {starter.text}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Actual Thread Message History list */
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence initial={false}>
              {thread.messages.map((message) => {
                const isAI = message.role === "assistant";
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-start gap-4 ${isAI ? "justify-start" : "justify-end"}`}
                  >
                    {/* Bot Avatar Icon (Left side) */}
                    {isAI && (
                      <div className="h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl bg-indigo-600 text-white flex shadow-xs">
                        <Bot className="h-5 w-5" />
                      </div>
                    )}

                    {/* Chat Bubble Container */}
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-2xs ${
                        isAI
                          ? "bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none"
                          : "bg-indigo-600 text-white rounded-tr-none"
                      }`}
                    >
                      {/* Message Source Metadata Label */}
                      <div className="flex items-center gap-2 mb-1.5 justify-between">
                        <span className={`text-[10px] font-mono tracking-wider font-semibold uppercase ${
                          isAI ? "text-slate-400" : "text-white/70"
                        }`}>
                          {isAI ? "Gemini" : "User"}
                        </span>
                        <span className={`text-[10px] font-mono ${
                          isAI ? "text-slate-300" : "text-white/50"
                        }`}>
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>

                      {/* Content Markup Body */}
                      <div className={`prose max-w-none text-sm break-words leading-relaxed font-sans ${
                        isAI 
                          ? "prose-slate text-slate-800 prose-sm prose-pre:p-0" 
                          : "prose-invert text-white prose-sm"
                      }`}>
                        <Markdown
                          components={{
                            // Override pre/code block formatting safely
                            code({ node, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || "");
                              const codeString = String(children).replace(/\n$/, "");
                              
                              return match ? (
                                <CodeBlock language={match[1]} code={codeString} />
                              ) : (
                                <code 
                                  className={`rounded-sm px-1 py-0.5 font-mono text-xs font-semibold ${
                                    isAI 
                                      ? "bg-slate-200 text-rose-600" 
                                      : "bg-indigo-700 text-indigo-100"
                                  }`} 
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {message.content}
                        </Markdown>
                      </div>

                      {/* Web Grounding Citations */}
                      {isAI && message.groundingChunks && message.groundingChunks.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-200/60 pt-3">
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">
                            <Globe className="h-3 w-3 text-indigo-500" /> Grounding Sources:
                          </span>
                          {message.groundingChunks.map((chunk, idx) => {
                            const web = chunk.web;
                            if (!web) return null;
                            return (
                              <a
                                key={idx}
                                href={web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md bg-white hover:bg-slate-100 text-[11px] px-2 py-1 text-indigo-600 font-sans font-medium transition-colors border border-slate-200 shadow-3xs"
                              >
                                <span className="truncate max-w-[150px]">{web.title || "Reference web Page"}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* User Avatar (Right side) */}
                    {!isAI && (
                      <div className="h-10 w-10 shrink-0 select-none items-center justify-center rounded-xl bg-slate-100 border border-slate-200 flex shadow-3xs">
                        <User className="h-5 w-5 text-slate-600" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Cognitive Thinking / Loading State placeholder */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4 justify-start"
                >
                  <div className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white flex shadow-2xs">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl px-5 py-4 bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none">
                    <span className="text-[10px] font-mono tracking-wider font-semibold text-slate-400 uppercase block mb-1">
                      Gemini
                    </span>
                    <div className="flex items-center gap-2 py-1 text-slate-500 text-sm font-sans">
                      <Globe className="h-4 w-4 animate-spin-slow text-indigo-500 shrink-0" />
                      <span>Gemini is generating dynamic thoughts...</span>
                      <div className="flex items-center gap-1 ml-1.5">
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse [animation-delay:0.1s]"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse [animation-delay:0.25s]"></span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse [animation-delay:0.4s]"></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input controls bar (Anchored to the absolute bottom) */}
      <div className="border-t border-slate-200 bg-white p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSend} className="relative flex items-end gap-2.5 border border-slate-200 focus-within:border-indigo-500 bg-slate-50 rounded-2xl p-2 transition">
            
            {/* Input fields */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                thread.searchGrounding
                  ? "Ask Gemini 3.5 Flash (with Google Search active)..."
                  : "Ask Gemini 3.5 Flash..."
              }
              rows={1}
              className="flex-1 max-h-40 min-h-[36px] bg-transparent resize-none overflow-y-auto outline-hidden border-0 py-2.5 px-3 text-sm text-slate-800 focus:ring-0 placeholder:text-slate-400"
              style={{ height: "auto" }}
            />

            {/* Controls panel: action button */}
            <div className="flex items-center pb-1 pr-1 shrink-0">
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className={`flex h-10 w-10 items-center justify-center rounded-xl font-medium text-white shadow-xs transition ${
                  inputText.trim() && !isLoading
                    ? "bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer"
                    : "bg-slate-300 cursor-not-allowed"
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Quick Stats information sub-row */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-2 px-1">
            <div className="flex items-center gap-3">
              {thread.searchGrounding ? (
                <span className="text-emerald-600 font-bold uppercase flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Google Search Active
                </span>
              ) : (
                <span className="text-slate-400">Search Grounding Off</span>
              )}

              {thread.systemInstruction && (
                <span className="text-indigo-600 font-medium">Custom Persona Engaged</span>
              )}
            </div>

            <span className="text-slate-400">Press Enter to Send</span>
          </div>
        </div>
      </div>
    </div>
  );
}
