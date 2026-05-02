import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DictionaryEditor } from "./DictionaryEditor";
import { EngineActuatorSelect } from "../base/EngineActuatorSelect";
import {
  ConfigKind,
  ConfigsService,
  type SharedConfig,
} from "@/lib/configs";
import { toast } from "sonner";

interface ConfigEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ConfigKind;
  item?: any | null;
  onSaved: () => void;
}

const NONE_VALUE = "__none__";

export function ConfigEditorDialog({
  open,
  onOpenChange,
  kind,
  item,
  onSaved,
}: ConfigEditorDialogProps) {
  const isEdit = !!item?.id;
  const [domain, setDomain] = useState("");
  const [keyField, setKeyField] = useState("");
  const [mergedConfig, setMergedConfig] = useState<string>("");
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [shared, setShared] = useState<SharedConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const configsService = new ConfigsService();

  const setKeyOption = (value: string, config_preset: Record<string, any> | null) => {
    setKeyField(value);
  
    if (config_preset && Object.keys(config).length == 0) {
      setConfig(config_preset); 
      // Loads the preset config when an option is selected, but only if the config is not empty
    }
  };

  useEffect(() => {
    if (!open) return;
    setDomain(item?.domain ?? "");
    setKeyField(
      kind === "challenge"
        ? item?.challenge_key ?? ""
        : kind === "ca"
          ? item?.ca_key ?? ""
          : item?.key ?? "",
    );
    setMergedConfig(item?.merged_config ?? "");
    setConfig(item?.config ?? {});
  }, [open, item, kind]);

  useEffect(() => {
    if (!open) return;
    if (kind !== "shared") {
      configsService.listItems<SharedConfig>("shared").then(setShared).catch(() => {});
    }
  }, [open, kind]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { config, domain: domain || null };
      if (kind === "challenge") {
        payload.challenge_key = keyField || null;
        payload.merged_config = mergedConfig || null;
      } else if (kind === "ca") {
        payload.ca_key = keyField || null;
        payload.merged_config = mergedConfig || null;
      } else {
        payload.key = keyField || null;
      }

      if (isEdit) await configsService.updateItem(kind, item.id, payload);
      else await configsService.createItem(kind, payload);

      toast.success(isEdit ? "Updated" : "Created");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const titles: Record<ConfigKind, string> = {
    challenge: "Challenge Config",
    ca: "Certificate Authority Config",
    shared: "Shared Config",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit" : "New"} {titles[kind]}
          </DialogTitle>
          <DialogDescription>
            Manage the configuration for this item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {kind === "challenge" || kind === "ca" ? (
            <EngineActuatorSelect
              kind={kind}
              value={keyField}
              onValueChange={setKeyOption}
              open={open}
            />
          ) : (
            <div className="space-y-2">
              <Label>Key</Label>
              <Input
                value={keyField}
                onChange={(e) => setKeyField(e.target.value)}
                placeholder="shared config key"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Domain</Label>
            <Input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="optional"
            />
          </div>

          {(kind === "challenge" || kind === "ca") && (
            <div className="space-y-2">
              <Label>Merge the configuration from</Label>
              <Select
                value={mergedConfig || NONE_VALUE}
                onValueChange={(v) => setMergedConfig(v === NONE_VALUE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {shared.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.key || s.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DictionaryEditor value={config} onChange={setConfig} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
