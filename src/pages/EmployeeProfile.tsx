import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, Mail, Phone, MapPin, Building, User, Clock, Activity, FileText } from "lucide-react";
import { format } from "date-fns";

interface Employee {
  id: number;
  empCode: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  hireDate: string;
  isActive: boolean;
  nationalId: string;
  address: string;
  city: string;
  createdAt: string;
  updatedAt: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakIn: string | null;
  breakOut: string | null;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  lateMinutes: number;
  status: string;
  notes: string | null;
}

export function EmployeeProfile() {
  const { id } = useParams();

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['/api/employees', id],
    enabled: !!id,
  });

  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['/api/attendance', { employeeId: id, limit: 50 }],
    enabled: !!id,
  });

  if (employeeLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Employee not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const attendanceRecords = attendanceData?.records || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-blue-100 text-blue-700">
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">{employee.position}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={employee.isActive ? "default" : "secondary"}>
                {employee.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline">ID: {employee.empCode}</Badge>
            </div>
          </div>
        </div>
        <Button variant="outline">
          Edit Profile
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{employee.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{employee.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">National ID</p>
                    <p className="font-medium">{employee.nationalId || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">
                      {employee.address && employee.city 
                        ? `${employee.address}, ${employee.city}`
                        : employee.address || employee.city || 'Not provided'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Employment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Employment Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Department</p>
                  <p className="font-medium">{employee.department}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Position</p>
                  <p className="font-medium">{employee.position}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Hire Date</p>
                    <p className="font-medium">
                      {employee.hireDate ? format(new Date(employee.hireDate), 'PPP') : 'Not provided'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Employee Code</p>
                  <p className="font-medium">{employee.empCode}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>Latest attendance and system activity</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="flex items-center justify-center h-24">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : attendanceRecords.length > 0 ? (
                <div className="space-y-3">
                  {attendanceRecords.slice(0, 5).map((record: AttendanceRecord) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium">{format(new Date(record.date), 'MMM dd, yyyy')}</p>
                          <div className="text-sm text-gray-500">
                            {record.checkIn && <span>In: {format(new Date(record.checkIn), 'HH:mm')}</span>}
                            {record.checkOut && <span className="ml-2">Out: {format(new Date(record.checkOut), 'HH:mm')}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'destructive' : 'secondary'}>
                          {record.status}
                        </Badge>
                        <p className="text-sm text-gray-500">{format(new Date(record.date), 'MMM dd')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No recent activity found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Detailed attendance records and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : attendanceRecords.length > 0 ? (
                <div className="space-y-2">
                  {attendanceRecords.map((record: AttendanceRecord) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{format(new Date(record.date), 'PPPP')}</p>
                          <div className="text-sm text-gray-500 mt-1">
                            {record.checkIn && <span>In: {format(new Date(record.checkIn), 'HH:mm')}</span>}
                            {record.checkOut && <span className="ml-2">Out: {format(new Date(record.checkOut), 'HH:mm')}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Status</p>
                          <Badge variant={record.status === 'present' ? 'default' : record.status === 'late' ? 'destructive' : 'secondary'}>
                            {record.status}
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500">Hours</p>
                          <p className="font-medium">{record.totalHours ? Number(record.totalHours).toFixed(2) : '0.00'}h</p>
                        </div>
                        {record.lateMinutes > 0 && (
                          <div className="text-center">
                            <p className="text-sm text-gray-500">Late</p>
                            <p className="font-medium text-red-600">{record.lateMinutes} min</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No attendance records found</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">95.2%</div>
                <p className="text-sm text-gray-500">Last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Avg Hours/Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">8.2h</div>
                <p className="text-sm text-gray-500">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>On-Time Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">87%</div>
                <p className="text-sm text-gray-500">Last 30 days</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Documents</CardTitle>
              <CardDescription>Official documents and certifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Document management coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EmployeeProfile;