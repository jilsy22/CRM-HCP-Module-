import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadInteractions, setSelected, removeInteraction } from '../store/interactionsSlice';

const SENTIMENT_CLASS = {
    positive: 'badge-positive',
    neutral: 'badge-neutral',
    negative: 'badge-negative',
};

const TYPE_ICONS = {
    'In-Person Visit': '🤝',
    'Phone Call': '📞',
    'Email': '📧',
    'Webinar': '💻',
    'Conference': '🎤',
    'Other': '📌',
};

export default function InteractionHistory({ hcpId, onEdit }) {
    const dispatch = useDispatch();
    const { list, loading, selected } = useSelector(s => s.interactions);
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        dispatch(loadInteractions(hcpId ? { hcp_id: hcpId } : {}));
    }, [dispatch, hcpId]);

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-muted)' }}>Loading interactions…</p>
            </div>
        );
    }

    if (list.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>No interactions yet</h3>
                <p>Log your first HCP interaction using the form or chat interface above.</p>
            </div>
        );
    }

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm('Delete this interaction?')) {
            setDeleting(id);
            await dispatch(removeInteraction(id));
            setDeleting(null);
        }
    };

    return (
        <div className="interaction-list" id="interaction-list">
            {list.map(ix => (
                <div
                    key={ix.id}
                    className={`interaction-item${selected?.id === ix.id ? ' active' : ''}`}
                    id={`interaction-item-${ix.id}`}
                    onClick={() => dispatch(setSelected(ix))}
                    style={selected?.id === ix.id ? { borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.05)' } : {}}
                >
                    <div className="interaction-item-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span>{TYPE_ICONS[ix.interaction_type] || '📌'}</span>
                            <span className="interaction-item-title">
                                {ix.hcp?.name || `HCP #${ix.hcp_id}`}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            {ix.sentiment && (
                                <span className={`badge ${SENTIMENT_CLASS[ix.sentiment] || 'badge-neutral'}`}>
                                    {ix.sentiment}
                                </span>
                            )}
                            <button
                                className="btn btn-ghost btn-sm btn-icon"
                                id={`edit-interaction-${ix.id}`}
                                onClick={e => { e.stopPropagation(); onEdit?.(ix); }}
                                title="Edit"
                            >✏️</button>
                            <button
                                className="btn btn-danger btn-sm btn-icon"
                                id={`delete-interaction-${ix.id}`}
                                onClick={e => handleDelete(e, ix.id)}
                                title="Delete"
                                disabled={deleting === ix.id}
                            >
                                {deleting === ix.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🗑️'}
                            </button>
                        </div>
                    </div>

                    <div className="interaction-item-meta">
                        {ix.interaction_type}
                        {ix.interaction_date && ` · ${new Date(ix.interaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        {ix.hcp?.specialty && ` · ${ix.hcp.specialty}`}
                        {ix.duration_minutes && ` · ${ix.duration_minutes} min`}
                    </div>

                    {(ix.ai_summary || ix.raw_notes) && (
                        <div className="interaction-item-summary">
                            {ix.ai_summary || ix.raw_notes?.slice(0, 120)}
                        </div>
                    )}

                    {ix.products_discussed?.length > 0 && (
                        <div className="chips-row" style={{ marginTop: 'var(--space-2)' }}>
                            {ix.products_discussed.map(p => (
                                <span key={p} className="chip">💊 {p}</span>
                            ))}
                        </div>
                    )}

                    {ix.next_steps && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-info)', marginTop: 'var(--space-2)' }}>
                            ➡️ {ix.next_steps}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
