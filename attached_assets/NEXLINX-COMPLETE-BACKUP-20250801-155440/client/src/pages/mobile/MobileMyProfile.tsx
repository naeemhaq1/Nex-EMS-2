import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Camera,
  Upload,
  Edit3,
  Save,
  X,
  Phone,
  Mail,
  Building,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface Employee {
  id: number;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string;
  designation?: string;
  position?: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  isActive: boolean;
  nonBio?: boolean;
  stopPay?: boolean;
  cnicMissing?: string;
  joiningDate?: string;
  profilePhoto?: string;
}

export default function MobileMyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState<Partial<Employee>>({});
  const [location] = useLocation();
  
  // Check if accessed from admin menu
  const isFromAdmin = location === '/mobile/employee/profile';

  // Fetch current user's employee data
  const { data: employee, isLoading } = useQuery({
    queryKey: ['/api/employees', user?.employeeId],
    queryFn: async () => {
      if (!user?.employeeId) return null;
      const response = await fetch(`/api/employees?employeeCode=${user.employeeId}&limit=1000`);
      if (!response.ok) throw new Error('Failed to fetch employee data');
      const data = await response.json();
      return data.employees?.find((emp: Employee) => emp.employeeCode === user.employeeId);
    },
    enabled: !!user?.employeeId,
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (updates: Partial<Employee>) => {
      if (!employee?.id) throw new Error('Employee ID not found');
      return apiRequest(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      setIsEditing(false);
      setEditedEmployee({});
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Photo upload mutation
  const photoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('employeeId', employee?.id?.toString() || '');
      
      const response = await fetch('/api/employees/upload-photo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Failed to upload photo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File Too Large",
          description: "Please select a photo smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      photoUploadMutation.mutate(file);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedEmployee({
      phone: employee?.phone || '',
      email: employee?.email || '',
      nationalId: employee?.nationalId || '',
    });
  };

  const handleSave = () => {
    if (Object.keys(editedEmployee).length > 0) {
      updateEmployeeMutation.mutate(editedEmployee);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedEmployee({});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1b3e] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-[#1a1b3e] flex flex-col">
        {/* Fixed Header with Back Arrow */}
        <div className="bg-[#2a2b5e] border-b border-gray-700 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link to={isFromAdmin ? "/mobile/admin/dashboard" : "/mobile/employee/dashboard"}>
              <Button size="sm" variant="ghost" className="p-1">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">My Profile</h1>
            {isFromAdmin && (
              <Badge variant="outline" className="ml-2 border-blue-500 text-blue-400 text-xs">
                Admin View
              </Badge>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-lg font-semibold mb-2">Employee Information Not Found</h2>
            <p className="text-gray-400 mb-4">No employee profile data available for your account.</p>
            <Link to={isFromAdmin ? "/mobile/admin/dashboard" : "/mobile/employee/dashboard"}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {isFromAdmin ? "Return to Admin" : "Back to Dashboard"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1b3e] flex flex-col">
      {/* Fixed Header */}
      <div className="bg-[#2a2b5e] border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={isFromAdmin ? "/mobile/admin/dashboard" : "/mobile/employee/dashboard"}>
              <Button size="sm" variant="ghost" className="p-1">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">My Profile</h1>
            {isFromAdmin && (
              <Badge variant="outline" className="ml-2 border-blue-500 text-blue-400 text-xs">
                Admin View
              </Badge>
            )}
          </div>
          
          {!isEditing ? (
            <Button onClick={handleEdit} size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                disabled={updateEmployeeMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button onClick={handleCancel} size="sm" variant="outline">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 space-y-6">
          {/* Profile Photo Section */}
          <Card className="bg-[#2a2b5e] border-gray-700">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <Avatar className="h-24 w-24 bg-gray-600">
                    {employee.profilePhoto ? (
                      <AvatarImage src={employee.profilePhoto} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-gray-600 text-white text-2xl">
                        {getInitials(employee.firstName, employee.lastName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  {/* Photo upload overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <h2 className="text-xl font-semibold mb-1">
                  {employee.firstName} {employee.lastName}
                </h2>
                <p className="text-gray-400 mb-4">{employee.employeeCode}</p>
                
                {/* Photo Upload Buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={handleCameraCapture}
                    size="sm" 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={photoUploadMutation.isPending}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera
                  </Button>
                  <Button 
                    onClick={handleGallerySelect}
                    size="sm" 
                    variant="outline"
                    disabled={photoUploadMutation.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Gallery
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="bg-[#2a2b5e] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Full Name</label>
                  <p className="text-white font-medium">
                    {employee.firstName} {employee.lastName}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Employee Code</label>
                  <p className="text-white font-medium">{employee.employeeCode}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Department</label>
                  <p className="text-white font-medium">{employee.department}</p>
                </div>
                
                <div>
                  <label className="text-sm text-gray-400">Designation</label>
                  <p className="text-white font-medium">
                    {employee.designation || employee.position || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-[#2a2b5e] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Phone Number</label>
                {isEditing ? (
                  <Input
                    value={editedEmployee.phone || ''}
                    onChange={(e) => setEditedEmployee(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    className="bg-[#1a1b3e] border-gray-600 text-white"
                  />
                ) : (
                  <p className="text-white font-medium">
                    {employee.phone || 'Not provided'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-400">Email Address</label>
                {isEditing ? (
                  <Input
                    value={editedEmployee.email || ''}
                    onChange={(e) => setEditedEmployee(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                    type="email"
                    className="bg-[#1a1b3e] border-gray-600 text-white"
                  />
                ) : (
                  <p className="text-white font-medium">
                    {employee.email || 'Not provided'}
                  </p>
                )}
              </div>
              
              <div>
                <label className="text-sm text-gray-400">CNIC</label>
                {isEditing ? (
                  <Input
                    value={editedEmployee.nationalId || ''}
                    onChange={(e) => setEditedEmployee(prev => ({ ...prev, nationalId: e.target.value }))}
                    placeholder="Enter CNIC number"
                    className="bg-[#1a1b3e] border-gray-600 text-white"
                  />
                ) : (
                  <p className="text-white font-medium">
                    {employee.nationalId || 'Not provided'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card className="bg-[#2a2b5e] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building className="h-5 w-5" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Joining Date</label>
                <p className="text-white font-medium">
                  {formatDate(employee.joiningDate)}
                </p>
              </div>
              
              <div>
                <label className="text-sm text-gray-400">Employment Status</label>
                <div className="flex items-center gap-2 mt-1">
                  {employee.isActive ? (
                    <Badge className="bg-green-600 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-red-600 text-white">
                      <X className="h-3 w-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                  
                  {employee.nonBio && (
                    <Badge className="bg-blue-600 text-white">
                      <Shield className="h-3 w-3 mr-1" />
                      Non-Bio
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}