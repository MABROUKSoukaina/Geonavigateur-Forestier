import { create } from 'zustand';
import type { Placette } from '../types';

interface DataState {
  placettes: Placette[];
  selectedPlacettes: string[];
  searchQuery: string;
  dataSource: 'default' | 'custom';
  setPlacettes: (p: Placette[]) => void;
  toggleSelectPlacette: (id: string) => void;
  setSelectedPlacettes: (ids: string[]) => void;
  clearSelection: () => void;
  setSearchQuery: (q: string) => void;
  setDataSource: (src: 'default' | 'custom') => void;
}

export const useDataStore = create<DataState>((set) => ({
  placettes: [],
  selectedPlacettes: [],
  searchQuery: '',
  dataSource: 'default',
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
}));
