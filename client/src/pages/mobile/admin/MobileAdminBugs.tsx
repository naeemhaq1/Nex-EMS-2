import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import MobileAdminDualNavigation from '@/components/mobile/MobileAdminDualNavigation';
import { 
  Bug, 
  Send, 
  AlertTriangle, 
  CheckCircle,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

interface BugReport {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'ui' | 'functionality' | 'performance' | 'data' | 'other';
  steps: string;
  expectedBehavior: string;
  actualBehavior: string;
}

export default function MobileAdminBugs() {
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState<BugReport>({
    title: '',
    description: '',
    severity: 'medium',
    category: 'functionality',
    steps: '',
    expectedBehavior: '',
    actualBehavior: ''
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const submitBugMutation = useMutation({
    mutationFn: async (bugData: BugReport) => {
      await apiRequest('/api/bugs/submit', {
        method: 'POST',
        body: JSON.stringify(bugData),
      });
    },
    onSuccess: () => {
      setSubmitStatus('success');
      setFormData({
        title: '',
        description: '',
        severity: 'medium',
        category: 'functionality',
        steps: '',
        expectedBehavior: '',
        actualBehavior: ''
      });
      setTimeout(() => setSubmitStatus('idle'), 3000);
    },
    onError: () => {
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }
  });

  const handleBack = () => {
    navigate('/mobile/admin/dashboard');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.description) {
      submitBugMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: keyof BugReport, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-600';
      case 'medium': return 'bg-yellow-600';
      case 'high': return 'bg-orange-600';
      case 'critical': return 'bg-red-600';
      default: return 'bg-yellow-600';
    }
  };

  return (
    <div className="h-screen bg-[#1A1B3E] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2A2B5E] border-b border-gray-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-gray-400 hover:text-white p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center">
                <Bug className="w-6 h-6 mr-2 text-red-400" />
                Bug Report
              </h1>
              <p className="text-gray-400 text-sm">Submit issues and problems</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-scroll mobile-content-scroll p-4 pb-20">
        {/* Success/Error Messages */}
        {submitStatus === 'success' && (
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
              <span className="text-green-400 font-medium">Bug report submitted successfully!</span>
            </div>
            <p className="text-green-300 text-sm mt-1">Thank you for helping improve the system.</p>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-red-400 font-medium">Failed to submit bug report</span>
            </div>
            <p className="text-red-300 text-sm mt-1">Please try again or contact support.</p>
          </div>
        )}

        {/* Bug Report Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <label className="block text-white font-medium mb-2">Bug Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief description of the problem"
              className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Severity and Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2A2B5E] rounded-lg p-4">
              <label className="block text-white font-medium mb-2">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => handleInputChange('severity', e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <div className={`w-full h-1 rounded mt-2 ${getSeverityColor(formData.severity)}`}></div>
            </div>

            <div className="bg-[#2A2B5E] rounded-lg p-4">
              <label className="block text-white font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="ui">User Interface</option>
                <option value="functionality">Functionality</option>
                <option value="performance">Performance</option>
                <option value="data">Data Issues</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <label className="block text-white font-medium mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Detailed description of the problem"
              rows={4}
              className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              required
            />
          </div>

          {/* Steps to Reproduce */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <label className="block text-white font-medium mb-2">Steps to Reproduce</label>
            <textarea
              value={formData.steps}
              onChange={(e) => handleInputChange('steps', e.target.value)}
              placeholder="1. Go to... 2. Click on... 3. See error..."
              rows={3}
              className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Expected vs Actual Behavior */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-[#2A2B5E] rounded-lg p-4">
              <label className="block text-white font-medium mb-2">Expected Behavior</label>
              <textarea
                value={formData.expectedBehavior}
                onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
                placeholder="What should happen?"
                rows={2}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            <div className="bg-[#2A2B5E] rounded-lg p-4">
              <label className="block text-white font-medium mb-2">Actual Behavior</label>
              <textarea
                value={formData.actualBehavior}
                onChange={(e) => handleInputChange('actualBehavior', e.target.value)}
                placeholder="What actually happens?"
                rows={2}
                className="w-full bg-[#1A1B3E] border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-[#2A2B5E] rounded-lg p-4">
            <Button
              type="submit"
              disabled={!formData.title || !formData.description || submitBugMutation.isPending}
              className="w-full flex flex-col items-center justify-center space-y-1 px-2 py-3 rounded-lg transition-all duration-200 active:scale-95 min-w-[60px] bg-red-600 hover:bg-red-700"
            >
              <div className="p-1 rounded-lg flex items-center justify-center">
                {submitBugMutation.isPending ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Send className="w-5 h-5 text-white" />
                )}
              </div>
              <span className="text-xs text-white font-medium text-center leading-tight">
                {submitBugMutation.isPending ? 'Submitting...' : 'Submit Bug Report'}
              </span>
            </Button>
            <p className="text-gray-400 text-xs mt-2 text-center">
              Report will be sent to development team for review
            </p>
          </div>
        </form>
      </div>

      {/* Bottom Navigation */}
      <MobileAdminDualNavigation currentPage="bugs" />
    </div>
  );
}