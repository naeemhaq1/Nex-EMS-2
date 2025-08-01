import { useAuth } from "@/contexts/AuthContext";

export function useUser() {
  const { user, loading, login, logout } = useAuth();
  
  return {
    user,
    loading,
    login,
    logout,
  };
}