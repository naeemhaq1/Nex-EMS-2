import { apiRequest } from "./queryClient";
import type { Employee, AttendanceRecord, User } from "@shared/schema";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardMetrics {
  totalEmployees: number;
  presentToday: number;
  lateArrivals: number;
  absentToday: number;
}

export interface RecentActivity {
  type: string;
  employeeName: string;
  employeeCode: string;
  timestamp: Date;
  details: string;
}

export interface SyncStatus {
  syncType: string;
  lastSync: Date | null;
  status: string;
  recordsProcessed: number;
  recordsTotal: number;
  error: string | null;
}

export interface MonthlyReport {
  period: string;
  summary: {
    totalEmployees: number;
    averageAttendance: number;
    totalHours: number;
    totalOvertimeHours: number;
  };
  employees: Array<{
    employee: {
      id: number;
      name: string;
      employeeCode: string;
      department: string;
      position: string;
    };
    attendance: {
      totalDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      totalHours: number;
      regularHours: number;
      overtimeHours: number;
      lateMinutes: number;
    };
  }>;
}

export interface PayrollReport {
  period: string;
  summary: {
    totalEmployees: number;
    totalBaseSalary: number;
    totalOvertimePay: number;
    totalDeductions: number;
    totalNetPay: number;
  };
  employees: Array<{
    employeeCode: string;
    name: string;
    department: string;
    position: string;
    daysWorked: number;
    totalHours: number;
    overtimeHours: number;
    baseSalary: number;
    overtimePay: number;
    deductions: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
    totalDeductions: number;
    netPay: number;
  }>;
}

export class ApiService {
  private static instance: ApiService;

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Dashboard APIs
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await apiRequest("GET", "/api/dashboard/metrics");
    return response.json();
  }

  async getRecentActivity(limit = 10): Promise<RecentActivity[]> {
    const response = await apiRequest("GET", `/api/dashboard/activity?limit=${limit}`);
    return response.json();
  }

  // Employee APIs
  async getEmployees(params: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    isActive?: boolean;
  } = {}): Promise<PaginatedResponse<Employee>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.search) searchParams.append("search", params.search);
    if (params.department) searchParams.append("department", params.department);
    if (params.isActive !== undefined) searchParams.append("isActive", params.isActive.toString());

    const response = await apiRequest("GET", `/api/employees?${searchParams}`);
    return response.json();
  }

  async getEmployee(id: number): Promise<Employee> {
    const response = await apiRequest("GET", `/api/employees/${id}`);
    return response.json();
  }

  async createEmployee(employee: Partial<Employee>): Promise<Employee> {
    const response = await apiRequest("POST", "/api/employees", employee);
    return response.json();
  }

  async updateEmployee(id: number, employee: Partial<Employee>): Promise<Employee> {
    const response = await apiRequest("PATCH", `/api/employees/${id}`, employee);
    return response.json();
  }

  async deleteEmployee(id: number): Promise<void> {
    await apiRequest("DELETE", `/api/employees/${id}`);
  }

  // Attendance APIs
  async getAttendanceRecords(params: {
    page?: number;
    limit?: number;
    employeeId?: number;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  } = {}): Promise<PaginatedResponse<AttendanceRecord>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.employeeId) searchParams.append("employeeId", params.employeeId.toString());
    if (params.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params.dateTo) searchParams.append("dateTo", params.dateTo);
    if (params.status) searchParams.append("status", params.status);

    const response = await apiRequest("GET", `/api/attendance?${searchParams}`);
    return response.json();
  }

  async getEmployeeAttendance(employeeId: number, params: {
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<PaginatedResponse<AttendanceRecord>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.dateFrom) searchParams.append("dateFrom", params.dateFrom);
    if (params.dateTo) searchParams.append("dateTo", params.dateTo);

    const response = await apiRequest("GET", `/api/attendance/employee/${employeeId}?${searchParams}`);
    return response.json();
  }

  // Reports APIs
  async getMonthlyReport(month: number, year: number): Promise<MonthlyReport> {
    const response = await apiRequest("GET", `/api/reports/monthly?month=${month}&year=${year}`);
    return response.json();
  }

  async getPayrollReport(month: number, year: number): Promise<PayrollReport> {
    const response = await apiRequest("GET", `/api/reports/payroll?month=${month}&year=${year}`);
    return response.json();
  }

  // Sync APIs
  async syncEmployees(): Promise<{ success: boolean; processed: number; total: number }> {
    const response = await apiRequest("POST", "/api/sync/employees");
    return response.json();
  }

  async syncAttendance(): Promise<{ success: boolean; processed: number; total: number }> {
    const response = await apiRequest("POST", "/api/sync/attendance");
    return response.json();
  }

  async getSyncStatus(): Promise<SyncStatus[]> {
    const response = await apiRequest("GET", "/api/sync/status");
    return response.json();
  }

  // Utility methods
  async exportData(endpoint: string, filename: string): Promise<void> {
    const response = await apiRequest("GET", endpoint);
    const data = await response.json();
    
    // Convert to CSV
    const csv = this.convertToCSV(data);
    
    // Download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private convertToCSV(data: any): string {
    if (!data || typeof data !== 'object') return '';
    
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const rows = data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );
      
      return [headers.join(','), ...rows].join('\n');
    }
    
    // Handle object with array property
    if (data.employees && Array.isArray(data.employees)) {
      return this.convertToCSV(data.employees);
    }
    
    return '';
  }

  // Error handling
  private handleError(error: any): never {
    if (error.response) {
      // Server responded with error status
      throw new Error(`API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
    } else if (error.request) {
      // Network error
      throw new Error('Network error: Unable to connect to server');
    } else {
      // Other error
      throw new Error(error.message || 'Unknown error occurred');
    }
  }
}

export const apiService = ApiService.getInstance();

// Utility functions for common operations
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString();
};

export const formatTime = (time: string | Date): string => {
  const t = new Date(time);
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const getStatusColor = (status: string): string => {
  const colors = {
    present: 'text-green-500',
    late: 'text-yellow-500',
    absent: 'text-red-500',
    partial: 'text-blue-500',
  };
  return colors[status as keyof typeof colors] || 'text-gray-500';
};

export const calculateAttendancePercentage = (present: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
};
