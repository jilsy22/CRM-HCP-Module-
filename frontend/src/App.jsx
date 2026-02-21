import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LogInteractionScreen from './pages/LogInteractionScreen';

function HCPsPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div className="page-header-text">
                    <h2>HCP Directory</h2>
                    <p>Browse healthcare professionals in your territory</p>
                </div>
            </div>
            <div className="card">
                <div className="empty-state">
                    <div className="empty-state-icon">👩‍⚕️</div>
                    <h3>HCP Directory</h3>
                    <p>Use the Log Interaction screen to search and interact with HCPs.</p>
                </div>
            </div>
        </div>
    );
}

function App() {
    return (
        <Provider store={store}>
            <BrowserRouter>
                <div className="app-shell">
                    <Sidebar />
                    <div className="main-content">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/log-interaction" element={<LogInteractionScreen />} />
                            <Route path="/hcps" element={<HCPsPage />} />
                        </Routes>
                    </div>
                </div>
            </BrowserRouter>
        </Provider>
    );
}

export default App;
