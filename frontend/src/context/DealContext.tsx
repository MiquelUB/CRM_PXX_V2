import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';
import type { KeyedMutator } from 'swr';

// Definició de tipus basada en models.py del backend
export interface Interaccio {
  id: number;
  tipus: string;
  contingut: string;
  data: string;
  data_fi?: string;
  autor?: string;
  external_id?: string;
}

export interface Contacte {
  id: number;
  nom: string;
  carrec?: string;
  email: string;
  telefon?: string;
}

export interface Municipi {
  codi_ine: string;
  nom: string;
  poblacio?: number;
  provincia: string;
}

export interface DealData {
  id: number;
  titol: string;
  estat: string;
  data_creacio: string;
  municipi: Municipi;
  contactes: Contacte[];
  interaccions: Interaccio[];
  // Camps per a la lògica de plans SaaS (poden venir del backend o ser locals)
  plan_nom?: string;
  rutes_limit?: number;
  pois_limit?: number;
  preu_acordat?: number;
}

interface DealContextType {
  deal: DealData | undefined;
  isLoading: boolean;
  error: any;
  mutate: KeyedMutator<DealData>;
}

const DealContext = createContext<DealContextType | undefined>(undefined);

// Fetcher genèric per a SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

export const DealProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { id } = useParams<{ id: string }>();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const { data: deal, error, isLoading, mutate } = useSWR<DealData>(
    id && id !== 'undefined' ? `${API_BASE}/deals/${id}/full` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return (
    <DealContext.Provider value={{ deal, error, isLoading, mutate }}>
      {children}
    </DealContext.Provider>
  );
};

export const useDeal = () => {
  const context = useContext(DealContext);
  if (!context) throw new Error('useDeal must be used within DealProvider');
  return context;
};
