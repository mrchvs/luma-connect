import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Logo } from "@/components/Logo";

const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];

function parseCycleSlug(slug: string): { month: number; year: number } | null {
  const yearDigits = slug.match(/(\d{2})$/)?.[1];
  const monthName = slug.replace(/\d+$/, "");
  const month = MONTHS.indexOf(monthName.toLowerCase()) + 1;
  if (!month || !yearDigits) return null;
  return { month, year: 2000 + parseInt(yearDigits) };
}

function cycleSlug(name: string) {
  const parts = name.split(" ");
  return `${parts[0].toLowerCase()}${parts[1]?.slice(2)}`;
}

export default function MomentumJoin() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "joining" | "done" | "error" | "already">("loading");
  const [cycleName, setCycleName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      localStorage.setItem("pendingInvite", cycleId!);
      navigate(`/auth?redirect=/momentum/join/${cycleId}&invite=${cycleId}`, { replace: true });
      return;
    }

    if (!cycleId) return;

    const join = async () => {
      if (!user?.id) {
        setErrorMsg("Your session appears invalid. Please sign out and sign back in.");
        setStatus("error");
        return;
      }
      setStatus("joining");

      // Resolve the cycle — supports both slug ("june26") and UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(cycleId);
      let cycle: { id: string; name: string } | null = null;

      if (isUUID) {
        const { data, error } = await (supabase as any)
          .from("accountability_cycles").select("id, name").eq("id", cycleId).maybeSingle();
        if (error) { setErrorMsg(error.message); setStatus("error"); return; }
        cycle = data;
      } else {
        const parsed = parseCycleSlug(cycleId);
        if (!parsed) { setErrorMsg(`Could not parse slug: ${cycleId}`); setStatus("error"); return; }
        const { data, error } = await (supabase as any)
          .from("accountability_cycles").select("id, name")
          .eq("month", parsed.month).eq("year", parsed.year).maybeSingle();
        if (error) { setErrorMsg(error.message); setStatus("error"); return; }
        cycle = data;
      }

      if (!cycle) {
        setErrorMsg(`No cycle found for: ${cycleId}`);
        setStatus("error");
        return;
      }

      setCycleName(cycle.name);

      // Use cycle.id (UUID) for all membership operations.
      // Check by user_id first, then fall back to email (handles admin-pre-added rows with null/wrong user_id).
      let existing: { id: string; status: string } | null = null;

      const { data: byUserId } = await supabase
        .from("accountability_cycle_members")
        .select("id, status")
        .eq("cycle_id", cycle.id)
        .eq("user_id", user.id)
        .maybeSingle();
      existing = byUserId;

      if (!existing && user.email) {
        const { data: byEmail } = await supabase
          .from("accountability_cycle_members")
          .select("id, status")
          .eq("cycle_id", cycle.id)
          .eq("email", user.email)
          .maybeSingle();
        existing = byEmail;
      }

      const handleMembershipError = async (error: { message: string }) => {
        // If Supabase rejects our user_id as a FK violation, the session is stale
        // (admin deleted this auth user but the browser JWT is still cached).
        // Sign out to clear it so the user can sign up fresh.
        if (error.message.includes("user_id_fkey") || error.message.includes("foreign key")) {
          // Store invite before signout so it survives the OAuth redirect
          localStorage.setItem("pendingInvite", cycleId!);
          await supabase.auth.signOut();
          navigate(`/auth?redirect=/momentum/join/${cycleId}&invite=${cycleId}`, { replace: true });
          return;
        }
        setErrorMsg(error.message);
        setStatus("error");
      };

      if (existing) {
        if (existing.status === "joined") {
          setStatus("already");
          setTimeout(() => navigate(`/momentum/${cycleSlug(cycle!.name)}`, { replace: true }), 1500);
          return;
        }
        // Update status to joined and ensure user_id is set correctly
        const { error } = await supabase
          .from("accountability_cycle_members")
          .update({ status: "joined", user_id: user.id })
          .eq("id", existing.id);
        if (error) { await handleMembershipError(error); return; }
      } else {
        const { error } = await supabase.from("accountability_cycle_members")
          .insert({ cycle_id: cycle.id, user_id: user.id, email: user.email ?? "", status: "joined" });
        if (error) { await handleMembershipError(error); return; }
      }

      localStorage.removeItem("pendingInvite");
      setStatus("done");
      setTimeout(() => navigate(`/momentum/${cycleSlug(cycle!.name)}`, { replace: true }), 1500);
    };

    join();
  }, [user, loading, cycleId, navigate]); // eslint-disable-line

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F7F2E9" }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#F7F2E9", fontFamily: "'Geist', sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ marginBottom: 32 }}><Logo size="md" /></div>

        {status === "joining" && (
          <><LoadingSpinner size="lg" /><p style={{ marginTop: 16, color: "#6B6259", fontSize: 15 }}>Joining {cycleName}…</p></>
        )}

        {status === "done" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: "'TheSeasons', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#1a1a1a", margin: "0 0 8px" }}>You're in!</h2>
            <p style={{ color: "#6B6259", fontSize: 15 }}>Welcome to the {cycleName} cohort. Redirecting you now…</p>
          </>
        )}

        {status === "already" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontFamily: "'TheSeasons', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#1a1a1a", margin: "0 0 8px" }}>Already joined</h2>
            <p style={{ color: "#6B6259", fontSize: 15 }}>You're already a member of {cycleName}. Redirecting you now…</p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
            <h2 style={{ fontFamily: "'TheSeasons', Georgia, serif", fontSize: 28, fontWeight: 500, color: "#1a1a1a", margin: "0 0 8px" }}>Something went wrong</h2>
            <p style={{ color: "#6B6259", fontSize: 15, marginBottom: 8 }}>Could not join the cohort.</p>
            {errorMsg && <p style={{ color: "#9B8E84", fontSize: 13, marginBottom: 16 }}>{errorMsg}</p>}
            <button onClick={() => navigate("/momentum")}
              style={{ background: "#E5602B", color: "#fff", border: "none", borderRadius: 999, padding: "10px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Go to Momentum
            </button>
          </>
        )}
      </div>
    </div>
  );
}
