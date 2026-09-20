"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Flame,
  History,
  ListTodo,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Square,
  Tag,
  Target,
  Trash2,
  User,
  Zap,
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

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "done" | "cancelled";
  estimated_minutes?: number;
  tags?: string[];
  created_at: string;
  completed_at?: string;
}

interface MemoryItem {
  id: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  score?: number;
  created_at: string;
}

interface NextActionData {
  task_id?: string;
  task_title: string;
  priority: string;
  estimated_minutes: number;
  reason: string;
  suggested_action: string;
}

interface FocusSessionData {
  id: string;
  task_id?: string;
  duration_minutes: number;
  status: string;
  started_at: string;
  ended_at?: string;
  notes?: string;
}

interface DailySummaryData {
  date: string;
  completed_tasks_count: number;
  active_tasks_count: number;
  total_focus_minutes: number;
  next_priority_task?: string;
  productivity_score: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<
    "chat" | "tasks" | "memory" | "productivity" | "system"
  >("chat");

  // Health State
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  // Chat State
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  // Tasks State
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "done">("all");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [newTaskMinutes, setNewTaskMinutes] = useState(25);
  const [newTaskTags, setNewTaskTags] = useState("");

  // Memory State
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [memoryCategoryFilter, setMemoryCategoryFilter] = useState<string>("all");
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState("general");
  const [newMemoryTags, setNewMemoryTags] = useState("");
  const [isSearchingMemory, setIsSearchingMemory] = useState(false);

  // Productivity State
  const [nextAction, setNextAction] = useState<NextActionData | null>(null);
  const [activeFocusSession, setActiveFocusSession] = useState<FocusSessionData | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummaryData | null>(null);
  const [focusDurationSelect, setFocusDurationSelect] = useState(25);
  const [focusNotesInput, setFocusNotesInput] = useState("");
  const [focusRemainingSeconds, setFocusRemainingSeconds] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // 1. Fetch Health
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth(null);
      }
    } catch {
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

  // 4. Fetch Tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
    }
  }, [apiUrl]);

  // 5. Fetch Memories
  const fetchMemories = useCallback(async () => {
    try {
      const url =
        memoryCategoryFilter === "all"
          ? `${apiUrl}/api/v1/memory`
          : `${apiUrl}/api/v1/memory?category=${memoryCategoryFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error("Failed to load memories:", err);
    }
  }, [apiUrl, memoryCategoryFilter]);

  // 6. Fetch Productivity Data
  const fetchProductivity = useCallback(async () => {
    try {
      const [nextRes, focusRes, summaryRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/productivity/next-action`),
        fetch(`${apiUrl}/api/v1/productivity/focus/active`),
        fetch(`${apiUrl}/api/v1/productivity/summary`),
      ]);

      if (nextRes.ok) setNextAction(await nextRes.json());
      if (focusRes.ok) {
        const focusData = await focusRes.json();
        setActiveFocusSession(focusData);
        if (focusData && focusData.status === "active") {
          const startMs = new Date(focusData.started_at).getTime();
          const targetMs = startMs + focusData.duration_minutes * 60 * 1000;
          const remainingSecs = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
          setFocusRemainingSeconds(remainingSecs);
        } else {
          setFocusRemainingSeconds(null);
        }
      }
      if (summaryRes.ok) setDailySummary(await summaryRes.json());
    } catch (err) {
      console.error("Failed to load productivity data:", err);
    }
  }, [apiUrl]);

  // Initial loading
  useEffect(() => {
    fetchHealth();
    fetchConversations();
    fetchTasks();
    fetchMemories();
    fetchProductivity();
    const interval = setInterval(() => {
      fetchHealth();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchConversations, fetchTasks, fetchMemories, fetchProductivity]);

  // Focus Timer Tick
  useEffect(() => {
    if (focusRemainingSeconds === null || focusRemainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setFocusRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [focusRemainingSeconds]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Chat Actions
  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingContent("");
    inputRef.current?.focus();
  };

  const deleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${apiUrl}/api/v1/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) startNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const text = (customPrompt || inputText).trim();
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

      if (!response.ok) throw new Error(`Chat error: ${response.statusText}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("ReadableStream not available");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

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
              setActiveConversationId(eventData.conversation_id);
            } else if (eventType === "token") {
              accumulated += eventData.delta;
              setStreamingContent(accumulated);
            } else if (eventType === "done") {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: accumulated },
              ]);
              setStreamingContent("");
              setIsStreaming(false);
              fetchConversations();
              fetchTasks();
              fetchMemories();
              fetchProductivity();
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
          content: `⚠️ **AI Service Error:** ${errMsg}`,
        },
      ]);
      setStreamingContent("");
    } finally {
      setIsStreaming(false);
    }
  };

  // Task Actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const tagsArray = newTaskTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`${apiUrl}/api/v1/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          priority: newTaskPriority,
          estimated_minutes: newTaskMinutes,
          tags: tagsArray,
        }),
      });

      if (res.ok) {
        setNewTaskTitle("");
        setNewTaskTags("");
        fetchTasks();
        fetchProductivity();
      }
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  const handleToggleTask = async (task: TaskItem) => {
    try {
      if (task.status !== "done") {
        await fetch(`${apiUrl}/api/v1/tasks/${task.id}/complete`, {
          method: "POST",
        });
      } else {
        await fetch(`${apiUrl}/api/v1/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "todo" }),
        });
      }
      fetchTasks();
      fetchProductivity();
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/tasks/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTasks();
        fetchProductivity();
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  // Memory Actions
  const handleSearchMemory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = memorySearchQuery.trim();
    if (!query) {
      fetchMemories();
      return;
    }
    setIsSearchingMemory(true);
    try {
      const catParam = memoryCategoryFilter !== "all" ? `&category=${memoryCategoryFilter}` : "";
      const res = await fetch(
        `${apiUrl}/api/v1/memory/search?q=${encodeURIComponent(query)}${catParam}&limit=10`
      );
      if (res.ok) {
        const data = await res.json();
        setMemories(data);
      }
    } catch (err) {
      console.error("Failed searching memories:", err);
    } finally {
      setIsSearchingMemory(false);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;

    try {
      const tagsArray = newMemoryTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(`${apiUrl}/api/v1/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMemoryContent.trim(),
          category: newMemoryCategory,
          tags: tagsArray,
          source: "user",
        }),
      });

      if (res.ok) {
        setNewMemoryContent("");
        setNewMemoryTags("");
        fetchMemories();
      }
    } catch (err) {
      console.error("Failed to create memory:", err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/memory/${id}`, {
        method: "DELETE",
      });
      if (res.ok) fetchMemories();
    } catch (err) {
      console.error("Failed to delete memory:", err);
    }
  };

  // Focus Actions
  const handleStartFocus = async (duration: number, taskId?: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/productivity/focus/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_minutes: duration,
          task_id: taskId,
          notes: focusNotesInput.trim() || undefined,
        }),
      });
      if (res.ok) {
        const session = await res.json();
        setActiveFocusSession(session);
        setFocusRemainingSeconds(duration * 60);
        setFocusNotesInput("");
        fetchProductivity();
      }
    } catch (err) {
      console.error("Failed to start focus session:", err);
    }
  };

  const handleEndFocus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/productivity/focus/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: "Session stopped by user",
          status: "completed",
        }),
      });
      if (res.ok) {
        setActiveFocusSession(null);
        setFocusRemainingSeconds(null);
        fetchProductivity();
      }
    } catch (err) {
      console.error("Failed to end focus session:", err);
    }
  };

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "active") return t.status !== "done";
    if (taskFilter === "done") return t.status === "done";
    return true;
  });

  return (
    <main className="min-h-screen bg-[#07090E] text-[#E2E8F0] font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col h-screen overflow-hidden">
      {/* Background Gradients & Tech Grid */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_70%_at_50%_-10%,rgba(14,165,233,0.12),rgba(255,255,255,0))]" />
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:3.5rem_3.5rem]" />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-wider bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
                DORAEMON
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono font-semibold">
                v0.1.0 OS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Personal AI Operating Layer for Windows</p>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="flex items-center bg-slate-900/90 border border-slate-800 p-1 rounded-xl shadow-inner gap-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "chat"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "tasks"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>Tasks</span>
            {tasks.filter((t) => t.status !== "done").length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                {tasks.filter((t) => t.status !== "done").length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("memory")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "memory"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Memory</span>
            {memories.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                {memories.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("productivity")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "productivity"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Productivity</span>
            {activeFocusSession && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "system"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>System</span>
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === "ok"
                  ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse"
                  : healthLoading
                  ? "bg-amber-400 animate-pulse"
                  : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
              }`}
            />
            <span className="text-slate-300">
              {health?.status === "ok" ? "ONLINE" : healthLoading ? "CONNECTING..." : "OFFLINE"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* TAB 1: CHAT */}
        {activeTab === "chat" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Conversations Sidebar */}
            <aside className="w-72 border-r border-slate-800/80 bg-slate-950/40 flex flex-col backdrop-blur-sm">
              <div className="p-3 border-b border-slate-800/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  History
                </span>
                <button
                  onClick={startNewChat}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No conversations yet.
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                        activeConversationId === conv.id
                          ? "bg-cyan-950/40 text-cyan-300 border border-cyan-800/50"
                          : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                      }`}
                    >
                      <div className="truncate flex-1 pr-2">{conv.title || "Untitled Chat"}</div>
                      <button
                        onClick={(e) => deleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
                        title="Delete chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </aside>

            {/* Chat Conversation & Prompt Area */}
            <div className="flex-1 flex flex-col bg-slate-950/20 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && !streamingContent ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4 py-12">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                      <Sparkles className="w-7 h-7 text-cyan-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-100">
                        How can DORAEMON assist your workflow today?
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Ask questions, coordinate tasks, recall memories, or plan your next high-impact action.
                      </p>
                    </div>

                    {/* Quick Starter Prompts */}
                    <div className="grid grid-cols-2 gap-2 w-full pt-4">
                      <button
                        onClick={() => handleSendMessage("What should I do now?")}
                        className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition-all hover:border-cyan-500/30"
                      >
                        <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" /> Next Action
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Evaluate tasks and pick what to do now
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          handleSendMessage("Remember that client meeting is scheduled for 3 PM tomorrow.")
                        }
                        className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition-all hover:border-blue-500/30"
                      >
                        <div className="font-semibold text-blue-400 flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5" /> Store Memory
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Remember important facts & rules
                        </div>
                      </button>
                      <button
                        onClick={() =>
                          handleSendMessage("Create a critical task to finalize quarterly security review.")
                        }
                        className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition-all hover:border-emerald-500/30"
                      >
                        <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <ListTodo className="w-3.5 h-3.5" /> Create Task
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Add a new item to the task backlog
                        </div>
                      </button>
                      <button
                        onClick={() => handleSendMessage("Search memory for deployment access requirements.")}
                        className="p-3 text-left rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 text-xs text-slate-300 transition-all hover:border-purple-500/30"
                      >
                        <div className="font-semibold text-purple-400 flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5" /> Recall Info
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Semantic search across past notes
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-3 max-w-3xl ${
                          m.role === "user" ? "ml-auto justify-end" : "mr-auto justify-start"
                        }`}
                      >
                        {m.role !== "user" && (
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                            <Sparkles className="w-4 h-4 text-cyan-400" />
                          </div>
                        )}
                        <div
                          className={`p-4 rounded-2xl text-xs leading-relaxed ${
                            m.role === "user"
                              ? "bg-cyan-600/20 text-cyan-100 border border-cyan-500/30 max-w-xl"
                              : "bg-slate-900/80 text-slate-200 border border-slate-800/90 shadow-md whitespace-pre-wrap font-sans"
                          }`}
                        >
                          {m.content}
                        </div>
                        {m.role === "user" && (
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                            <User className="w-4 h-4 text-slate-300" />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Streaming Chunk */}
                    {streamingContent && (
                      <div className="flex gap-3 max-w-3xl mr-auto justify-start">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="p-4 rounded-2xl text-xs leading-relaxed bg-slate-900/80 text-slate-200 border border-cyan-500/40 shadow-md whitespace-pre-wrap">
                          {streamingContent}
                          <span className="inline-block w-1.5 h-3 ml-1 bg-cyan-400 animate-ping" />
                        </div>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Box */}
              <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="max-w-4xl mx-auto flex items-end gap-2 bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/50 rounded-2xl p-2 transition-all shadow-lg"
                >
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Message DORAEMON... (e.g., 'Plan my day' or 'What should I do now?')"
                    className="flex-1 bg-transparent border-0 resize-none text-xs text-slate-100 placeholder-slate-500 focus:outline-none px-2 py-1.5 max-h-32"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isStreaming}
                    className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TASKS */}
        {activeTab === "tasks" && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-cyan-400" />
                  Task Backlog & Operations
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Deterministic task tracking with priority evaluation and AI integration.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
                {(["all", "active", "done"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTaskFilter(f)}
                    className={`px-3 py-1 rounded-md capitalize transition-all ${
                      taskFilter === f
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Add Form */}
            <form
              onSubmit={handleCreateTask}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center gap-3"
            >
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New task title... (e.g., 'Deploy API v1 to staging')"
                className="flex-1 min-w-[240px] px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical Priority</option>
              </select>
              <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={newTaskMinutes}
                  onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                  className="w-12 bg-transparent text-slate-200 text-center focus:outline-none font-mono"
                />
                <span>min</span>
              </div>
              <input
                type="text"
                value={newTaskTags}
                onChange={(e) => setNewTaskTags(e.target.value)}
                placeholder="Tags (comma separated)..."
                className="w-48 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                type="submit"
                disabled={!newTaskTitle.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-40"
              >
                Add Task
              </button>
            </form>

            {/* Tasks List */}
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  No tasks matching the current filter.
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      task.status === "done"
                        ? "bg-slate-950/30 border-slate-900 opacity-60"
                        : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          task.status === "done"
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : "border-slate-700 hover:border-cyan-400"
                        }`}
                      >
                        {task.status === "done" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div>
                        <div
                          className={`text-xs font-medium ${
                            task.status === "done"
                              ? "line-through text-slate-500"
                              : "text-slate-200"
                          }`}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Priority Badge */}
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
                          task.priority === "critical"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : task.priority === "high"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : task.priority === "medium"
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {task.priority}
                      </span>

                      {/* Estimated Duration */}
                      {task.estimated_minutes && (
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {task.estimated_minutes}m
                        </span>
                      )}

                      {/* Tags */}
                      {task.tags?.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono"
                        >
                          #{tag}
                        </span>
                      ))}

                      {/* Delete Action */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MEMORY */}
        {activeTab === "memory" && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-400" />
                  Semantic & Structured Memory
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Vector embeddings and structured recall used automatically during AI reasoning.
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
                {["all", "work", "preference", "fact", "project", "general"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setMemoryCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-md capitalize transition-all ${
                      memoryCategoryFilter === cat
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Semantic Search Bar */}
            <form onSubmit={handleSearchMemory} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={memorySearchQuery}
                  onChange={(e) => setMemorySearchQuery(e.target.value)}
                  placeholder="Semantic search memories... (e.g. 'Who handles deployment access?')"
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingMemory}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)] disabled:opacity-40"
              >
                {isSearchingMemory ? "Searching..." : "Search"}
              </button>
            </form>

            {/* Add Memory Form */}
            <form
              onSubmit={handleCreateMemory}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center gap-3"
            >
              <input
                type="text"
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
                placeholder="Store a new fact, rule, or preference... (e.g. 'Deployments require Sarah approval')"
                className="flex-1 min-w-[280px] px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <select
                value={newMemoryCategory}
                onChange={(e) => setNewMemoryCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-blue-500/50 capitalize"
              >
                <option value="general">General</option>
                <option value="work">Work</option>
                <option value="preference">Preference</option>
                <option value="fact">Fact</option>
                <option value="project">Project</option>
                <option value="system">System</option>
              </select>
              <input
                type="text"
                value={newMemoryTags}
                onChange={(e) => setNewMemoryTags(e.target.value)}
                placeholder="Tags..."
                className="w-40 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
              <button
                type="submit"
                disabled={!newMemoryContent.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)] disabled:opacity-40"
              >
                Remember
              </button>
            </form>

            {/* Memories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {memories.length === 0 ? (
                <div className="col-span-2 text-center py-16 text-slate-500 text-xs">
                  No memories stored. Ask DORAEMON or add one above!
                </div>
              ) : (
                memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between hover:border-slate-700 transition-all space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          {mem.category}
                        </span>
                        {mem.score !== undefined && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Match: {(mem.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">{mem.content}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-slate-600" />
                        {mem.tags?.length > 0 ? mem.tags.join(", ") : "no tags"}
                      </div>
                      <button
                        onClick={() => handleDeleteMemory(mem.id)}
                        className="p-1 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PRODUCTIVITY */}
        {activeTab === "productivity" && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                Productivity Engine & Next Action
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Contextual prioritization, focus flow management, and accomplishment metrics.
              </p>
            </div>

            {/* HERO CARD: WHAT SHOULD I DO NOW? */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/30 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-semibold tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      HIGHEST IMPACT ACTION
                    </span>
                    {nextAction?.priority && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] uppercase">
                        {nextAction.priority} Priority
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-slate-100">
                    {nextAction?.task_title || "Loading next action..."}
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {nextAction?.reason}
                  </p>
                  <p className="text-xs font-mono text-cyan-400">
                    💡 {nextAction?.suggested_action}
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() =>
                      handleStartFocus(
                        nextAction?.estimated_minutes || 25,
                        nextAction?.task_id
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start {nextAction?.estimated_minutes || 25}m Focus
                  </button>
                  <button
                    onClick={fetchProductivity}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-evaluate
                  </button>
                </div>
              </div>
            </div>

            {/* FOCUS TIMER & DAILY STATS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Focus Timer Widget */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    Deep Focus Session
                  </span>
                  {activeFocusSession && (
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full animate-pulse">
                      SESSION ACTIVE
                    </span>
                  )}
                </div>

                <div className="text-center py-4 space-y-2">
                  <div className="text-5xl font-extrabold font-mono text-slate-100 tracking-wider">
                    {focusRemainingSeconds !== null
                      ? formatSeconds(focusRemainingSeconds)
                      : `${focusDurationSelect}:00`}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {activeFocusSession
                      ? `Focusing: ${activeFocusSession.notes || "Deep Work"}`
                      : "Ready to launch focus block"}
                  </p>
                </div>

                {activeFocusSession ? (
                  <button
                    onClick={handleEndFocus}
                    className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Complete / Stop Focus Session
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-center gap-2">
                      {[15, 25, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => setFocusDurationSelect(mins)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                            focusDurationSelect === mins
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200"
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={focusNotesInput}
                      onChange={(e) => setFocusNotesInput(e.target.value)}
                      placeholder="Focus objective (optional)..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={() => handleStartFocus(focusDurationSelect)}
                      className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Start Focus Block
                    </button>
                  </div>
                )}
              </div>

              {/* Daily Stats Widget */}
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Daily Productivity Metrics
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    {dailySummary?.date || "Today"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-500 uppercase font-mono">
                      Completed Tasks
                    </span>
                    <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                      {dailySummary?.completed_tasks_count ?? 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-500 uppercase font-mono">
                      Active Backlog
                    </span>
                    <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                      {dailySummary?.active_tasks_count ?? 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-500 uppercase font-mono">
                      Focus Minutes
                    </span>
                    <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                      {dailySummary?.total_focus_minutes ?? 0}m
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[11px] text-slate-500 uppercase font-mono">
                      Productivity Score
                    </span>
                    <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                      {dailySummary?.productivity_score ?? 0}%
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 text-center">
                  Consistent focus session blocks build high long-term output.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM */}
        {activeTab === "system" && (
          <div className="flex-1 flex flex-col p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-6">
            <div>
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                System Status & Architecture Telemetry
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Phase-by-phase telemetry, database connections, and AI provider configurations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase font-mono">
                  <Cpu className="w-4 h-4" /> AI Layer
                </div>
                <div className="text-sm font-bold text-slate-100 uppercase">
                  {health?.ai_provider || "Gemini"}
                </div>
                <div className="text-xs text-slate-400">
                  Model: <span className="font-mono text-slate-300">gemini-2.0-flash</span>
                </div>
                <div className="text-xs text-slate-400">
                  Embeddings: <span className="font-mono text-slate-300">text-embedding-004</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase font-mono">
                  <Database className="w-4 h-4" /> Persistence
                </div>
                <div className="text-sm font-bold text-slate-100">
                  {health?.db_connected ? "Connected" : "Disconnected"}
                </div>
                <div className="text-xs text-slate-400">
                  Engine: <span className="font-mono text-slate-300">Async SQLAlchemy + SQLite / pgvector</span>
                </div>
                <div className="text-xs text-slate-400">
                  Memory Store: <span className="font-mono text-slate-300">{memories.length} records</span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs uppercase font-mono">
                  <Zap className="w-4 h-4" /> Tools & Capabilities
                </div>
                <div className="text-sm font-bold text-slate-100">10 Active Tools</div>
                <div className="text-xs text-slate-400">
                  Task CRUD, Semantic Memory, Focus Timers, Next Action
                </div>
                <div className="text-xs text-slate-400">
                  Safety: <span className="font-mono text-emerald-400">Allowlist / Risk Verified</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
