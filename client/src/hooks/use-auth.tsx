import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient
} from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Interface for login data
type LoginData = {
  username: string;
  password: string;
};

// Auth context type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  token: string | null;
  setToken: (token: string | null) => void;
  loginMutation: UseMutationResult<{ user: User; token: string }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
};

// Create auth context
export const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(localStorage.getItem('jwt_token'));

  // Custom fetch function with token
  const fetchWithToken = async () => {
    if (!token) return null;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    try {
      const response = await fetch('/api/user', { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, clear it
          setToken(null);
          localStorage.removeItem('jwt_token');
          return null;
        }
        throw new Error(`Sunucu hatası: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error("Kullanıcı bilgisi alınamadı:", error);
      return null;
    }
  };

  // Get current user query
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user", token],
    queryFn: fetchWithToken,
    enabled: !!token,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: { user: User; token: string }) => {
      // Save token to localStorage
      localStorage.setItem('jwt_token', data.token);
      setToken(data.token);
      
      // Update user data in query cache
      queryClient.setQueryData(["/api/user", data.token], data.user);
      
      toast({
        title: "Giriş başarılı",
        description: `Hoş geldiniz, ${data.user.fullName || data.user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Giriş başarısız",
        description: error.message || "Kullanıcı adı veya şifre hatalı",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (user: User) => {
      toast({
        title: "Kayıt başarılı",
        description: `Kullanıcı ${user.username} başarıyla oluşturuldu.`,
      });
      
      // Invalidate users query if it exists
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Kayıt başarısız",
        description: error.message || "Kullanıcı oluşturulamadı",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // JWT is stateless, so we don't need to call the server to logout
      // Just remove the token from localStorage and state
      localStorage.removeItem('jwt_token');
      setToken(null);
    },
    onSuccess: () => {
      // Clear user data from query cache
      queryClient.setQueryData(["/api/user", token], null);
      
      toast({
        title: "Çıkış yapıldı",
        description: "Başarıyla çıkış yaptınız.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Çıkış başarısız",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update token in localStorage when it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('jwt_token', token);
    } else {
      localStorage.removeItem('jwt_token');
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        token,
        setToken,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Auth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}