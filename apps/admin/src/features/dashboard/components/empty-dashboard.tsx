import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_ENTER_CLASS, dashboardEnterStyle } from "../utils";

export function EmptyDashboard() {
  return (
    <Card
      className={`${DASHBOARD_ENTER_CLASS} border-dashed`}
      style={dashboardEnterStyle(0)}
    >
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <AppIcons.trendingUp className="size-7" stroke={1.5} />
        </div>
        <CardTitle className="text-xl">No agencies yet</CardTitle>
        <CardDescription className="max-w-md text-balance">
          Provision the first tenant to start seeing suspended queues, trial
          follow-ups, and import health here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/tenants/new">
            <AppIcons.building className="size-4" />
            Provision tenant
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/plans?create=1">
            <AppIcons.chartBar className="size-4" />
            Create plan
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
