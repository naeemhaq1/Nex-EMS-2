import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MobileAttendance() {
  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Attendance tracking interface</p>
        </CardContent>
      </Card>
    </div>
  );
}