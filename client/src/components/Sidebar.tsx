import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Server,
  MapPin,
  PieChart,
  Settings,
  LogOut,
  UserCog,
  Shield,
  User
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const isActive = (path: string) => {
    return location === path;
  };
  
  // Ana menü seçenekleri
  const navItems = [
    {
      name: "Yönetim Paneli",
      path: "/",
      icon: <LayoutDashboard className="h-5 w-5" />
    },
    {
      name: "Tüm Sunucular",
      path: "/servers",
      icon: <Server className="h-5 w-5" />
    },
    {
      name: "Lokasyonlar",
      path: "/locations",
      icon: <MapPin className="h-5 w-5" />
    },
    {
      name: "Grafiksel Raporlar",
      path: "/reports",
      icon: <PieChart className="h-5 w-5" />
    }
  ];
  
  // Kullanıcı ayarları menüsü
  const userItems = [
    {
      name: "Profil Ayarları",
      path: "/profile",
      icon: <Settings className="h-5 w-5" />
    }
  ];
  
  // Yönetici seçenekleri (sadece admin kullanıcıları için)
  const adminItems = user?.role === UserRole.ADMIN ? [
    {
      name: "Kullanıcı Yönetimi",
      path: "/users",
      icon: <UserCog className="h-5 w-5" />
    }
  ] : [];
  
  return (
    <div 
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-100 transform transition-transform duration-300 md:translate-x-0 md:static md:z-auto ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
          <div className="flex items-center">
            <Server className="h-7 w-7 text-primary" strokeWidth={1.5} />
            <span className="ml-2 text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">ServerTrack</span>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Ana Menü */}
          <div className="px-3 py-4">
            <div className="mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Ana Menü
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <a 
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary border-l-2 border-primary'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                  } transition-colors`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, "", item.path);
                    window.dispatchEvent(new Event("popstate"));
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                >
                  <span className={`mr-3 ${isActive(item.path) ? 'text-primary' : 'text-gray-500'}`}>{item.icon}</span>
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
          
          {/* Kullanıcı Ayarları */}
          <div className="px-3 py-2">
            <div className="mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Kullanıcı
            </div>
            <nav className="space-y-1">
              {userItems.map((item) => (
                <a 
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary border-l-2 border-primary'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                  } transition-colors`}
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.pushState(null, "", item.path);
                    window.dispatchEvent(new Event("popstate"));
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                >
                  <span className={`mr-3 ${isActive(item.path) ? 'text-primary' : 'text-gray-500'}`}>{item.icon}</span>
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
          
          {/* Yönetici Menüsü (Sadece yöneticiler için görünür) */}
          {adminItems.length > 0 && (
            <div className="px-3 py-2">
              <div className="mb-2 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center">
                <Shield className="h-3 w-3 mr-1 text-primary" />
                Yönetici
              </div>
              <nav className="space-y-1">
                {adminItems.map((item) => (
                  <a 
                    key={item.path}
                    href={item.path}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md ${
                      isActive(item.path)
                        ? 'bg-primary-50 text-primary border-l-2 border-primary'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
                    } transition-colors`}
                    onClick={(e) => {
                      e.preventDefault();
                      window.history.pushState(null, "", item.path);
                      window.dispatchEvent(new Event("popstate"));
                      if (window.innerWidth < 768) {
                        onClose();
                      }
                    }}
                  >
                    <span className={`mr-3 ${isActive(item.path) ? 'text-primary' : 'text-gray-500'}`}>{item.icon}</span>
                    {item.name}
                  </a>
                ))}
              </nav>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-100">
          <button 
            className="flex items-center px-3 py-2 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Çıkış Yap
          </button>
          
          {/* Kullanıcı bilgileri */}
          {user && (
            <div className="mt-3 px-3 py-2 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate flex items-center">
                    {user.role === UserRole.ADMIN ? (
                      <>
                        <Shield className="h-3 w-3 mr-1 text-primary" />
                        <span>Yönetici</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3 mr-1 text-gray-500" />
                        <span>Kullanıcı</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
