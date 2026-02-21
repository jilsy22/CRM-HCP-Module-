import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { editInteraction } from '../store/interactionsSlice';

const INTERACTION_TYPES = [
    'In-Person Visit', 'Phone Call', 'Email', 'Webinar', 'Conference', 'Other'
];

export default function EditInteractionModal({ interaction, onClose }) {
    const dispatch = useDispatch();
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!interaction) return;
        setForm({
            interaction_type: interaction.interaction_type || 'In-Person Visit',
            interaction_date: interaction.interaction_date
                ? new Date(interaction.interaction_date).toISOString().split('T')[0] : '',
            duration_minutes: interaction.duration_minutes || '',
            location: interaction.location || '',
            raw_notes: interaction.raw_notes || '',
            products_discussed: (interaction.products_discussed || []).join(', '),
            next_steps: interaction.next_steps || '',
            objections_raised: (interaction.objections_raised || []).join(', '),
            samples_provided: (interaction.samples_provided || []).join(', '),
            follow_up_date: interaction.follow_up_date
                ? new Date(interaction.follow_up_date).toISOString().split('T')[0] : '',
        });
    }, [interaction]);

    const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await dispatch(editInteraction({
                id: interaction.id,
                data: {
                    interaction_type: form.interaction_type,
                    interaction_date: form.interaction_date ? new Date(form.interaction_date).toISOString() : null,
                    duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
                    location: form.location || null,
                    raw_notes: form.raw_notes || null,
                    products_discussed: form.products_discussed ? form.products_discussed.split(',').map(s => s.trim()).filter(Boolean) : [],
                    next_steps: form.next_steps || null,
                    objections_raised: form.objections_raised ? form.objections_raised.split(',').map(s => s.trim()).filter(Boolean) : [],
                    samples_provided: form.samples_provided ? form.samples_provided.split(',').map(s => s.trim()).filter(Boolean) : [],
                    follow_up_date: form.follow_up_date ? new Date(form.follow_up_date).toISOString() : null,
                },
            })).unwrap();
            onClose();
        } catch (err) {
            setError(err?.message || 'Update failed.');
        } finally {
            setLoading(false);
        }
    };

    if (!interaction) return null;

    return (
        <div className="modal-overlay" id="edit-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" id="edit-interaction-modal">
                <div className="modal-header">
                    <h2 className="modal-title">✏️ Edit Interaction #{interaction.id}</h2>
                    <button className="btn btn-ghost btn-icon" id="close-edit-modal" onClick={onClose}>✕</button>
                </div>

                <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 'var(--text-sm)', color: 'var(--accent-primary)' }}>
                    HCP: <strong>{interaction.hcp?.name || `#${interaction.hcp_id}`}</strong>
                    {interaction.hcp?.specialty && ` · ${interaction.hcp.specialty}`}
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', color: 'var(--accent-danger)', fontSize: 'var(--text-sm)' }}>
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} id="edit-interaction-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Interaction Type</label>
                            <select className="form-select" id="edit-type-select" value={form.interaction_type} onChange={update('interaction_type')}>
                                {INTERACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" id="edit-date" value={form.interaction_date} onChange={update('interaction_date')} />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Duration (min)</label>
                            <input type="number" className="form-input" id="edit-duration" value={form.duration_minutes} onChange={update('duration_minutes')} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Location</label>
                            <input type="text" className="form-input" id="edit-location" value={form.location} onChange={update('location')} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea className="form-textarea" id="edit-notes" value={form.raw_notes} onChange={update('raw_notes')} rows={4} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Products Discussed</label>
                        <input type="text" className="form-input" id="edit-products" value={form.products_discussed} onChange={update('products_discussed')} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Next Steps</label>
                        <input type="text" className="form-input" id="edit-next-steps" value={form.next_steps} onChange={update('next_steps')} />
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Objections</label>
                            <input type="text" className="form-input" id="edit-objections" value={form.objections_raised} onChange={update('objections_raised')} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Follow-Up Date</label>
                            <input type="date" className="form-input" id="edit-followup" value={form.follow_up_date} onChange={update('follow_up_date')} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
                        <button type="button" className="btn btn-ghost" id="cancel-edit-btn" onClick={onClose}>Cancel</button>
                        <button type="submit" id="save-edit-btn" className="btn btn-primary" disabled={loading}>
                            {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : '✓ Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
