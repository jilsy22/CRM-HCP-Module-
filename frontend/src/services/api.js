import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// ─── HCPs ─────────────────────────────────────────────
export const fetchHCPs = (params = {}) => api.get('/hcps/', { params });
export const fetchHCP = (id) => api.get(`/hcps/${id}`);
export const createHCP = (data) => api.post('/hcps/', data);

// ─── Interactions ──────────────────────────────────────
export const fetchInteractions = (params = {}) => api.get('/interactions/', { params });
export const fetchInteraction = (id) => api.get(`/interactions/${id}`);
export const createInteraction = (data) => api.post('/interactions/', data);
export const updateInteraction = (id, data) => api.put(`/interactions/${id}`, data);
export const deleteInteraction = (id) => api.delete(`/interactions/${id}`);

// ─── Chat ──────────────────────────────────────────────
export const sendChatMessage = (data) => api.post('/chat/', data);
export const newChatSession = () => api.get('/chat/new-session');

// SSE streaming helper
export const streamChatMessage = (data, onToken, onToolEvent, onDone, onError) => {
    const url = '/api/chat/stream';

    // Guard: ensure onDone is called at most once
    let doneSignaled = false;
    const signalDone = () => {
        if (!doneSignaled) {
            doneSignaled = true;
            onDone();
        }
    };

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(async (response) => {
        if (!response.ok) {
            const text = await response.text();
            onError(`Server error ${response.status}: ${text}`);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const event = JSON.parse(line.slice(6)); // remove 'data: ' prefix
                        if (event.type === 'token') {
                            onToken(event.content);
                        } else if (event.type === 'tool_start' || event.type === 'tool_end') {
                            onToolEvent(event);
                        } else if (event.type === 'done') {
                            signalDone();
                        } else if (event.type === 'error') {
                            onError(event.content);
                            signalDone();
                        }
                    } catch (e) { /* skip malformed */ }
                }
            }
        }
        // Stream ended naturally — ensure done is signaled
        signalDone();
    }).catch((err) => {
        onError(err.message || 'Network error');
        signalDone();
    });
};

export default api;
