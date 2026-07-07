import { create } from 'zustand';

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
  // Read initial states
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  const savedFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  
  // Set theme attribute on html tag
  document.documentElement.setAttribute('data-theme', savedTheme);

  return {
    theme: savedTheme,
    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      return { theme: nextTheme };
    }),
    favorites: savedFavorites,
    toggleFavorite: (id: string) => set((state) => {
      const isFav = state.favorites.includes(id);
      const nextFavorites = isFav 
        ? state.favorites.filter((favId) => favId !== id)
        : [...state.favorites, id];
      localStorage.setItem('favorites', JSON.stringify(nextFavorites));
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
