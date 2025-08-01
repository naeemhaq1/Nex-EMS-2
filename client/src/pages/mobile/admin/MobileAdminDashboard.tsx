import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MobileAdminDashboard() {
  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Welcome to the admin dashboard</p>
        </CardContent>
      </Card>
    </div>
  );
}