import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Kong API Gateway öneki için yardımcı fonksiyon
function getApiUrl(url: string): string {
  // Eğer url zaten tam bir URL ise (http:// veya https:// ile başlıyorsa), değiştirme
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Eğer url zaten /stok ile başlıyorsa, değiştirme
  if (url.startsWith('/stok/')) {
    return url;
  }
  
  // Eğer url / ile başlıyorsa, /stok ekle
  if (url.startsWith('/')) {
    // API endpointi ise /stok önekini ekle
    if (url.startsWith('/api/')) {
      return `/stok${url}`;
    }
    // Diğer endpoint'ler için de /stok ekle
    return `/stok${url}`;
  }
  
  // Eğer url / ile başlamıyorsa, /stok/ ekle
  return `/stok/${url}`;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get the JWT token from localStorage
  const token = localStorage.getItem('jwt_token');
  
  // Prepare headers
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Convert date objects to ISO strings for request
  let processedData = data;
  if (data) {
    processedData = Object.entries(data).reduce((acc, [key, value]) => {
      // Check if the value is a Date object and convert it to ISO string
      acc[key] = value instanceof Date ? value.toISOString() : value;
      return acc;
    }, {} as Record<string, any>);
  }
  
  // Kong API Gateway önekini ekle
  const apiUrl = getApiUrl(url);
  
  const res = await fetch(apiUrl, {
    method,
    headers,
    body: processedData ? JSON.stringify(processedData) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get the JWT token from localStorage
    const token = localStorage.getItem('jwt_token');
    
    // Prepare headers
    const headers: HeadersInit = {};
    
    // Add Authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Kong API Gateway önekini ekle
    const url = queryKey[0] as string;
    const apiUrl = getApiUrl(url);
    
    const res = await fetch(apiUrl, {
      headers
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
