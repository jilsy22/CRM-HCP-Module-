import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    addUserMessage, startAIMessage, appendStreamToken,
    addToolEvent, finalizeAIMessage, setLoading, resetChat,
} from '../store/chatSlice';
import { streamChatMessage } from '../services/api';

const TOOL_LABELS = {
    log_interaction: { icon: '📝', label: 'Logging Interaction', color: '#10b981' },
    edit_interaction: { icon: '✏️', label: 'Editing Interaction', color: '#f59e0b' },
    search_hcp: { icon: '🔍', label: 'Searching HCPs', color: '#38bdf8' },
    get_interaction_history: { icon: '📋', label: 'Loading History', color: '#8b5cf6' },
    generate_next_best_action: { icon: '🎯', label: 'Generating Next Best Action', color: '#6366f1' },
};

const EXAMPLE_PROMPTS = [
    "Log my meeting with Dr. Priya Sharma today about Metformin XR — very positive, she agreed to prescribe",
    "Show me interaction history for Dr. Arjun Mehta",
    "Search for Cardiologists in the North territory",
    "What should I do next with Dr. Sneha Reddy?",
    "Edit interaction 1 — add next step: send follow-up brochure by Friday",
];

export default function ChatInterface({ compact = false }) {
    const dispatch = useDispatch();
    const { messages, loading, streamingContent, activeToolCalls, sessionId } = useSelector(s => s.chat);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, streamingContent, activeToolCalls]);

    const sendMessage = useCallback(async (text) => {
        const msg = text || input.trim();
        if (!msg || loading) return;
        setInput('');

        dispatch(addUserMessage(msg));
        dispatch(startAIMessage());

        streamChatMessage(
            { session_id: sessionId, message: msg },
            (token) => dispatch(appendStreamToken(token)),
            (event) => dispatch(addToolEvent(event)),
            () => dispatch(finalizeAIMessage()),
            (err) => {
                console.error('Stream error:', err);
                dispatch(setLoading(false));
                dispatch(finalizeAIMessage());
            }
        );
    }, [dispatch, input, loading, sessionId]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const renderMessage = (msg) => {
        const isUser = msg.role === 'user';
        return (
            <div key={msg.id} className={`chat-bubble ${isUser ? 'user' : ''}`}>
                <div className={`chat-bubble-avatar ${isUser ? 'avatar-user' : 'avatar-ai'}`}>
                    {isUser ? '👤' : '🤖'}
                </div>
                <div className="chat-bubble-content">
                    <div className={`chat-bubble-text ${isUser ? 'bubble-user' : 'bubble-ai'}`}>
                        {msg.content}
                    </div>
                    {/* Tool calls summary */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {msg.toolCalls.map((tc, i) => {
                                const meta = TOOL_LABELS[tc.tool] || { icon: '🔧', label: tc.tool, color: '#94a3b8' };
                                return (
                                    <div key={i} className="tool-call-card">
                                        <span style={{ color: meta.color }}>{meta.icon}</span>
                                        <span className="tool-call-badge" style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}18` }}>
                                            {meta.label}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)' }}>
                                            {tc.status === 'done' ? '✓ completed' : '⏳ running'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className={`chat-bubble-meta ${isUser ? 'bubble-user-meta' : 'bubble-ai-meta'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="chat-container" id="chat-container">
            {/* Messages */}
            <div className="chat-messages" id="chat-messages">
                {/* Welcome */}
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🤖</div>
                        <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                            AI Field Rep Assistant
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', maxWidth: 400, margin: '0 auto var(--space-6)' }}>
                            I can log interactions, search HCPs, review history, and recommend next best actions — just chat with me!
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'center' }}>
                            {EXAMPLE_PROMPTS.map((p, i) => (
                                <button
                                    key={i}
                                    id={`example-prompt-${i}`}
                                    className="btn btn-ghost"
                                    style={{ fontSize: 'var(--text-xs)', textAlign: 'left', maxWidth: 480, width: '100%' }}
                                    onClick={() => sendMessage(p)}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(renderMessage)}

                {/* Active tool calls (streaming) */}
                {loading && activeToolCalls.length > 0 && (
                    <div className="chat-bubble">
                        <div className="chat-bubble-avatar avatar-ai">🤖</div>
                        <div className="chat-bubble-content">
                            {activeToolCalls.map((tc, i) => {
                                const meta = TOOL_LABELS[tc.tool] || { icon: '🔧', label: tc.tool, color: '#94a3b8' };
                                return (
                                    <div key={i} className="tool-call-card animate-pulse">
                                        <span style={{ color: meta.color }}>{meta.icon}</span>
                                        <span className="tool-call-badge" style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}18` }}>
                                            {meta.label}…
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Streaming text */}
                {loading && streamingContent && (
                    <div className="chat-bubble">
                        <div className="chat-bubble-avatar avatar-ai">🤖</div>
                        <div className="chat-bubble-content">
                            <div className="chat-bubble-text bubble-ai">
                                {streamingContent}
                                <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--accent-primary)', marginLeft: 2, animation: 'pulse 0.8s infinite', verticalAlign: 'text-bottom' }} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Typing indicator */}
                {loading && !streamingContent && activeToolCalls.length === 0 && (
                    <div className="chat-bubble">
                        <div className="chat-bubble-avatar avatar-ai">🤖</div>
                        <div className="chat-bubble-content">
                            <div className="chat-bubble-text bubble-ai">
                                <div className="typing-dots">
                                    <span /><span /><span />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area" style={compact ? { padding: 'var(--space-3)', flexDirection: 'row', gap: 8 } : {}}>
                <textarea
                    ref={textareaRef}
                    id="chat-input"
                    className="chat-input"
                    placeholder={compact ? 'Describe interaction…' : 'Ask me to log, edit, search, or analyze HCP interactions…'}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={compact ? 2 : 1}
                    disabled={loading}
                    style={compact ? { resize: 'none', minHeight: 48 } : {}}
                />
                <button
                    id="chat-send-btn"
                    className={compact ? 'btn btn-primary btn-sm' : 'chat-send-btn'}
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    style={compact ? { alignSelf: 'flex-end', whiteSpace: 'nowrap' } : {}}
                >
                    {loading
                        ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                        : compact ? '⚡ Log' : '↑'
                    }
                </button>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 var(--space-4) var(--space-3)', borderTop: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Powered by LangGraph · Groq gemma2-9b-it
                </span>
                <button className="btn btn-ghost btn-sm" id="reset-chat-btn" onClick={() => dispatch(resetChat())}>
                    New Chat
                </button>
            </div>
        </div>
    );
}
