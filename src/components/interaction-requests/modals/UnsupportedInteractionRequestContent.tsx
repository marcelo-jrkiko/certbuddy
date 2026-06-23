import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function UnsupportedInteractionRequestContent({
  type,
  requestData,
}: {
  type?: string | null;
  requestData: unknown;
}) {
  return (
    <div className="space-y-3">
      <Alert>
        <AlertTitle>Unsupported request type</AlertTitle>
        <AlertDescription>
          This interaction type is not implemented in the UI yet.
        </AlertDescription>
      </Alert>
      <div className="rounded-md border bg-muted/30 p-3 text-xs">
        <p className="mb-2 text-muted-foreground">
          Type: <span className="font-mono">{type ?? "unknown"}</span>
        </p>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all">
          {JSON.stringify(requestData ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
