"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const SalonRoleContext = createContext({ role: null, profile: null });

export function useSalonRole() {
  return useContext(SalonRoleContext);
}

export default function AuthGuard({ children, allowedRoles }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function handleSession(session) {
      if (!mounted) return;

      if (!session?.user?.id) {
        setAuthorized(false);
        setRole(null);
        setProfile(null);
        setChecking(false);
        router.replace("/login");
        return;
      }

      setChecking(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, role, active")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error || !data || !data.active) {
        setAuthorized(false);
        setRole(null);
        setProfile(null);
        setChecking(false);
        return;
      }

      setProfile(data);
      setRole(data.role);
      setAuthorized(!allowedRoles || allowedRoles.includes(data.role));
      setChecking(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        handleSession(session);
      } else if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
        handleSession(null);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        handleSession(null);
        return;
      }
      handleSession(data.session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, allowedRoles]);

  if (checking) {
    return (
      <div dir="rtl" style={{ textAlign: "center", padding: "50px", fontFamily: "Arial" }}>
        جاري التحقق من صلاحيات الحساب...
      </div>
    );
  }

  if (!authorized) {
    return (
      <div dir="rtl" style={{ textAlign: "center", padding: "50px", fontFamily: "Arial" }}>
        <h2>ليس لديك صلاحية لفتح هذه الصفحة</h2>
        <button onClick={() => router.replace("/")} style={{ padding: "10px 18px", cursor: "pointer" }}>
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <SalonRoleContext.Provider value={{ role, profile }}>
      {children}
    </SalonRoleContext.Provider>
  );
}
