import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Settings, 
  Target,
  Shuffle,
  Crown,
  Shield,
  Loader2,
  Building2
} from 'lucide-react';

// Type definitions
interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  isActive: boolean;
  designation?: string;
  workTeam?: string;
}

interface Designation {
  title: string;
  count: number;
  required: boolean;
}

interface TeamTemplate {
  id: number;
  name: string;
  description: string;
  departments: string[];
  designations: Designation[];
  totalMembers: number;
  category: string;
}

interface TeamMember {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  isLead: boolean;
}

interface AssembledTeam {
  id: number;
  name: string;
  description: string;
  templateId?: number;
  status: string;
  members: TeamMember[];
  createdAt: Date;
  shiftId?: number;
}

export default function TeamAssembly() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TeamTemplate | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [currentTeam, setCurrentTeam] = useState<AssembledTeam | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showManualAssignment, setShowManualAssignment] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<Employee[]>([]);
  const [employeeDesignations, setEmployeeDesignations] = useState<Record<number, string>>({});

  // API calls for data fetching
  const { data: templates = [], isLoading: templatesLoading } = useQuery<TeamTemplate[]>({
    queryKey: ['/api/teams/templates'],
  });

  const { data: assembledTeams = [], isLoading: teamsLoading } = useQuery<AssembledTeam[]>({
    queryKey: ['/api/teams/teams'],
  });

  // Fetch employees
  const { data: employeesData } = useQuery({
    queryKey: ['/api/employees?isActive=true'],
  });
  
  const employees = Array.isArray(employeesData?.employees) ? employeesData.employees : [];

  // Fetch departments
  const { data: departments = [] } = useQuery<string[]>({
    queryKey: ['/api/employees/departments'],
  });

  // Mutations for team operations
  const createTeamMutation = useMutation({
    mutationFn: async (teamData: { name: string; description: string; templateId?: number; members: any[] }) => {
      const response = await apiRequest('POST', '/api/teams/teams', teamData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams/teams'] });
      setShowCreateDialog(false);
      setTeamName("");
      setTeamDescription("");
      setSelectedTemplate(null);
      setSelectedEmployees([]);
      setEmployeeDesignations({});
      toast({ title: "Team created successfully", variant: "default" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create team", description: error.message, variant: "destructive" });
    }
  });

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      await apiRequest('DELETE', `/api/teams/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/teams/teams'] });
      toast({ title: "Team deleted successfully", variant: "default" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete team", description: error.message, variant: "destructive" });
    }
  });

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = !searchQuery || 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch && emp.isActive;
  });

  const createTeamFromTemplate = () => {
    if (!selectedTemplate || !teamName) {
      toast({ title: "Please select a template and enter team name", variant: "destructive" });
      return;
    }

    const teamData = {
      name: teamName,
      description: teamDescription,
      templateId: selectedTemplate.id,
      members: []
    };

    createTeamMutation.mutate(teamData);
  };

  const createManualTeam = () => {
    if (!teamName || selectedEmployees.length === 0) {
      toast({ title: "Please enter team name and select employees", variant: "destructive" });
      return;
    }

    const members = selectedEmployees.map(emp => ({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeCode: emp.employeeCode,
      designation: employeeDesignations[emp.id] || 'Team Member',
      department: emp.department,
      isLead: false
    }));

    const teamData = {
      name: teamName,
      description: teamDescription,
      members: members
    };

    createTeamMutation.mutate(teamData);
  };

  const toggleEmployeeSelection = (employee: Employee) => {
    const isSelected = selectedEmployees.some(emp => emp.id === employee.id);
    
    if (isSelected) {
      setSelectedEmployees(prev => prev.filter(emp => emp.id !== employee.id));
      setEmployeeDesignations(prev => {
        const newDesignations = { ...prev };
        delete newDesignations[employee.id];
        return newDesignations;
      });
    } else {
      setSelectedEmployees(prev => [...prev, employee]);
      setEmployeeDesignations(prev => ({
        ...prev,
        [employee.id]: employee.designation || 'Team Member'
      }));
    }
  };

  const updateEmployeeDesignation = (employeeId: number, designation: string) => {
    setEmployeeDesignations(prev => ({
      ...prev,
      [employeeId]: designation
    }));
  };

  if (templatesLoading || teamsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Team Assembly</h1>
          <p className="text-gray-400 mt-1">Create and manage team compositions with flexible assignment options</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Team</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Team Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Team Name</label>
                  <Input 
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter team name"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <Input 
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="Enter team description"
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Creation Method Selection */}
              <div className="flex gap-4">
                <Button 
                  variant={showManualAssignment ? "outline" : "default"}
                  onClick={() => setShowManualAssignment(false)}
                  className="flex-1"
                >
                  <Target className="mr-2 h-4 w-4" />
                  Use Template
                </Button>
                <Button 
                  variant={showManualAssignment ? "default" : "outline"}
                  onClick={() => setShowManualAssignment(true)}
                  className="flex-1"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Manual Assignment
                </Button>
              </div>

              {/* Template Selection */}
              {!showManualAssignment && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Select Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map(template => (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id 
                            ? 'ring-2 ring-purple-500 bg-gray-800' 
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-white text-lg">{template.name}</CardTitle>
                          <p className="text-gray-400 text-sm">{template.description}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-gray-300">{template.totalMembers} members</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-purple-400" />
                              <span className="text-sm text-gray-300">{template.departments.join(', ')}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.designations.map(designation => (
                                <Badge 
                                  key={designation.title} 
                                  variant={designation.required ? "default" : "outline"}
                                  className="text-xs"
                                >
                                  {designation.title} ({designation.count})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Assignment */}
              {showManualAssignment && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Manual Employee Assignment</h3>
                  
                  {/* Employee Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search employees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  {/* Selected Employees */}
                  {selectedEmployees.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-md font-medium text-white">Selected Team Members ({selectedEmployees.length})</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedEmployees.map(employee => (
                          <div key={employee.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium text-white">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="text-sm text-gray-400">
                                {employee.employeeCode} • {employee.department}
                              </div>
                            </div>
                            <Select 
                              value={employeeDesignations[employee.id] || 'Team Member'}
                              onValueChange={(value) => updateEmployeeDesignation(employee.id, value)}
                            >
                              <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Team Member">Team Member</SelectItem>
                                <SelectItem value="Team Lead">Team Lead</SelectItem>
                                <SelectItem value="Supervisor">Supervisor</SelectItem>
                                <SelectItem value="Coordinator">Coordinator</SelectItem>
                                <SelectItem value="Specialist">Specialist</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => toggleEmployeeSelection(employee)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available Employees */}
                  <div className="space-y-3">
                    <h4 className="text-md font-medium text-white">Available Employees</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {filteredEmployees
                        .filter(emp => !selectedEmployees.some(sel => sel.id === emp.id))
                        .map(employee => (
                          <div 
                            key={employee.id} 
                            className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                            onClick={() => toggleEmployeeSelection(employee)}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-white">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="text-sm text-gray-400">
                                {employee.employeeCode} • {employee.department}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={showManualAssignment ? createManualTeam : createTeamFromTemplate}
                  disabled={createTeamMutation.isPending || !teamName}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {createTeamMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Team
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="teams" className="data-[state=active]:bg-purple-600">
            Assembled Teams
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-purple-600">
            Templates
          </TabsTrigger>
          <TabsTrigger value="employees" className="data-[state=active]:bg-purple-600">
            Employee Pool
          </TabsTrigger>
        </TabsList>

        {/* Assembled Teams Tab */}
        <TabsContent value="teams" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assembledTeams.map(team => (
              <Card key={team.id} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{team.name}</CardTitle>
                      <p className="text-gray-400 text-sm mt-1">{team.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300"
                        onClick={() => deleteTeamMutation.mutate(team.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-gray-300">{team.members.length} members</span>
                      <Badge variant="outline" className="ml-auto">
                        {team.status}
                      </Badge>
                    </div>
                    
                    {team.members.slice(0, 3).map(member => (
                      <div key={member.id} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-300">{member.employeeName}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {member.designation}
                        </Badge>
                      </div>
                    ))}
                    
                    {team.members.length > 3 && (
                      <div className="text-sm text-gray-400">
                        +{team.members.length - 3} more members
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <Card key={template.id} className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">{template.name}</CardTitle>
                  <p className="text-gray-400 text-sm">{template.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-gray-300">{template.totalMembers} members</span>
                      <Badge variant="outline" className="ml-auto">
                        {template.category}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-gray-300">{template.departments.join(', ')}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {template.designations.map(designation => (
                        <Badge 
                          key={designation.title} 
                          variant={designation.required ? "default" : "outline"}
                          className="text-xs"
                        >
                          {designation.title} ({designation.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Employee Pool Tab */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-600 text-white"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map(employee => (
              <Card key={employee.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {employee.firstName[0]}{employee.lastName[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-sm text-gray-400">
                        {employee.employeeCode}
                      </div>
                      <div className="text-sm text-gray-400">
                        {employee.department}
                      </div>
                      {employee.designation && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {employee.designation}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}