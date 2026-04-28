import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import useSWR from 'swr';

export interface Interaccio {
  id: number;
  tipus: string;
  contingut: string;
  data: string; // ISO String from backend 'data' field
  metadata_json?: any;
  completat: boolean;
}

export interface CalendariEvent {
  id: number;
  tipus: string;
  descripcio: string;
  data_inici: string;
  data_fi?: string;
  completat: boolean;
  es_tasca: boolean;
}

export interface Contacte {
  id: number;
  nom: string;
  carrec?: string;
  email: string;
  telefon?: string;
  municipi_id: number;
  deal_id?: number;
}

export interface Municipi {
  id: number;
  codi_ine: string;
  nom: string;
  provincia?: string;
  poblacio?: number;
  adreca_fisica?: string;
  email_general?: string;
  telefon_general?: string;
}

export interface DealData {
  id: number;
  estat_kanban: string;
  pla_assignat: string;
  pla_saas: string;
  is_active: boolean;
  municipi: Municipi;
  contactes: Contacte[];
  accions: Interaccio[];
  calendari_events: CalendariEvent[];
  municipality_context?: string;
  proper_pas?: string;
  data_seguiment?: string;
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
