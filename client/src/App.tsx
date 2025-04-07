import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Servers from "@/pages/Servers";
import ServerDetail from "@/pages/ServerDetail";
import Locations from "@/pages/Locations";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Profile from "@/pages/Profile";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { Loader2, Settings, LogOut, UserCog, Shield } from "lucide-react";
import AuthPage from "@/pages/auth-page";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

// Protect routes to require authentication
const ProtectedRoute = ({
  path,
  component: Component,
}: {
  path: string;
  component: React.FC;
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  return (
    <Route path={path}>
      {user ? <Component /> : <Redirect to="/auth" />}
    </Route>
  );
};

function Router() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  
  return (
    <div className="h-screen flex overflow-hidden">
      {user && (
        <>
          {/* Mobile backdrop */}
          {sidebarOpen && (
            <div 
              className="md:hidden fixed inset-0 z-40 bg-black/20" 
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* Sidebar */}
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </>
      )}
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        {user && (
          <header className="bg-white shadow-sm z-10">
            <div className="px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
              <div className="flex items-center">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)} 
                  className="md:hidden p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="hidden md:block ml-2 h-5 w-px bg-gray-300 mx-3"></div>
                <h1 className="hidden md:block text-gradient text-lg font-semibold">
                  Sunucu Envanter Yönetimi
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden md:flex items-center px-3 py-1 bg-primary/5 text-primary rounded-full text-xs font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Son Güncelleme: {new Date().toLocaleDateString('tr-TR')}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="mr-1">{user.username}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <a 
                        href="/profile"
                        className="flex items-center"
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.pushState(null, "", "/profile");
                          window.dispatchEvent(new Event("popstate"));
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Profil Ayarları
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600 cursor-pointer flex items-center"
                      onClick={() => logoutMutation.mutate()}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
        )}
        
        {/* Main content area */}
        <main className={`flex-1 overflow-y-auto bg-gray-50 ${user ? 'p-4 sm:p-6 lg:p-8' : 'p-0'}`}>
          <Switch>
            <Route path="/auth" component={AuthPage} />
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/servers" component={Servers} />
            <ProtectedRoute path="/servers/:id" component={ServerDetail} />
            <ProtectedRoute path="/locations" component={Locations} />
            <ProtectedRoute path="/reports" component={Reports} />
            <ProtectedRoute path="/profile" component={Profile} />
            <ProtectedRoute path="/users" component={Users} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter>
          <Router />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
