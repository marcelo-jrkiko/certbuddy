import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { engineService, type EngineActuatorOption } from "@/lib/engine";
import { toast } from "sonner";

interface EngineOptionsSelectProps {
  kind: "challenge" | "ca";
  value: string;
  onValueChange: (value: string, config_preset: Record<string, any> | null) => void;
  open: boolean;
}

export function EngineActuatorSelect({
  kind,
  value,
  onValueChange,
  open,
}: EngineOptionsSelectProps) {
  const [options, setOptions] = useState<EngineActuatorOption[]>([]);

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
      <Select value={value} onValueChange={(val) => {
        const selectedOption = options.find((o) => o.key === val);
        onValueChange(val, selectedOption ? selectedOption.config_preset : null);
      }}>
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
