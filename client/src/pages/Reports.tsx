import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { 
  PieChart, 
  Pie, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { ServerStatus } from '@shared/schema';

interface ServerStats {
  total: number;
  active: number;
  transit: number;
  setup: number;
  passive: number;
  shippable: number;
}

interface ServerCountByLocation {
  locationName: string;
  count: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const STATUS_COLORS = {
  [ServerStatus.ACTIVE]: '#4ade80',   // green
  [ServerStatus.TRANSIT]: '#facc15',  // yellow
  [ServerStatus.SETUP]: '#60a5fa',    // blue
  [ServerStatus.PASSIVE]: '#94a3b8',  // slate
  [ServerStatus.SHIPPABLE]: '#f97316' // orange
};

const STATUS_LABELS = {
  [ServerStatus.ACTIVE]: 'Aktif',
  [ServerStatus.TRANSIT]: 'Transfer Sürecinde',
  [ServerStatus.SETUP]: 'Kurulum Aşamasında',
  [ServerStatus.PASSIVE]: 'Pasif',
  [ServerStatus.SHIPPABLE]: 'Gönderilebilir'
};

export default function Reports() {
  const { toast } = useToast();
  const [serversByLocation, setServersByLocation] = useState<ServerCountByLocation[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);

  // Fetch server statistics
  const { data: stats, isLoading } = useQuery<ServerStats>({
    queryKey: ['/api/stats'],
  });

  // Fetch all servers
  const { data: servers } = useQuery<any[]>({
    queryKey: ['/api/servers'],
  });

  // Fetch all locations
  const { data: locations } = useQuery<any[]>({
    queryKey: ['/api/locations'],
  });

  // Fetch all activities
  const { data: activities } = useQuery<any[]>({
    queryKey: ['/api/activities'],
  });

  useEffect(() => {
    if (servers && locations && Array.isArray(servers) && Array.isArray(locations)) {
      // Group servers by location
      const locationCounts: Record<number, number> = {};
      
      servers.forEach((server: any) => {
        const locationId = server.locationId;
        if (locationId) {
          if (locationCounts[locationId]) {
            locationCounts[locationId]++;
          } else {
            locationCounts[locationId] = 1;
          }
        }
      });
      
      // Map to required format
      const serversByLocationData = Object.entries(locationCounts).map(([locationId, count]) => {
        const location = locations.find((loc: any) => loc.id === parseInt(locationId));
        return {
          locationName: location ? location.name : `Lokasyon #${locationId}`,
          count
        };
      });
      
      setServersByLocation(serversByLocationData);
    }
  }, [servers, locations]);

  useEffect(() => {
    if (activities) {
      // Group activities by month and count types
      const timelineMap = new Map();
      
      activities.forEach((activity: any) => {
        const date = new Date(activity.createdAt);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!timelineMap.has(monthYear)) {
          timelineMap.set(monthYear, {
            date: monthYear,
            add: 0,
            transfer: 0,
            setup: 0,
            maintenance: 0,
            note: 0
          });
        }
        
        const monthData = timelineMap.get(monthYear);
        if (activity.type in monthData) {
          monthData[activity.type]++;
        }
      });
      
      // Convert to array and sort by date
      const timelineDataArray = Array.from(timelineMap.values());
      timelineDataArray.sort((a, b) => {
        const [aMonth, aYear] = a.date.split('/').map(Number);
        const [bMonth, bYear] = b.date.split('/').map(Number);
        
        if (aYear !== bYear) return aYear - bYear;
        return aMonth - bMonth;
      });
      
      setTimelineData(timelineDataArray);
    }
  }, [activities]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  // Prepare data for status pie chart
  const statusData = stats ? [
    { name: STATUS_LABELS[ServerStatus.ACTIVE], value: stats.active, color: STATUS_COLORS[ServerStatus.ACTIVE] },
    { name: STATUS_LABELS[ServerStatus.TRANSIT], value: stats.transit, color: STATUS_COLORS[ServerStatus.TRANSIT] },
    { name: STATUS_LABELS[ServerStatus.SETUP], value: stats.setup, color: STATUS_COLORS[ServerStatus.SETUP] },
    { name: STATUS_LABELS[ServerStatus.PASSIVE], value: stats.passive, color: STATUS_COLORS[ServerStatus.PASSIVE] },
    { name: STATUS_LABELS[ServerStatus.SHIPPABLE], value: stats.shippable, color: STATUS_COLORS[ServerStatus.SHIPPABLE] }
  ] : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 bg-gradient-to-r from-primary-600 to-purple-600 text-transparent bg-clip-text">
        Grafiksel Sunucu Analizi
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Stats Cards */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 transform transition-transform duration-300 hover:scale-105">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Sunucu Sayıları</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg p-4 shadow-md">
              <h3 className="font-medium">Toplam</h3>
              <p className="text-3xl font-bold mt-2">{stats?.total || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg p-4 shadow-md">
              <h3 className="font-medium">Aktif</h3>
              <p className="text-3xl font-bold mt-2">{stats?.active || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white rounded-lg p-4 shadow-md">
              <h3 className="font-medium">Kurulumda</h3>
              <p className="text-3xl font-bold mt-2">{stats?.setup || 0}</p>
            </div>
          </div>
        </div>
        
        {/* Status Pie Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 transform transition-transform duration-300 hover:scale-105">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Sunucu Durum Dağılımı</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} Sunucu`, 'Miktar']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Servers by Location Bar Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 transform transition-transform duration-300 hover:scale-105">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Lokasyonlara Göre Sunucu Dağılımı</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={serversByLocation}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="locationName" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60} 
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} Sunucu`, 'Miktar']} />
                <Bar dataKey="count" fill="#8884d8" name="Sunucu Sayısı">
                  {serversByLocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Activity Timeline */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-100 transform transition-transform duration-300 hover:scale-105">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Aktivite Zaman Çizelgesi</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={timelineData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="add" stroke="#8884d8" name="Ekleme" strokeWidth={2} />
                <Line type="monotone" dataKey="transfer" stroke="#82ca9d" name="Transfer" strokeWidth={2} />
                <Line type="monotone" dataKey="note" stroke="#ffc658" name="Not" strokeWidth={2} />
                <Line type="monotone" dataKey="setup" stroke="#ff7300" name="Kurulum" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Additional Information Section */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-lg shadow-xl p-8 mb-10">
        <h2 className="text-2xl font-bold mb-4">Sunucu Durumu Özeti</h2>
        <p className="mb-4">
          Sunucu envanterinizde toplam <span className="font-bold text-yellow-300">{stats?.total}</span> adet sunucu bulunmaktadır.
          Bunların <span className="font-bold text-green-300">{stats?.active}</span> tanesi aktif durumdadır.
        </p>
        <div className="flex flex-wrap gap-4 mt-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex-1">
            <h3 className="font-semibold text-lg">Transit</h3>
            <p className="text-2xl font-bold">{stats?.transit}</p>
            <p className="text-sm opacity-80">Transfer sürecinde olan sunucular</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex-1">
            <h3 className="font-semibold text-lg">Kurulum</h3>
            <p className="text-2xl font-bold">{stats?.setup}</p>
            <p className="text-sm opacity-80">Kurulum aşamasındaki sunucular</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex-1">
            <h3 className="font-semibold text-lg">Gönderilebilir</h3>
            <p className="text-2xl font-bold">{stats?.shippable}</p>
            <p className="text-sm opacity-80">Sevkiyata hazır sunucular</p>
          </div>
        </div>
      </div>
      
      <div className="text-center text-gray-600 mt-8">
        <p>Son güncelleme: {new Date().toLocaleString('tr-TR')}</p>
      </div>
    </div>
  );
}