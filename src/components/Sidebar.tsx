import React, { useState } from "react";
import { 
  MessageSquare, Plus, Trash2, Edit2, Check, X, 
  Menu, Compass, Sparkles, ChevronLeft, Github
} from "lucide-react";
import { ChatThread } from "../types";
import { AnimatePresence, motion } from "motion/react";

interface SidebarProps {
  threads: ChatThread[];
  activeThreadId: string;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteThread: (id: string) => void;
  onRenameThread: (id: string, newTitle: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export default function Sidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onRenameThread,
  isOpen,
  onToggleOpen,
}: SidebarProps) {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startEditing = (thread: ChatThread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(thread.id);
    setEditTitle(thread.title);
  };

  const saveEdit = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameThread(id, editTitle.trim());
    }
    setEditingThreadId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingThreadId(null);
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isOpen && (
        <div 
          id="sidebar-backdrop"
          className="fixed inset-0 z-40 bg-black/40 blur-xs transition-opacity duration-300 md:hidden"
          onClick={onToggleOpen}
        />
      )}

      {/* Sidebar main body */}
      <aside
        id="sidebar-container"
        className={`fixed inset-y-0 left-0 z-55 flex w-72 flex-col border-r border-slate-200 bg-slate-50 transition-transform duration-300 md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-indigo-600/10 p-2 text-indigo-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-sans font-semibold tracking-tight text-slate-900">
              Gemini Spaces
            </span>
          </div>
          <button
            id="close-sidebar-mobile"
            onClick={onToggleOpen}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 md:hidden"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Action: Create New Conversation Thread */}
        <div className="p-4">
          <button
            id="btn-new-chat"
            onClick={onNewThread}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            <Plus className="h-4 w-4" />
            New Thread
          </button>
        </div>

        {/* Thread History List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          <div className="px-3 py-2 text-xs font-mono font-medium tracking-wider text-slate-400 uppercase">
            History Threads
          </div>
          
          <AnimatePresence initial={false}>
            {threads.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 font-sans">
                No conversations yet
              </div>
            ) : (
              threads.map((thread) => {
                const isActive = thread.id === activeThreadId;
                const isEditing = thread.id === editingThreadId;

                return (
                  <motion.div
                    key={thread.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => !isEditing && onSelectThread(thread.id)}
                    className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm cursor-pointer transition-all ${
                      isActive
                        ? "bg-slate-200/70 text-indigo-700 font-medium"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex flex-1 items-center gap-2.5 min-w-0">
                      <MessageSquare className={`h-4.5 w-4.5 shrink-0 ${
                        isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"
                      }`} />
                      
                      {isEditing ? (
                        <form
                          onSubmit={(e) => saveEdit(thread.id, e)}
                          className="flex flex-1 items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-white text-slate-900 rounded-md border border-slate-300 px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-1 rounded text-red-600 hover:bg-red-50"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : (
                        <span className="truncate pr-12 font-sans">
                          {thread.title}
                        </span>
                      )}
                    </div>

                    {/* Quick Action Overlay (Rename / Delete) */}
                    {!isEditing && (
                      <div className="absolute right-2 top-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-1.5 bg-gradient-to-l from-slate-100 pl-4 py-1 rounded-r-xl transition-opacity">
                        <button
                          title="Rename workspace"
                          onClick={(e) => startEditing(thread, e)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Delete thread"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteThread(thread.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Workspace Footer Info */}
        <div className="border-t border-slate-200 bg-slate-100/70 p-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-300 flex items-center justify-center text-slate-700 font-semibold text-sm select-none shadow-xs border border-white">
              AI
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate font-sans">
                Google Studio Engine
              </div>
              <div className="text-[10px] text-slate-500 font-mono tracking-wide">
                MODEL: GEMINI-3.5-FLASH
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
