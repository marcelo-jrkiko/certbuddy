import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type DnsChangePayload = {
  domain?: string;
  record_name?: string;
  token?: string;
  record_type?: string;
};

function asDnsChangePayload(value: unknown): DnsChangePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;

  return {
    domain: typeof source.domain === "string" ? source.domain : undefined,
    record_name:
      typeof source.record_name === "string" ? source.record_name : undefined,
    token: typeof source.token === "string" ? source.token : undefined,
    record_type:
      typeof source.record_type === "string" ? source.record_type : "TXT",
  };
}

export function DnsChangeRequestContent({ requestData }: { requestData: unknown }) {
  const payload = asDnsChangePayload(requestData);

  return (
    <div className="space-y-4">
      <Alert>
        <AlertTitle>Action required on your DNS provider</AlertTitle>
        <AlertDescription>
          Create the DNS record below for your domain. After propagation, click Confirm.
        </AlertDescription>
      </Alert>

      <div className="rounded-md border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Record details</h4>
          <Badge variant="outline">{payload.record_type ?? "TXT"}</Badge>
        </div>

        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Domain</dt>
            <dd className="font-medium">{payload.domain ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Record name</dt>
            <dd className="font-mono text-xs break-all">{payload.record_name ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Token / Value</dt>
            <dd className="font-mono text-xs break-all">{payload.token ?? "-"}</dd>
          </div>
        </dl>
      </div>

      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Open your DNS provider panel.</li>
        <li>Add or update the record with the values above.</li>
        <li>Wait until DNS is propagated for the record.</li>
        <li>Return here and click Confirm.</li>
      </ol>
    </div>
  );
}
