import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';

export interface Interaccio {
  id: number;
  tipus: string;
  contingut: string;
  data_creacio: string;
  metadata_json?: any;
}

export interface Contacte {
  id: number;
  nom: string;
  carrec?: string;
  email: string;
  telefon?: string;
}

export interface Municipi {
  id: number;
  codi_ine: string;
  nom: string;
  adreca_fisica?: string;
  email_general?: string;
  telefon_general?: string;
  contactes?: Contacte[];
}

export interface DealData {
  id: number;
  estat_kanban: string;
  pla_assignat: string;
  municipi: Municipi;
  interaccions: Interaccio[];
}

interface DealContextType {
  deal: DealData | undefined;
  isLoading: boolean;
  error: any;
  refreshDeal: () => Promise<void>;
}

const DealContext = createContext<DealContextType | undefined>(undefined);

const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

export const DealProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { id } = useParams<{ id: string }>();
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const { data: deal, error, isLoading, mutate } = useSWR<DealData>(
    id && id !== 'undefined' ? `${API_BASE}/deals/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  const refreshDeal = async () => {
    await mutate();
  };

  return (
    <DealContext.Provider value={{ deal, error, isLoading, refreshDeal }}>
      {children}
    </DealContext.Provider>
  );
};

export const useDeal = () => {
  const context = useContext(DealContext);
  if (!context) throw new Error('useDeal must be used within DealProvider');
  return context;
};
