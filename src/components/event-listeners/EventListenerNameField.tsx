import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EventListenerNameFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function EventListenerNameField({ value, onChange }: EventListenerNameFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Name</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Certificate issued notification"
      />
    </div>
  );
}