import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Server } from "@shared/schema";
import AddServerModal from "@/components/AddServerModal";
import TransferModal from "@/components/TransferModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";

export default function Servers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  
  const [addServerModalOpen, setAddServerModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  
  const { data: servers, isLoading, error } = useQuery<Server[]>({
    queryKey: ['/api/servers'],
  });
  
  const deleteServerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/servers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      toast({
        title: "Başarılı",
        description: "Sunucu başarıyla silindi.",
      });
      
      setConfirmDeleteModalOpen(false);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sunucu silinirken bir hata oluştu.",
      });
    }
  });
  
  if (error) {
    toast({
      variant: "destructive",
      title: "Hata",
      description: "Sunucular yüklenirken bir hata oluştu.",
    });
  }
  
  const handleTransferClick = (server: Server) => {
    setSelectedServer(server);
    setTransferModalOpen(true);
  };
  
  const handleDeleteClick = (server: Server) => {
    setSelectedServer(server);
    setConfirmDeleteModalOpen(true);
  };
  
  const confirmDelete = () => {
    if (selectedServer) {
      deleteServerMutation.mutate(selectedServer.id);
    }
  };
  
  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setLocationFilter("");
    setDateFilter("");
  };
  
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
  
  // Apply filters
  const filteredServers = servers?.filter(server => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      server.serverId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.specs.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === "" || server.status === statusFilter;
    
    // Location filter
    const matchesLocation = locationFilter === "" || server.location === locationFilter;
    
    // Date filter (simplified for example)
    let matchesDate = true;
    const today = new Date();
    const serverDate = new Date(server.createdAt);
    
    if (dateFilter === "today") {
      matchesDate = serverDate.toDateString() === today.toDateString();
    } else if (dateFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      matchesDate = serverDate >= weekAgo;
    } else if (dateFilter === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(today.getMonth() - 1);
      matchesDate = serverDate >= monthAgo;
    }
    
    return matchesSearch && matchesStatus && matchesLocation && matchesDate;
  }) || [];
  
  // Get unique locations for filter
  const locations = servers ? [...new Set(servers.map(server => server.location))] : [];
  
  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Tüm Sunucular</h2>
          <p className="mt-1 text-sm text-gray-500">Sistemdeki tüm sunucuların listesi</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md pl-10" 
              placeholder="Sunucu Ara..."
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <button 
            onClick={() => setAddServerModalOpen(true)} 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Sunucu Ekle
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4">
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Durum</label>
          <select 
            id="status-filter" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option value="">Tümü</option>
            <option value="active">Aktif</option>
            <option value="transit">Transfer Sürecinde</option>
            <option value="maintenance">Bakımda</option>
          </select>
        </div>
        <div>
          <label htmlFor="location-filter" className="block text-sm font-medium text-gray-700">Lokasyon</label>
          <select 
            id="location-filter" 
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option value="">Tümü</option>
            {locations.map((location, index) => (
              <option key={index} value={location}>{location}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700">Tarih</label>
          <select 
            id="date-filter" 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option value="">Tümü</option>
            <option value="today">Bugün</option>
            <option value="week">Bu Hafta</option>
            <option value="month">Bu Ay</option>
          </select>
        </div>
        <div className="flex items-end">
          <button 
            onClick={resetFilters}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>

      {/* Server Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
          ) : filteredServers.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Özellikler</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasyon</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ekleme Tarihi</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServers.map(server => (
                  <tr key={server.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link to={`/servers/${server.id}`} className="text-primary-600 hover:text-primary-900">
                        {server.serverId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{server.model}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{server.specs}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{server.location}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(server.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(server.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleTransferClick(server)} 
                          className="text-blue-600 hover:text-blue-900" 
                          title="Transfer Et"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                        <Link to={`/servers/${server.id}`}>
                          <button className="text-gray-600 hover:text-gray-900" title="Görüntüle">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </Link>
                        <button 
                          onClick={() => handleDeleteClick(server)} 
                          className="text-red-600 hover:text-red-900" 
                          title="Sil"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {searchQuery || statusFilter || locationFilter || dateFilter ? 
                "Filtrelere uygun sunucu bulunamadı." : 
                "Henüz sunucu bulunmuyor."}
            </div>
          )}
        </div>

        {/* Pagination - Simple implementation */}
        {filteredServers.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Önceki
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Sonraki
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Toplam <span className="font-medium">{filteredServers.length}</span> sunucu
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span className="sr-only">Önceki</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button aria-current="page" className="z-10 bg-primary-50 border-primary-500 text-primary-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                    1
                  </button>
                  <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                    <span className="sr-only">Sonraki</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddServerModal 
        isOpen={addServerModalOpen} 
        onClose={() => setAddServerModalOpen(false)} 
      />
      
      {selectedServer && (
        <TransferModal 
          isOpen={transferModalOpen} 
          onClose={() => setTransferModalOpen(false)} 
          server={selectedServer}
        />
      )}
      
      {selectedServer && (
        <DeleteConfirmModal 
          isOpen={confirmDeleteModalOpen} 
          onClose={() => setConfirmDeleteModalOpen(false)} 
          onConfirm={confirmDelete}
          isDeleting={deleteServerMutation.isPending}
        />
      )}
    </div>
  );
}
