import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Server, Activity, ServerNote, Location } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import TransferModal from "@/components/TransferModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import EditServerModal from "@/components/EditServerModal";
import { formatDate } from "@/lib/utils";

export default function ServerDetail() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [noteText, setNoteText] = useState("");
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  
  const { data: server, isLoading, error } = useQuery<Server>({
    queryKey: [`/api/servers/${id}`],
  });
  
  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: [`/api/servers/${id}/activities`],
    enabled: !!server,
  });
  
  const { data: location } = useQuery<Location>({
    queryKey: [`/api/locations/${server?.locationId}`],
    enabled: !!server && !!server.locationId,
  });
  
  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!user || !user.id) {
        throw new Error("Oturum açmış kullanıcı bulunamadı");
      }
      await apiRequest('POST', `/api/servers/${id}/notes`, { 
        note,
        createdBy: user.id 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/servers/${id}/notes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/servers/${id}/activities`] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      toast({
        title: "Not eklendi",
        description: "Sunucu için yeni not başarıyla eklendi.",
      });
      
      setNoteText("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Not eklenirken bir hata oluştu.",
      });
    }
  });
  
  const deleteServerMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/servers/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Sunucu silindi",
        description: "Sunucu başarıyla silindi.",
      });
      
      navigate("/servers");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sunucu silinirken bir hata oluştu.",
      });
    }
  });
  
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sunucu bilgileri yüklenirken bir hata oluştu.",
      });
    }
  }, [error, toast]);
  
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteText.trim()) {
      addNoteMutation.mutate(noteText);
    }
  };
  
  const handleDelete = () => {
    deleteServerMutation.mutate();
  };
  
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
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
      case 'maintenance':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Bakımda
          </span>
        );
      default:
        return null;
    }
  };
  
  const getActivityIcon = (type?: string) => {
    if (!type) return null;
    
    switch(type) {
      case 'add':
        return (
          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center ring-8 ring-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </span>
        );
      case 'transfer':
        return (
          <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </span>
        );
      case 'note':
        return (
          <span className="h-8 w-8 rounded-full bg-yellow-500 flex items-center justify-center ring-8 ring-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </span>
        );
      case 'maintenance':
        return (
          <span className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center ring-8 ring-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </span>
        );
      default:
        return (
          <span className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center ring-8 ring-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </span>
        );
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }
  
  if (!server) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Sunucu bulunamadı.</div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center mb-6">
        <button onClick={() => navigate("/servers")} className="mr-4 text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Sunucu Detayları: {server.serverId}
          </h2>
          <p className="mt-1 text-sm text-gray-500">{server.model}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Server Details */}
        <div className="md:col-span-2 bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Sunucu Bilgileri</h3>
          </div>
          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Sunucu ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{server.serverId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Model</dt>
                <dd className="mt-1 text-sm text-gray-900">{server.model}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Teknik Özellikler</dt>
                <dd className="mt-1 text-sm text-gray-900">{server.specs}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Lokasyon</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {location ? location.name : `Lokasyon #${server.locationId}`}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">IP Adresi</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {server.ipAddress || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Kullanıcı Adı</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {server.username || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Şifre</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {server.password ? "••••••••" : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Durum</dt>
                <dd className="mt-1 text-sm">
                  {getStatusBadge(server.status)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Ekleme Tarihi</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(server.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
          <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200 flex space-x-3">
            <button 
              onClick={() => setTransferModalOpen(true)} 
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Transfer Et
            </button>
            <button 
              onClick={() => setEditModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Düzenle
            </button>
            <button 
              onClick={() => setConfirmDeleteModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Sil
            </button>
          </div>
        </div>

        {/* Notes and Activity */}
        <div className="md:col-span-1 space-y-6">
          {/* Add Note */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Not Ekle</h3>
            </div>
            <form onSubmit={handleAddNote} className="px-4 py-5 sm:p-6">
              <textarea 
                rows={4} 
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="shadow-sm block w-full focus:ring-primary-500 focus:border-primary-500 sm:text-sm border border-gray-300 rounded-md" 
                placeholder="Sunucu ile ilgili not ekleyin..."
              />
              <div className="mt-4 flex justify-end">
                <button 
                  type="submit" 
                  disabled={addNoteMutation.isPending || !noteText.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addNoteMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>

          {/* Server History */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Geçmiş Hareketler</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
              {activitiesLoading ? (
                <div className="text-center text-gray-500">Yükleniyor...</div>
              ) : activities && activities.length > 0 ? (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {activities.map((activity, idx) => (
                      <li key={activity.id}>
                        <div className="relative pb-8">
                          {idx !== activities.length - 1 && (
                            <span 
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" 
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  {activity.description}
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time dateTime={activity.createdAt.toString()}>
                                  {formatDate(activity.createdAt)}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center text-gray-500">Henüz aktivite bulunmuyor</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <TransferModal 
        isOpen={transferModalOpen} 
        onClose={() => setTransferModalOpen(false)} 
        server={server}
      />
      
      <DeleteConfirmModal 
        isOpen={confirmDeleteModalOpen} 
        onClose={() => setConfirmDeleteModalOpen(false)} 
        onConfirm={handleDelete}
        isDeleting={deleteServerMutation.isPending}
      />
      
      <EditServerModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        server={server}
      />
    </div>
  );
}
