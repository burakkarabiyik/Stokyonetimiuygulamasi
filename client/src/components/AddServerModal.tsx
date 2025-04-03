import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ServerStatus } from "@shared/schema";

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddServerModal({ isOpen, onClose }: AddServerModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    serverId: "",
    model: "",
    specs: "",
    location: "Ankara Depo",
    status: ServerStatus.ACTIVE, // Aktif, yani depoda
    notes: "",
    quantity: 1
  });
  
  const addServerMutation = useMutation({
    mutationFn: async () => {
      const quantity = parseInt(formData.quantity.toString()) || 1;
      const baseServerId = formData.serverId;
      
      // Toplu sunucu ekleme işlemi
      for (let i = 0; i < quantity; i++) {
        // Birden fazla sunucu ekleniyorsa, sunucu ID'sini sıralı hale getir
        const currentServerId = quantity > 1 ? `${baseServerId}-${i + 1}` : baseServerId;
        
        // Sunucuyu oluştur
        await apiRequest('POST', '/api/servers', {
          serverId: currentServerId,
          model: formData.model,
          specs: formData.specs,
          location: formData.location,
          status: formData.status
        });
        
        // Eğer not varsa ekle
        if (formData.notes.trim()) {
          // Oluşturulan sunucuyu bul
          const servers = await queryClient.fetchQuery({
            queryKey: ['/api/servers'],
          });
          
          const newServer = servers.find((s: any) => s.serverId === currentServerId);
          
          if (newServer) {
            await apiRequest('POST', `/api/servers/${newServer.id}/notes`, {
              note: formData.notes
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      
      const quantity = parseInt(formData.quantity.toString()) || 1;
      toast({
        title: "Başarılı",
        description: quantity > 1 ? `${quantity} adet sunucu başarıyla eklendi.` : "Sunucu başarıyla eklendi.",
      });
      
      // Reset form and close modal
      setFormData({
        serverId: "",
        model: "",
        specs: "",
        location: "Ankara Depo",
        status: ServerStatus.ACTIVE,
        notes: "",
        quantity: 1
      });
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Sunucu eklenirken bir hata oluştu.",
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.serverId.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sunucu ID'si gereklidir.",
      });
      return;
    }
    
    if (!formData.model.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Sunucu modeli gereklidir.",
      });
      return;
    }
    
    if (!formData.specs.trim()) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Teknik özellikler gereklidir.",
      });
      return;
    }
    
    addServerMutation.mutate();
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed z-50 inset-0 overflow-y-auto" 
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div 
          className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 sm:mx-0 sm:h-10 sm:w-10">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Yeni Sunucu Ekle
              </h3>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="serverId" className="block text-sm font-medium text-gray-700">Sunucu ID</label>
                    <input 
                      type="text" 
                      name="serverId" 
                      id="serverId" 
                      value={formData.serverId}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                      placeholder="SRV-2023-092"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Adet</label>
                    <input 
                      type="number" 
                      name="quantity" 
                      id="quantity" 
                      min="1"
                      max="50"
                      value={formData.quantity}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                      placeholder="1"
                    />
                    <p className="mt-1 text-xs text-gray-500">Aynı modelden kaç adet eklemek istediğinizi belirtin (maksimum 50)</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-700">Sunucu Modeli</label>
                  <input 
                    type="text" 
                    name="model" 
                    id="model" 
                    value={formData.model}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                    placeholder="Dell PowerEdge R740"
                  />
                </div>
                <div>
                  <label htmlFor="specs" className="block text-sm font-medium text-gray-700">Teknik Özellikler</label>
                  <textarea 
                    name="specs" 
                    id="specs" 
                    rows={3} 
                    value={formData.specs}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                    placeholder="2x Intel Xeon Gold 6230, 128GB RAM, 4x 1.8TB SSD"
                  ></textarea>
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">Lokasyon</label>
                  <select 
                    id="location" 
                    name="location" 
                    value={formData.location}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value="Ankara Depo">Ankara Depo</option>
                    <option value="İstanbul Merkez">İstanbul Merkez</option>
                    <option value="İzmir Depo">İzmir Depo</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">Durum</label>
                  <select 
                    id="status" 
                    name="status" 
                    value={formData.status}
                    onChange={handleChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                  >
                    <option value={ServerStatus.ACTIVE}>Aktif</option>
                    <option value={ServerStatus.TRANSIT}>Transfer Sürecinde</option>
                    <option value={ServerStatus.SETUP}>Kurulumda</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notlar (Opsiyonel)</label>
                  <textarea 
                    name="notes" 
                    id="notes" 
                    rows={2} 
                    value={formData.notes}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                    placeholder="Sunucu ile ilgili ek notlar..."
                  ></textarea>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button 
                    type="submit" 
                    disabled={addServerMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addServerMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
