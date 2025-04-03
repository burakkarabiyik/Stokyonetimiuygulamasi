import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, groupByDate } from "@/lib/utils";
import { Activity, ServerTransfer, ActivityType } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Reports() {
  const { toast } = useToast();
  const [reportPeriod, setReportPeriod] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("all");
  
  // Tüm aktiviteleri çek
  const { 
    data: activities, 
    isLoading: activitiesLoading
  } = useQuery<Activity[]>({
    queryKey: ['/api/activities'],
  });
  
  // Tüm transferleri çek
  const { 
    data: transfers, 
    isLoading: transfersLoading
  } = useQuery<ServerTransfer[]>({
    queryKey: ['/api/transfers'],
  });
  
  // Tarih filtresi uygula
  const filterByDate = <T extends { createdAt: string | Date }>(data: T[] | undefined): T[] => {
    if (!data) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    switch (reportPeriod) {
      case 'today':
        return data.filter(item => new Date(item.createdAt) >= today);
      case 'week':
        return data.filter(item => new Date(item.createdAt) >= lastWeek);
      case 'month':
        return data.filter(item => new Date(item.createdAt) >= lastMonth);
      default:
        return data;
    }
  };
  
  // Aktivite tipine göre filtrele
  const filterByType = (data: Activity[] | undefined): Activity[] => {
    if (!data) return [];
    
    if (reportType === 'all') return data;
    return data.filter(activity => activity.type === reportType);
  };
  
  // Filtrelenmiş aktiviteler ve transferler
  const filteredActivities = filterByType(filterByDate(activities));
  const filteredTransfers = filterByDate(transfers);
  
  // Tarih gruplarına ayır
  const groupedActivities = groupByDate(filteredActivities);
  const groupedTransfers = groupByDate(filteredTransfers);
  
  // İstatistikler
  const stats = {
    additions: filteredActivities.filter(a => a.type === ActivityType.ADD).length,
    transfers: filteredActivities.filter(a => a.type === ActivityType.TRANSFER).length,
    setup: filteredActivities.filter(a => a.type === ActivityType.SETUP).length,
    notes: filteredActivities.filter(a => a.type === ActivityType.NOTE).length,
  };
  
  if (activitiesLoading || transfersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Raporlar yükleniyor...</div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-gray-500 mt-1">Sunucular ile ilgili aktivite ve transfer raporları</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Zaman Aralığı" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Zamanlar</SelectItem>
              <SelectItem value="today">Bugün</SelectItem>
              <SelectItem value="week">Son Hafta</SelectItem>
              <SelectItem value="month">Son Ay</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Aktivite Tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Aktiviteler</SelectItem>
              <SelectItem value={ActivityType.ADD}>Ekleme</SelectItem>
              <SelectItem value={ActivityType.TRANSFER}>Transfer</SelectItem>
              <SelectItem value={ActivityType.NOTE}>Not</SelectItem>
              <SelectItem value={ActivityType.SETUP}>Kurulum</SelectItem>
              <SelectItem value={ActivityType.EDIT}>Düzenleme</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* İstatistikler */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Toplam Ekleme</CardTitle>
            <CardDescription>Eklenen sunucular</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.additions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Toplam Transfer</CardTitle>
            <CardDescription>Tamamlanan transferler</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.transfers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Kurulumlar</CardTitle>
            <CardDescription>Kurulum aktiviteleri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.setup}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Not İşlemleri</CardTitle>
            <CardDescription>Toplam not işlemleri</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.notes}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Raporlar */}
      <Tabs defaultValue="activities" className="mt-6">
        <TabsList className="mb-4">
          <TabsTrigger value="activities">Aktivite Raporu</TabsTrigger>
          <TabsTrigger value="transfers">Transfer Raporu</TabsTrigger>
        </TabsList>
        
        <TabsContent value="activities">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Aktivite Raporu</h3>
              <p className="mt-1 text-sm text-gray-500">
                {reportPeriod === 'all' ? 'Tüm zamanlar' : 
                 reportPeriod === 'today' ? 'Bugün' : 
                 reportPeriod === 'week' ? 'Son hafta' : 'Son ay'} 
                {reportType === 'all' ? ', tüm aktiviteler' : `, ${reportType} tipi aktiviteler`}
              </p>
            </div>
            
            {Object.keys(groupedActivities).length > 0 ? (
              <div className="overflow-hidden">
                {Object.entries(groupedActivities).map(([date, activities]) => (
                  <div key={date} className="border-b border-gray-200 last:border-b-0">
                    <div className="bg-gray-50 px-4 py-3">
                      <h4 className="text-sm font-medium text-gray-900">{date}</h4>
                    </div>
                    <ul className="divide-y divide-gray-200">
                      {activities.map((activity) => (
                        <li key={activity.id} className="px-4 py-3">
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 h-5 w-5 rounded-full ${
                              activity.type === ActivityType.ADD ? 'bg-green-500' :
                              activity.type === ActivityType.TRANSFER ? 'bg-blue-500' :
                              activity.type === ActivityType.NOTE ? 'bg-yellow-500' :
                              activity.type === ActivityType.SETUP ? 'bg-purple-500' :
                              activity.type === ActivityType.EDIT ? 'bg-indigo-500' :
                              'bg-gray-500'
                            } mr-3 mt-1`}></div>
                            <div>
                              <p className="text-sm text-gray-900">{activity.description}</p>
                              <p className="text-xs text-gray-500">{formatDate(activity.createdAt, true)}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-5 text-center text-gray-500">
                Bu kriterlere uygun aktivite bulunamadı.
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="transfers">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Transfer Raporu</h3>
              <p className="mt-1 text-sm text-gray-500">
                {reportPeriod === 'all' ? 'Tüm zamanlar' : 
                 reportPeriod === 'today' ? 'Bugün' : 
                 reportPeriod === 'week' ? 'Son hafta' : 'Son ay'} için transfer işlemleri
              </p>
            </div>
            
            {Object.keys(groupedTransfers).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tarih
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kimden
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nereye
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transfer Tarihi
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notlar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransfers.map((transfer) => (
                      <tr key={transfer.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transfer.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transfer.fromLocation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transfer.toLocation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transfer.transferDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {transfer.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-5 text-center text-gray-500">
                Bu zaman aralığında transfer bulunamadı.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}