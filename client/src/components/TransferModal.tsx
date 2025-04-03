import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Server } from "@shared/schema";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server;
}

export default function TransferModal({ isOpen, onClose, server }: TransferModalProps) {
  const { toast } = useToast();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format for input date
  
  const [formData, setFormData] = useState({
    targetLocation: "",
    transferDate: today,
    notes: "",
    markAsFieldUse: false
  });
  
  const transferMutation = useMutation({
    mutationFn: async () => {
      // Oluşturulacak not
      let serverNote = formData.notes.trim();

      // Transfer kaydını oluştur
      await apiRequest('POST', `/api/servers/${server.id}/transfers`, {
        toLocation: formData.targetLocation,
        transferDate: formData.transferDate, // String olarak gönderiyoruz, API'de dönüştürülecek
        notes: serverNote,
        markAsFieldUse: formData.markAsFieldUse // Sahada kullanımda olarak işaretlenip işaretlenmeyeceği
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/servers'] });
      queryClient.invalidateQueries({ queryKey: [`/api/servers/${server.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/servers/${server.id}/transfers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/servers/${server.id}/activities`] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      toast({
        title: "Başarılı",
        description: "Transfer işlemi başlatıldı.",
      });
      
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Transfer işlemi sırasında bir hata oluştu.",
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (formData.targetLocation === server.location) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Hedef konum mevcut konumla aynı olamaz.",
      });
      return;
    }
    
    if (!formData.transferDate) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Transfer tarihi gereklidir.",
      });
      return;
    }
    
    transferMutation.mutate();
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  // Artık önceden tanımlanmış lokasyonlara ihtiyacımız yok, kullanıcı istediği metni girebilir
  
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                Sunucu Transferi
              </h3>
              <div className="mt-4">
                <p className="text-sm text-gray-500">
                  Seçilen sunucuyu transfer edeceğiniz konumu ve detayları girin.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="serverId" className="block text-sm font-medium text-gray-700">Sunucu ID</label>
                  <input 
                    type="text" 
                    id="serverId" 
                    value={server.serverId}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50" 
                  />
                </div>
                <div>
                  <label htmlFor="currentLocation" className="block text-sm font-medium text-gray-700">Mevcut Konum</label>
                  <input 
                    type="text" 
                    id="currentLocation" 
                    value={server.location}
                    readOnly
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-gray-50" 
                  />
                </div>
                <div>
                  <label htmlFor="targetLocation" className="block text-sm font-medium text-gray-700">Hedef Konum</label>
                  <input 
                    type="text" 
                    name="targetLocation" 
                    id="targetLocation" 
                    value={formData.targetLocation}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Hedef konum giriniz" 
                  />
                </div>
                <div>
                  <label htmlFor="transferDate" className="block text-sm font-medium text-gray-700">Transfer Tarihi</label>
                  <input 
                    type="date" 
                    name="transferDate" 
                    id="transferDate" 
                    value={formData.transferDate}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
                {/* IP adresi ve şifre alanları kaldırıldı */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Transfer Notları</label>
                  <textarea 
                    name="notes" 
                    id="notes" 
                    rows={3} 
                    value={formData.notes}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" 
                    placeholder="Transfer ile ilgili diğer notlar..."
                  ></textarea>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="markAsFieldUse"
                    id="markAsFieldUse"
                    checked={formData.markAsFieldUse}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="markAsFieldUse" className="ml-2 block text-sm text-gray-700">
                    Sahada Kullanımda olarak işaretle
                  </label>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button 
                    type="submit" 
                    disabled={transferMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {transferMutation.isPending ? "İşleniyor..." : "Transfer Başlat"}
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
