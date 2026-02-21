import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchInteractions, createInteraction, updateInteraction, deleteInteraction } from '../services/api';

export const loadInteractions = createAsyncThunk('interactions/load', async (params) => {
    const res = await fetchInteractions(params);
    return res.data;
});

export const addInteraction = createAsyncThunk('interactions/add', async (data) => {
    const res = await createInteraction(data);
    return res.data;
});

export const editInteraction = createAsyncThunk('interactions/edit', async ({ id, data }) => {
    const res = await updateInteraction(id, data);
    return res.data;
});

export const removeInteraction = createAsyncThunk('interactions/remove', async (id) => {
    await deleteInteraction(id);
    return id;
});

const interactionsSlice = createSlice({
    name: 'interactions',
    initialState: {
        list: [],
        selected: null,
        loading: false,
        error: null,
        submitSuccess: false,
    },
    reducers: {
        setSelected(state, action) { state.selected = action.payload; },
        clearSubmitSuccess(state) { state.submitSuccess = false; },
    },
    extraReducers: (builder) => {
        builder
            // Load
            .addCase(loadInteractions.pending, (s) => { s.loading = true; s.error = null; })
            .addCase(loadInteractions.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
            .addCase(loadInteractions.rejected, (s, a) => { s.loading = false; s.error = a.error.message; })
            // Add
            .addCase(addInteraction.fulfilled, (s, a) => { s.list.unshift(a.payload); s.submitSuccess = true; })
            // Edit
            .addCase(editInteraction.fulfilled, (s, a) => {
                const idx = s.list.findIndex(i => i.id === a.payload.id);
                if (idx >= 0) s.list[idx] = a.payload;
                if (s.selected?.id === a.payload.id) s.selected = a.payload;
            })
            // Remove
            .addCase(removeInteraction.fulfilled, (s, a) => {
                s.list = s.list.filter(i => i.id !== a.payload);
                if (s.selected?.id === a.payload) s.selected = null;
            });
    },
});

export const { setSelected, clearSubmitSuccess } = interactionsSlice.actions;
export default interactionsSlice.reducer;
