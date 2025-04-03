import React, { useState } from 'react';
import { Server, ServerStatus } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface EditServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server;
  onServerUpdated: () => void;
}

export default function EditServerModal({ isOpen, onClose, server, onServerUpdated }: EditServerModalProps) {
  const [formData, setFormData] = useState({
    ipAddress: server.ipAddress || '',
    username: server.username || '',
    password: server.password || '',
    status: server.status,
    location: server.location
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    
    try {
      // Sunucu bilgilerini güncelle
      await apiRequest('PUT', `/api/servers/${server.id}`, {
        ipAddress: formData.ipAddress || null,
        username: formData.username || null,
        password: formData.password || null,
        status: formData.status,
        location: formData.location
      });
      
      toast({
        title: "Başarılı",
        description: "Sunucu bilgileri başarıyla güncellendi.",
      });
      
      onServerUpdated();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Sunucu bilgileri güncellenirken bir hata oluştu.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 z-10">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Sunucu Bilgilerini Düzenle</h3>
          <p className="mt-1 text-sm text-gray-500">
            {server.serverId} - {server.model}
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="ipAddress" className="block text-sm font-medium text-gray-700">
                  IP Adresi
                </label>
                <input
                  type="text"
                  id="ipAddress"
                  name="ipAddress"
                  className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md p-2"
                  placeholder="192.168.1.100"
                  value={formData.ipAddress}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md p-2"
                  placeholder="admin"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Şifre
                </label>
                <input
                  type="text"
                  id="password"
                  name="password"
                  className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md p-2"
                  placeholder="******"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Durum
                </label>
                <select
                  id="status"
                  name="status"
                  className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md p-2"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value={ServerStatus.ACTIVE}>Aktif (Depoda)</option>
                  <option value={ServerStatus.TRANSIT}>Transfer Sürecinde</option>
                  <option value={ServerStatus.READY}>Gönderilebilir</option>
                  <option value={ServerStatus.FIELD}>Sahada Kullanımda</option>
                  <option value={ServerStatus.INACTIVE}>Pasif</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Lokasyon
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  className="mt-1 block w-full shadow-sm sm:text-sm border border-gray-300 rounded-md p-2"
                  placeholder="Ankara Merkez"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 sm:px-6 bg-gray-50 flex flex-row-reverse space-x-2 space-x-reverse">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}