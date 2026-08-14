import { Building2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  data: { organization: string; website: string };
  onChange: (data: { organization: string; website: string }) => void;
}

export function OrganizationStep({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Organization</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tell us about your company</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Organization name</Label>
        <Input
          value={data.organization}
          onChange={(e) => onChange({ ...data, organization: e.target.value })}
          placeholder="Acme Corporation"
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Website (optional)</Label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={data.website}
            onChange={(e) => onChange({ ...data, website: e.target.value })}
            placeholder="https://acme.com"
            className="h-11 pl-10"
          />
        </div>
      </div>
    </div>
  );
}
