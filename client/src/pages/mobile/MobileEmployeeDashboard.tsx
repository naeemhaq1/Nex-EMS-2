import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MobileEmployeeDashboard() {
  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <Card>
        <CardHeader>
          <CardTitle>Employee Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Welcome to your employee dashboard</p>
        </CardContent>
      </Card>
    </div>
  );
}