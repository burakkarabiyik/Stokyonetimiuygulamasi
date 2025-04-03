import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ServerStatus } from "@shared/schema";
import { formatDate } from "@/lib/utils";

export default function SetupServer() {
  const { id } = useParams();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    ipAddress: "",
    username: "",
    password: "",
    notes: "",
    completedSetup: false,
  });

  const { data: server, isLoading } = useQuery({
    queryKey: ['/api/servers', parseInt(id || "0")],
    queryFn: () => apiRequest("GET", `/api/servers/${id}`),
  });

  useEffect(() => {
    if (server) {
      // Eğer sunucu durumu Kurulumda değilse, uyarı göster
      if (server.status !== ServerStatus.SETUP) {
        toast({
          variant: "destructive",
          title: "Uyarı",
          description: "Bu sunucu kurulum aşamasında değil. Önce sunucuyu kurulum durumuna geçirmelisiniz.",
        });
      }
    }
  }, [server]);

  const setupMutation = useMutation({
    mutationFn: async () => {
      // Önce sunucu notlarını ekleyelim
      const setupNotes = `IP Adresi: ${formData.ipAddress}
Kullanıcı Adı: ${formData.username}
Şifre: ${formData.password}
${formData.notes ? `Ek Notlar: ${formData.notes}` : ""}`;

      await apiRequest("POST", `/api/servers/${id}/notes`, {
        note: setupNotes
      });

      // Eğer kurulum tamamlandı işaretlendiyse, durumu güncelleyelim
      if (formData.completedSetup) {
        await apiRequest("PUT", `/api/servers/${id}`, {
          status: ServerStatus.FIELD // Sahada Kullanımda olarak güncelle
        });

        // Aktivite ekle
        await apiRequest("POST", `/api/servers/${id}/transfers`, {
          fromLocation: server.location,
          toLocation: "Saha Kullanımı",
          notes: "Kurulum tamamlandı, saha kullanımına alındı.",
          isFieldDeployment: true
        });
      }
    },
    onSuccess: () => {
      // Verileri yenile
      queryClient.invalidateQueries({ queryKey: ['/api/servers', parseInt(id || "0")] });
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      // Başarı mesajı
      toast({
        title: "Başarılı",
        description: formData.completedSetup 
          ? "Kurulum tamamlandı ve sunucu saha kullanımına alındı." 
          : "Kurulum bilgileri kaydedildi.",
      });

      // Sunucu detay sayfasına yönlendir
      setLocation(`/servers/${id}`);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Kurulum bilgileri kaydedilirken bir hata oluştu.",
      });
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Temel validasyon
    if (!formData.ipAddress.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "IP adresi gereklidir.",
      });
      return;
    }

    if (!formData.username.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Kullanıcı adı gereklidir.",
      });
      return;
    }

    if (!formData.password.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Şifre gereklidir.",
      });
      return;
    }

    setupMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">Sunucu bulunamadı</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => setLocation(`/servers/${id}`)}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Sunucu Kurulum Bilgileri</h1>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Sunucu Bilgileri</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Kurulum yapılacak sunucunun detayları.</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Sunucu ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{server.serverId}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Model</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{server.model}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Teknik Özellikler</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{server.specs}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Durum</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${server.status === ServerStatus.SETUP ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {server.status === ServerStatus.SETUP ? 'Kurulumda' : 
                     server.status === ServerStatus.ACTIVE ? 'Aktif' : 
                     server.status === ServerStatus.TRANSIT ? 'Transfer Sürecinde' : 'Sahada Kullanımda'}
                  </span>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Lokasyon</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{server.location}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Ekleme Tarihi</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(server.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Kurulum Bilgilerini Girin</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Kurulum tamamlandığında sunucuya bağlanmak için gereken bilgileri ekleyin.</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700">IP Adresi</label>
                <input
                  type="text"
                  name="ipAddress"
                  id="ipAddress"
                  value={formData.ipAddress}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="192.168.1.100"
                />
              </div>
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="admin"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Şifre</label>
                <input
                  type="text" // Güvenlik için normalde password olmalı, ancak not olarak kaydedileceği için text
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="************"
                />
              </div>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Ek Notlar (Opsiyonel)</label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Kurulum ile ilgili ek bilgiler..."
                ></textarea>
              </div>
              
              <div className="relative flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="completedSetup"
                    name="completedSetup"
                    type="checkbox"
                    checked={formData.completedSetup}
                    onChange={(e) => setFormData(prev => ({ ...prev, completedSetup: e.target.checked }))}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="completedSetup" className="font-medium text-gray-700">Kurulum tamamlandı</label>
                  <p className="text-gray-500">Kurulumu tamamladıysanız işaretleyin. Sunucu durumu "Sahada Kullanımda" olarak güncellenecektir.</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setLocation(`/servers/${id}`)}
                  className="mr-3 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={setupMutation.isPending || server.status !== ServerStatus.SETUP}
                  className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {setupMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}