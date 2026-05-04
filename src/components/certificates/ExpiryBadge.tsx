import { Badge } from "@/components/ui/badge";

export function ExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return <span className="text-muted-foreground text-xs">—</span>;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days < 0) return <Badge variant="destructive">Expired</Badge>;
  const label = days === 0 ? "Expires today" : `${days} day${days === 1 ? "" : "s"}`;
  let cls = "bg-green-600 text-white hover:bg-green-600";
  if (days < 2) cls = "bg-red-600 text-white hover:bg-red-600";
  else if (days <= 7) cls = "bg-yellow-500 text-black hover:bg-yellow-500";
  return <Badge className={cls}>{label}</Badge>;
}

export function getCertStats<T extends { expires_at?: string | null }>(certs: T[]) {
  const now = Date.now();
  let valid = 0;
  let expired = 0;
  for (const c of certs) {
    if (c.expires_at && new Date(c.expires_at).getTime() < now) expired++;
    else valid++;
  }
  return { total: certs.length, valid, expired };
}
