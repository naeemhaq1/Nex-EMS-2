import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { firstTimePasswordSchema } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Key, Shield } from 'lucide-react';

interface FirstTimePasswordFormProps {
  userId: number;
  username: string;
  onSuccess: () => void;
}

export default function FirstTimePasswordForm({ userId, username, onSuccess }: FirstTimePasswordFormProps) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(firstTimePasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: ''
    }
  });

  const setPasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/auth/set-first-time-password', {
        method: 'POST',
        data: {
          userId,
          newPassword: data.newPassword
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Password Set Successfully",
        description: "Your password has been set. You can now login with your new password.",
        variant: "default"
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set password. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      form.setError('confirmPassword', {
        type: 'manual',
        message: 'Passwords do not match'
      });
      return;
    }
    setPasswordMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
          <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-xl">Set Your Password</CardTitle>
        <CardDescription>
          Welcome <strong>{username}</strong>! Please set a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="Enter your new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password"
                      placeholder="Confirm your new password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Password Requirements:
                  </p>
                  <ul className="mt-1 text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    <li>• At least 8 characters long</li>
                    <li>• Use a combination of letters, numbers, and symbols</li>
                    <li>• Choose a unique password you haven't used elsewhere</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={setPasswordMutation.isPending}
              className="w-full"
            >
              {setPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting Password...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Set Password
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}