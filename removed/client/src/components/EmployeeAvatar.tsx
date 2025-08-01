import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, User } from 'lucide-react';

interface EmployeeAvatarProps {
  employeeId?: number;
  employeeCode?: string;
  employeeName?: string;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showInitials?: boolean;
  showVerification?: boolean;
  hasPhone?: boolean;
  hasCnic?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
  xl: 'h-12 w-12 text-lg'
};

function EmployeeAvatar({
  employeeId,
  employeeCode,
  employeeName,
  email,
  size = 'md',
  showInitials = true,
  showVerification = false,
  hasPhone = false,
  hasCnic = false,
  className = ''
}: EmployeeAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchAvatar = async () => {
      if (!employeeId && !employeeCode) return;
      
      setIsLoading(true);
      setHasError(false);
      
      try {
        const params = new URLSearchParams();
        if (employeeId) params.append('employeeId', employeeId.toString());
        if (employeeCode) params.append('employeeCode', employeeCode);
        if (email) params.append('email', email);
        
        const response = await fetch(`/api/avatar?${params}`);
        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.avatarUrl);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.error('Error fetching avatar:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvatar();
  }, [employeeId, employeeCode, email]);

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getVerificationStatus = () => {
    if (!showVerification) return null;
    
    const isVerified = hasPhone && hasCnic;
    const missingItems = [];
    if (!hasCnic) missingItems.push('CNIC');
    if (!hasPhone) missingItems.push('Phone');
    
    return {
      isVerified,
      missingItems,
      title: isVerified ? 'Verified Employee' : `Missing: ${missingItems.join(', ')}`
    };
  };

  const verification = getVerificationStatus();

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      <div className="flex-shrink-0">
        <Avatar className={sizeClasses[size]}>
          {!hasError && avatarUrl && (
            <AvatarImage 
              src={avatarUrl} 
              alt={employeeName || 'Employee'}
              onError={() => setHasError(true)}
            />
          )}
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : showInitials && employeeName ? (
              getInitials(employeeName)
            ) : (
              <User className="h-4 w-4" />
            )}
          </AvatarFallback>
        </Avatar>
      </div>
      
      {verification && (
        <div className="flex items-center gap-1">
          {verification.isVerified ? (
            <Badge 
              variant="secondary" 
              className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1.5 py-0.5 text-xs"
              title={verification.title}
            >
              <Check className="h-3 w-3" />
            </Badge>
          ) : (
            <Badge 
              variant="destructive" 
              className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-1.5 py-0.5 text-xs"
              title={verification.title}
            >
              <AlertTriangle className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export { EmployeeAvatar };
export default EmployeeAvatar;