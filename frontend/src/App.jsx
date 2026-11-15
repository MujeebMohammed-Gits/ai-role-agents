import { API_BASE } from './services/api';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Bot, MessageCircle, Activity, Play, Terminal,
  ChevronRight, X, Maximize, Minimize, Plus, Search, Sparkles,
  Globe, Layers, Shield, Users, Briefcase, Target, Brain, Wand2,
  BarChart3, Clock, RefreshCw, Link, ExternalLink,
} from 'lucide-react';
import { listAgents, getMemory, clearMemory } from './services/api.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import { renderMarkdown, renderMermaidDiagrams } from './utils/markdownRenderer.js';
import { formatLog, LEVEL_COLORS } from './utils/formatLog.js';

const AGENT_META = {
  delivery_management: { color: 'indigo', icon: Briefcase, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  enterprise_agile_coach: { color: 'indigo', icon: Users, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  scrum_master: { color: 'indigo', icon: Activity, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  product_manager: { color: 'indigo', icon: Target, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  product_owner: { color: 'indigo', icon: Layers, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  business_analyst: { color: 'indigo', icon: Wand2, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  user_research: { color: 'indigo', icon: Brain, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  devops_engineer: { color: 'indigo', icon: RefreshCw, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  sre: { color: 'indigo', icon: Shield, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  platform_engineering: { color: 'indigo', icon: Globe, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  programme_manager: { color: 'indigo', icon: BarChart3, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
  management_consultant: { color: 'indigo', icon: Brain, gradient: 'from-indigo-100 to-indigo-200', border: 'border-indigo-200/50' },
};

function formatTime(ts) {
  if (!ts) return '';
  let ms;
  if (typeof ts === 'number') {
    ms = ts < 1e12 ? ts * 1000 : ts;
  } else {
    const s = typeof ts === 'string' && !/[Zz]|[+-]\d{2}:?\d{2}$/.test(ts.trim())
      ? ts.trim() + 'Z'
      : ts;
    ms = Date.parse(s);
  }
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function agentTitle(role) {
  const titles = {
    delivery_management: 'Delivery Management',
    enterprise_agile_coach: 'Enterprise Agile Coach',
    scrum_master: 'Scrum Master',
    product_manager: 'Product Manager',
    product_owner: 'Product Owner',
    business_analyst: 'Business Analyst',
    user_research: 'User Research',
    devops_engineer: 'DevOps Engineer',
    sre: 'Site Reliability Eng.',
    platform_engineering: 'Platform Engineering',
    programme_manager: 'Programme Manager',
    management_consultant: 'Management Consultant',
  };
  return titles[role] || role;
}

function AgentCard({ agent, selected, onSelect }) {
  const meta = AGENT_META[agent.role] || { color: 'slate', icon: Bot, gradient: 'from-slate-100 to-slate-200', border: 'border-slate-200/50' };
  const Icon = meta.icon;
  const isSelected = selected && selected.role === agent.role;
  return (
    <button
      onClick={() => onSelect(agent)}
      className={`agent-card group ${isSelected ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500' : ''} ${meta.border}`}
      aria-pressed={isSelected}
      type="button"
    >
      <div className="flex items-center justify-between w-full mb-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600">
          <Icon size={20} strokeWidth={2} />
        </div>
        <span className="text-xs font-semibold text-indigo-600">{agent.title}</span>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{agent.title}</h3>
      <p className="text-xs text-slate-600 leading-relaxed mb-3">{agent.description}</p>
      <div className="mt-auto flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-slate-600">
          <Sparkles size={10} strokeWidth={1.5} /> Always-on
        </span>
      </div>
    </button>
  );
}

function MessageBubble({ message, isAgent }) {
  const isUser = message.role === 'user';
  const bubbleRef = useRef(null);

  // Render any mermaid workflow diagrams once streaming has finished. While
  // streaming, the "Rendering workflow diagram..." placeholder stays visible.
  useEffect(() => {
    if (message.streaming || !bubbleRef.current) return;
    renderMermaidDiagrams(bubbleRef.current);
  }, [message.streaming, message.rendered]);
  const meta = isAgent ? AGENT_META[message.agentRole || 'delivery_management'] : null;
  const base = isUser
    ? 'bg-indigo-600 text-white'
    : 'bg-white border border-slate-200 shadow-sm text-slate-800';
  const alignClass = isUser ? 'ml-auto' : 'mr-auto';
  const tailClass = isUser ? 'rounded-tr-none' : 'rounded-tl-none';

  return (
    <div className={`flex ${alignClass} ${isUser ? "max-w-2xl" : "w-full"} mb-4 fade-in slide-up`}>
      <div ref={bubbleRef} style={isUser ? undefined : { width: "100%", maxWidth: "100%" }} className={`message-bubble ${base} ${tailClass}`}>
          {isAgent && meta && (
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-${meta.color}-100 text-${meta.color}-600`}>
              {(() => {
                const MessageIcon = meta.icon || Bot;
                return <MessageIcon size={10} strokeWidth={2} />;
              })()}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{agentTitle(message.agentRole)}</span>
            <span className="ml-auto text-[10px] text-slate-600">{formatTime(message.ts)}</span>
          </div>
        )}
        {message.rendered ? (
          <div className="prose prose-sm text-slate-800 max-w-none" dangerouslySetInnerHTML={{ __html: message.rendered }} />
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
        {isAgent && (
          <div className="mt-2 flex items-center gap-2">
            {message.evaluation && (
              <>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${message.evaluation.passed ? 'text-emerald-500 border border-emerald-500/20 bg-emerald-500/5' : 'text-rose-500 border border-rose-500/20 bg-rose-500/5'}`}>
                  Eval {Math.round(message.evaluation.score * 100)}
                </span>
                <span className={`text-[9px] ${message.validation_state === 'valid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {message.validation_state}
                </span>
              </>
            )}
            {message.guardrail?.passed === false && (
              <span className="text-[9px] text-rose-500">⚠ Guardrail</span>
            )}
          </div>
        )}
        {isAgent && message.context && message.context.length > 0 && (
          <details className="mt-2">
            <summary className="text-[9px] text-slate-600 cursor-pointer">Context ({message.context.length} docs)</summary>
            <div className="mt-1 p-2 bg-slate-100 border border-slate-200/30 rounded text-[10px]">
              {message.context.map((c, i) => (
                <div key={i} className="mb-1 text-slate-600">
                  <span className="font-mono text-indigo-600">Reference #{i + 1}</span>: {c.text.slice(0, 200)}…
                </div>
              ))}
            </div>
          </details>
        )}
        {isUser && (
          <span className="block mt-2 text-[10px] text-indigo-100">{formatTime(message.ts)}</span>
        )}
      </div>
    </div>
  );
}

function ConversationThread({ messages }) {
  return (
    <div className="h-full overflow-y-auto pl-6 pr-8 py-6 space-y-6">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted">
          <MessageCircle size={48} className="mb-3 opacity-50" />
          <p className="text-sm">No conversation yet. Select an agent and ask a question.</p>
        </div>
      ) : (
        <>
          {messages.map((m, i) => (
            <div key={i} className="flex w-full">
              {m.role === 'user' ? (
                <MessageBubble message={m} isAgent={false} />
              ) : (
                <MessageBubble message={m} isAgent agentRole={m.agentRole} />
              )}
            </div>
          ))}
          <div className="h-4" />
        </>
      )}
    </div>
  );
}

function LiveLog({ logs, collapsed, onToggle }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-100 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <Terminal size={14} strokeWidth={1.5} className="text-indigo-600" />
          <span className="text-sm font-semibold text-slate-900">Live Processing Log</span>
          <span className="ml-auto text-[10px] text-slate-600">{logs.length} events</span>
        </div>
        <ChevronRight size={16} className={`transition-transform duration-200 ${collapsed ? 'rotate-90' : ''}`} />
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-2 bg-slate-100">
          {logs.length === 0 ? (
            <div className="text-center py-4 text-[10px] text-slate-600">Waiting for agent activity…</div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="log-entry py-1 fade-in">
                <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${LEVEL_COLORS[entry.level] || 'text-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-mono text-slate-600">{entry.time || ''}</span>
                    <span className="text-indigo-600/70">[{entry.agent}]</span>
                    <span className="text-slate-600 uppercase tracking-tighter">{entry.level}</span>
                  </div>
                  <div className="text-[11px] text-slate-800 leading-snug">{entry.message}</div>
                  {entry.meta && Object.keys(entry.meta).length > 0 && (
                    <div className="mt-0.5 text-[9px] text-muted/70 font-mono">
                      {JSON.stringify(entry.meta)}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TraceLog({ events, collapsed, onToggle }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-100 cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-2">
          <Activity size={14} strokeWidth={1.5} className="text-indigo-600" />
          <span className="text-sm font-semibold text-slate-900">Trace Events</span>
          <span className="ml-auto text-[10px] text-slate-600">{events.length} events</span>
        </div>
        <ChevronRight size={16} className={`transition-transform duration-200 ${collapsed ? 'rotate-90' : ''}`} />
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-2 bg-slate-100">
          {events.length === 0 ? (
            <div className="text-center py-4 text-[10px] text-slate-600">Waiting for trace events…</div>
          ) : (
            events.map((ev, i) => (
              <div key={i} className="trace-entry py-1 fade-in border-b border-slate-200/20 last:border-b-0">
                <div className="flex items-center gap-1.5 text-[10px] mb-0.5">
                  <span className="font-mono text-indigo-600">{ev.type || 'trace'}</span>
                  <span className="text-slate-600 uppercase tracking-tighter">{ev.phase}</span>
                  <span className="text-slate-600">{ev.stage}</span>
                  {ev.score != null && (
                    <span className="ml-auto font-mono">{ev.score.toFixed(2)}</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-800 leading-snug truncate">
                  {JSON.stringify(ev.data || {})}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function QueryInput({ onSubmit, input, setInput, loading, disabled }) {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-slate-200 bg-white">
      <div className="relative">
        <input
          className="input-field pl-11 pr-10 py-3.5"
          placeholder="Ask your agent…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          autoFocus
        />
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        {loading ? (
          <RefreshCw size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 animate-[spin_1s_linear_infinite]" />
        ) : (
          <button
            type="submit"
            className="btn-ghost absolute right-3 top-1/2 -translate-y-1/2"
            disabled={disabled || !input.trim()}
          >
            <Play size={16} strokeWidth={2} />
          </button>
        )}
      </div>
      {disabled && (
        <p className="mt-2 text-[11px] text-slate-600">Select an agent to start asking questions.</p>
      )}
    </form>
  );
}

// React Error Boundary so a rendering error in the conversation area can never
// blank the whole screen. Renders a fallback with a refresh option instead.
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] caught rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center text-rose-500">
          <p className="text-sm mb-2">Failed to render a message.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-ghost text-xs"
          >
            Refresh conversation
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [logs, setLogs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showGallery, setShowGallery] = useState(true);
  const [logCollapsed, setLogCollapsed] = useState(true);
  const [traceCollapsed, setTraceCollapsed] = useState(true);
  const [traceEvents, setTraceEvents] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    listAgents().then((data) => setAgents(data)).catch((err) => {
      console.error('Failed to load agents', err);
      setAgents([]);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) {
      const id = 'sess_' + Math.random().toString(36).slice(2, 9);
      setSessionId(id);
    }
    if (sessionId && conversation.length === 0) {
      getMemory(sessionId, 50).then(({ messages }) => {
        setConversation(
          messages.map((m) => ({ role: m.role, content: m.content, agentRole: m.meta?.agentRole, ts: Date.now() }))
        );
      });
    }
  }, [sessionId]);

  useWebSocket('/api/ws/logs', (msg) => {
    setLogs((prev) => [...prev, formatLog(msg)].slice(-300));
  });

  useWebSocket('/api/ws/trace', (msg) => {
    setTraceEvents((prev) => [...prev, msg].slice(-300));
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const selectAgent = useCallback((agent) => {
    setSelectedAgent(agent);
    setShowGallery(false);
    const id = 'sess_' + agent.role + '_' + Math.random().toString(36).slice(2, 9);
    setSessionId(id);
    setConversation([]);
    setLogs([]);
    setTraceEvents([]);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!input.trim() || !selectedAgent) return;
      const userMsg = { role: 'user', content: input, ts: Date.now() };
      setConversation((prev) => [...prev, userMsg]);
      setInput('');
      setLoading(true);
            const streamId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const pendingMsg = {
        role: 'assistant',
        content: '',
        rendered: '',
        agentRole: selectedAgent.role,
        ts: Date.now(),
        streamId,
        streaming: true,
      };
      setConversation((prev) => [...prev, pendingMsg]);

      try {
        const res = await fetch(`${API_BASE}/query/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: selectedAgent.role,
            query: input,
            session_id: sessionId,
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `Query failed: ${res.status}`);
        }
        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentContent = '';
        let currentRendered = '';
        let finalResult = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            break;
          }
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split('\n\n');
          buffer = parts.pop();

          for (const part of parts) {
            if (!part.trim()) continue;
            let eventType = 'status';
            let eventData = '';
            for (const line of part.split('\n')) {
              if (line.startsWith('event: ')) eventType = line.slice(7);
              else if (line.startsWith('data: ')) eventData = line.slice(6);
            }
            if (!eventData) continue;

            const data = JSON.parse(eventData);

            if (eventType === 'token') {
              const chunk = typeof data === 'string' ? data : (data.text ?? data.chunk ?? data.token ?? data.content ?? '');
              currentContent += chunk;
              currentRendered = renderMarkdown(currentContent);
              setConversation((prev) =>
                prev.map((m) =>
                  m.streamId === streamId && m.role === 'assistant'
                    ? { ...m, content: currentContent, rendered: currentRendered }
                    : m
                )
              );
            } else if (eventType === 'status') {
              
            } else if (eventType === 'done') {
              finalResult = data;
            } else if (eventType === 'error') {
              throw new Error(data.message || 'Streaming error from agent');
            }
          }
        }

        // Process any leftover buffer after stream ends
        if (buffer.trim()) {
          let eventType = 'status';
          let eventData = '';
          for (const line of buffer.split('\n')) {
            if (line.startsWith('event: ')) eventType = line.slice(7);
            else if (line.startsWith('data: ')) eventData = line.slice(6);
          }
          if (eventData) {
            const data = JSON.parse(eventData);
            if (eventType === 'done') finalResult = data;
          }
        }

        if (finalResult) {
          const rendered = renderMarkdown(finalResult.response);
          const agentMsg = {
            role: 'assistant',
            content: finalResult.response,
            rendered,
            agentRole: selectedAgent.role,
            ts: Date.now(),
            streamId,
            streaming: false,
            evaluation: finalResult.evaluation,
            guardrail: finalResult.guardrail,
            context: finalResult.context,
            validation_state: finalResult.validation_state,
          };
          setConversation((prev) =>
            prev.map((m) =>
              m.streamId === streamId && m.role === 'assistant' ? agentMsg : m
            )
          );
          (finalResult.logs || []).forEach((l) =>
            setLogs((prev) => [...prev, formatLog(l)])
          );
        }
      } catch (err) {
        setConversation((prev) =>
          prev.map((m) =>
            m.streamId === streamId && m.role === 'assistant'
              ? { ...m, content: `Error: ${err.message}`, streaming: false }
              : m
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [input, selectedAgent, sessionId]
  );

  const clearChat = useCallback(() => {
    if (sessionId) clearMemory(sessionId);
    setConversation([]);
    setLogs([]);
    setTraceEvents([]);
  }, [sessionId]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar: Agent Gallery */}
      <aside
        className={`hidden lg:flex flex-col w-80 border-r border-border/30 transition-all duration-300 ${
          showGallery ? '' : 'w-16'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Bot size={18} strokeWidth={2} className="ai-bot-spin text-indigo-600" />
            <span className="font-bold text-lg tracking-tight text-slate-900 whitespace-nowrap">
              AI Role Agents
            </span>
          </div>
          <button
            onClick={() => setShowGallery(false)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Collapse sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className={`px-3 py-2 text-[11px] font-semibold text-slate-600 uppercase tracking-wider ${
            showGallery ? '' : 'hidden'
          }`}>
            Choose your agent
          </p>
          <div className="space-y-2">
            {agents.map((agent) => (
              <AgentCard
                key={agent.role}
                agent={agent}
                selected={selectedAgent}
                onSelect={selectAgent}
              />
            ))}
          </div>
          {showGallery && (
            <div className="pt-3 px-3 border-t border-border/30">
              <button
                onClick={clearChat}
                className="btn-ghost w-full text-[11px]"
              >
                <Plus size={14} className="mr-2" /> New conversation
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile toggle for gallery */}
      {!showGallery && typeof window !== 'undefined' && window.innerWidth <= 768 && (
        <div className="lg:hidden fixed bottom-4 left-4 z-50">
          <button onClick={() => setShowGallery(true)} className="btn-primary">
            <ChevronRight size={18} /> Open Agent Gallery
          </button>
        </div>
      )}

      {/* Main: Chat */}
      <main className="flex-1 min-w-0 flex flex-col bg-slate-50 relative">
        <header className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between z-10">
          <div className="flex items-center gap-3 ml-2">
            {selectedAgent ? (
              <>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-600">
                  {(() => {
                    const AgentIcon = AGENT_META[selectedAgent.role]?.icon || Bot;
                    return <AgentIcon size={20} strokeWidth={2} />;
                  })()}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-900">{selectedAgent.title}</h2>
                  <p className="text-xs text-slate-600">{selectedAgent.subtitle}</p>
                </div>
              </>
            ) : (
              <div className="text-center">
                <h2 className="font-semibold text-slate-900">Role Agents Mesh</h2>
                <p className="text-xs text-muted">Select an agent to begin</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogCollapsed((c) => !c)}
              className="btn-ghost text-[11px] px-3 py-2"
              title="Toggle live log"
            >
              <Terminal size={14} strokeWidth={1.5} className="mr-1" />
              Live Log
            </button>
            <button
              onClick={() => {
                setSelectedAgent(null);
                setShowGallery(true);
              }}
              className="btn-ghost text-[11px] px-3 py-2 hidden lg:inline-flex items-center"
              title="Show gallery"
            >
              <LayoutDashboard size={14} className="mr-1" /> Gallery
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            <ErrorBoundary>
              <ConversationThread messages={conversation} />
            </ErrorBoundary>
            <div ref={messagesEndRef} className="h-1" />
          </div>

          {/* Fixed Log Panel */}
          <div
            className={`border-t border-border transition-all duration-300 ${
            logCollapsed ? "h-8" : "h-40"
            }`}
          >
            <LiveLog
              logs={logs}
              collapsed={logCollapsed}
              onToggle={() => setLogCollapsed((c) => !c)}
            />
          </div>

          {/* Trace Events Panel */}
          <div
            className={`border-t border-border transition-all duration-300 ${
            traceCollapsed ? "h-8" : "h-40"
            }`}
          >
            <TraceLog
              events={traceEvents}
              collapsed={traceCollapsed}
              onToggle={() => setTraceCollapsed((c) => !c)}
            />
          </div>
        </div>

        <QueryInput
          onSubmit={handleSubmit}
          input={input}
          setInput={setInput}
          loading={loading}
          disabled={!selectedAgent}
        />

        {/* Footer credit */}
        <div className="w-full pt-3 pb-2 text-right pr-4 border-t border-slate-200 bg-white">
          <div className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap overflow-visible">
            {/* Softly pulsing status dot */}
            <span
              className="creator-outside-dot flex items-center justify-center w-2.5 h-2.5 rounded-full bg-brand-500 shadow-[0_0_12px_rgba(79,70,229,0.6)] pulse-glow"
            />
            {/* Glowing border pill around the credit */}
                <div className="creator-capsule"><span className="creator-capsule-text">AI Role Agents built by Mujeeb Mohammed</span></div>
          </div>
        </div>
      </main>
    </div>
  );
}
