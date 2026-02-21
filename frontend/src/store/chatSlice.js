import { createSlice } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

const chatSlice = createSlice({
    name: 'chat',
    initialState: {
        sessionId: uuidv4(),
        messages: [],
        loading: false,
        streamingContent: '',
        activeToolCalls: [],
    },
    reducers: {
        addUserMessage(state, action) {
            state.messages.push({
                id: uuidv4(),
                role: 'user',
                content: action.payload,
                timestamp: new Date().toISOString(),
            });
        },
        startAIMessage(state) {
            state.loading = true;
            state.streamingContent = '';
            state.activeToolCalls = [];
        },
        appendStreamToken(state, action) {
            state.streamingContent += action.payload;
        },
        addToolEvent(state, action) {
            const event = action.payload;
            if (event.type === 'tool_start') {
                state.activeToolCalls.push({ tool: event.tool, input: event.input, status: 'running' });
            } else if (event.type === 'tool_end') {
                const tc = state.activeToolCalls.find(t => t.tool === event.tool && t.status === 'running');
                if (tc) { tc.status = 'done'; tc.output = event.output; }
            }
        },
        finalizeAIMessage(state) {
            const content = state.streamingContent || 'Done.';
            state.messages.push({
                id: uuidv4(),
                role: 'ai',
                content,
                toolCalls: state.activeToolCalls,
                timestamp: new Date().toISOString(),
            });
            state.loading = false;
            state.streamingContent = '';
            state.activeToolCalls = [];
        },
        setLoading(state, action) { state.loading = action.payload; },
        resetChat(state) {
            state.messages = [];
            state.sessionId = uuidv4();
            state.streamingContent = '';
            state.activeToolCalls = [];
        },
    },
});

export const {
    addUserMessage, startAIMessage, appendStreamToken,
    addToolEvent, finalizeAIMessage, setLoading, resetChat,
} = chatSlice.actions;
export default chatSlice.reducer;
