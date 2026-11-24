"use client";

import { useRouter } from "@/i18n/navigation";
import { Label, Select } from "@/components/ui/input";

export function SqualesStationSelect({
  label,
  value,
  stations,
}: Readonly<{
  label: string;
  value: string;
  stations: { id: string; label: string }[];
}>) {
  const router = useRouter();
  return (
    <div className="max-w-sm">
      <Label htmlFor="squales-station">{label}</Label>
      <Select
        id="squales-station"
        value={value}
        onChange={(event) => {
          const station = event.target.value;
          router.push(`/dashboard/air?tab=underground&station=${station}`);
        }}
      >
        {stations.map((station) => (
          <option key={station.id} value={station.id}>
            {station.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
