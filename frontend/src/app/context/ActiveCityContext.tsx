import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Single global source of truth for "which city is currently active" across the
 * whole app — the interactive map, the dashboard's quest/artifact panels, the
 * bottom city carousel, the AI historian's context, and artifact filtering all
 * read from (and can write to) this one value instead of keeping their own
 * independent, easily-desynced notion of "the selected city".
 *
 * The `/city/:id` route remains the shareable/bookmarkable source of truth for
 * that URL; the root App component syncs it into this context on navigation so
 * the two never disagree.
 */
interface ActiveCityContextValue {
  activeCityId: string | null;
  setActiveCityId: (cityId: string | null) => void;
}

const ActiveCityContext = createContext<ActiveCityContextValue | null>(null);

export function ActiveCityProvider({ children }: { children: ReactNode }) {
  const [activeCityId, setActiveCityId] = useState<string | null>(null);
  return (
    <ActiveCityContext.Provider value={{ activeCityId, setActiveCityId }}>
      {children}
    </ActiveCityContext.Provider>
  );
}

export function useActiveCity(): ActiveCityContextValue {
  const ctx = useContext(ActiveCityContext);
  if (!ctx) {
    throw new Error("useActiveCity must be used within an ActiveCityProvider");
  }
  return ctx;
}
