import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ServerStatus, LocationType } from "@shared/schema";
import { generateServerId } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Server, Plus, Settings } from "lucide-react";

import ServerModelManager from "./ServerModelManager";

// Toplu sunucu ekleme şeması
const batchServerSchema = z.object({
  quantity: z.number().min(1).max(10),
  modelId: z.number().min(1, "Sunucu modeli seçilmelidir"),
  locationId: z.number().min(1, "Lokasyon seçilmelidir"),
  status: z.string().default(ServerStatus.PASSIVE),
});

type BatchServerFormData = z.infer<typeof batchServerSchema>;

interface BatchServerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Sunucu modeli tipi
interface ServerModel {
  id: number;
  name: string;
  brand: string;
  specs: string;
}

// Lokasyon tipi
interface Location {
  id: number;
  name: string;
  type: string;
  address: string | null;
  capacity: number;
  isActive: boolean;
}

export default function BatchServerAddModal({ 
  isOpen, 
  onClose 
}: BatchServerAddModalProps) {
  const { toast } = useToast();
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ServerModel | null>(null);
  const [previewList, setPreviewList] = useState<any[]>([]);

  // Form tanımları
  const form = useForm<BatchServerFormData>({
    resolver: zodResolver(batchServerSchema),
    defaultValues: {
      quantity: 1,
      status: ServerStatus.PASSIVE,
    },
  });

  // Modelleri ve lokasyonları çek
  const { data: serverModels = [] } = useQuery<ServerModel[]>({
    queryKey: ["/api/server-models"],
    enabled: isOpen,
  });

  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ["/api/locations"],
    enabled: isOpen,
  });

  // Modellerden seçim yapıldığında
  const handleModelChange = (modelId: number) => {
    const selected = serverModels.find(model => model.id === modelId);
    setSelectedModel(selected || null);
    updatePreviewList(form.getValues().quantity, modelId);
  };

  // Adet değiştiğinde önizleme listesini güncelle
  const handleQuantityChange = (quantity: number) => {
    const modelId = form.getValues().modelId;
    updatePreviewList(quantity, modelId);
  };

  // Önizleme listesini güncelle
  const updatePreviewList = (quantity: number, modelId: number) => {
    if (!modelId) {
      setPreviewList([]);
      return;
    }

    const model = serverModels.find(m => m.id === modelId);
    if (!model) {
      setPreviewList([]);
      return;
    }

    const newList = [];
    for (let i = 0; i < quantity; i++) {
      newList.push({
        serverId: generateServerId(),
        model: model.name,
        brand: model.brand,
      });
    }
    setPreviewList(newList);
  };

  // Toplu sunucu ekleme fonksiyonu
  const addBatchServerMutation = useMutation({
    mutationFn: async (data: BatchServerFormData) => {
      const res = await apiRequest("POST", "/api/servers/batch", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Başarılı",
        description: `${form.getValues().quantity} adet sunucu başarıyla eklendi`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      form.reset({
        quantity: 1,
        status: ServerStatus.PASSIVE,
      });
      setPreviewList([]);
      setSelectedModel(null);
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Hata",
        description: error.message || "Sunucular eklenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  // Formu gönder
  const onSubmit = (data: BatchServerFormData) => {
    addBatchServerMutation.mutate(data);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Toplu Sunucu Ekle</DialogTitle>
            <DialogDescription>
              Aynı modelden birden fazla sunucuyu kolayca ekleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Adet seçimi */}
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eklenecek Sunucu Adedi</FormLabel>
                        <div className="space-y-2">
                          <Slider 
                            defaultValue={[1]}
                            min={1}
                            max={10}
                            step={1}
                            onValueChange={(value) => {
                              field.onChange(value[0]);
                              handleQuantityChange(value[0]);
                            }}
                          />
                          <div className="flex justify-between items-center">
                            <Badge variant="outline">{field.value} adet</Badge>
                            <div className="flex gap-2">
                              {[1, 5, 10].map((num) => (
                                <Button 
                                  key={num}
                                  type="button"
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    field.onChange(num);
                                    handleQuantityChange(num);
                                  }}
                                >
                                  {num}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sunucu modeli seçimi */}
                  <FormField
                    control={form.control}
                    name="modelId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel>Sunucu Modeli</FormLabel>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm"
                            onClick={() => setIsModelManagerOpen(true)}
                            className="h-8 px-2 text-xs"
                          >
                            <Settings className="h-3.5 w-3.5 mr-1" />
                            <span>Modelleri Yönet</span>
                          </Button>
                        </div>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(parseInt(value));
                            handleModelChange(parseInt(value));
                          }}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sunucu modeli seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {serverModels.length === 0 ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                <p>Kayıtlı sunucu modeli bulunamadı</p>
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  onClick={() => setIsModelManagerOpen(true)}
                                  className="mt-1"
                                >
                                  Model eklemek için tıklayın
                                </Button>
                              </div>
                            ) : (
                              serverModels.map((model) => (
                                <SelectItem key={model.id} value={model.id.toString()}>
                                  <div className="flex flex-col">
                                    <span>{model.brand} {model.name}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                                      {model.specs}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Lokasyon seçimi */}
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lokasyon</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Lokasyon seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.length === 0 ? (
                              <div className="p-2 text-center text-sm text-muted-foreground">
                                <p>Kayıtlı lokasyon bulunamadı</p>
                              </div>
                            ) : (
                              locations
                                .filter(loc => loc.isActive)
                                .map((location) => (
                                <SelectItem key={location.id} value={location.id.toString()}>
                                  <div className="flex flex-col">
                                    <span>{location.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {location.type === LocationType.DEPOT ? "Depo" :
                                        location.type === LocationType.OFFICE ? "Ofis" : "Saha"}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Durum seçimi */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlangıç Durumu</FormLabel>
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
                            <SelectItem value={ServerStatus.PASSIVE}>Pasif</SelectItem>
                            <SelectItem value={ServerStatus.SETUP}>Kurulum</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Önizleme */}
                <div className="space-y-2">
                  <Label>Eklenecek Sunucular Önizleme</Label>
                  <Card className="border-dashed">
                    <CardContent className="p-4 h-[250px] overflow-y-auto">
                      {previewList.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                          <Server className="h-12 w-12 mb-2 opacity-20" />
                          <p className="text-sm">Önizleme için sunucu modeli seçin</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {previewList.map((item, index) => (
                            <div 
                              key={index} 
                              className="p-2 border rounded-md flex items-center gap-3"
                            >
                              <Server className="h-5 w-5 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{item.serverId}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.brand} {item.model}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <p className="text-xs text-muted-foreground">
                    Not: Sunucu ID'leri otomatik olarak oluşturulur. Gerçek ID'ler eklendiğinde farklı olabilir.
                  </p>
                </div>
              </div>

              {/* Ek bilgi paneli */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="info">
                  <AccordionTrigger className="text-sm">Toplu ekleme hakkında bilgi</AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>
                        Toplu ekleme ile aynı modelden birden fazla sunucuyu tek seferde ekleyebilirsiniz. 
                        Sistem otomatik olarak her sunucu için benzersiz ID üretecektir.
                      </p>
                      <p>
                        Ekledikten sonra her sunucuyu ayrı ayrı düzenleyerek IP adresi, kullanıcı adı ve şifre
                        gibi özel alanları doldurabilirsiniz.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={addBatchServerMutation.isPending}
                >
                  İptal
                </Button>
                <Button 
                  type="submit" 
                  disabled={addBatchServerMutation.isPending || previewList.length === 0}
                >
                  {addBatchServerMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Ekleniyor...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      {previewList.length} Sunucu Ekle
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Sunucu Modelleri Yönetimi */}
      <ServerModelManager 
        isOpen={isModelManagerOpen} 
        onClose={() => {
          setIsModelManagerOpen(false);
          // Model eklendiğinde server-models verisini güncelle
          queryClient.invalidateQueries({ queryKey: ["/api/server-models"] });
        }} 
      />
    </>
  );
}