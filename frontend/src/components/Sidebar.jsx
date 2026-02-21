import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    { label: 'Dashboard', icon: '📊', path: '/' },
    { label: 'Log Interaction', icon: '📝', path: '/log-interaction' },
    { label: 'HCP Directory', icon: '👩‍⚕️', path: '/hcps' },
    { label: 'Analytics', icon: '📈', path: '/analytics' },
];

export default function Sidebar() {
    const { pathname } = useLocation();
    return (
        <nav className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">💊</div>
                <div>
                    <h1>LifeRep CRM</h1>
                    <span>HCP Module</span>
                </div>
            </div>
            <div className="sidebar-nav">
                <p className="nav-section-label">Main Menu</p>
                {navItems.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
                <p className="nav-section-label" style={{ marginTop: 'var(--space-4)' }}>AI Tools</p>
                <Link
                    to="/log-interaction"
                    id="nav-ai-chat"
                    className="nav-item"
                    onClick={e => {
                        // Navigate to log interaction, then switch to chat mode via URL
                    }}
                >
                    <span className="nav-icon">🤖</span>
                    AI Assistant
                </Link>
            </div>
            <div className="sidebar-footer">
                <div className="user-info">
                    <div className="user-avatar">FR</div>
                    <div className="user-details">
                        <p>Field Rep</p>
                        <span>LangGraph · Groq AI</span>
                    </div>
                </div>
            </div>
        </nav>
    );
}
