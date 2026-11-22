import {
  IconBuildingCommunity,
  IconCash,
  IconCoins,
  IconMapPin,
  IconMessages,
  IconTrophy,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";
import type { MyPerformance } from "@/features/performance/types";
import { formatCompactMoney, formatMoney } from "@/features/targets/utils/target-format";
import { formatNumber } from "@/lib/format";

interface Tile {
  label: string;
  value: string;
  title?: string;
  icon: Icon;
}

/** Spec §4.1 "All-time totals": deals, units, revenue, commission, touches, visits, clients. */
export function AllTimeStrip({ data }: { data: MyPerformance }) {
  const { allTime, currency } = data;
  const tiles: Tile[] = [
    { label: "Deals", value: formatNumber(allTime.deals), icon: IconTrophy },
    { label: "Units sold", value: formatNumber(allTime.units), icon: IconBuildingCommunity },
    {
      label: "Revenue sold",
      value: formatCompactMoney(allTime.revenue, currency),
      title: formatMoney(allTime.revenue, currency),
      icon: IconCash,
    },
    {
      label: "Commission",
      value: formatCompactMoney(allTime.commission, currency),
      title: formatMoney(allTime.commission, currency),
      icon: IconCoins,
    },
    { label: "Interactions", value: formatNumber(allTime.interactions), icon: IconMessages },
    { label: "Visits", value: formatNumber(allTime.visits), icon: IconMapPin },
    { label: "Clients served", value: formatNumber(allTime.clientsServed), icon: IconUsers },
  ];

  return (
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60 shadow-xs sm:grid-cols-4 xl:grid-cols-7">
      {tiles.map((tile) => (
        <li key={tile.label} className="min-w-0 bg-card px-4 py-3 last:col-span-2 xl:last:col-span-1" title={tile.title}>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <tile.icon className="size-3.5 shrink-0" />
            <span className="truncate">{tile.label}</span>
          </div>
          <div className="mt-1 truncate text-xl font-semibold tabular-nums">{tile.value}</div>
        </li>
      ))}
    </ul>
  );
}
