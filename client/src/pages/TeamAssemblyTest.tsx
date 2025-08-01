import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

export default function TeamAssemblyTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] to-[#0D1B2A] p-6">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Team Assembly</h1>
          <p className="text-purple-200">
            Create and manage teams with intelligent employee assignment
          </p>
        </div>

        <Card className="bg-[#2A2B5E]/50 border border-purple-400/30 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-purple-300" />
            <h3 className="text-lg font-semibold mb-2 text-white">Team Assembly Module</h3>
            <p className="text-purple-200 mb-4">
              This is the simplified Team Assembly component for testing
            </p>
            <Button 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Test Button
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}