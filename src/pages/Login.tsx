import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { shouldRedirectToMobile } from "@/utils/deviceDetection";
import { deviceAuthService } from "@/services/DeviceAuthService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogIn, Eye, EyeOff, Shield, Users, Clock, Key, Smartphone, AlertTriangle } from "lucide-react";
import nexlinxLogo from "../assets/nexlinx_transparent_logo.png";
import PasswordResetForm from "@/components/PasswordResetForm";
import FirstTimePasswordForm from "@/components/FirstTimePasswordForm";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'reset' | 'first-time'>('login');
  const [firstTimeUser, setFirstTimeUser] = useState<{userId: number, username: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log('Login form submitted for user:', username);
      
      // Clear any previous auth state
      localStorage.removeItem('auth-state');
      
      const result = await login(username, password);
      console.log('Login result:', result);
      
      if (!result.success) {
        // Check if this is a first-time password change requirement
        if (result.error === "Password change required" && result.requiresPasswordChange && result.userId) {
          setFirstTimeUser({
            userId: result.userId,
            username: username
          });
          setView('first-time');
        } else {
          setError(result.error || "Login failed. Please check your credentials.");
        }
      } else {
        console.log('Login successful, redirecting...');
        // Small delay to ensure state is set
        setTimeout(() => {
          if (shouldRedirectToMobile()) {
            setLocation('/mobile/employee/dashboard');
          } else {
            setLocation('/admin');
          }
        }, 100);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("Login failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setView('login');
    setError("");
    setFirstTimeUser(null);
  };

  const handleFirstTimePasswordSuccess = () => {
    setView('login');
    setFirstTimeUser(null);
    setError("");
    setUsername("");
    setPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1B3E] via-[#2A2B5E] to-[#1A1B3E] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:block text-white space-y-8">
          <div className="text-center">
            <img 
              src={nexlinxLogo} 
              alt="Nexlinx Networks" 
              className="w-40 h-40 mx-auto -mb-6"
            />
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
              Nexlinx Smart EMS
            </h1>
            <p className="text-xl text-gray-300">
              Employee Management System
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Employee Management</h3>
                <p className="text-gray-400">Comprehensive workforce tracking and analytics</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Smart Attendance</h3>
                <p className="text-gray-400">Real-time biometric and mobile punch tracking</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Secure Access</h3>
                <p className="text-gray-400">Enterprise-grade security and authentication</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Dynamic Forms */}
        <div className="w-full max-w-md mx-auto">
          {view === 'login' && (
            <Card className="bg-[#2A2B5E]/80 backdrop-blur-sm border border-cyan-500/20 shadow-2xl">
              <CardHeader className="text-center space-y-4">
                <div className="lg:hidden">
                  <img 
                    src={nexlinxLogo} 
                    alt="Nexlinx Networks" 
                    className="w-20 h-20 mx-auto mb-4"
                  />
                </div>
                <CardTitle className="text-2xl lg:text-3xl font-bold text-white">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Sign in to access your dashboard
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                      <AlertDescription className="text-red-200">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-gray-200 font-medium">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-[#1A1B3E]/50 border-cyan-500/30 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20"
                      placeholder="Enter your username"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-200 font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-[#1A1B3E]/50 border-cyan-500/30 text-white placeholder-gray-400 focus:border-cyan-400 focus:ring-cyan-400/20 pr-10"
                        placeholder="Enter your password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400 hover:text-white" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400 hover:text-white" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-md transition-all duration-300 transform hover:scale-105"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-5 w-5 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
                
                <div className="flex justify-center">
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => setView('reset')}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    <Key className="h-4 w-4 mr-1" />
                    Forgot Password?
                  </Button>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    Powered by Nexlinx Networks
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {view === 'reset' && (
            <PasswordResetForm onBack={handleBackToLogin} />
          )}

          {view === 'first-time' && firstTimeUser && (
            <FirstTimePasswordForm 
              userId={firstTimeUser.userId}
              username={firstTimeUser.username}
              onSuccess={handleFirstTimePasswordSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}