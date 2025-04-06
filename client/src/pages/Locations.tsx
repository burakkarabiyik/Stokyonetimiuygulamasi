import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationType } from "@shared/schema";
import { useForm } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";

interface Location {
  id: number;
  name: string;
  type: string;
  address: string | null;
  capacity: number;
  isActive: boolean;
  createdAt: string;
}

interface LocationFormData {
  name: string;
  type: string;
  address: string;
  capacity: number;
  isActive: boolean;
}

export default function Locations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Fetch locations
  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    refetchOnWindowFocus: false,
  });

  // Add location mutation
  const addLocationMutation = useMutation({
    mutationFn: async (data: LocationFormData) => {
      const res = await apiRequest("POST", "/api/locations", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Lokasyon eklendi",
        description: "Yeni lokasyon başarıyla eklendi",
      });
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Lokasyon eklenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Edit location mutation
  const editLocationMutation = useMutation({
    mutationFn: async (data: LocationFormData & { id: number }) => {
      const { id, ...locationData } = data;
      const res = await apiRequest("PUT", `/api/locations/${id}`, locationData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Lokasyon güncellendi",
        description: "Lokasyon bilgileri başarıyla güncellendi",
      });
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Lokasyon güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/locations/${id}`);
      if (res.status === 204) {
        return { success: true };
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Lokasyon silindi",
        description: "Lokasyon başarıyla silindi",
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Lokasyon silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Add location form
  const addForm = useForm<LocationFormData>({
    defaultValues: {
      name: "",
      type: LocationType.DEPOT,
      address: "",
      capacity: 10,
      isActive: true,
    },
  });

  // Edit location form
  const editForm = useForm<LocationFormData & { id: number }>({
    defaultValues: {
      id: 0,
      name: "",
      type: LocationType.DEPOT,
      address: "",
      capacity: 10,
      isActive: true,
    },
  });

  // Handle add form submit
  const handleAddSubmit = (data: LocationFormData) => {
    addLocationMutation.mutate(data);
  };

  // Handle edit form submit
  const handleEditSubmit = (data: LocationFormData & { id: number }) => {
    editLocationMutation.mutate(data);
  };

  // Handle edit button click
  const handleEditClick = (location: Location) => {
    setSelectedLocation(location);
    editForm.reset({
      id: location.id,
      name: location.name,
      type: location.type,
      address: location.address || "",
      capacity: location.capacity,
      isActive: location.isActive,
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (location: Location) => {
    setSelectedLocation(location);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete confirm
  const handleDeleteConfirm = () => {
    if (selectedLocation) {
      deleteLocationMutation.mutate(selectedLocation.id);
    }
  };

  // Filter locations by type
  const filteredLocations = locations.filter((location) => {
    if (activeTab === "all") return true;
    return location.type === activeTab;
  });

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case LocationType.DEPOT:
        return "Depo";
      case LocationType.OFFICE:
        return "Ofis";
      case LocationType.FIELD:
        return "Saha";
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Lokasyonlar</h1>
        {isAdmin && (
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Yeni Lokasyon Ekle
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">Tümü</TabsTrigger>
          <TabsTrigger value={LocationType.DEPOT}>Depolar</TabsTrigger>
          <TabsTrigger value={LocationType.OFFICE}>Ofisler</TabsTrigger>
          <TabsTrigger value={LocationType.FIELD}>Sahalar</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-lg shadow">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-800">
                Lokasyon bulunamadı
              </h3>
              <p className="mt-2 text-gray-500">
                Seçilen türde lokasyon bulunmamaktadır.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredLocations.map((location) => (
                <Card key={location.id} className={location.isActive ? "" : "opacity-60"}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{location.name}</CardTitle>
                      <div className="flex space-x-1">
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(location)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => handleDeleteClick(location)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Tür:</span>
                        <span className="font-medium">{getLocationTypeLabel(location.type)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Kapasite:</span>
                        <span className="font-medium">{location.capacity} sunucu</span>
                      </div>
                      {location.address && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Adres:</span>
                          <span className="font-medium max-w-[200px] truncate">
                            {location.address}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Durum:</span>
                        <span
                          className={`font-medium ${
                            location.isActive ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {location.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Location Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Lokasyon Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddSubmit)}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Lokasyon Adı</Label>
                <Input id="name" {...addForm.register("name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Tür</Label>
                <Select
                  defaultValue={LocationType.DEPOT}
                  onValueChange={(value) => addForm.setValue("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lokasyon türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LocationType.DEPOT}>Depo</SelectItem>
                    <SelectItem value={LocationType.OFFICE}>Ofis</SelectItem>
                    <SelectItem value={LocationType.FIELD}>Saha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adres (İsteğe Bağlı)</Label>
                <Input id="address" {...addForm.register("address")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Kapasite (Sunucu Sayısı)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  {...addForm.register("capacity", { valueAsNumber: true })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  defaultChecked
                  onCheckedChange={(checked) => addForm.setValue("isActive", checked)}
                />
                <Label htmlFor="isActive">Aktif</Label>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                İptal
              </Button>
              <Button type="submit" disabled={addLocationMutation.isPending}>
                {addLocationMutation.isPending ? "Ekleniyor..." : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lokasyon Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Lokasyon Adı</Label>
                <Input id="edit-name" {...editForm.register("name")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Tür</Label>
                <Select
                  defaultValue={editForm.getValues("type")}
                  onValueChange={(value) => editForm.setValue("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Lokasyon türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LocationType.DEPOT}>Depo</SelectItem>
                    <SelectItem value={LocationType.OFFICE}>Ofis</SelectItem>
                    <SelectItem value={LocationType.FIELD}>Saha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Adres (İsteğe Bağlı)</Label>
                <Input id="edit-address" {...editForm.register("address")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Kapasite (Sunucu Sayısı)</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min="1"
                  {...editForm.register("capacity", { valueAsNumber: true })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editForm.getValues("isActive")}
                  onCheckedChange={(checked) => editForm.setValue("isActive", checked)}
                />
                <Label htmlFor="edit-isActive">Aktif</Label>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                İptal
              </Button>
              <Button type="submit" disabled={editLocationMutation.isPending}>
                {editLocationMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Location Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lokasyon Sil</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              <strong>{selectedLocation?.name}</strong> lokasyonunu silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLocationMutation.isPending}
            >
              {deleteLocationMutation.isPending ? "Siliniyor..." : "Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}