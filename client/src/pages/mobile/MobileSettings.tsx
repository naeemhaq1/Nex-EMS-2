import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MobileSettings() {
  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Application settings</p>
        </CardContent>
      </Card>
    </div>
  );
}