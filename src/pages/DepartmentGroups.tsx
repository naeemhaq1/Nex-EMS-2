import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Users, Copy, Building2, Search, X, FolderPlus, Settings, Grid, List } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DepartmentGroup } from "@shared/departmentGroups";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().default("#3B82F6"),
  departments: z.array(z.string()).default([]),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

const colorOptions = [
  { value: "#3B82F6", label: "Blue", color: "bg-blue-500" },
  { value: "#10B981", label: "Green", color: "bg-green-500" },
  { value: "#8B5CF6", label: "Purple", color: "bg-purple-500" },
  { value: "#F59E0B", label: "Orange", color: "bg-orange-500" },
  { value: "#EF4444", label: "Red", color: "bg-red-500" },
  { value: "#6B7280", label: "Gray", color: "bg-gray-500" },
  { value: "#EC4899", label: "Pink", color: "bg-pink-500" },
  { value: "#14B8A6", label: "Teal", color: "bg-teal-500" },
];

export default function DepartmentGroups() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DepartmentGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Fetch department groups
  const { data: groups = [], isLoading: groupsLoading } = useQuery<DepartmentGroup[]>({
    queryKey: ["/api/department-groups"],
  });

  // Fetch all departments
  const { data: departments = [], isLoading: departmentsLoading } = useQuery<string[]>({
    queryKey: ["/api/employees/departments"],
  });

  // Fetch department employee counts
  const { data: departmentCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["/api/departments/employee-counts"],
  });

  // Create group form
  const createForm = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      departments: [],
    },
  });

  // Edit group form
  const editForm = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      departments: [],
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateGroupFormData) => {
      return apiRequest({
        url: "/api/department-groups",
        method: "POST",
        data: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-groups"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Department group created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create department group",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CreateGroupFormData) => {
      if (!selectedGroup) throw new Error("No group selected");
      return apiRequest({
        url: `/api/department-groups/${selectedGroup.id}`,
        method: "PUT",
        data: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-groups"] });
      setIsEditDialogOpen(false);
      setSelectedGroup(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Department group updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update department group",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return apiRequest({
        url: `/api/department-groups/${groupId}`,
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-groups"] });
      toast({
        title: "Success",
        description: "Department group deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete department group",
        variant: "destructive",
      });
    },
  });

  // Handle create group
  const handleCreateGroup = (data: CreateGroupFormData) => {
    createMutation.mutate(data);
  };

  // Handle edit group
  const handleEditGroup = (data: CreateGroupFormData) => {
    updateMutation.mutate(data);
  };

  // Handle delete group
  const handleDeleteGroup = (groupId: number) => {
    if (window.confirm("Are you sure you want to delete this department group?")) {
      deleteMutation.mutate(groupId);
    }
  };

  // Handle clone group
  const handleCloneGroup = (group: DepartmentGroup) => {
    createForm.setValue("name", `${group.name} (Copy)`);
    createForm.setValue("description", group.description || "");
    createForm.setValue("color", group.color || "");
    createForm.setValue("departments", group.departments || []);
    setIsCreateDialogOpen(true);
  };

  // Handle edit group click
  const handleEditClick = (group: DepartmentGroup) => {
    setSelectedGroup(group);
    editForm.setValue("name", group.name);
    editForm.setValue("description", group.description || "");
    editForm.setValue("color", group.color || "");
    editForm.setValue("departments", group.departments || []);
    setIsEditDialogOpen(true);
  };

  // Filter groups based on search
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Departments can belong to multiple groups, so no ungrouped concept

  return (
    <div className="space-y-6 min-h-screen bg-[#1A1B3E]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Department Groups</h1>
          <p className="text-slate-400 mt-1">Organize departments into logical groups for better management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <div className="flex items-center bg-[#2A2B5E] rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 p-0 ${viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className={`h-8 w-8 p-0 ${viewMode === "table" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#2A2B5E] border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Groups</CardTitle>
            <FolderPlus className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{groups.length}</div>
            <p className="text-xs text-slate-400">Active department groups</p>
          </CardContent>
        </Card>

        <Card className="bg-[#2A2B5E] border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Departments</CardTitle>
            <Building2 className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{departments.length}</div>
            <p className="text-xs text-slate-400">Available departments</p>
          </CardContent>
        </Card>

        <Card className="bg-[#2A2B5E] border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">
              {Object.values(departmentCounts).reduce((sum, count) => sum + count, 0)}
            </div>
            <p className="text-xs text-slate-400">Across all departments</p>
          </CardContent>
        </Card>
      </div>

      {/* Groups Display */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="bg-[#2A2B5E] border-purple-500/20 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color || '#6B7280' }}
                    />
                    <CardTitle className="text-lg text-white">{group.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(group)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCloneGroup(group)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {group.description && (
                  <CardDescription className="text-slate-400">{group.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3 min-h-[120px] flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">Departments</span>
                    <Badge variant="secondary" className="bg-purple-600/20 text-purple-300">
                      {group.departments?.length || 0}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-start">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {group.departments?.slice(0, 4).map((dept) => (
                        <Badge key={dept} variant="outline" className="border-slate-600 text-slate-400 text-xs">
                          {dept} ({departmentCounts[dept] || 0})
                        </Badge>
                      ))}
                    </div>
                    {(group.departments?.length || 0) > 4 && (
                      <div className="text-xs text-slate-500">
                        +{(group.departments?.length || 0) - 4} more departments
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-400 mt-auto">
                    <span>Total Employees:</span>
                    <span className="font-medium text-white">
                      {group.departments?.reduce((sum, dept) => sum + (departmentCounts[dept] || 0), 0) || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-[#2A2B5E] border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Department Groups</CardTitle>
            <CardDescription className="text-slate-400">
              All department groups with their details and actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-purple-500/20">
                  <TableHead className="text-slate-300">Group</TableHead>
                  <TableHead className="text-slate-300">Description</TableHead>
                  <TableHead className="text-slate-300">Departments</TableHead>
                  <TableHead className="text-slate-300">Total Employees</TableHead>
                  <TableHead className="text-right text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id} className="border-purple-500/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: group.color || '#6B7280' }}
                        />
                        <div>
                          <div className="font-medium text-white">{group.name}</div>
                          <Badge variant="secondary" className="mt-1 bg-purple-600/20 text-purple-300">
                            ID: {group.id}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {group.description ? (
                          <span className="text-slate-300">{group.description}</span>
                        ) : (
                          <span className="text-slate-500 italic">No description</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-600 text-slate-400">
                            {group.departments?.length || 0} departments
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {group.departments?.slice(0, 3).map((dept) => (
                            <Badge key={dept} variant="outline" className="border-slate-600 text-slate-400 text-xs">
                              {dept} ({departmentCounts[dept] || 0})
                            </Badge>
                          ))}
                          {(group.departments?.length || 0) > 3 && (
                            <span className="text-xs text-slate-500">+{(group.departments?.length || 0) - 3} more</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-white">
                        {group.departments?.reduce((sum, dept) => sum + (departmentCounts[dept] || 0), 0) || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(group)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCloneGroup(group)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}



      {/* Create Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#2A2B5E] border-purple-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Create Department Group</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new group to organize departments for reporting and filtering
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateGroup)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter group name" {...field} className="bg-[#1A1B3E] border-purple-500/20 text-white placeholder:text-slate-500" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={createForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">Color</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="bg-[#1A1B3E] border-purple-500/20 text-white">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1A1B3E] border-purple-500/20">
                            {colorOptions.map((color) => (
                              <SelectItem key={color.value} value={color.value} className="text-white hover:bg-[#2A2B5E]">
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full ${color.color}`} />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter group description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="departments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Departments</FormLabel>
                    <FormControl>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {departments.map((dept) => (
                          <div key={dept} className="flex items-center space-x-2">
                            <Checkbox
                              id={dept}
                              checked={field.value?.includes(dept)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, dept]);
                                } else {
                                  field.onChange(field.value?.filter((d) => d !== dept));
                                }
                              }}
                            />
                            <label htmlFor={dept} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between w-full">
                              <span>{dept}</span>
                              <Badge variant="outline" className="ml-2">
                                {departmentCounts[dept] || 0}
                              </Badge>
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl bg-[#2A2B5E] border-purple-500/20">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Department Group</DialogTitle>
            <DialogDescription className="text-slate-400">
              Modify the group details and department assignments
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditGroup)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter group name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                          <SelectContent>
                            {colorOptions.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full ${color.color}`} />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter group description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="departments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Departments</FormLabel>
                    <FormControl>
                      <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {departments.map((dept) => (
                          <div key={dept} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${dept}`}
                              checked={field.value?.includes(dept)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, dept]);
                                } else {
                                  field.onChange(field.value?.filter((d) => d !== dept));
                                }
                              }}
                            />
                            <label htmlFor={`edit-${dept}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between w-full">
                              <span>{dept}</span>
                              <Badge variant="outline" className="ml-2">
                                {departmentCounts[dept] || 0}
                              </Badge>
                            </label>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Group"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}