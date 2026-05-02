import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

export type DictEntry = { key: string; value: string };

export function dictToObject(entries: DictEntry[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { key, value } of entries) {
    if (!key) continue;
    // Try parse as JSON (for booleans, numbers, arrays, objects)
    let parsed: unknown = value;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
    out[key] = parsed;
  }
  return out;
}

export function objectToDict(obj: Record<string, unknown> | null | undefined): DictEntry[] {
  if (!obj) return [];
  return Object.entries(obj).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

interface DictionaryEditorProps {
  value: Record<string, unknown> | null | undefined;
  onChange: (value: Record<string, unknown>) => void;
}

export function DictionaryEditor({ value, onChange }: DictionaryEditorProps) {
  const [entries, setEntries] = useState<DictEntry[]>(() => objectToDict(value));

  useEffect(() => {
    setEntries(objectToDict(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (next: DictEntry[]) => {
    setEntries(next);
    onChange(dictToObject(next));
  };

  return (
    <div className="space-y-2">
      <Label>Config</Label>
      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No keys yet.</p>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="key"
              value={entry.key}
              onChange={(e) => {
                const next = [...entries];
                next[i] = { ...next[i], key: e.target.value };
                update(next);
              }}
              className="flex-1"
            />
            <Input
              placeholder="value"
              value={entry.value}
              onChange={(e) => {
                const next = [...entries];
                next[i] = { ...next[i], value: e.target.value };
                update(next);
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => update(entries.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => update([...entries, { key: "", value: "" }])}
      >
        <Plus className="h-4 w-4 mr-1" /> Add key
      </Button>
      <details className="text-xs text-muted-foreground mt-2">
        <summary className="cursor-pointer">JSON preview</summary>
        <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
          {JSON.stringify(dictToObject(entries), null, 2)}
        </pre>
      </details>
    </div>
  );
}
