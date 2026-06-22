import { AdminLockedAccounts } from "@/components/AdminLockedAccounts";
import { AdminRoleManagement } from "@/components/AdminRoleManagement";

export function AdminSettings({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-bold tracking-widest uppercase text-primary mb-1">Settings</p>
        <h1 className="font-display text-3xl font-semibold leading-tight">Security &amp; Roles</h1>
        <p className="text-muted-foreground text-sm mt-1">Account protection and team permissions.</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Security</h2>
        <AdminLockedAccounts />
      </section>

      {isOwner && (
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Roles</h2>
          <AdminRoleManagement />
        </section>
      )}
    </div>
  );
}
