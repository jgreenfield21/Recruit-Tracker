import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { parseISO } from "date-fns";
import { formatET } from "@/lib/date-utils";
import {
  Plus,
  Search,
  Mail,
  Phone,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Users,
  Filter,
  Download,
  Upload,
  Star,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { CoachForm } from "@/components/coach-form";
import { ImportCoachesDialog } from "@/components/import-coaches-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Coach, Contact, CoachStatus } from "@shared/schema";
import { coachStatusOptions, divisionOptions } from "@shared/schema";

type SortField = "name" | "school" | "position" | "division" | "status" | "lastContact" | "favorite";
type SortDirection = "asc" | "desc";
type SortConfig = { field: SortField; direction: SortDirection };

const divisionOrder: Record<string, number> = {
  "D1": 0,
  "D2": 1,
  "D3": 2,
  "NAIA": 3,
  "JUCO": 4,
  "Other": 5,
};

const statusOrder: Record<string, number> = {
  "not_contacted": 0,
  "contacted": 1,
  "responded": 2,
  "interested": 3,
  "visit_scheduled": 4,
  "offer": 5,
  "committed": 6,
  "not_interested": 7,
};

export default function Coaches() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { field: "division", direction: "asc" },
    { field: "school", direction: "asc" },
    { field: "name", direction: "asc" },
  ]);
  const { toast } = useToast();

  const { data: coaches, isLoading } = useQuery<Coach[]>({
    queryKey: ["/api/coaches"],
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/coaches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
      toast({ title: "Coach deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete coach", variant: "destructive" });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/coaches/${id}/favorite`);
      return res.json();
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/coaches"] });
      const previousCoaches = queryClient.getQueryData<Coach[]>(["/api/coaches"]);
      queryClient.setQueryData<Coach[]>(["/api/coaches"], (old) =>
        old?.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c))
      );
      return { previousCoaches };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previousCoaches) {
        queryClient.setQueryData(["/api/coaches"], context.previousCoaches);
      }
      toast({
        title: "Failed to update favorite",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
    },
  });

  const lastContactMap = useMemo(() => {
    const map = new Map<string, string | null>();
    if (!coaches || !contacts) return map;
    for (const coach of coaches) {
      const coachContacts = contacts.filter((c) => c.coachId === coach.id);
      if (coachContacts.length === 0) {
        map.set(coach.id, null);
      } else {
        const sorted = [...coachContacts].sort(
          (a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()
        );
        map.set(coach.id, sorted[0].date);
      }
    }
    return map;
  }, [coaches, contacts]);

  if (isLoading) {
    return <LoadingState message="Loading coaches..." />;
  }

  const handleSort = (field: SortField) => {
    setSortConfigs((prev) => {
      const existingIndex = prev.findIndex((s) => s.field === field);
      if (existingIndex === 0) {
        const existing = prev[0];
        return [
          { field, direction: existing.direction === "asc" ? "desc" : "asc" },
          ...prev.slice(1),
        ];
      }
      if (existingIndex > 0) {
        const updated = prev.filter((s) => s.field !== field);
        return [{ field, direction: "asc" }, ...updated];
      }
      return [{ field, direction: "asc" }, ...prev];
    });
  };

  const getSortIcon = (field: SortField) => {
    const config = sortConfigs.find((s) => s.field === field);
    if (!config) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    const index = sortConfigs.indexOf(config);
    const opacity = index === 0 ? "opacity-100" : "opacity-60";
    if (config.direction === "asc") return <ArrowUp className={`h-3.5 w-3.5 ml-1 ${opacity}`} />;
    return <ArrowDown className={`h-3.5 w-3.5 ml-1 ${opacity}`} />;
  };

  const filteredCoaches = coaches?.filter((coach) => {
    const matchesSearch =
      coach.name.toLowerCase().includes(search.toLowerCase()) ||
      coach.school.toLowerCase().includes(search.toLowerCase()) ||
      coach.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || coach.status === statusFilter;
    const matchesDivision = divisionFilter === "all" || coach.division === divisionFilter;
    const matchesFavorite = !favoriteFilter || coach.favorite;
    return matchesSearch && matchesStatus && matchesDivision && matchesFavorite;
  }) || [];

  const sortedCoaches = [...filteredCoaches].sort((a, b) => {
    for (const { field, direction } of sortConfigs) {
      const dir = direction === "asc" ? 1 : -1;
      let cmp = 0;

      switch (field) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "school":
          cmp = a.school.localeCompare(b.school);
          break;
        case "position":
          cmp = (a.position || "").localeCompare(b.position || "");
          break;
        case "division": {
          const aDiv = divisionOrder[a.division || ""] ?? 99;
          const bDiv = divisionOrder[b.division || ""] ?? 99;
          cmp = aDiv - bDiv;
          break;
        }
        case "status": {
          const aStatus = statusOrder[a.status] ?? 99;
          const bStatus = statusOrder[b.status] ?? 99;
          cmp = aStatus - bStatus;
          break;
        }
        case "lastContact": {
          const aDate = lastContactMap.get(a.id);
          const bDate = lastContactMap.get(b.id);
          if (!aDate && !bDate) cmp = 0;
          else if (!aDate) cmp = 1;
          else if (!bDate) cmp = -1;
          else cmp = aDate.localeCompare(bDate);
          break;
        }
        case "favorite":
          cmp = (a.favorite ? 0 : 1) - (b.favorite ? 0 : 1);
          break;
      }

      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  });

  const SortableHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="flex items-center cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        data-testid={`sort-${field}`}
      >
        {children}
        {getSortIcon(field)}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-coaches-title">Coaches</h1>
          <p className="text-muted-foreground">
            Manage your college coach contacts
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => window.open("/api/export/coaches", "_blank")}
                data-testid="button-export-coaches"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Coaches (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open("/api/export/contacts", "_blank")}
                data-testid="button-export-contacts"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Contact History (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} data-testid="button-import-coaches">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-new-coach">
                <Plus className="h-4 w-4 mr-2" />
                Add Coach
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Coach</DialogTitle>
              <DialogDescription>
                Enter the coach's contact information to add them to your list.
              </DialogDescription>
            </DialogHeader>
            <CoachForm onSuccess={() => setIsAddDialogOpen(false)} />
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, school, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-coaches"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={favoriteFilter ? "default" : "outline"}
                size="default"
                onClick={() => setFavoriteFilter(!favoriteFilter)}
                className="toggle-elevate"
                data-testid="button-favorite-filter"
              >
                <Star className={`h-4 w-4 mr-2 ${favoriteFilter ? "fill-current" : ""}`} />
                Favorites
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {coachStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-division-filter">
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCoaches.length === 0 ? (
            coaches?.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No coaches yet"
                description="Add your first college coach to start tracking your recruiting contacts."
                actionLabel="Add Your First Coach"
                onAction={() => setIsAddDialogOpen(true)}
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No matches found"
                description="Try adjusting your search or filter criteria."
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader field="favorite" className="w-[40px]">
                      <Star className="h-3.5 w-3.5" />
                    </SortableHeader>
                    <SortableHeader field="name">Name</SortableHeader>
                    <SortableHeader field="school">School</SortableHeader>
                    <SortableHeader field="position" className="hidden md:table-cell">Position</SortableHeader>
                    <TableHead className="hidden md:table-cell">Salutation</TableHead>
                    <SortableHeader field="division" className="hidden lg:table-cell">Division</SortableHeader>
                    <SortableHeader field="status">Status</SortableHeader>
                    <SortableHeader field="lastContact" className="hidden sm:table-cell">Last Contact</SortableHeader>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCoaches.map((coach) => {
                    const lastContact = lastContactMap.get(coach.id) ?? null;
                    return (
                      <TableRow key={coach.id} data-testid={`row-coach-${coach.id}`}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleFavoriteMutation.mutate(coach.id)}
                            data-testid={`button-favorite-${coach.id}`}
                          >
                            <Star className={`h-4 w-4 ${coach.favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{coach.name}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{coach.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{coach.school}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {coach.position || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {coach.salutation || "Coach " + (coach.name.includes(" ") ? coach.name.substring(coach.name.indexOf(" ") + 1) : coach.name)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {coach.division || "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={coach.status as CoachStatus} />
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {lastContact
                            ? formatET(lastContact, "MMM d, yyyy")
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                data-testid={`button-coach-menu-${coach.id}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/coaches/${coach.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setEditingCoach(coach)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteMutation.mutate(coach.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingCoach} onOpenChange={() => setEditingCoach(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coach</DialogTitle>
            <DialogDescription>
              Update the coach's contact information.
            </DialogDescription>
          </DialogHeader>
          {editingCoach && (
            <CoachForm
              coach={editingCoach}
              onSuccess={() => setEditingCoach(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ImportCoachesDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen} />
    </div>
  );
}
