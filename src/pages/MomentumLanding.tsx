import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { MainNav } from "@/components/MainNav";
import { format } from "date-fns";
import { Target, ArrowRight, CheckCircle2, Clock } from "lucide-react";

const serif = "'Montreal Serial', 'Newsreader', Georgia, serif";
const sans = "'Geist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

const MONTHS_FULL = ["january","february","march","april","may","june","july","august","september","october","november","december"];

function monthSlug(month: number, year: number) {
  return `${MONTHS_FULL[month - 1]}${String(year).slice(2)}`;
}

export default function MomentumLanding() {
  const { user, profile, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (!loading && user && !profile?.completed) navigate("/onboarding");
  }, [user, profile, loading, navigate]);

  // All visible cohorts
  const { data: allCycles } = useQuery({
    queryKey: ["all-accountability-cycles-landing", isAdmin],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("accountability_cycles")
        .select("id, name, month, year, hidden")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      const rows = (data ?? []) as Array<{ id: string; name: string; month: number; year: number; hidden?: boolean }>;
      return isAdmin ? rows : rows.filter(c => !c.hidden);
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // User's memberships
  const { data: myMemberships } = useQuery({
    queryKey: ["my-cycle-memberships-landing", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("accountability_cycle_members")
        .select("cycle_id, status")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  if (!user || !allCycles || !myMemberships) return null;

  const membershipMap = new Map(
    (myMemberships as Array<{ cycle_id: string; status: string }>).map(m => [m.cycle_id, m.status])
  );

  const myCohorts = allCycles.filter(c => {
    const s = membershipMap.get(c.id);
    return s === "joined" || s === "invited";
  });

  const availableCohorts = allCycles.filter(c => !membershipMap.has(c.id));
  const pendingCohorts = allCycles.filter(c => membershipMap.get(c.id) === "pending");

  return (
    <div style={{ minHeight: "100vh", background: "#F7F2E9", fontFamily: sans }}>
      <MainNav />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#E5602B", marginBottom: 8 }}>Monday Momentum</div>
          <h1 style={{ fontFamily: serif, fontSize: 38, fontWeight: 500, color: "#1a1a1a", margin: 0, lineHeight: 1.1 }}>Your cohorts</h1>
        </div>

        {/* My cohorts */}
        {myCohorts.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#9B8E84", marginBottom: 12 }}>My cohorts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {myCohorts.map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/momentum/${monthSlug(c.month, c.year)}`)}
                  style={{
                    background: "#fff", borderRadius: 14, border: "1px solid #EDE8E2",
                    padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", textAlign: "left" as const, gap: 12,
                    boxShadow: "0 1px 3px rgba(0,0,0,.04)", transition: "box-shadow .15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFEDE5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Target size={18} style={{ color: "#E5602B" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: "#1a1a1a" }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: "#9B8E84", marginTop: 2 }}>Four weeks · one goal</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#2D7A4F", background: "#D1FAE5", padding: "3px 10px", borderRadius: 999 }}>Joined</span>
                    <ArrowRight size={16} style={{ color: "#9B8E84" }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* July 2026 waitlist */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#9B8E84", marginBottom: 12 }}>Coming up</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              background: "#fff", borderRadius: 14, border: "1px solid #EDE8E2",
              padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,.04)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Target size={18} style={{ color: "#7C3AED" }} />
                </div>
                <div>
                  <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: "#1a1a1a" }}>July 2026</div>
                  <div style={{ fontSize: 13, color: "#9B8E84", marginTop: 2 }}>Four weeks · one goal</div>
                </div>
              </div>
              <a
                href="https://lu.ma/swvixbar"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "#E5602B", color: "#fff", borderRadius: 999,
                  padding: "8px 18px", fontSize: 13, fontWeight: 500,
                  textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                }}
              >
                Register →
              </a>
            </div>
          </div>
        </div>

        {/* Pending */}
        {pendingCohorts.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#9B8E84", marginBottom: 12 }}>Pending applications</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingCohorts.map(c => (
                <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #EDE8E2", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Clock size={18} style={{ color: "#D97706" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: "#1a1a1a" }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: "#9B8E84", marginTop: 2 }}>Application under review</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#D97706", background: "#FEF3C7", padding: "3px 10px", borderRadius: 999, flexShrink: 0 }}>Pending</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available to join */}
        {availableCohorts.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#9B8E84", marginBottom: 12 }}>Available to join</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {availableCohorts.map(c => (
                <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid #EDE8E2", padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <CheckCircle2 size={18} style={{ color: "#7C3AED" }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 500, color: "#1a1a1a" }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: "#9B8E84", marginTop: 2 }}>Four weeks · one goal</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!user) return;
                      const { error } = await supabase
                        .from("accountability_cycle_members")
                        .insert({ cycle_id: c.id, user_id: user.id, email: user.email ?? "", status: "pending" });
                      if (error && !error.message.includes("duplicate") && !error.message.includes("unique")) return;
                      const { data: admins } = await supabase.from("user_roles").select("user_id").or("role.eq.admin,role.eq.owner");
                      if (admins?.length) {
                        await supabase.from("notifications").insert(
                          admins.map((a: { user_id: string }) => ({
                            user_id: a.user_id,
                            title: "New cohort application",
                            body: `${user.email?.split("@")[0]} applied to join the ${c.name} cohort`,
                            link: `/admin/momentum?cycle=${c.id}`,
                          }))
                        );
                      }
                      navigate(0); // refresh
                    }}
                    style={{
                      background: "#E5602B", color: "#fff", border: "none", borderRadius: 999,
                      padding: "8px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                    }}
                  >
                    Apply →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {myCohorts.length === 0 && pendingCohorts.length === 0 && availableCohorts.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "#fff", borderRadius: 16, border: "1px solid #EDE8E2" }}>
            <p style={{ fontSize: 15, color: "#9B8E84", margin: 0 }}>No cohorts available right now. Check back soon.</p>
          </div>
        )}

      </div>
    </div>
  );
}
