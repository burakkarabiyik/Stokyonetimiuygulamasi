import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import StatsCard from "@/components/StatsCard";
import { Server, Activity, ServerStatus } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Server as ServerIcon, CircleCheck, Truck, RotateCw } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<any>({
    queryKey: ['/api/stats'],
  });
  
  const { data: recentServers, isLoading: serversLoading, error: serversError } = useQuery<Server[]>({
    queryKey: ['/api/servers'],
  });
  
  const { data: activities, isLoading: activitiesLoading, error: activitiesError } = useQuery<Activity[]>({
    queryKey: ['/api/activities?limit=5'],
  });
  
  if (statsError || serversError || activitiesError) {
    toast({
      variant: "destructive",
      title: "Hata",
      description: "Veriler yüklenirken bir hata oluştu."
    });
  }
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Aktif
          </span>
        );
      case 'transit':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Transfer Sürecinde
          </span>
        );
      case 'setup':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Kurulumda
          </span>
        );
      case 'maintenance': // Backward compatibility
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Kurulumda
          </span>
        );
      default:
        return null;
    }
  };
  
  const getActivityIcon = (type: string) => {
    switch(type) {
      case 'add':
        return (
          <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
        );
      case 'transfer':
        return (
          <span className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </span>
        );
      case 'maintenance':
      case 'setup':
        return (
          <span className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
        );
      case 'note':
        return (
          <span className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </span>
        );
      case 'delete':
        return (
          <span className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </span>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-gradient">Sunucu Yönetim Paneli</h1>
          <p className="mt-2 text-gray-600">Depo ve sunucu durumlarına genel bakış</p>
        </div>
        
        <div className="flex gap-2">
          <Link to="/servers">
            <button className="btn-primary">
              <ServerIcon className="mr-2 h-4 w-4" />
              Sunucuları Görüntüle
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-8">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon bg-blue-50">
            <ServerIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="dashboard-stat-info">
            <div className="dashboard-stat-value">{statsLoading ? "..." : stats?.total || "0"}</div>
            <div className="dashboard-stat-label">Toplam Sunucu</div>
          </div>
        </div>
        
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon bg-emerald-50">
            <CircleCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="dashboard-stat-info">
            <div className="dashboard-stat-value">{statsLoading ? "..." : stats?.active || "0"}</div>
            <div className="dashboard-stat-label">Aktif Sunucular</div>
          </div>
        </div>
        
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon bg-amber-50">
            <Truck className="h-6 w-6 text-amber-600" />
          </div>
          <div className="dashboard-stat-info">
            <div className="dashboard-stat-value">{statsLoading ? "..." : stats?.transit || "0"}</div>
            <div className="dashboard-stat-label">Transfer Sürecinde</div>
          </div>
        </div>
        
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon bg-purple-50">
            <RotateCw className="h-6 w-6 text-purple-600" />
          </div>
          <div className="dashboard-stat-info">
            <div className="dashboard-stat-value">{statsLoading ? "..." : stats?.setup || "0"}</div>
            <div className="dashboard-stat-label">Kurulumda</div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Server List Section */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-1 card p-0">
          <div className="p-4 border-b border-gray-200">
            <h3 className="section-header mb-0">Son Aktiviteler</h3>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {activitiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : activities && activities.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {activities.map(activity => (
                  <li key={activity.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">Henüz aktivite bulunmuyor</p>
              </div>
            )}
          </div>
        </div>

        {/* Server List */}
        <div className="lg:col-span-2 card p-0">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="section-header mb-0">Son Eklenen Sunucular</h3>
            <Link to="/servers">
              <button className="btn-secondary py-1 px-3 h-8 text-xs">
                Tümünü Gör
              </button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            {serversLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentServers && recentServers.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Model</th>
                    <th>Lokasyon</th>
                    <th>Durum</th>
                    <th>Ekleme Tarihi</th>
                  </tr>
                </thead>
                <tbody>
                  {recentServers.slice(0, 4).map(server => (
                    <tr key={server.id} className="hover:bg-gray-50">
                      <td className="font-medium">
                        <Link to={`/servers/${server.id}`} className="text-primary hover:text-primary/90">
                          {server.serverId}
                        </Link>
                      </td>
                      <td>{server.model}</td>
                      <td>
                        {server.locationId && (
                          <span>Lokasyon #{server.locationId}</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          server.status === 'active' ? 'status-active' :
                          server.status === 'transit' ? 'status-transit' :
                          server.status === 'setup' ? 'status-setup' :
                          server.status === 'shippable' ? 'status-shippable' :
                          'status-passive'
                        }`}>
                          {server.status === 'active' ? 'Aktif' :
                           server.status === 'transit' ? 'Transferde' :
                           server.status === 'setup' ? 'Kurulumda' :
                           server.status === 'shippable' ? 'Gönderilebilir' :
                           'Pasif'}
                        </span>
                      </td>
                      <td>{formatDate(server.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <ServerIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">Henüz sunucu bulunmuyor</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
