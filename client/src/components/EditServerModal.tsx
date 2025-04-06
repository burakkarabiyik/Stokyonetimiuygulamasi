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
import { Server, ServerStatus } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormMessage, Form } from "@/components/ui/form";

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
  status: z.string().min(1, "Durum seçilmelidir"),
});

type EditServerFormData = z.infer<typeof editServerSchema>;

export default function EditServerModal({ isOpen, onClose, server }: EditServerModalProps) {
  const { toast } = useToast();
  
  // Form state'ini yönetmek için react-hook-form kullanıyoruz
  const form = useForm<EditServerFormData>({
    resolver: zodResolver(editServerSchema),
    defaultValues: {
      model: server.model,
      specs: server.specs,
      ipAddress: server.ipAddress || "",
      username: server.username || "",
      password: server.password || "",
      status: server.status,
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

  // Mevcut durum değerine dayalı renk sınıfını döndüren helper fonksiyon
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case ServerStatus.PASSIVE:
        return "text-gray-500";
      case ServerStatus.SETUP:
        return "text-blue-500";
      case ServerStatus.SHIPPABLE:
        return "text-green-500";
      case ServerStatus.ACTIVE:
        return "text-emerald-600";
      case ServerStatus.TRANSIT:
        return "text-amber-500";
      default:
        return "text-gray-500";
    }
  };

  // Mevcut durum değerine göre Türkçe adını döndüren helper fonksiyon
  const getStatusName = (status: string) => {
    switch (status) {
      case ServerStatus.PASSIVE:
        return "Pasif";
      case ServerStatus.SETUP:
        return "Kurulum";
      case ServerStatus.SHIPPABLE:
        return "Gönderilebilir";
      case ServerStatus.ACTIVE:
        return "Sahada";
      case ServerStatus.TRANSIT:
        return "Transfer Halinde";
      default:
        return status;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sunucu Düzenle</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="model" className="text-right">
                  Model
                </Label>
                <div className="col-span-3">
                  <Input id="model" {...form.register("model")} />
                  {form.formState.errors.model && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.model.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="specs" className="text-right">
                  Teknik Özellikler
                </Label>
                <div className="col-span-3">
                  <Input id="specs" {...form.register("specs")} />
                  {form.formState.errors.specs && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.specs.message}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Durum
                </Label>
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Durum seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.values(ServerStatus).map((status) => (
                              <SelectItem 
                                key={status} 
                                value={status}
                                className={getStatusColorClass(status)}
                              >
                                {getStatusName(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ipAddress" className="text-right">
                  IP Adresi
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="ipAddress" 
                    {...form.register("ipAddress")} 
                    placeholder="Ör: 192.168.1.100" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Kullanıcı Adı
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="username" 
                    {...form.register("username")} 
                    placeholder="Ör: admin" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Şifre
                </Label>
                <div className="col-span-3">
                  <Input 
                    id="password" 
                    type="password" 
                    {...form.register("password")} 
                    placeholder="••••••••" 
                  />
                </div>
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}