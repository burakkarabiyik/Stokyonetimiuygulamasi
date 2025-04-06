import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Edit, Trash2, Plus } from "lucide-react";

// Sunucu tipi için şema
const serverModelSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Sunucu modeli gereklidir"),
  brand: z.string().min(1, "Marka gereklidir"),
  specs: z.string().min(1, "Özellikler gereklidir"),
});

type ServerModel = z.infer<typeof serverModelSchema>;
type ServerModelFormData = Omit<ServerModel, "id">;

interface ServerModelManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ServerModelManager({ isOpen, onClose }: ServerModelManagerProps) {
  const { toast } = useToast();
  const [editingModel, setEditingModel] = useState<ServerModel | null>(null);
  const [deletingModel, setDeletingModel] = useState<ServerModel | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Sunucu modellerini getir
  const { data: serverModels = [], isLoading } = useQuery({
    queryKey: ["/api/server-models"],
    enabled: isOpen,
  });

  // Ekleme formu
  const addForm = useForm<ServerModelFormData>({
    resolver: zodResolver(serverModelSchema.omit({ id: true })),
    defaultValues: {
      name: "",
      brand: "",
      specs: "",
    },
  });

  // Düzenleme formu
  const editForm = useForm<ServerModel>({
    resolver: zodResolver(serverModelSchema),
    defaultValues: {
      id: 0,
      name: "",
      brand: "",
      specs: "",
    },
  });

  // Ekle mutasyonu
  const addMutation = useMutation({
    mutationFn: async (data: ServerModelFormData) => {
      const res = await apiRequest("POST", "/api/server-models", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sunucu modeli başarıyla eklendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/server-models"] });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Sunucu modeli eklenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Düzenle mutasyonu
  const editMutation = useMutation({
    mutationFn: async (data: ServerModel) => {
      const { id, ...modelData } = data;
      const res = await apiRequest("PUT", `/api/server-models/${id}`, modelData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sunucu modeli başarıyla güncellendi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/server-models"] });
      setIsEditDialogOpen(false);
      editForm.reset();
      setEditingModel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Sunucu modeli güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Sil mutasyonu
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/server-models/${id}`);
      if (res.status === 204) {
        return { success: true };
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: "Sunucu modeli başarıyla silindi",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/server-models"] });
      setIsDeleteDialogOpen(false);
      setDeletingModel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Sunucu modeli silinirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Form işleyicileri
  const handleAddSubmit = (data: ServerModelFormData) => {
    addMutation.mutate(data);
  };

  const handleEditSubmit = (data: ServerModel) => {
    editMutation.mutate(data);
  };

  const handleDeleteConfirm = () => {
    if (deletingModel?.id) {
      deleteMutation.mutate(deletingModel.id);
    }
  };

  // Düzenleme modunu aç
  const openEditMode = (model: ServerModel) => {
    setEditingModel(model);
    editForm.reset({
      id: model.id,
      name: model.name,
      brand: model.brand,
      specs: model.specs,
    });
    setIsEditDialogOpen(true);
  };

  // Silme modunu aç
  const openDeleteMode = (model: ServerModel) => {
    setDeletingModel(model);
    setIsDeleteDialogOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sunucu Modelleri Yönetimi</DialogTitle>
          <DialogDescription>
            Sistemde kayıtlı sunucu modellerini görüntüleyebilir, ekleyebilir, düzenleyebilir veya silebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-between items-center my-4">
          <div className="text-sm text-muted-foreground">
            {serverModels.length} adet sunucu modeli listeleniyor
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Model Ekle
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : serverModels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-center text-muted-foreground mb-4">
                Henüz kayıtlı sunucu modeli bulunmuyor.
              </p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                İlk Modeli Ekle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Marka</TableHead>
                  <TableHead>Özellikler</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serverModels.map((model: ServerModel) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>{model.brand}</TableCell>
                    <TableCell className="max-w-xs truncate">{model.specs}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditMode(model)}
                        className="h-8 w-8 p-0 mr-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Düzenle</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteMode(model)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Sil</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Ekleme Modalı */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Sunucu Modeli Ekle</DialogTitle>
            <DialogDescription>
              Sisteme yeni bir sunucu modeli eklemek için formu doldurun.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit(handleAddSubmit)}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Model Adı</Label>
                <Input
                  id="name"
                  placeholder="Örn: PowerEdge R740"
                  {...addForm.register("name")}
                />
                {addForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {addForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marka</Label>
                <Input
                  id="brand"
                  placeholder="Örn: Dell"
                  {...addForm.register("brand")}
                />
                {addForm.formState.errors.brand && (
                  <p className="text-sm text-red-500">
                    {addForm.formState.errors.brand.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="specs">Özellikler</Label>
                <Textarea
                  id="specs"
                  placeholder="Örn: 2x Intel Xeon Gold 6230, 128GB RAM, 4x 1.8TB SSD"
                  {...addForm.register("specs")}
                />
                {addForm.formState.errors.specs && (
                  <p className="text-sm text-red-500">
                    {addForm.formState.errors.specs.message}
                  </p>
                )}
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
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Ekleniyor...
                  </>
                ) : (
                  "Ekle"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Düzenleme Modalı */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sunucu Modeli Düzenle</DialogTitle>
            <DialogDescription>
              Sunucu modeli bilgilerini düzenleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Model Adı</Label>
                <Input
                  id="edit-name"
                  {...editForm.register("name")}
                />
                {editForm.formState.errors.name && (
                  <p className="text-sm text-red-500">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-brand">Marka</Label>
                <Input
                  id="edit-brand"
                  {...editForm.register("brand")}
                />
                {editForm.formState.errors.brand && (
                  <p className="text-sm text-red-500">
                    {editForm.formState.errors.brand.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-specs">Özellikler</Label>
                <Textarea
                  id="edit-specs"
                  {...editForm.register("specs")}
                />
                {editForm.formState.errors.specs && (
                  <p className="text-sm text-red-500">
                    {editForm.formState.errors.specs.message}
                  </p>
                )}
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
              <Button type="submit" disabled={editMutation.isPending}>
                {editMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Güncelleniyor...
                  </>
                ) : (
                  "Güncelle"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Modalı */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sunucu Modelini Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. {deletingModel?.name} modelini silmek istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Siliniyor...
                </>
              ) : (
                "Evet, Sil"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}