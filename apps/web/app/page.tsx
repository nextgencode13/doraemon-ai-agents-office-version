"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  History,
  MessageSquare,
  Plus,
  Power,
  RefreshCw,
  Send,
  Server,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

interface HealthData {
  status: string;
  app_name: string;
  version: string;
  app_env: string;
  api_version: string;
  ai_provider: string;
  ai_configured: boolean;
  db_connected: boolean;
}

interface MessageItem {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: MessageItem[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");

  // Health State
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Chat & Conversation State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // 1. Fetch Health Status
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/health`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setHealth(data);
    } catch (err: unknown) {
      setHealthError(err instanceof Error ? err.message : "Connection failed");
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, [apiUrl]);

  // 2. Fetch Conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, [apiUrl]);

  // 3. Load Active Conversation Messages
  const loadConversation = useCallback(
    async (id: string) => {
      setActiveConversationId(id);
      try {
        const res = await fetch(`${apiUrl}/api/v1/conversations/${id}`);
        if (res.ok) {
          const data: ConversationItem = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    },
    [apiUrl]
  );

  useEffect(() => {
    fetchHealth();
    fetchConversations();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Create new blank conversation
  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent("");
    inputRef.current?.focus();
  };

  // Delete a conversation
  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${apiUrl}/api/v1/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          startNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // 4. Send Message via SSE Streaming
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setInputText("");
    const userMsg: MessageItem = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`${apiUrl}/api/v1/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConversationId,
          message: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ReadableStream not available");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let resolvedConvId = activeConversationId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const matchEvent = block.match(/event:\s*(\w+)/);
          const dataIndex = block.indexOf("data:");

          if (matchEvent && dataIndex !== -1) {
            const eventType = matchEvent[1];
            const rawJson = block.slice(dataIndex + 5).trim();
            const eventData = JSON.parse(rawJson);

            if (eventType === "conversation") {
              resolvedConvId = eventData.conversation_id;
              setActiveConversationId(eventData.conversation_id);
            } else if (eventType === "token") {
              accumulated += eventData.delta;
              setStreamingContent(accumulated);
            } else if (eventType === "done") {
              // Finalize message
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: accumulated },
              ]);
              setStreamingContent("");
              setIsStreaming(false);
              fetchConversations();
            } else if (eventType === "error") {
              throw new Error(eventData.error);
            }
          }
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Error streaming response";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Error communicating with AI:** ${errMsg}`,
        },
      ]);
      setStreamingContent("");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07090E] text-[#E2E8F0] font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col h-screen overflow-hidden">
      {/* Background Gradients & Tech Grid */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_70%_at_50%_-10%,rgba(14,165,233,0.12),rgba(255,255,255,0))]" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">JARVIS</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                PHASE 1: CHAT & PERSISTENCE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Personal AI Operating System</p>
          </div>
        </div>

        {/* View Switcher & Health Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                activeTab === "chat"
                  ? "bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat Command Center
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                activeTab === "dashboard"
                  ? "bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              System Status
            </button>
          </div>

          <button
            onClick={fetchHealth}
            title="Refresh System Status"
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900/70 border border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.db_connected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-slate-300 text-[11px]">
              {health?.db_connected ? "ONLINE" : "DISCONNECTED"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {activeTab === "chat" ? (
        <div className="relative z-10 flex flex-1 overflow-hidden">
          {/* Left Sidebar: Conversations History */}
          <aside className="w-72 border-r border-slate-800/80 bg-slate-950/40 backdrop-blur-sm flex flex-col p-4">
            <button
              onClick={startNewChat}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/40 hover:to-blue-600/40 border border-cyan-500/40 text-cyan-200 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] mb-4"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>

            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Recent Dialogs
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-slate-500 p-2 italic">No conversations yet</p>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                        isActive
                          ? "bg-slate-800/70 border-cyan-500/40 text-white shadow-sm"
                          : "bg-slate-900/30 border-transparent hover:bg-slate-900/70 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                        <span className="truncate">{conv.title}</span>
                      </div>
                      <button
                        onClick={(e) => deleteConversation(e, conv.id)}
                        title="Delete conversation"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Machine Profile Footer */}
            <div className="pt-3 border-t border-slate-800/60 text-[11px] text-slate-500">
              <div className="flex items-center justify-between">
                <span>AI Provider:</span>
                <span className="font-mono text-slate-300 uppercase">{health?.ai_provider || "GEMINI"}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Model:</span>
                <span className="font-mono text-cyan-400">gemini-2.5-flash</span>
              </div>
            </div>
          </aside>

          {/* Right Main Chat View */}
          <div className="flex-1 flex flex-col bg-slate-950/20">
            {/* Messages Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 && !streamingContent && (
                <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-4 my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)]">
                    <Sparkles className="w-7 h-7 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      JARVIS Intelligence System
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Ready for natural language planning, tasks, and system assistance.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 w-full text-xs text-left">
                    <button
                      onClick={() => setInputText("What should I work on next?")}
                      className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 text-slate-300 transition-all text-[11px]"
                    >
                      💡 &quot;What should I do now?&quot;
                    </button>
                    <button
                      onClick={() => setInputText("Help me plan my priorities for today.")}
                      className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/40 text-slate-300 transition-all text-[11px]"
                    >
                      📅 &quot;Plan my day&quot;
                    </button>
                  </div>
                </div>
              )}

              {/* Message List */}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-3xl ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      msg.role === "user"
                        ? "bg-blue-600/30 border border-blue-500/40 text-blue-300"
                        : "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                    }`}
                  >
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600/20 border border-blue-500/30 text-slate-100 rounded-tr-none whitespace-pre-wrap"
                        : "bg-slate-900/70 border border-slate-800/80 text-slate-200 rounded-tl-none prose prose-invert max-w-none whitespace-pre-wrap"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Streaming Chunk Container */}
              {streamingContent && (
                <div className="flex gap-3 max-w-3xl mr-auto">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 animate-pulse">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl text-xs leading-relaxed bg-slate-900/70 border border-cyan-500/40 text-slate-200 rounded-tl-none whitespace-pre-wrap shadow-[0_0_15px_rgba(6,182,212,0.08)]">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
              <form
                onSubmit={handleSendMessage}
                className="max-w-3xl mx-auto flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/60 transition-all shadow-lg"
              >
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="Ask JARVIS anything, or press Enter to send..."
                  className="flex-1 px-3 py-2 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none resize-none max-h-32"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isStreaming}
                  className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* Status & System Tab */
        <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-8">
          {healthError && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-sm">
              <div className="flex items-center gap-3">
                <Power className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-rose-200">Backend API Unreachable</p>
                  <p className="text-xs text-rose-300/80">
                    Cannot connect to <code className="font-mono">{apiUrl}</code>. Run <code className="font-mono bg-rose-900/40 px-1 py-0.5 rounded">npm run dev:api</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cards Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">FastAPI Core</span>
                <Server className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {health ? health.status.toUpperCase() : "DISCONNECTED"}
                </span>
                {health && <span className="text-xs text-slate-400 font-mono">v{health.version}</span>}
              </div>
              <div className="text-xs text-slate-400 space-y-1.5 pt-3 border-t border-slate-800/60">
                <div className="flex justify-between">
                  <span>Environment:</span>
                  <span className="font-mono text-slate-300">{health?.app_env || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Endpoints:</span>
                  <span className="font-mono text-slate-300">/health, /chat, /conversations</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Provider</span>
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {health?.ai_provider ? health.ai_provider.toUpperCase() : "GEMINI"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${health?.ai_configured ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50" : "bg-amber-950 text-amber-400 border border-amber-800/50"}`}>
                  {health?.ai_configured ? "ACTIVE" : "API KEY NEEDED"}
                </span>
              </div>
              <div className="text-xs text-slate-400 space-y-1.5 pt-3 border-t border-slate-800/60">
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span className="font-mono text-slate-300">gemini-2.5-flash</span>
                </div>
                <div className="flex justify-between">
                  <span>Streaming:</span>
                  <span className="font-mono text-emerald-400">Server-Sent Events (SSE)</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database & State</span>
                <Database className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {health?.db_connected ? "CONNECTED" : "STANDBY"}
                </span>
                <span className="text-xs text-slate-400 font-mono">SQLAlchemy Async</span>
              </div>
              <div className="text-xs text-slate-400 space-y-1.5 pt-3 border-t border-slate-800/60">
                <div className="flex justify-between">
                  <span>Active Schema:</span>
                  <span className="font-mono text-slate-300">conversations, messages</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Dialogs:</span>
                  <span className="font-mono text-slate-300">{conversations.length}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Machine Profile */}
          <section className="p-6 rounded-2xl bg-slate-900/20 border border-slate-800/60">
            <div className="flex items-center gap-3 mb-4">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-white">Machine Profile Directives</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-slate-500 mb-1">CPU</p>
                <p className="text-slate-200 font-semibold">Intel Core i9-14900K</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-slate-500 mb-1">RAM</p>
                <p className="text-slate-200 font-semibold">32 GB RAM</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-slate-500 mb-1">GPU ACCELERATION</p>
                <p className="text-amber-400 font-semibold">Cloud AI First (No CUDA)</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <p className="text-slate-500 mb-1">OS</p>
                <p className="text-slate-200 font-semibold">Windows 11 24H2</p>
              </div>
            </div>
          </section>

          {/* Roadmap Completion Status */}
          <section className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/80">
            <h2 className="text-base font-semibold text-white mb-4">Roadmap Progression</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-200">Phase 0: Foundation</p>
                  <p className="text-slate-400 text-[11px]">Monorepo, FastAPI backend, health check</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/50">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-cyan-200">Phase 1: Gemini Chat & Streaming (Complete)</p>
                  <p className="text-slate-400 text-[11px]">SSE streaming, conversational persistence, provider isolation</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
