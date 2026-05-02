import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { engineService, type EngineOption } from "@/lib/engine";
import { toast } from "sonner";
import type { ConfigKind } from "@/lib/configs";

interface EngineOptionsSelectProps {
  kind: "challenge" | "ca";
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
}

export function EngineActuatorSelect({
  kind,
  value,
  onValueChange,
  open,
}: EngineOptionsSelectProps) {
  const [options, setOptions] = useState<EngineOption[]>([]);

  useEffect(() => {
    if (!open) return;
    if (kind === "challenge") {
      engineService
        .listAvailableChallenges()
        .then(setOptions)
        .catch((e) => toast.error(e.message));
    } else if (kind === "ca") {
      engineService
        .listAvailableCAs()
        .then(setOptions)
        .catch((e) => toast.error(e.message));
    }
  }, [open, kind]);

  const label = kind === "challenge" ? "Challenge" : "CA";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
