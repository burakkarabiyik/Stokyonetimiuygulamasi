import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Server } from "@shared/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2 } from "lucide-react";

interface EditServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server;
}

// Sanal makine için şema
const virtualMachineSchema = z.object({
  name: z.string().min(1, "Sanal makine adı zorunludur"),
  ip: z.string().min(1, "IP adresi zorunludur"),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
});

// Ağ bilgileri için şema
const networkInfoSchema = z.object({
  mainIp: z.string().optional().nullable(),
  mainUsername: z.string().optional().nullable(),
  mainPassword: z.string().optional().nullable(),
  virtualMachines: z.array(virtualMachineSchema).optional().default([]),
});

// Düzenleme için form şeması
const editServerSchema = z.object({
  model: z.string().min(1, "Model adı zorunludur"),
  specs: z.string().min(1, "Teknik özellikler zorunludur"),
  ipAddress: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  networkInfo: networkInfoSchema.optional(),
});

type EditServerFormData = z.infer<typeof editServerSchema>;

export default function EditServerModal({ isOpen, onClose, server }: EditServerModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  // Sanal makineler için state
  const [virtualMachines, setVirtualMachines] = useState<Array<{
    name: string;
    ip: string;
    username: string;
    password: string;
    id?: string; // Geçici ID
  }>>([]); 
  
  // Mevcut network bilgilerini parse et
  React.useEffect(() => {
    if (server.networkInfo) {
      try {
        const networkInfo = typeof server.networkInfo === 'string' 
          ? JSON.parse(server.networkInfo) 
          : server.networkInfo;
        
        if (networkInfo.virtualMachines && Array.isArray(networkInfo.virtualMachines)) {
          setVirtualMachines(networkInfo.virtualMachines.map((vm, index) => ({
            ...vm,
            id: `vm-${index}`
          })));
        }
      } catch (e) {
        console.error("Network info parse hatası:", e);
      }
    }
  }, [server]);
  
  // Form state'ini yönetmek için react-hook-form kullanıyoruz
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<EditServerFormData>({
    resolver: zodResolver(editServerSchema),
    defaultValues: {
      model: server.model,
      specs: server.specs,
      ipAddress: server.ipAddress || "",
      username: server.username || "",
      password: server.password || "",
      networkInfo: {
        mainIp: server.ipAddress || "",
        mainUsername: server.username || "",
        mainPassword: server.password || "",
        virtualMachines: []
      }
    }
  });

  // Sunucu güncelleme mutation'ı
  const updateServerMutation = useMutation({
    mutationFn: async (data: EditServerFormData) => {
      const response = await apiRequest("PUT", `/api/servers/${server.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      // Başarılı güncelleme sonrası ilgili sorguları geçersiz kılma
      queryClient.invalidateQueries({ queryKey: [`/api/servers/${server.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      
      toast({
        title: "Sunucu güncellendi",
        description: "Sunucu bilgileri başarıyla güncellendi."
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sunucu güncellenirken bir hata oluştu: " + error.message
      });
    }
  });

  // Sanal makine eklemek için
  const addVirtualMachine = () => {
    const newVM = {
      name: "",
      ip: "",
      username: "",
      password: "",
      id: `vm-${Date.now()}`
    };
    
    setVirtualMachines([...virtualMachines, newVM]);
  };
  
  // Sanal makine silmek için
  const removeVirtualMachine = (id: string) => {
    setVirtualMachines(virtualMachines.filter(vm => vm.id !== id));
  };
  
  // Sanal makine bilgilerini güncellemek için
  const updateVirtualMachine = (id: string, field: string, value: string) => {
    setVirtualMachines(virtualMachines.map(vm => 
      vm.id === id ? { ...vm, [field]: value } : vm
    ));
  };
  
  // Form gönderim işleyicisi
  const onSubmit = (data: EditServerFormData) => {
    // Sanal makineleri network info içine ekle
    const updatedData = {
      ...data,
      networkInfo: {
        mainIp: data.ipAddress,
        mainUsername: data.username,
        mainPassword: data.password,
        virtualMachines: virtualMachines.map(({ id, ...vm }) => vm) // id'leri temizle
      }
    };
    
    // networkInfo'yu JSON olarak gönder
    updatedData.networkInfo = JSON.stringify(updatedData.networkInfo);
    updateServerMutation.mutate(updatedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sunucu Düzenle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
              <TabsTrigger value="network">Ağ Bilgileri</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="model" className="text-right">
                    Model
                  </Label>
                  <Input
                    id="model"
                    {...register("model")}
                    className="col-span-3"
                  />
                  {errors.model && (
                    <p className="col-span-3 col-start-2 text-sm text-red-500">
                      {errors.model.message}
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="specs" className="text-right">
                    Teknik Özellikler
                  </Label>
                  <Input
                    id="specs"
                    {...register("specs")}
                    className="col-span-3"
                  />
                  {errors.specs && (
                    <p className="col-span-3 col-start-2 text-sm text-red-500">
                      {errors.specs.message}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="network" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Ana Sunucu Erişim Bilgileri</CardTitle>
                  <CardDescription>Ana sunucunun IP adresi ve erişim bilgilerini girin</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ipAddress" className="text-right">
                      IP Adresi
                    </Label>
                    <Input
                      id="ipAddress"
                      {...register("ipAddress")}
                      className="col-span-3"
                      placeholder="Ör: 192.168.1.100"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right">
                      Kullanıcı Adı
                    </Label>
                    <Input
                      id="username"
                      {...register("username")}
                      className="col-span-3"
                      placeholder="Ör: admin"
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="password" className="text-right">
                      Şifre
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      {...register("password")}
                      className="col-span-3"
                      placeholder="••••••••"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Sanal Makineler</CardTitle>
                    <CardDescription>Bu sunucu üzerindeki sanal makinelerin bilgilerini girin</CardDescription>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addVirtualMachine}
                    size="sm"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Sanal Makine Ekle
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {virtualMachines.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Sanal makine eklenmemiş.
                    </div>
                  ) : (
                    virtualMachines.map((vm, index) => (
                      <Card key={vm.id} className="border border-gray-200">
                        <CardHeader className="py-3 flex flex-row items-center justify-between">
                          <CardTitle className="text-base">Sanal Makine #{index + 1}</CardTitle>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => removeVirtualMachine(vm.id as string)}
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="py-2 space-y-3">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor={`vm-${vm.id}-name`}>Makine Adı</Label>
                              <Input
                                id={`vm-${vm.id}-name`}
                                value={vm.name}
                                onChange={(e) => updateVirtualMachine(vm.id as string, "name", e.target.value)}
                                placeholder="Ör: VM-Web"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label htmlFor={`vm-${vm.id}-ip`}>IP Adresi</Label>
                              <Input
                                id={`vm-${vm.id}-ip`}
                                value={vm.ip}
                                onChange={(e) => updateVirtualMachine(vm.id as string, "ip", e.target.value)}
                                placeholder="Ör: 192.168.1.101"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`vm-${vm.id}-username`}>Kullanıcı Adı</Label>
                              <Input
                                id={`vm-${vm.id}-username`}
                                value={vm.username}
                                onChange={(e) => updateVirtualMachine(vm.id as string, "username", e.target.value)}
                                placeholder="Ör: vmadmin"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`vm-${vm.id}-password`}>Şifre</Label>
                              <Input
                                id={`vm-${vm.id}-password`}
                                type="password"
                                value={vm.password}
                                onChange={(e) => updateVirtualMachine(vm.id as string, "password", e.target.value)}
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={updateServerMutation.isPending}
            >
              İptal
            </Button>
            <Button 
              type="submit"
              disabled={updateServerMutation.isPending}
            >
              {updateServerMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}