import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Users, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { DepartmentGroup } from "@shared/departmentGroups";
import { apiRequest } from "@/lib/queryClient";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().default("#3B82F6"),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

export default function MobileGroups() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DepartmentGroup | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [createGroupDepartments, setCreateGroupDepartments] = useState<string[]>([]);
  const [previewDepartment, setPreviewDepartment] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

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

  // Fetch employees for preview
  const { data: previewEmployees } = useQuery({
    queryKey: ["/api/departments", previewDepartment, "employees"],
    queryFn: async () => {
      if (!previewDepartment) return null;
      const response = await fetch(`/api/departments/${encodeURIComponent(previewDepartment)}/employees`);
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    },
    enabled: !!previewDepartment && isPreviewDialogOpen,
  });

  // Create group form
  const createForm = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
    },
  });

  // Edit group form
  const editForm = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (data: CreateGroupFormData) =>
      apiRequest("/api/department-groups", {
        method: "POST",
        body: JSON.stringify({ ...data, departments: createGroupDepartments }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-groups"] });
      toast({
        title: "Success",
        description: "Department group created successfully",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      setCreateGroupDepartments([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create department group",
        variant: "destructive",
      });
    },
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateGroupFormData> }) =>
      apiRequest(`/api/department-groups/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-groups"] });
      toast({
        title: "Success",
        description: "Department group updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedGroup(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update department group",
        variant: "destructive",
      });
    },
  });

  // Delete group mutation
  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/department-groups/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-groups"] });
      toast({
        title: "Success",
        description: "Department group deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete department group",
        variant: "destructive",
      });
    },
  });

  // Update departments mutation
  const updateDepartmentsMutation = useMutation({
    mutationFn: ({ id, departments }: { id: number; departments: string[] }) =>
      apiRequest(`/api/department-groups/${id}/departments`, {
        method: "PUT",
        body: JSON.stringify({ departments }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/department-groups"] });
      toast({
        title: "Success",
        description: "Departments updated successfully",
      });
      setIsDepartmentDialogOpen(false);
      setSelectedGroup(null);
      setSelectedDepartments([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update departments",
        variant: "destructive",
      });
    },
  });

  const handleCreateGroup = async (data: CreateGroupFormData) => {
    // Check for duplicates first
    try {
      const response = await apiRequest("/api/departments/check-duplicates", {
        method: "POST",
        body: JSON.stringify({ departments: createGroupDepartments }),
      });
      
      if (response.duplicateCount > 0) {
        setDuplicateWarning(response);
      } else {
        createGroupMutation.mutate(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check for duplicate employees",
        variant: "destructive",
      });
    }
  };

  const confirmCreateWithDuplicates = () => {
    const data = createForm.getValues();
    createGroupMutation.mutate(data);
    setDuplicateWarning(null);
  };

  const handleEditGroup = (data: CreateGroupFormData) => {
    if (selectedGroup) {
      updateGroupMutation.mutate({ id: selectedGroup.id, data });
    }
  };

  const handleDeleteGroup = (group: DepartmentGroup) => {
    if (confirm(`Are you sure you want to delete "${group.name}"?`)) {
      deleteGroupMutation.mutate(group.id);
    }
  };

  const handleManageDepartments = (group: DepartmentGroup) => {
    setSelectedGroup(group);
    setSelectedDepartments(group.departments as string[]);
    setIsDepartmentDialogOpen(true);
  };

  const handleUpdateDepartments = () => {
    if (selectedGroup) {
      updateDepartmentsMutation.mutate({
        id: selectedGroup.id,
        departments: selectedDepartments,
      });
    }
  };

  const openEditDialog = (group: DepartmentGroup) => {
    setSelectedGroup(group);
    editForm.reset({
      name: group.name,
      description: group.description || "",
      color: group.color || "#3B82F6",
    });
    setIsEditDialogOpen(true);
  };

  // Get departments not in any group
  const assignedDepartments = new Set(
    groups.flatMap((group) => group.departments as string[])
  );
  const unassignedDepartments = departments.filter(
    (dept) => !assignedDepartments.has(dept)
  );

  if (groupsLoading || departmentsLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/2 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Department Groups</h1>
        <Button
          size="sm"
          onClick={() => {
            setIsCreateDialogOpen(true);
            setCreateGroupDepartments([]);
          }}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Unassigned Departments Alert */}
      {unassignedDepartments.length > 0 && (
        <Card className="bg-yellow-900/20 border-yellow-600/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-yellow-400 text-sm">
              Unassigned ({unassignedDepartments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {unassignedDepartments.slice(0, 5).map((dept) => (
                <Badge key={dept} variant="outline" className="text-yellow-400 border-yellow-600/50 text-xs">
                  {dept}
                </Badge>
              ))}
              {unassignedDepartments.length > 5 && (
                <Badge variant="outline" className="text-yellow-400 border-yellow-600/50 text-xs">
                  +{unassignedDepartments.length - 5} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department Groups */}
      <div className="space-y-4">
        {groups.map((group) => (
          <Card key={group.id} className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color || "#3B82F6" }}
                  />
                  <div className="min-w-0">
                    <CardTitle className="text-white text-base">
                      {group.name}
                    </CardTitle>
                    {group.description && (
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {group.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleManageDepartments(group)}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Departments
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(group)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteGroup(group)}
                      className="text-red-400"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-xs text-slate-400">
                  <Users className="mr-2 h-3 w-3" />
                  {(group.departments as string[]).length} departments • {
                    (group.departments as string[]).reduce((acc, dept) => acc + (departmentCounts[dept] || 0), 0)
                  } employees
                </div>
                {(group.departments as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(group.departments as string[]).slice(0, 3).map((dept) => (
                      <Badge 
                        key={dept} 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-slate-600"
                        onClick={() => {
                          setPreviewDepartment(dept);
                          setIsPreviewDialogOpen(true);
                        }}
                      >
                        {dept} ({departmentCounts[dept] || 0})
                      </Badge>
                    ))}
                    {(group.departments as string[]).length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{(group.departments as string[]).length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Department Group</DialogTitle>
            <DialogDescription>
              Create a new group to organize departments
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateGroup)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Head Office" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Brief description"
                        rows={2}
                      />
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
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="color"
                          {...field}
                          className="w-16 h-10"
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="#3B82F6"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Choose a color for this group
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Department Selection */}
              <div className="space-y-2">
                <Label>Select Departments</Label>
                <ScrollArea className="h-[200px] border rounded-lg p-4">
                  <div className="space-y-2">
                    {departments.map((dept) => {
                      const isChecked = createGroupDepartments.includes(dept);
                      const isInOtherGroup = assignedDepartments.has(dept);

                      return (
                        <div
                          key={dept}
                          className={`flex items-center space-x-3 p-2 rounded-lg ${
                            isInOtherGroup ? "opacity-50" : ""
                          }`}
                        >
                          <Checkbox
                            id={`mobile-create-${dept}`}
                            checked={isChecked}
                            disabled={isInOtherGroup}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setCreateGroupDepartments([...createGroupDepartments, dept]);
                              } else {
                                setCreateGroupDepartments(
                                  createGroupDepartments.filter((d) => d !== dept)
                                );
                              }
                            }}
                          />
                          <Label
                            htmlFor={`mobile-create-${dept}`}
                            className={`flex-1 cursor-pointer text-sm ${
                              isInOtherGroup ? "cursor-not-allowed" : ""
                            }`}
                          >
                            {dept}
                          </Label>
                          {isInOtherGroup && (
                            <span className="text-xs text-slate-500">
                              (assigned)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
                <div className="text-sm text-slate-400">
                  {createGroupDepartments.length} departments selected
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createGroupMutation.isPending}>
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Department Group</DialogTitle>
            <DialogDescription>
              Update the group details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditGroup)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
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
                      <div className="flex items-center space-x-2">
                        <Input
                          type="color"
                          {...field}
                          className="w-16 h-10"
                        />
                        <Input
                          value={field.value}
                          onChange={field.onChange}
                        />
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
                <Button type="submit" disabled={updateGroupMutation.isPending}>
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manage Departments Dialog */}
      <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Departments</DialogTitle>
            <DialogDescription>
              {selectedGroup?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-2">
                {departments.map((dept) => {
                  const isChecked = selectedDepartments.includes(dept);
                  const isInOtherGroup = !isChecked && assignedDepartments.has(dept);

                  return (
                    <div
                      key={dept}
                      className={`flex items-center space-x-3 p-2 rounded-lg ${
                        isInOtherGroup ? "opacity-50" : ""
                      }`}
                    >
                      <Checkbox
                        id={dept}
                        checked={isChecked}
                        disabled={isInOtherGroup}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDepartments([...selectedDepartments, dept]);
                          } else {
                            setSelectedDepartments(
                              selectedDepartments.filter((d) => d !== dept)
                            );
                          }
                        }}
                      />
                      <Label
                        htmlFor={dept}
                        className={`flex-1 text-sm ${
                          isInOtherGroup ? "cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        {dept}
                      </Label>
                      {isInOtherGroup && (
                        <span className="text-xs text-slate-500">
                          (assigned)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="text-sm text-slate-400">
              {selectedDepartments.length} selected
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDepartmentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDepartments}
              disabled={updateDepartmentsMutation.isPending}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Preview Dialog */}
      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Employees in {previewDepartment}</DialogTitle>
            <DialogDescription>
              Showing all employees in this department
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {previewEmployees ? (
              <div className="space-y-2">
                {previewEmployees.employees.map((employee: any) => (
                  <div key={employee.employeeCode} className="p-3 border border-slate-700 rounded-lg bg-slate-800">
                    <div className="font-medium text-white">{employee.employeeName}</div>
                    <div className="text-sm text-slate-400">Code: {employee.employeeCode}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Warning Dialog */}
      <Dialog open={!!duplicateWarning} onOpenChange={() => setDuplicateWarning(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Duplicate Employees Detected</DialogTitle>
            <DialogDescription>
              {duplicateWarning?.duplicateCount} employee(s) are already assigned to other department groups
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              The following employees appear in multiple departments:
            </p>
            <ScrollArea className="h-[200px] w-full rounded-md border border-slate-700 p-4">
              {duplicateWarning?.duplicates.map((dup: any) => (
                <div key={dup.employeeCode} className="mb-3">
                  <div className="font-medium text-white">{dup.employeeName}</div>
                  <div className="text-sm text-slate-400">Code: {dup.employeeCode}</div>
                  <div className="text-xs text-yellow-400 mt-1">
                    Departments: {dup.departments.join(", ")}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateWarning(null)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmCreateWithDuplicates}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Create Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}