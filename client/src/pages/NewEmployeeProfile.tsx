import React from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Building2, User, Clock, Shield, Activity } from 'lucide-react';

// Types
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
  cnic?: string;
  isActive: boolean;
  nonBio?: boolean;
  stopPay?: boolean;
  cnicMissing?: string;
  hireDate?: string;
  joiningDate?: string;
  birthday?: string;
  contractDate?: string;
  contractTerm?: string;
  contractExpiry?: string;
  location?: string;
  workTeam?: string;
  salutation?: string;
  shiftId?: string;
  pop?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export default function NewEmployeeProfile() {
  const { id } = useParams();

  // Fetch employee data
  const { data: employee, isLoading } = useQuery({
    queryKey: ['/api/employees', id],
    enabled: !!id,
  });

  // Fetch shifts data
  const { data: shifts = [] } = useQuery({
    queryKey: ['/api/shifts'],
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getShiftName = (shiftId?: string) => {
    if (!shiftId) return 'N/A';
    const shift = shifts.find((s: Shift) => s.id === shiftId);
    return shift ? shift.name : shiftId;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1b3e] p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-[#1a1b3e] p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#2a2b5e] rounded-lg p-6 text-center">
            <p className="text-gray-400">Employee not found</p>
            <Link to="/employees">
              <Button variant="outline" className="mt-4 border-gray-600 text-white hover:bg-[#3a3b6e]">
                Back to Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1b3e] text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link to="/employees">
            <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
        </div>

        {/* Profile Header */}
        <div className="bg-[#2a2b5e] rounded-lg p-6 mb-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-32 w-32 bg-gray-600">
              <AvatarFallback className="bg-gray-600 text-white text-2xl">
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-xl text-gray-300 mb-4">
                {employee.designation || employee.position || 'N/A'}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="border-green-500 text-green-400">
                  {employee.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {employee.nonBio && (
                  <Badge variant="outline" className="border-blue-500 text-blue-400">
                    Non-Bio
                  </Badge>
                )}
                {employee.stopPay && (
                  <Badge variant="outline" className="border-red-500 text-red-400">
                    Stop Pay
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="bg-[#2a2b5e] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">PERSONAL INFORMATION</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Employee Code</label>
                  <p className="text-white">{employee.employeeCode}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Code2</label>
                  <p className="text-white">{employee.employeeCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">BioTime ID</label>
                  <p className="text-white">{employee.id}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">First Name</label>
                  <p className="text-white">{employee.firstName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Salutation</label>
                  <p className="text-white">{employee.salutation || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Last Name</label>
                  <p className="text-white">{employee.lastName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">{employee.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Phone</label>
                  <p className="text-white">{employee.phone || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">National ID</label>
                  <p className="text-white">{employee.cnic || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Birthday</label>
                  <p className="text-white">{formatDate(employee.birthday)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-[#2a2b5e] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">EMPLOYMENT INFORMATION</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Department</label>
                  <p className="text-white">{employee.department}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Position</label>
                  <p className="text-white">{employee.position || employee.designation || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Project</label>
                  <p className="text-white">{employee.workTeam || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Project</label>
                  <p className="text-white">{employee.workTeam || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Hire Date</label>
                  <p className="text-white">{formatDate(employee.hireDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Designation</label>
                  <p className="text-white">{employee.designation || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Joining Date</label>
                  <p className="text-white">{formatDate(employee.joiningDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Employment</label>
                  <p className="text-white">{employee.isActive ? 'Active' : 'Inactive'}</p>
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-sm text-gray-400">Location</label>
                <p className="text-white">{employee.location || employee.pop || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Contract & Status */}
          <div className="bg-[#2a2b5e] rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-white">CONTRACT & STATUS</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Contract Date</label>
                  <p className="text-white">{formatDate(employee.contractDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Contract Term</label>
                  <p className="text-white">{employee.contractTerm || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Contract Expiry</label>
                  <p className="text-white">{formatDate(employee.contractExpiry)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Entitlement Date</label>
                  <p className="text-white">{formatDate(employee.joiningDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Is Active</label>
                  <p className={`font-semibold ${employee.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {employee.isActive ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Shift ID</label>
                  <p className="text-white">{getShiftName(employee.shiftId)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">CNIC Missing</label>
                  <p className={`font-semibold ${employee.cnicMissing === 'yes' ? 'text-red-400' : 'text-green-400'}`}>
                    {employee.cnicMissing === 'yes' ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Stop Pay</label>
                  <p className={`font-semibold ${employee.stopPay ? 'text-red-400' : 'text-green-400'}`}>
                    {employee.stopPay ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}