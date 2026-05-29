import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Logo } from "@/components/Logo";

export default function MomentumJoin() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "joining" | "done" | "error" | "already">("loading");
  const [cycleName, setCycleName] = useState("");

  // If not logged in, redirect to auth with a return URL
  useEffect(() => {
    if (!loading && !user) {
      navigate(`/auth?redirect=/momentum/join/${cycleId}`, { replace: true });
    }
  }, [user, loading, cycleId, navigate]);

  useEffect(() => {
    if (!user || !cycleId) return;

    const join = async () => {
      setStatus("joining");

      // Fetch cycle info
      const { data: cycle, error: cycleError } = await supabase
        .from("accountability_cycles")
        .select("id, name")
        .eq("id", cycleId)
        .maybeSingle();

      if (cycleError || !cycle) {
        setStatus("error");
        return;
      }

      setCycleName(cycle.name);

      // Check if already a member
      const { data: existing } = await supabase
        .from("accountability_cycle_members")
        .select("id, status")
        .eq("cycle_id", cycleId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        if (existing.status === "joined" || existing.status === "invited") {
          setStatus("already");
          setTimeout(() => navigate(`/momentum/${cycleSlug(cycle)}`, { replace: true }), 1500);
          return;
        }
        // If pending, upgrade to joined
        await supabase
          .from("accountability_cycle_members")
          .update({ status: "joined" })
          .eq("id", existing.id);
      } else {
        // Insert as joined directly (invite link = direct acceptance)
        const { error } = await supabase
          .from("accountability_cycle_members")
          .insert({ cycle_id: cycleId, user_id: user.id, email: user.email ?? "", status: "joined" });

        if (error) {
          setStatus("error");
          return;
        }
      }

      setStatus("done");
      setTimeout(() => navigate(`/momentum/${cycleSlug(cycle)}`, { replace: true }), 1500);
    };

    join();
  }, [user, cycleId, navigate]);

  function cycleSlug(cycle: { name: string }) {
    const parts = cycle.name.split(" ");
    const month = parts[0].slice(0, 3).toLowerCase();
    const year = parts[1]?.slice(2);
    return `${month}${year}`;
  }

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FAF7F4" }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#FAF7F4", fontFamily: "'Geist', sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <Logo size="md" />
        </div>

        {status === "joining" && (
          <>
            <LoadingSpinner size="lg" />
            <p style={{ marginTop: 16, color: "#6B6259", fontSize: 15 }}>Joining {cycleName}…</p>
          </>
        )}

        {status === "done" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: "'TheSeasons', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#1a1a1a", margin: "0 0 8px" }}>
              You're in!
            </h2>
            <p style={{ color: "#6B6259", fontSize: 15 }}>Welcome to the {cycleName} cohort. Redirecting you now…</p>
          </>
        )}

        {status === "already" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: "'TheSeasons', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#1a1a1a", margin: "0 0 8px" }}>
              Already joined
            </h2>
            <p style={{ color: "#6B6259", fontSize: 15 }}>You're already a member of {cycleName}. Redirecting you now…</p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
            <h2 style={{ fontFamily: "'TheSeasons', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#1a1a1a", margin: "0 0 8px" }}>
              Link not found
            </h2>
            <p style={{ color: "#6B6259", fontSize: 15, marginBottom: 24 }}>This invite link may have expired or is invalid.</p>
            <button
              onClick={() => navigate("/momentum")}
              style={{ background: "#E5602B", color: "#fff", border: "none", borderRadius: 999, padding: "10px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
            >
              Go to Momentum
            </button>
          </>
        )}
      </div>
    </div>
  );
}
