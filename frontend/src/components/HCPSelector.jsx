import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loadHCPs, setSelectedHCP } from '../store/hcpSlice';

export default function HCPSelector({ onSelect, selectedId }) {
    const dispatch = useDispatch();
    const { list, loading } = useSelector(s => s.hcps);
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        dispatch(loadHCPs());
    }, [dispatch]);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const filtered = list.filter(h =>
        h.name.toLowerCase().includes(query.toLowerCase()) ||
        h.specialty.toLowerCase().includes(query.toLowerCase())
    );

    const selected = list.find(h => h.id === selectedId);

    const handleSelect = (hcp) => {
        onSelect(hcp);
        dispatch(setSelectedHCP(hcp));
        setQuery('');
        setOpen(false);
    };

    return (
        <div className="hcp-selector" ref={ref} id="hcp-selector-wrapper">
            <input
                id="hcp-search-input"
                className="form-input"
                placeholder={selected ? selected.name : 'Search HCP by name or specialty…'}
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                autoComplete="off"
                style={selected && !query ? { color: 'var(--accent-primary)', fontWeight: 600 } : {}}
            />
            {open && (
                <div className="hcp-dropdown">
                    {loading && (
                        <div className="hcp-dropdown-item" style={{ color: 'var(--text-muted)' }}>
                            <div className="spinner" style={{ width: 14, height: 14, display: 'inline-block', marginRight: 8 }} />
                            Loading…
                        </div>
                    )}
                    {!loading && filtered.length === 0 && (
                        <div className="hcp-dropdown-item" style={{ color: 'var(--text-muted)' }}>No HCPs found</div>
                    )}
                    {filtered.slice(0, 8).map(hcp => (
                        <div key={hcp.id} className="hcp-dropdown-item" onClick={() => handleSelect(hcp)} id={`hcp-option-${hcp.id}`}>
                            <div className="hcp-name">{hcp.name}</div>
                            <div className="hcp-meta">
                                {hcp.specialty}
                                {hcp.territory && ` · ${hcp.territory}`}
                                {hcp.institution && ` · ${hcp.institution}`}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
