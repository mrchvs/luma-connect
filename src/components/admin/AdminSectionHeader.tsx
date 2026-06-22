export function AdminSectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold tracking-widest uppercase text-primary mb-1">{eyebrow}</p>
      <h1 className="font-display text-3xl font-semibold leading-tight">{title}</h1>
      {subtitle && <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
