import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Venue } from '@/types';
import { db } from '@/db/database';

interface VenueContextType {
  selectedVenueId: number | null;
  selectedVenue: Venue | null;
  selectVenue: (venueId: number | null) => void;
  refreshVenue: () => Promise<void>;
}

const VenueContext = createContext<VenueContextType | undefined>(undefined);

export function VenueProvider({ children }: { children: ReactNode }) {
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(() => {
    const saved = localStorage.getItem('selected_venue_id');
    return saved ? parseInt(saved) : null;
  });
  
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const selectVenue = useCallback((venueId: number | null) => {
    setSelectedVenueId(venueId);
    if (venueId !== null) {
      localStorage.setItem('selected_venue_id', venueId.toString());
    } else {
      localStorage.removeItem('selected_venue_id');
    }
  }, []);

  const refreshVenue = useCallback(async () => {
    if (selectedVenueId !== null) {
      const venue = await db.venues.get(selectedVenueId);
      setSelectedVenue(venue || null);
    } else {
      setSelectedVenue(null);
    }
  }, [selectedVenueId]);

  useEffect(() => {
    refreshVenue();
  }, [refreshVenue]);

  return (
    <VenueContext.Provider value={{ selectedVenueId, selectedVenue, selectVenue, refreshVenue }}>
      {children}
    </VenueContext.Provider>
  );
}

export function useVenue() {
  const context = useContext(VenueContext);
  if (context === undefined) {
    throw new Error('useVenue must be used within a VenueProvider');
  }
  return context;
}
