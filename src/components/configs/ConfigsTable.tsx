import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";
import type { ConfigKind } from "@/lib/configs";

export type ConfigRow = {
  id: string;
  kind: ConfigKind;
  key: string;
  domain?: string | null;
  merged_config?: string | null;
  raw: any;
};

const kindLabel: Record<ConfigKind, string> = {
  challenge: "Challenge",
  ca: "CA",
  shared: "Shared",
};

const kindVariant: Record<ConfigKind, "default" | "secondary" | "outline"> = {
  challenge: "default",
  ca: "secondary",
  shared: "outline",
};

interface Props {
  rows: ConfigRow[];
  loading: boolean;
  onEdit: (row: ConfigRow) => void;
  onDelete: (row: ConfigRow) => void;
}

export function ConfigsTable({ rows, loading, onEdit, onDelete }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Domain</TableHead>
          <TableHead>Shared</TableHead>
          <TableHead className="w-[120px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              Loading...
            </TableCell>
          </TableRow>
        )}
        {!loading && rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No configurations yet.
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => (
          <TableRow key={`${r.kind}-${r.id}`}>
            <TableCell>
              <Badge variant={kindVariant[r.kind]}>{kindLabel[r.kind]}</Badge>
            </TableCell>
            <TableCell className="font-mono text-sm">{r.key || "—"}</TableCell>
            <TableCell>{r.domain || "—"}</TableCell>
            <TableCell className="font-mono text-xs">
              {r.merged_config ? r.merged_config.slice(0, 8) : "—"}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onEdit(r)}
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(r)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
