import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { getCertStats } from "./ExpiryBadge";

export function CertificateStatsCards<T extends { expires_at?: string | null }>({
  certs,
}: {
  certs: T[];
}) {
  const stats = getCertStats(certs);
  const items = [
    { label: "Total Certificates", value: stats.total, Icon: Shield, color: "text-foreground" },
    { label: "Valid", value: stats.valid, Icon: ShieldCheck, color: "text-green-500" },
    { label: "Expired", value: stats.expired, Icon: ShieldAlert, color: "text-red-500" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map(({ label, value, Icon, color }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon className={`h-4 w-4 ${color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
