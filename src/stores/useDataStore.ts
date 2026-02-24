import { create } from 'zustand';
import type { Placette } from '../types';
import { fetchPlacettes } from '../services/api';

interface DataState {
  placettes: Placette[];
  selectedPlacettes: string[];
  searchQuery: string;
  dataSource: 'default' | 'custom';
  loading: boolean;
  error: string | null;
  setPlacettes: (p: Placette[]) => void;
  toggleSelectPlacette: (id: string) => void;
  setSelectedPlacettes: (ids: string[]) => void;
  clearSelection: () => void;
  setSearchQuery: (q: string) => void;
  setDataSource: (src: 'default' | 'custom') => void;
  loadFromApi: () => Promise<void>;
}

export const useDataStore = create<DataState>((set) => ({
  placettes: [],
  selectedPlacettes: [],
  searchQuery: '',
  dataSource: 'default',
  loading: false,
  error: null,
  setPlacettes: (placettes) => set({ placettes }),
  toggleSelectPlacette: (id) =>
    set((s) => ({
      selectedPlacettes: s.selectedPlacettes.includes(id)
        ? s.selectedPlacettes.filter((x) => x !== id)
        : [...s.selectedPlacettes, id],
    })),
  setSelectedPlacettes: (ids) => set({ selectedPlacettes: ids }),
  clearSelection: () => set({ selectedPlacettes: [] }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDataSource: (dataSource) => set({ dataSource }),
  loadFromApi: async () => {
    set({ loading: true, error: null });
    try {
      const placettes = await fetchPlacettes();
      set({ placettes, loading: false, dataSource: 'default' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      set({ error: message, loading: false });
    }
  },
}));
