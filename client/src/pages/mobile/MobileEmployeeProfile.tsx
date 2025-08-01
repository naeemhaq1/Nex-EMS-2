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

export default function MobileEmployeeProfile() {
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
    if (!firstName || !lastName) return 'N/A';
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
      <div className="min-h-screen bg-[#1a1b3e] p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-[#1a1b3e] flex flex-col">
        {/* Fixed Header with Back Arrow */}
        <div className="flex-shrink-0 bg-[#1a1b3e] p-4 border-b border-gray-700">
          <Link to="/mobile/employees">
            <Button variant="ghost" className="text-gray-400 hover:text-white p-0 touch-manipulation">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Directory
            </Button>
          </Link>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-white">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-semibold mb-2">Employee Not Found</h2>
            <p className="text-gray-400 mb-4">The requested employee profile could not be found.</p>
            <Link to="/mobile/employees">
              <Button variant="outline" className="border-gray-600 text-white hover:bg-[#3a3b6e]">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Directory
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1a1b3e] text-white flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-[#1a1b3e] p-4 border-b border-gray-700">
        <Link to="/mobile/employees">
          <Button variant="ghost" className="text-gray-400 hover:text-white p-0 touch-manipulation">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Directory
          </Button>
        </Link>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 space-y-4">
          {/* Profile Header */}
          <div className="bg-[#2a2b5e] rounded-lg p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 bg-gray-600 flex-shrink-0">
                <AvatarFallback className="bg-gray-600 text-white text-lg">
                  {getInitials(employee.firstName, employee.lastName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold mb-1">
                  {employee.firstName} {employee.lastName}
                </h1>
                <p className="text-lg text-gray-300 mb-2">
                  {employee.designation || employee.position || 'N/A'}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  <Badge variant="outline" className="border-green-500 text-green-400 text-xs">
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {employee.nonBio && (
                    <Badge variant="outline" className="border-blue-500 text-blue-400 text-xs">
                      Non-Bio
                    </Badge>
                  )}
                  {employee.stopPay && (
                    <Badge variant="outline" className="border-red-500 text-red-400 text-xs">
                      Stop Pay
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-[#2a2b5e] rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 text-white">Personal Information</h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Employee Code</label>
                  <p className="text-sm text-white">{employee.employeeCode}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">BioTime ID</label>
                  <p className="text-sm text-white">{employee.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">First Name</label>
                  <p className="text-sm text-white">{employee.firstName}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Last Name</label>
                  <p className="text-sm text-white">{employee.lastName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Email</label>
                  <p className="text-sm text-white break-all">{employee.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Phone</label>
                  <p className="text-sm text-white">{employee.phone || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">National ID</label>
                  <p className="text-sm text-white">{employee.cnic || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Birthday</label>
                  <p className="text-sm text-white">{formatDate(employee.birthday)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-[#2a2b5e] rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 text-white">Employment Information</h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Department</label>
                  <p className="text-sm text-white">{employee.department}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Position</label>
                  <p className="text-sm text-white">{employee.position || employee.designation || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Hire Date</label>
                  <p className="text-sm text-white">{formatDate(employee.hireDate)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Joining Date</label>
                  <p className="text-sm text-white">{formatDate(employee.joiningDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Work Team</label>
                  <p className="text-sm text-white">{employee.workTeam || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Designation</label>
                  <p className="text-sm text-white">{employee.designation || 'N/A'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase">Location</label>
                <p className="text-sm text-white">{employee.location || employee.pop || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Contract & Status */}
          <div className="bg-[#2a2b5e] rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3 text-white">Contract & Status</h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Contract Date</label>
                  <p className="text-sm text-white">{formatDate(employee.contractDate)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Contract Term</label>
                  <p className="text-sm text-white">{employee.contractTerm || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Contract Expiry</label>
                  <p className="text-sm text-white">{formatDate(employee.contractExpiry)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Shift ID</label>
                  <p className="text-sm text-white">{getShiftName(employee.shiftId)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Is Active</label>
                  <p className={`text-sm font-semibold ${employee.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {employee.isActive ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">CNIC Missing</label>
                  <p className={`text-sm font-semibold ${employee.cnicMissing === 'yes' ? 'text-red-400' : 'text-green-400'}`}>
                    {employee.cnicMissing === 'yes' ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Stop Pay</label>
                  <p className={`text-sm font-semibold ${employee.stopPay ? 'text-red-400' : 'text-green-400'}`}>
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