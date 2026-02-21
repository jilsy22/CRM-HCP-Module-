import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadInteractions } from '../store/interactionsSlice';
import { loadHCPs } from '../store/hcpSlice';

const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#94a3b8', negative: '#ef4444' };

export default function Dashboard() {
    const dispatch = useDispatch();
    const { list: interactions } = useSelector(s => s.interactions);
    const { list: hcps } = useSelector(s => s.hcps);

    useEffect(() => {
        dispatch(loadInteractions());
        dispatch(loadHCPs());
    }, [dispatch]);

    const positiveCount = interactions.filter(i => i.sentiment === 'positive').length;
    const thisWeek = interactions.filter(i => {
        const d = new Date(i.interaction_date);
        const now = new Date();
        return (now - d) < 7 * 24 * 60 * 60 * 1000;
    }).length;

    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header-text">
                    <h2>Dashboard</h2>
                    <p>Welcome back! Here's your HCP engagement overview.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                {[
                    { icon: '🏥', label: 'Total HCPs', value: hcps.length, change: null },
                    { icon: '📝', label: 'Interactions Logged', value: interactions.length, change: null },
                    { icon: '📅', label: 'This Week', value: thisWeek, change: null },
                    { icon: '😊', label: 'Positive Sentiment', value: positiveCount, change: null },
                ].map(stat => (
                    <div key={stat.label} className="stat-card" id={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Recent interactions preview */}
            <div className="card">
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Recent Interactions</h3>
                {interactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3>No interactions yet</h3>
                        <p>Head to <strong>Log Interaction</strong> to record your first HCP interaction.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {interactions.slice(0, 5).map(ix => (
                            <div key={ix.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                                <div style={{ fontSize: '1.5rem' }}>
                                    {ix.interaction_type === 'In-Person Visit' ? '🤝' : ix.interaction_type === 'Phone Call' ? '📞' : '📧'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                                        {ix.hcp?.name || `HCP #${ix.hcp_id}`}
                                    </div>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                                        {ix.interaction_type} · {ix.interaction_date ? new Date(ix.interaction_date).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                                {ix.sentiment && (
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: SENTIMENT_COLORS[ix.sentiment] || '#94a3b8', flexShrink: 0 }} title={ix.sentiment} />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
