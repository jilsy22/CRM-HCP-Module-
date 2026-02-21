import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchHCPs } from '../services/api';

export const loadHCPs = createAsyncThunk('hcps/load', async (params) => {
    const res = await fetchHCPs(params);
    return res.data;
});

const hcpSlice = createSlice({
    name: 'hcps',
    initialState: {
        list: [],
        selectedHCP: null,
        loading: false,
        error: null,
    },
    reducers: {
        setSelectedHCP(state, action) { state.selectedHCP = action.payload; },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadHCPs.pending, (state) => { state.loading = true; state.error = null; })
            .addCase(loadHCPs.fulfilled, (state, action) => { state.loading = false; state.list = action.payload; })
            .addCase(loadHCPs.rejected, (state, action) => { state.loading = false; state.error = action.error.message; });
    },
});

export const { setSelectedHCP } = hcpSlice.actions;
export default hcpSlice.reducer;
