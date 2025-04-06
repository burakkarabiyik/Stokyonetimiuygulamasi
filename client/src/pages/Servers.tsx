import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Server, ServerStatus, Location } from "@shared/schema";
import AddServerModal from "@/components/AddServerModal";
import TransferModal from "@/components/TransferModal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import EditServerModal from "@/components/EditServerModal";
import { queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { 
  Search,
  Filter,
  RefreshCw,
  PlusCircle,
  Server as ServerIcon,
  FileText,
  Edit, 
  Trash2,
  MoveRight,
  SlidersHorizontal,
  X,
  MapPin,
  User,
  LogOut,
  Settings
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function Servers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Server operation modals
  const [addServerModalOpen, setAddServerModalOpen] = useState(false);
  const [editServerModalOpen, setEditServerModalOpen] = useState(false); 
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [confirmDeleteModalOpen, setConfirmDeleteModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  
  // API queries
  const { data: servers, isLoading, error } = useQuery<Server[]>({
    queryKey: ['/api/servers'],
  });
  
  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });
  
  // API mutations
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
  
  // Event handlers
  const handleEditClick = (server: Server) => {
    setSelectedServer(server);
    setEditServerModalOpen(true);
  };
  
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
    setStatusFilter("all");
    setLocationFilter("all");
  };
  
  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch(status) {
      case ServerStatus.ACTIVE:
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Aktif</Badge>;
      case ServerStatus.TRANSIT:
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">Transferde</Badge>;
      case ServerStatus.SETUP:
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Kurulumda</Badge>;
      case ServerStatus.SHIPPABLE:
        return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">Gönderilebilir</Badge>;
      case ServerStatus.PASSIVE:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Pasif</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Apply filters
  const filteredServers = servers?.filter(server => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      server.serverId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.specs.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === "all" || server.status === statusFilter;
    
    // Location filter
    const matchesLocation = locationFilter === "all" || server.locationId.toString() === locationFilter;
    
    return matchesSearch && matchesStatus && matchesLocation;
  }) || [];
  
  // Get location name helper
  const getLocationName = (locationId: number) => {
    const location = locations?.find(loc => loc.id === locationId);
    return location ? location.name : `Lokasyon #${locationId}`;
  };
  
  // Render main content
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sunucu Yönetimi</h1>
          <p className="text-muted-foreground">Envanterdeki sunucuları görüntüleyin ve yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setAddServerModalOpen(true)}
            className="gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Yeni Sunucu</span>
          </Button>
        </div>
      </div>
      
      {/* Filter and search bar */}
      <Card>
        <CardHeader className="px-5 py-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-medium">Filtreler ve Arama</CardTitle>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-secondary' : ''}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              </svg>
              <span className="sr-only">Grid görünümü</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-secondary' : ''}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="sr-only">Liste görünümü</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 py-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Sunucu ara..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Durum seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value={ServerStatus.ACTIVE}>Aktif</SelectItem>
                <SelectItem value={ServerStatus.TRANSIT}>Transferde</SelectItem>
                <SelectItem value={ServerStatus.SETUP}>Kurulumda</SelectItem>
                <SelectItem value={ServerStatus.SHIPPABLE}>Gönderilebilir</SelectItem>
                <SelectItem value={ServerStatus.PASSIVE}>Pasif</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Lokasyon seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Lokasyonlar</SelectItem>
                {locations?.map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(searchQuery || statusFilter !== "all" || locationFilter !== "all") && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                {filteredServers.length} sonuç bulundu
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters}
                className="h-8 gap-1 text-xs"
              >
                <X className="h-3.5 w-3.5" />
                <span>Filtreleri Temizle</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Server Content */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredServers.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredServers.map(server => (
                <Card key={server.id} className="overflow-hidden">
                  <CardHeader className="p-4 pb-2 space-y-0">
                    <div className="flex justify-between items-start">
                      <Link to={`/servers/${server.id}`} className="group">
                        <h3 className="text-base font-medium group-hover:underline group-hover:text-primary truncate">
                          {server.serverId}
                        </h3>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="sr-only">İşlemler</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <Link to={`/servers/${server.id}`} className="w-full">
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              <span>Detayları Görüntüle</span>
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem onClick={() => handleEditClick(server)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Düzenle</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTransferClick(server)}>
                            <MoveRight className="mr-2 h-4 w-4" />
                            <span>Transfer Et</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(server)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Sil</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{server.model}</p>
                  </CardHeader>
                  <CardContent className="px-4 py-2 space-y-3">
                    <div className="flex items-center gap-2">
                      <ServerIcon className="text-muted-foreground h-4 w-4" />
                      <span className="text-xs truncate">{server.specs}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        <span>{getLocationName(server.locationId)}</span>
                      </div>
                      {getStatusBadge(server.status)}
                    </div>
                  </CardContent>
                  <CardFooter className="px-4 py-3 border-t bg-muted/50 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between w-full">
                      <span>Eklenme: {formatDate(server.createdAt)}</span>
                      <span>{server.ipAddress ? "IP: " + server.ipAddress : "IP yok"}</span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Sunucu ID</th>
                      <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Model</th>
                      <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">IP Adresi</th>
                      <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Lokasyon</th>
                      <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Durum</th>
                      <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Tarih</th>
                      <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServers.map(server => (
                      <tr key={server.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4 align-middle">
                          <Link 
                            to={`/servers/${server.id}`} 
                            className="font-medium hover:underline text-primary"
                          >
                            {server.serverId}
                          </Link>
                        </td>
                        <td className="p-4 align-middle">{server.model}</td>
                        <td className="p-4 align-middle">{server.ipAddress || "-"}</td>
                        <td className="p-4 align-middle">{getLocationName(server.locationId)}</td>
                        <td className="p-4 align-middle">{getStatusBadge(server.status)}</td>
                        <td className="p-4 align-middle text-sm text-muted-foreground">
                          {formatDate(server.createdAt)}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-1">
                            <Link to={`/servers/${server.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <FileText className="h-4 w-4" />
                                <span className="sr-only">Detaylar</span>
                              </Button>
                            </Link>
                            <Button 
                              onClick={() => handleEditClick(server)} 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Düzenle</span>
                            </Button>
                            <Button 
                              onClick={() => handleTransferClick(server)} 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoveRight className="h-4 w-4" />
                              <span className="sr-only">Transfer</span>
                            </Button>
                            <Button 
                              onClick={() => handleDeleteClick(server)} 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Sil</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        ) : (
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <ServerIcon className="h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Sunucu Bulunamadı</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" || locationFilter !== "all"
                ? "Arama kriterlerinize uygun sonuç bulunamadı."
                : "Sisteme henüz sunucu eklenmemiş."}
            </p>
            <Button onClick={() => setAddServerModalOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Yeni Sunucu Ekle
            </Button>
          </Card>
        )}
      </div>
      
      {/* Modals */}
      <AddServerModal 
        isOpen={addServerModalOpen} 
        onClose={() => setAddServerModalOpen(false)} 
      />
      
      {selectedServer && (
        <>
          <EditServerModal
            isOpen={editServerModalOpen}
            onClose={() => setEditServerModalOpen(false)}
            server={selectedServer}
          />
          
          <TransferModal 
            isOpen={transferModalOpen} 
            onClose={() => setTransferModalOpen(false)} 
            server={selectedServer}
          />
        </>
      )}
      
      <DeleteConfirmModal 
        isOpen={confirmDeleteModalOpen} 
        onClose={() => setConfirmDeleteModalOpen(false)} 
        onConfirm={confirmDelete}
        isDeleting={deleteServerMutation.isPending}
      />
    </div>
  );
}