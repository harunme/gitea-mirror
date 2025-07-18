import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "../ui/checkbox";
import type { DatabaseCleanupConfig } from "@/types/config";
import { formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RefreshCw, Database } from "lucide-react";

interface DatabaseCleanupConfigFormProps {
  config: DatabaseCleanupConfig;
  setConfig: React.Dispatch<React.SetStateAction<DatabaseCleanupConfig>>;
  onAutoSave?: (config: DatabaseCleanupConfig) => void;
  isAutoSaving?: boolean;
}


// Helper to calculate cleanup interval in hours (should match backend logic)
function calculateCleanupInterval(retentionSeconds: number): number {
  const retentionDays = retentionSeconds / (24 * 60 * 60);
  if (retentionDays <= 1) {
    return 6;
  } else if (retentionDays <= 3) {
    return 12;
  } else if (retentionDays <= 7) {
    return 24;
  } else if (retentionDays <= 30) {
    return 48;
  } else {
    return 168;
  }
}

export function DatabaseCleanupConfigForm({
  config,
  setConfig,
  onAutoSave,
  isAutoSaving = false,
}: DatabaseCleanupConfigFormProps) {
  // Optimistically update nextRun when enabled or retention changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let newConfig = {
      ...config,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    };

    // If enabling or changing retention, recalculate nextRun
    if (
      (name === "enabled" && (e.target as HTMLInputElement).checked) ||
      (name === "retentionDays" && config.enabled)
    ) {
      const now = new Date();
      const retentionSeconds =
        name === "retentionDays"
          ? Number(value)
          : Number(newConfig.retentionDays);
      const intervalHours = calculateCleanupInterval(retentionSeconds);
      const nextRun = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);
      newConfig = {
        ...newConfig,
        nextRun,
      };
    }
    // If disabling, clear nextRun
    if (name === "enabled" && !(e.target as HTMLInputElement).checked) {
      newConfig = {
        ...newConfig,
        nextRun: undefined,
      };
    }

    setConfig(newConfig);
    if (onAutoSave) {
      onAutoSave(newConfig);
    }
  };

  // Predefined retention periods (in seconds, like schedule intervals)
  const retentionOptions: { value: number; label: string }[] = [
    { value: 86400, label: "1 day" },        // 24 * 60 * 60
    { value: 259200, label: "3 days" },      // 3 * 24 * 60 * 60
    { value: 604800, label: "7 days" },      // 7 * 24 * 60 * 60
    { value: 1209600, label: "14 days" },    // 14 * 24 * 60 * 60
    { value: 2592000, label: "30 days" },    // 30 * 24 * 60 * 60
    { value: 5184000, label: "60 days" },    // 60 * 24 * 60 * 60
    { value: 7776000, label: "90 days" },    // 90 * 24 * 60 * 60
  ];

  return (
    <Card className="self-start">
      <CardContent className="pt-6 relative">
        {isAutoSaving && (
          <div className="absolute top-4 right-4 flex items-center text-sm text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            <span className="text-xs">Auto-saving...</span>
          </div>
        )}
        <div className="flex flex-col gap-y-4">
          <div className="flex items-center">
            <Checkbox
              id="cleanup-enabled"
              name="enabled"
              checked={config.enabled}
              onCheckedChange={(checked) =>
                handleChange({
                  target: {
                    name: "enabled",
                    type: "checkbox",
                    checked: Boolean(checked),
                    value: "",
                  },
                } as React.ChangeEvent<HTMLInputElement>)
              }
            />
            <label
              htmlFor="cleanup-enabled"
              className="select-none ml-2 block text-sm font-medium"
            >
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Enable Automatic Database Cleanup
              </div>
            </label>
          </div>

          {config.enabled && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Data Retention Period
              </label>

              <Select
                name="retentionDays"
                value={String(config.retentionDays)}
                onValueChange={(value) =>
                  handleChange({
                    target: { name: "retentionDays", value },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
              >
                <SelectTrigger className="w-full border border-input dark:bg-background dark:hover:bg-background">
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground border border-input shadow-sm">
                  {retentionOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value.toString()}
                      className="cursor-pointer text-sm px-3 py-2 hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground mt-1">
                Activities and events older than this period will be automatically deleted.
              </p>
              <div className="mt-2 p-2 bg-muted/50 rounded-md">
                <p className="text-xs text-muted-foreground">
                  <strong>Cleanup Frequency:</strong> The cleanup process runs automatically at optimal intervals:
                  shorter retention periods trigger more frequent cleanups, longer periods trigger less frequent cleanups.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Last Cleanup</label>
              <div className="text-sm">
                {config.lastRun ? formatDate(config.lastRun) : "Never"}
              </div>
            </div>

            {config.enabled && (
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Next Cleanup</label>
                <div className="text-sm">
                  {config.nextRun
                    ? formatDate(config.nextRun)
                    : config.enabled
                      ? "Calculating..."
                      : "Never"}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
