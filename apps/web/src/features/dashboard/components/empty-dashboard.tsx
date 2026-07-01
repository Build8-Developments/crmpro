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
        <CardTitle className="text-xl">Welcome to CRMPro</CardTitle>
        <CardDescription className="max-w-md text-balance">
          Start by importing leads or creating your first project. Your dashboard
          will populate as activity grows.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/imports">
            <AppIcons.imports className="size-4" />
            Import leads
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/leads">
            <AppIcons.create className="size-4" />
            Create lead
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
