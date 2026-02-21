import { useState } from 'react';
import StructuredForm from '../components/StructuredForm';
import ChatInterface from '../components/ChatInterface';
import EditInteractionModal from '../components/EditInteractionModal';

export default function LogInteractionScreen() {
    const [editTarget, setEditTarget] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    return (
        <div className="page" style={{ padding: 'var(--space-4) var(--space-6)', maxWidth: '100%' }}>
            {/* Page Header */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                    Log HCP Interaction
                </h2>
            </div>

            {/* Two-Panel Layout: Form Left | Chat Right — always side-by-side */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 360px',
                gap: 'var(--space-4)',
                alignItems: 'start',
            }}>
                {/* LEFT: Structured Form */}
                <div className="card" style={{ padding: 'var(--space-5)' }}>
                    <StructuredForm onSuccess={() => showToast('✅ Interaction logged successfully!')} />
                </div>

                {/* RIGHT: AI Assistant Chat — always visible */}
                <div className="card" style={{
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 700,
                    overflow: 'hidden',
                }}>
                    {/* Chat Panel Header */}
                    <div style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border-default)',
                        background: 'rgba(99,102,241,0.08)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1rem' }}>🤖</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                                    AI Assistant
                                </div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                    Log interaction via chat
                                </div>
                            </div>
                        </div>
                    </div>
                    <ChatInterface compact />
                </div>
            </div>

            {/* Edit Modal */}
            {editTarget && (
                <EditInteractionModal
                    interaction={editTarget}
                    onClose={() => { setEditTarget(null); showToast('✅ Interaction updated!'); }}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast toast-${toast.type}`}>
                        {toast.message}
                    </div>
                </div>
            )}
        </div>
    );
}
