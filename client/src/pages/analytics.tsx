import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { BarChart3, TrendingUp, Users, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { EmptyState } from "@/components/empty-state";
import type { Coach, Contact } from "@shared/schema";
import { coachStatusOptions, divisionOptions, contactMethodOptions } from "@shared/schema";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Analytics() {
  const { data: coaches, isLoading: loadingCoaches } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const { data: contacts, isLoading: loadingContacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const isLoading = loadingCoaches || loadingContacts;

  if (isLoading) {
    return <LoadingState message="Loading analytics..." />;
  }

  if (!coaches?.length && !contacts?.length) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold" data-testid="text-analytics-title">Analytics</h1>
          <p className="text-muted-foreground">
            Gain insights into your recruiting efforts.
          </p>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No data to analyze"
          description="Add coaches and log contacts to see analytics about your recruiting efforts."
          actionLabel="Add Coaches"
          onAction={() => window.location.href = "/coaches"}
        />
      </div>
    );
  }

  const now = new Date();
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));
    const monthContacts = contacts?.filter((c) => {
      const contactDate = parseISO(c.date);
      return isWithinInterval(contactDate, { start: monthStart, end: monthEnd });
    }).length || 0;
    monthlyData.push({
      month: format(monthStart, "MMM"),
      contacts: monthContacts,
    });
  }

  const statusCounts = coachStatusOptions.map((status) => ({
    name: status.label,
    value: coaches?.filter((c) => c.status === status.value).length || 0,
  })).filter((s) => s.value > 0);

  const divisionCounts = divisionOptions.map((div) => ({
    name: div.label,
    coaches: coaches?.filter((c) => c.division === div.value).length || 0,
    contacts: contacts?.filter((contact) => {
      const coach = coaches?.find((c) => c.id === contact.coachId);
      return coach?.division === div.value;
    }).length || 0,
  })).filter((d) => d.coaches > 0 || d.contacts > 0);

  const methodCounts = contactMethodOptions.map((method) => ({
    name: method.label,
    value: contacts?.filter((c) => c.method === method.value).length || 0,
  })).filter((m) => m.value > 0);

  const totalCoaches = coaches?.length || 0;
  const totalContacts = contacts?.length || 0;
  const respondedCoaches = coaches?.filter((c) => c.status === "responded").length || 0;
  const responseRate = totalCoaches > 0 ? Math.round((respondedCoaches / totalCoaches) * 100) : 0;
  const avgContactsPerCoach = totalCoaches > 0 ? (totalContacts / totalCoaches).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold" data-testid="text-analytics-title">Analytics</h1>
        <p className="text-muted-foreground">
          Gain insights into your recruiting efforts and communication patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total-coaches">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coaches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-coaches">{totalCoaches}</div>
            <p className="text-xs text-muted-foreground">in your recruiting list</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-total-contacts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-contacts">{totalContacts}</div>
            <p className="text-xs text-muted-foreground">communications logged</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-response-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-response-rate">{responseRate}%</div>
            <p className="text-xs text-muted-foreground">coaches who responded</p>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-avg-contacts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Contacts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-contacts">{avgContactsPerCoach}</div>
            <p className="text-xs text-muted-foreground">per coach</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-chart-monthly">
          <CardHeader>
            <CardTitle>Contact Frequency</CardTitle>
            <CardDescription>Communications over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="contacts"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS[0] }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-chart-status">
          <CardHeader>
            <CardTitle>Coach Status Distribution</CardTitle>
            <CardDescription>Current status of all coaches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statusCounts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No status data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusCounts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusCounts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-chart-division">
          <CardHeader>
            <CardTitle>Activity by Division</CardTitle>
            <CardDescription>Coaches and contacts by NCAA division</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {divisionCounts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No division data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={divisionCounts}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="coaches" fill={CHART_COLORS[0]} name="Coaches" />
                    <Bar dataKey="contacts" fill={CHART_COLORS[1]} name="Contacts" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-chart-methods">
          <CardHeader>
            <CardTitle>Communication Methods</CardTitle>
            <CardDescription>How you're reaching out to coaches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {methodCounts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No contact method data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={methodCounts}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {methodCounts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
