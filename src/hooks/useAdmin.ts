import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles" as any)
        .select("is_admin")
        .eq("id", user.id)
        .single();
      const flag = (data as any)?.is_admin;
      setIsAdmin(!!flag);
      setLoading(false);
    };
    fetch();
  }, [user]);

  return { isAdmin, loading };
}


