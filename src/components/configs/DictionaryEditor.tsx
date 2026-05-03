import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";

export type DictEntry = { id: string; key: string; value: string };

export function dictToObject(entries: DictEntry[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { key, value } of entries) {
    // Skip entries with empty keys when converting back to object
    // but preserve non-empty ones to maintain state during editing
    if (!key.trim()) continue;
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
  return Object.entries(obj).map(([key, value], index) => ({
    id: `entry-${key}-${index}`,
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
  const lastSyncedSerializedRef = useRef(JSON.stringify(value));

  useEffect(() => {
    const currentSerialized = JSON.stringify(value);
    // Only reset entries if the value changed from an external source
    // (i.e., the serialized content is different from what we last sent via onChange)
    if (lastSyncedSerializedRef.current !== currentSerialized) {
      lastSyncedSerializedRef.current = currentSerialized;
      setEntries(objectToDict(value));
    }
  }, [value]);

  const update = (next: DictEntry[]) => {
    setEntries(next);
    const newValue = dictToObject(next);
    // Update the ref with the serialized version we're about to send
    lastSyncedSerializedRef.current = JSON.stringify(newValue);
    onChange(newValue);
  };

  const generateId = () => `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-2">
      <Label>Config</Label>
      <div className="space-y-2">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground">No keys yet.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-2">
            <Input
              placeholder="key"
              value={entry.key}
              onChange={(e) => {
                const next = entries.map((en) =>
                  en.id === entry.id ? { ...en, key: e.target.value } : en
                );
                update(next);
              }}
              className="flex-1"
            />
            <Input
              placeholder="value"
              value={entry.value}
              onChange={(e) => {
                const next = entries.map((en) =>
                  en.id === entry.id ? { ...en, value: e.target.value } : en
                );
                update(next);
              }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => update(entries.filter((en) => en.id !== entry.id))}
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
        onClick={() => update([...entries, { id: generateId(), key: "", value: "" }])}
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
