import React from "react";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Server, ServerDetail } from "@shared/schema";

interface ServerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: number;
  detail?: ServerDetail; // Eğer düzenleme ise mevcut detay
}

// VM detay form şeması
const serverDetailSchema = z.object({
  vmName: z.string().min(1, "VM adı zorunludur"),
  ipAddress: z.string().min(1, "IP adresi zorunludur"),
  username: z.string().min(1, "Kullanıcı adı zorunludur"),
  password: z.string().min(1, "Şifre zorunludur"),
  notes: z.string().nullable().optional(),
});

type ServerDetailFormData = z.infer<typeof serverDetailSchema>;

export default function ServerDetailModal({ isOpen, onClose, serverId, detail }: ServerDetailModalProps) {
  const { toast } = useToast();
  const isEditing = !!detail;
  
  // Form state'ini yönetmek için react-hook-form kullanıyoruz
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<ServerDetailFormData>({
    resolver: zodResolver(serverDetailSchema),
    defaultValues: {
      vmName: "",
      ipAddress: "",
      username: "",
      password: "",
      notes: "",
    }
  });
  
  // Eğer düzenleme modu ise ve detail varsa, formu dolduralım
  useEffect(() => {
    if (isEditing && detail) {
      setValue("vmName", detail.vmName || "");
      setValue("ipAddress", detail.ipAddress || "");
      setValue("username", detail.username || "");
      setValue("password", detail.password || "");
      setValue("notes", detail.notes || "");
    }
  }, [detail, isEditing, setValue]);

  // VM ekleme/düzenleme mutation'ı
  const serverDetailMutation = useMutation({
    mutationFn: async (data: ServerDetailFormData) => {
      if (isEditing && detail) {
        const response = await apiRequest("PUT", `/api/server-details/${detail.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", `/api/servers/${serverId}/details`, data);
        return response.json();
      }
    },
    onSuccess: () => {
      // Başarılı işlem sonrası ilgili sorguları geçersiz kılma
      queryClient.invalidateQueries({ queryKey: [`/api/servers/${serverId}/details`] });
      queryClient.invalidateQueries({ queryKey: [`/api/servers/${serverId}/activities`] });
      queryClient.invalidateQueries({ queryKey: [`/api/servers/${serverId}`] });
      
      toast({
        title: isEditing ? "VM güncellendi" : "VM eklendi",
        description: isEditing 
          ? "Sanal makine bilgileri başarıyla güncellendi."
          : "Sanal makine başarıyla eklendi."
      });
      
      reset();
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: `Sanal makine ${isEditing ? 'güncellenirken' : 'eklenirken'} bir hata oluştu: ${error.message}`
      });
    }
  });

  // Form gönderim işleyicisi
  const onSubmit = (data: ServerDetailFormData) => {
    serverDetailMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Sanal Makine Düzenle" : "Sanal Makine Ekle"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vmName" className="text-right">
                VM Adı
              </Label>
              <Input
                id="vmName"
                {...register("vmName")}
                className="col-span-3"
                placeholder="Ör: VM-WEB-001"
              />
              {errors.vmName && (
                <p className="col-span-3 col-start-2 text-sm text-red-500">
                  {errors.vmName.message}
                </p>
              )}
            </div>
            
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
              {errors.ipAddress && (
                <p className="col-span-3 col-start-2 text-sm text-red-500">
                  {errors.ipAddress.message}
                </p>
              )}
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
              {errors.username && (
                <p className="col-span-3 col-start-2 text-sm text-red-500">
                  {errors.username.message}
                </p>
              )}
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
              {errors.password && (
                <p className="col-span-3 col-start-2 text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notlar
              </Label>
              <Textarea
                id="notes"
                {...register("notes")}
                className="col-span-3"
                placeholder="Ör: Web sunucusu - Nginx + PHP"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={serverDetailMutation.isPending}
            >
              İptal
            </Button>
            <Button 
              type="submit"
              disabled={serverDetailMutation.isPending}
            >
              {serverDetailMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}