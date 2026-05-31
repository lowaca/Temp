import React, { useState, useEffect } from "react";
import { ChatThread, Message, GroundingChunk } from "./types";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatWindow from "./components/ChatWindow";
import { PERSONA_PRESETS } from "./presets";
import { AlertCircle, Terminal, HelpCircle, X, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Local storage key constants
const STORAGE_THREADS_KEY = "gemini_chat_threads_v1";
const STORAGE_ACTIVE_KEY = "gemini_chat_active_id_v1";

// Helper to create a fallback random ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
}

// Default initial state setup
const DEFAULT_PRESET = PERSONA_PRESETS[0];

function createInitialThread(): ChatThread {
  const curTime = new Date().toISOString();
  return {
    id: generateId(),
    title: "Fresh Chat Space",
    messages: [],
    systemInstruction: DEFAULT_PRESET.systemInstruction,
    searchGrounding: false,
    createdAt: curTime,
  };
}

export default function App() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sync state from LocalStorage on mount
  useEffect(() => {
    try {
      const storedThreadsStr = localStorage.getItem(STORAGE_THREADS_KEY);
      const storedActiveId = localStorage.getItem(STORAGE_ACTIVE_KEY);

      if (storedThreadsStr) {
        const parsedThreads = JSON.parse(storedThreadsStr) as ChatThread[];
        if (parsedThreads.length > 0) {
          setThreads(parsedThreads);
          // Match active ID, fallback to first thread
          const activeId = storedActiveId && parsedThreads.some((t) => t.id === storedActiveId)
            ? storedActiveId
            : parsedThreads[0].id;
          setActiveThreadId(activeId);
          return;
        }
      }

      // Default fallback if nothing in storage
      const initialThread = createInitialThread();
      setThreads([initialThread]);
      setActiveThreadId(initialThread.id);
    } catch (err) {
      console.error("Local storage lookup failed on mount:", err);
      // Fallback
      const initialThread = createInitialThread();
      setThreads([initialThread]);
      setActiveThreadId(initialThread.id);
    }
  }, []);

  // Save to LocalStorage whenever threads change or activeThreadId changes
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem(STORAGE_THREADS_KEY, JSON.stringify(threads));
    }
  }, [threads]);

  useEffect(() => {
    if (activeThreadId) {
      localStorage.setItem(STORAGE_ACTIVE_KEY, activeThreadId);
    }
  }, [activeThreadId]);

  // Handle resizing sidebars automatically on big screens
  useEffect(() => {
    const handleResize = () => {
      // Show sidebar by default on desktop, hide on mobile
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // trigger initial resize value
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Getter for the active thread
  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0] || createInitialThread();

  // Create a brand new Thread slot
  const handleNewThread = () => {
    const freshThread = createInitialThread();
    setThreads((prev) => [freshThread, ...prev]);
    setActiveThreadId(freshThread.id);
    
    // Auto-close on small view ports
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Switch thread focus
  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    setApiError(null);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Delete Thread item
  const handleDeleteThread = (id: string) => {
    const filtered = threads.filter((t) => t.id !== id);
    if (filtered.length === 0) {
      // Re-create a single workspace to prevent breaking UI
      const fresh = createInitialThread();
      setThreads([fresh]);
      setActiveThreadId(fresh.id);
    } else {
      setThreads(filtered);
      if (activeThreadId === id) {
        setActiveThreadId(filtered[0].id);
      }
    }
    setApiError(null);
  };

  // Rename a thread with inline field edit
  const handleRenameThread = (id: string, newTitle: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t))
    );
  };

  // Clear messages inside current thread
  const handleClearThread = () => {
    setThreads((prev) =>
      prev.map((t) => (t.id === activeThreadId ? { ...t, messages: [] } : t))
    );
    setApiError(null);
  };

  // Switch search grounding tools
  const handleToggleGrounding = () => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId ? { ...t, searchGrounding: !t.searchGrounding } : t
      )
    );
  };

  // Override specific thread system directive
  const handleUpdateSystemInstruction = (instruction: string) => {
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId ? { ...t, systemInstruction: instruction } : t
      )
    );
  };

  // Preset starter click triggers
  const handleSelectPromptStarter = (text: string, withSearchGrounding: boolean) => {
    // 1. Temporarily update the grounding state if requested by starter config
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? { ...t, searchGrounding: withSearchGrounding ? true : t.searchGrounding }
          : t
      )
    );

    // 2. Queue and dispatch the text sending action
    setTimeout(() => {
      handleSendMessage(text, withSearchGrounding);
    }, 150);
  };

  // Core event: User requests a question
  const handleSendMessage = async (userText: string, searchGroundingOverride?: boolean) => {
    if (isLoading) return;

    // Reset API error banner
    setApiError(null);

    const currentTimeStamp = new Date().toISOString();
    const newUserMessage: Message = {
      id: generateId(),
      role: "user",
      content: userText,
      createdAt: currentTimeStamp,
    };

    // Update active thread with user message immediately
    let updatedMessages: Message[] = [...activeThread.messages, newUserMessage];
    
    // Auto-update thread title if it is default "Fresh Chat Space"
    let updatedTitle = activeThread.title;
    if (activeThread.title === "Fresh Chat Space" || activeThread.title === "New Conversation") {
      const trimmed = userText.trim();
      updatedTitle = trimmed.length > 25 ? trimmed.substring(0, 25) + "..." : trimmed;
    }

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThreadId
          ? { ...t, title: updatedTitle, messages: updatedMessages }
          : t
      )
    );

    setIsLoading(true);

    try {
      // Select correct grounding setting 
      const activeGroundingSetting = searchGroundingOverride !== undefined 
        ? searchGroundingOverride 
        : activeThread.searchGrounding;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          systemInstruction: activeThread.systemInstruction,
          searchGrounding: activeGroundingSetting,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "A transport error occurred. Check your Gemini connection.");
      }

      // Create assistant reply structure
      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: data.text || "No reply body received from the workspace.",
        createdAt: new Date().toISOString(),
        groundingChunks: data.groundingChunks as GroundingChunk[],
      };

      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId
            ? { ...t, messages: [...updatedMessages, assistantMessage] }
            : t
        )
      );
    } catch (err: any) {
      console.error("Transmission to Gemini backend failed:", err);
      setApiError(err?.message || "Failed to communicate with your Gemini server API.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="app-root-container" className="flex h-screen w-screen overflow-hidden bg-white text-slate-800 antialiased font-sans">
      
      {/* Sidebar: Threads drawer list */}
      <Sidebar
        threads={threads}
        activeThreadId={activeThread.id}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Conversation Space content frame */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        
        {/* Core Header toolbar actions */}
        <Header
          thread={activeThread}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onClearThread={handleClearThread}
          onToggleGrounding={handleToggleGrounding}
          onUpdateSystemInstruction={handleUpdateSystemInstruction}
        />

        {/* Global Error Notice banner */}
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-amber-50 border-b border-amber-200 px-6 py-3.5 z-20 shrink-0"
            >
              <div className="flex items-start gap-3 max-w-3xl mx-auto">
                <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-amber-900 uppercase font-mono tracking-wider">
                    Backend Connection Issue
                  </h3>
                  <p className="text-xs text-amber-800 leading-normal mt-1 font-sans">
                    {apiError}
                  </p>
                </div>
                <button
                  onClick={() => setApiError(null)}
                  className="p-1 rounded text-amber-600 hover:bg-amber-100/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic chat area canvas */}
        <ChatWindow
          thread={activeThread}
          onSendMessage={(txt) => handleSendMessage(txt)}
          onClearThread={handleClearThread}
          isLoading={isLoading}
          onSelectPromptStarter={handleSelectPromptStarter}
        />
      </div>
    </div>
  );
}
