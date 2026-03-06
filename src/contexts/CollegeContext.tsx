import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type College = {
  id: string;
  college_name: string;
  subdomain: string | null;
  logo_url: string | null;
  tagline: string | null;
  primary_color: string | null;
  is_active: boolean;
  created_at: string;
};

type CollegeContextValue = {
  colleges: College[];
  activeCollegeId: string | null;
  activeCollege: College | null;
  setActiveCollegeId: (id: string | null) => void;
  isLoading: boolean;
};

const CollegeContext = createContext<CollegeContextValue>({
  colleges: [],
  activeCollegeId: null,
  activeCollege: null,
  setActiveCollegeId: () => {},
  isLoading: false,
});

const STORAGE_KEY = "active_college_id";

export function CollegeProvider({ children }: { children: ReactNode }) {
  const [activeCollegeId, setActiveCollegeIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );

  const collegesQuery = useQuery<College[]>({
    queryKey: ["super_admin", "colleges_ctx"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("colleges")
        .select("*")
        .order("college_name", { ascending: true });
      if (error) throw error;
      return (data as unknown as College[]) ?? [];
    },
    staleTime: 60_000,
  });

  const colleges = collegesQuery.data ?? [];

  // Auto-select first college if none stored
  useEffect(() => {
    if (!activeCollegeId && colleges.length > 0) {
      const first = colleges[0];
      setActiveCollegeIdState(first.id);
      localStorage.setItem(STORAGE_KEY, first.id);
    }
  }, [colleges, activeCollegeId]);

  const setActiveCollegeId = useCallback((id: string | null) => {
    setActiveCollegeIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const activeCollege = colleges.find((c) => c.id === activeCollegeId) ?? null;

  return (
    <CollegeContext.Provider
      value={{
        colleges,
        activeCollegeId,
        activeCollege,
        setActiveCollegeId,
        isLoading: collegesQuery.isLoading,
      }}
    >
      {children}
    </CollegeContext.Provider>
  );
}

export function useCollegeContext() {
  return useContext(CollegeContext);
}
