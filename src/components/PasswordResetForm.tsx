import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { passwordResetSchema } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, ArrowLeft, MessageSquare } from 'lucide-react';

interface PasswordResetFormProps {
  onBack: () => void;
}

export default function PasswordResetForm({ onBack }: PasswordResetFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'request' | 'success'>('request');
  const [resetUsername, setResetUsername] = useState('');

  const form = useForm({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      username: '',
      mobileNumber: ''
    }
  });

  const resetMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/auth/initiate-password-reset', {
        method: 'POST',
        data
      });
    },
    onSuccess: (data) => {
      setResetUsername(form.getValues('username'));
      setStep('success');
      toast({
        title: "Password Reset Initiated",
        description: "WhatsApp message with reset instructions has been sent to your registered mobile number.",
        variant: "default"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate password reset. Please check your username and mobile number.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: any) => {
    resetMutation.mutate(data);
  };

  if (step === 'success') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-xl">Password Reset Sent</CardTitle>
          <CardDescription>
            WhatsApp message with reset instructions has been sent to your registered mobile number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Username:</strong> {resetUsername}
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
              Please check your WhatsApp for the reset link and follow the instructions to set your new password.
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={onBack}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Reset Password</CardTitle>
        <CardDescription>
          Enter your username and registered mobile number to receive password reset instructions via WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your username"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your registered mobile number"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button 
                type="button" 
                onClick={onBack}
                variant="outline"
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={resetMutation.isPending}
                className="flex-1"
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}