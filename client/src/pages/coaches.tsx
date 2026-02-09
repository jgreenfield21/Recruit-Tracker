import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
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

export default function Coaches() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [favoriteFilter, setFavoriteFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
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
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      apiRequest("PATCH", `/api/coaches/${id}`, { favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coaches"] });
    },
  });

  if (isLoading) {
    return <LoadingState message="Loading coaches..." />;
  }

  const getLastContactDate = (coachId: string) => {
    const coachContacts = contacts?.filter((c) => c.coachId === coachId) || [];
    if (coachContacts.length === 0) return null;
    const sorted = coachContacts.sort((a, b) => 
      parseISO(b.date).getTime() - parseISO(a.date).getTime()
    );
    return sorted[0].date;
  };

  const filteredCoaches = coaches?.filter((coach) => {
    const matchesSearch =
      coach.name.toLowerCase().includes(search.toLowerCase()) ||
      coach.school.toLowerCase().includes(search.toLowerCase()) ||
      coach.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || coach.status === statusFilter;
    const matchesDivision = divisionFilter === "all" || coach.division === divisionFilter;
    const matchesFavorite = favoriteFilter === "all" || (favoriteFilter === "favorites" && coach.favorite);
    return matchesSearch && matchesStatus && matchesDivision && matchesFavorite;
  }) || [];

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
              <Select value={favoriteFilter} onValueChange={setFavoriteFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-favorite-filter">
                  <Star className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Favorites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coaches</SelectItem>
                  <SelectItem value="favorites">Favorites Only</SelectItem>
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
                    <TableHead>Name</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead className="hidden md:table-cell">Position</TableHead>
                    <TableHead className="hidden md:table-cell">Salutation</TableHead>
                    <TableHead className="hidden lg:table-cell">Division</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Last Contact</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCoaches.map((coach) => {
                    const lastContact = getLastContactDate(coach.id);
                    return (
                      <TableRow key={coach.id} data-testid={`row-coach-${coach.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleFavoriteMutation.mutate({ id: coach.id, favorite: !coach.favorite })}
                              className="shrink-0"
                              data-testid={`button-favorite-${coach.id}`}
                            >
                              <Star
                                className={`h-4 w-4 ${coach.favorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                              />
                            </button>
                            <div className="flex flex-col">
                              <span className="font-medium">{coach.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{coach.email}</span>
                              </div>
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
                            ? format(parseISO(lastContact), "MMM d, yyyy")
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
