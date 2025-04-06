import React from "react";
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

interface EditServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server;
}

// Düzenleme için form şeması
const editServerSchema = z.object({
  model: z.string().min(1, "Model adı zorunludur"),
  specs: z.string().min(1, "Teknik özellikler zorunludur"),
  ipAddress: z.string().nullable().optional(),
  username: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
});

type EditServerFormData = z.infer<typeof editServerSchema>;

export default function EditServerModal({ isOpen, onClose, server }: EditServerModalProps) {
  const { toast } = useToast();
  
  // Form state'ini yönetmek için react-hook-form kullanıyoruz
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EditServerFormData>({
    resolver: zodResolver(editServerSchema),
    defaultValues: {
      model: server.model,
      specs: server.specs,
      ipAddress: server.ipAddress || "",
      username: server.username || "",
      password: server.password || "",
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

  // Form gönderim işleyicisi
  const onSubmit = (data: EditServerFormData) => {
    updateServerMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sunucu Düzenle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          </div>
          
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