import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { addInteraction } from '../store/interactionsSlice';
import HCPSelector from './HCPSelector';

const INTERACTION_TYPES = ['In-Person Visit', 'Phone Call', 'Email', 'Webinar', 'Conference', 'Other'];

const AI_SUGGESTED_FOLLOWUPS = [
    'Schedule follow-up meeting in 2 weeks',
    'Send OncoBonst Phase III PDF',
    'Add Dr. Sharma to advisory board invite list',
];

export default function StructuredForm({ onSuccess }) {
    const dispatch = useDispatch();
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toTimeString().slice(0, 5);

    const [form, setForm] = useState({
        hcp_id: null,
        hcpName: '',
        interaction_type: 'In-Person Visit',
        interaction_date: today,
        interaction_time: nowTime,
        attendees: '',
        topics_discussed: '',
        materials_shared: [],
        samples_provided: [],
        sentiment: 'Neutral',          // Positive | Neutral | Negative
        outcomes: '',
        next_steps: '',
        raw_notes: '',
        products_discussed: '',
        objections_raised: '',
        follow_up_date: '',
        duration_minutes: '',
        location: '',
    });

    const [newMaterial, setNewMaterial] = useState('');
    const [newSample, setNewSample] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [aiFollowups] = useState(AI_SUGGESTED_FOLLOWUPS);

    const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleHCPSelect = (hcp) => setForm(f => ({ ...f, hcp_id: hcp.id, hcpName: hcp.name }));

    const addMaterial = () => {
        if (!newMaterial.trim()) return;
        setForm(f => ({ ...f, materials_shared: [...f.materials_shared, newMaterial.trim()] }));
        setNewMaterial('');
    };

    const removeMaterial = (i) => setForm(f => ({ ...f, materials_shared: f.materials_shared.filter((_, idx) => idx !== i) }));

    const addSample = () => {
        if (!newSample.trim()) return;
        setForm(f => ({ ...f, samples_provided: [...f.samples_provided, newSample.trim()] }));
        setNewSample('');
    };

    const removeSample = (i) => setForm(f => ({ ...f, samples_provided: f.samples_provided.filter((_, idx) => idx !== i) }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.hcp_id) { setError('Please select an HCP.'); return; }
        setLoading(true); setError('');
        try {
            const dateTimeStr = form.interaction_date
                ? `${form.interaction_date}T${form.interaction_time || '00:00'}:00`
                : null;
            const payload = {
                hcp_id: form.hcp_id,
                interaction_type: form.interaction_type,
                interaction_date: dateTimeStr ? new Date(dateTimeStr).toISOString() : null,
                duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
                location: form.location || null,
                raw_notes: [form.topics_discussed, form.outcomes, form.raw_notes].filter(Boolean).join('\n\n') || null,
                products_discussed: form.products_discussed
                    ? form.products_discussed.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                next_steps: [form.next_steps, ...aiFollowups.slice(0, 1)].filter(Boolean).join('; ') || null,
                objections_raised: form.objections_raised
                    ? form.objections_raised.split(',').map(s => s.trim()).filter(Boolean)
                    : [],
                samples_provided: form.samples_provided,
                follow_up_date: form.follow_up_date ? new Date(form.follow_up_date).toISOString() : null,
                sentiment: form.sentiment.toLowerCase(),
            };
            await dispatch(addInteraction(payload)).unwrap();
            onSuccess?.();
            // Reset form
            setForm({
                hcp_id: null, hcpName: '', interaction_type: 'In-Person Visit',
                interaction_date: today, interaction_time: nowTime,
                attendees: '', topics_discussed: '', materials_shared: [],
                samples_provided: [], sentiment: 'Neutral', outcomes: '',
                next_steps: '', raw_notes: '', products_discussed: '',
                objections_raised: '', follow_up_date: '', duration_minutes: '', location: '',
            });
        } catch (err) {
            setError(err?.message || 'Failed to log interaction. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const sectionStyle = {
        marginBottom: 'var(--space-5)',
    };

    const sectionHeaderStyle = {
        fontSize: 'var(--text-sm)',
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 'var(--space-3)',
        paddingBottom: 'var(--space-2)',
        borderBottom: '1px solid var(--border-default)',
    };

    const rowStyle = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-3)',
    };

    const labelStyle = {
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        display: 'block',
    };

    return (
        <form onSubmit={handleSubmit} id="log-interaction-form">
            {/* Error */}
            {error && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
                    marginBottom: 'var(--space-4)', color: 'var(--accent-danger)', fontSize: 'var(--text-sm)'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* ── SECTION: Interaction Details ── */}
            <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Interaction Details</div>

                {/* HCP Name */}
                <div className="form-group">
                    <label style={labelStyle}>HCP Name</label>
                    <HCPSelector onSelect={handleHCPSelect} selectedId={form.hcp_id} placeholder="Search or select HCP…" />
                </div>

                {/* Type + Date */}
                <div style={rowStyle}>
                    <div className="form-group">
                        <label style={labelStyle}>Interaction Type</label>
                        <select id="interaction-type-select" className="form-select" value={form.interaction_type} onChange={update('interaction_type')}>
                            {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label style={labelStyle}>Date</label>
                        <input id="interaction-date" type="date" className="form-input" value={form.interaction_date} onChange={update('interaction_date')} />
                    </div>
                </div>

                {/* Attendees + Time */}
                <div style={rowStyle}>
                    <div className="form-group">
                        <label style={labelStyle}>Attendees</label>
                        <input
                            id="attendees"
                            type="text"
                            className="form-input"
                            placeholder="Enter names or search…"
                            value={form.attendees}
                            onChange={update('attendees')}
                        />
                    </div>
                    <div className="form-group">
                        <label style={labelStyle}>Time</label>
                        <input id="interaction-time" type="time" className="form-input" value={form.interaction_time} onChange={update('interaction_time')} />
                    </div>
                </div>

                {/* Topics Discussed */}
                <div className="form-group">
                    <label style={labelStyle}>Topics Discussed</label>
                    <textarea
                        id="topics-discussed"
                        className="form-textarea"
                        placeholder="Enter key discussion points…"
                        value={form.topics_discussed}
                        onChange={update('topics_discussed')}
                        rows={3}
                    />
                </div>

                {/* Voice Note CTA */}
                <button
                    type="button"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '6px 12px',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: 'var(--space-4)',
                    }}
                    onClick={() => { }}
                >
                    🎙️ Summarize from Voice Note <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Requires Consent)</span>
                </button>
            </div>

            {/* ── SECTION: Materials Shared / Samples Distributed ── */}
            <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Materials Shared / Samples Distributed</div>

                {/* Materials */}
                <div className="form-group">
                    <label style={labelStyle}>Materials Shared</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. OncoBonst Phase III PDF"
                            value={newMaterial}
                            onChange={e => setNewMaterial(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMaterial(); } }}
                            style={{ flex: 1 }}
                        />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={addMaterial} style={{ whiteSpace: 'nowrap' }}>
                            🔍 Search/Add
                        </button>
                    </div>
                    {form.materials_shared.length === 0 ? (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No materials added</div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {form.materials_shared.map((m, i) => (
                                <span key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)',
                                    borderRadius: 999, padding: '2px 10px', fontSize: 'var(--text-xs)', fontWeight: 600,
                                }}>
                                    {m}
                                    <button type="button" onClick={() => removeMaterial(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 12, marginLeft: 2, padding: 0 }}>×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Samples */}
                <div className="form-group">
                    <label style={labelStyle}>Samples Distributed</label>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g. Metformin 500mg ×10"
                            value={newSample}
                            onChange={e => setNewSample(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSample(); } }}
                            style={{ flex: 1 }}
                        />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={addSample} style={{ whiteSpace: 'nowrap' }}>
                            ➕ Add Sample
                        </button>
                    </div>
                    {form.samples_provided.length === 0 ? (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>No samples added</div>
                    ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {form.samples_provided.map((s, i) => (
                                <span key={i} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    background: 'rgba(16,185,129,0.12)', color: '#10b981',
                                    borderRadius: 999, padding: '2px 10px', fontSize: 'var(--text-xs)', fontWeight: 600,
                                }}>
                                    {s}
                                    <button type="button" onClick={() => removeSample(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 12, marginLeft: 2, padding: 0 }}>×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── SECTION: Observed HCP Sentiment ── */}
            <div style={sectionStyle}>
                <div style={{ ...sectionHeaderStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#f59e0b' }}>⭐</span> Observed/Inferred HCP Sentiment
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                    {['Positive', 'Neutral', 'Negative'].map(s => (
                        <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                            <input
                                type="radio"
                                name="sentiment"
                                value={s}
                                checked={form.sentiment === s}
                                onChange={() => setForm(f => ({ ...f, sentiment: s }))}
                                style={{ accentColor: s === 'Positive' ? '#10b981' : s === 'Negative' ? '#ef4444' : '#94a3b8' }}
                            />
                            <span style={{
                                color: s === 'Positive' ? '#10b981' : s === 'Negative' ? '#ef4444' : 'var(--text-secondary)'
                            }}>
                                {s === 'Positive' ? '😊' : s === 'Negative' ? '😞' : '😐'} {s}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* ── SECTION: Outcomes ── */}
            <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Outcomes</div>
                <textarea
                    id="outcomes"
                    className="form-textarea"
                    placeholder="Key outcomes or agreements…"
                    value={form.outcomes}
                    onChange={update('outcomes')}
                    rows={3}
                />
            </div>

            {/* ── SECTION: Follow-up Actions ── */}
            <div style={sectionStyle}>
                <div style={sectionHeaderStyle}>Follow-up Actions</div>
                <textarea
                    id="next-steps"
                    className="form-textarea"
                    placeholder="Enter next steps or tasks…"
                    value={form.next_steps}
                    onChange={update('next_steps')}
                    rows={2}
                />

                {/* AI Suggested Follow-ups */}
                <div style={{
                    marginTop: 'var(--space-3)',
                    background: 'rgba(99,102,241,0.06)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3)',
                    border: '1px solid rgba(99,102,241,0.15)',
                }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                        🤖 AI Suggested Follow-ups
                    </div>
                    {aiFollowups.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                            <span style={{ color: 'var(--accent-primary)', fontSize: 10, marginTop: 3 }}>●</span>
                            <span
                                style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                onClick={() => setForm(f => ({ ...f, next_steps: f.next_steps ? `${f.next_steps}; ${tip}` : tip }))}
                            >
                                {tip}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border-default)' }}>
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setForm(f => ({
                        ...f, hcp_id: null, hcpName: '', attendees: '', topics_discussed: '',
                        materials_shared: [], samples_provided: [], sentiment: 'Neutral',
                        outcomes: '', next_steps: '', raw_notes: '', products_discussed: '',
                        objections_raised: '', follow_up_date: '',
                    }))}
                >
                    Clear
                </button>
                <button id="submit-interaction-btn" type="submit" className="btn btn-primary" disabled={loading}>
                    {loading
                        ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
                        : '✓ Log Interaction'
                    }
                </button>
            </div>
        </form>
    );
}
