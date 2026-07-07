import { create } from 'zustand';

const safeStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore storage errors
    }
  },
};

interface AppState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  activeRouteId: string | null;
  setActiveRouteId: (id: string | null) => void;
  isTracking: boolean;
  setIsTracking: (val: boolean) => void;
  simulatedUserPos: { lat: number; lng: number } | null;
  setSimulatedUserPos: (pos: { lat: number; lng: number } | null) => void;
  simulatedComparsaPos: { lat: number; lng: number; pointIndex: number } | null;
  setSimulatedComparsaPos: (pos: { lat: number; lng: number; pointIndex: number } | null) => void;
}

export const useAppStore = create<AppState>((set) => {
  const getPreferredTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    const savedTheme = safeStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const getStoredFavorites = (): string[] => {
    const savedFavorites = safeStorage.getItem('favorites');
    if (!savedFavorites) return [];
    try {
      const parsed = JSON.parse(savedFavorites);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const savedTheme = getPreferredTheme();
  const savedFavorites = getStoredFavorites();

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  return {
    theme: savedTheme,
    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      safeStorage.setItem('theme', nextTheme);
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
      return { theme: nextTheme };
    }),
    favorites: savedFavorites,
    toggleFavorite: (id: string) => set((state) => {
      const isFav = state.favorites.includes(id);
      const nextFavorites = isFav 
        ? state.favorites.filter((favId) => favId !== id)
        : [...state.favorites, id];
      safeStorage.setItem('favorites', JSON.stringify(nextFavorites));
      return { favorites: nextFavorites };
    }),
    activeRouteId: 'recorrido-pilar', // default route to start with
    setActiveRouteId: (id) => set({ activeRouteId: id }),
    isTracking: false,
    setIsTracking: (val) => set({ isTracking: val }),
    simulatedUserPos: null,
    setSimulatedUserPos: (pos) => set({ simulatedUserPos: pos }),
    simulatedComparsaPos: null,
    setSimulatedComparsaPos: (pos) => set({ simulatedComparsaPos: pos }),
  };
});
