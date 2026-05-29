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

  useEffect(() => {
    if (loading) return; // wait for auth to resolve
    if (!user) {
      navigate(`/auth?redirect=/momentum/join/${cycleId}`, { replace: true });
      return;
    }
    if (!cycleId) return;

    const join = async () => {
      setStatus("joining");

      // Fetch cycle info — use as any to bypass TS type restrictions on hidden column
      const { data: cycle, error: cycleError } = await (supabase as any)
        .from("accountability_cycles")
        .select("id, name")
        .eq("id", cycleId)
        .maybeSingle();

      if (cycleError || !cycle) {
        console.error("Cycle fetch error:", cycleError, "cycle:", cycle);
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
  }, [user, loading, cycleId, navigate]); // eslint-disable-line

  function cycleSlug(cycle: { name: string }) {
    const parts = cycle.name.split(" ");
    const month = parts[0].toLowerCase(); // full month name e.g. "june"
    const year = parts[1]?.slice(2);      // last 2 digits of year e.g. "26"
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
