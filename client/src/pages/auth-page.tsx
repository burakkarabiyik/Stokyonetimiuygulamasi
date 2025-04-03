import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Login form şeması
const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı gereklidir"),
  password: z.string().min(1, "Şifre gereklidir"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation } = useAuth();

  // Zaten giriş yapmışsa anasayfaya yönlendir
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login formu
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Submit handler
  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full space-y-8 flex">
        {/* Hero Section */}
        <div className="flex-1 hidden md:block bg-gradient-to-r from-primary-500 to-primary-700 text-white p-12 rounded-l-xl">
          <div className="h-full flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-4">Sunucu Takip Sistemi</h1>
              <p className="text-xl mb-6">
                Sunucularınızı, donanımlarınızı ve ağ cihazlarınızı tek bir platformdan takip edin.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sunucu envanterini düzenleyin
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Transfer süreçlerini takip edin
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  IP bilgilerini güvenle saklayın
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Raporlar ile durumu analiz edin
                </li>
              </ul>
            </div>
            
            <div className="text-sm opacity-75">
              © 2023 Sunucu Takip Sistemi. Tüm hakları saklıdır.
            </div>
          </div>
        </div>
        
        {/* Auth form */}
        <div className="flex-1 p-8 bg-white rounded-r-xl shadow-xl">
          <Card>
            <CardHeader>
              <CardTitle>Giriş Yap</CardTitle>
              <CardDescription>
                Hesabınıza giriş yaparak sunucu yönetim sistemine erişin.
              </CardDescription>
            </CardHeader>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Kullanıcı Adı</Label>
                  <Input 
                    id="username" 
                    type="text" 
                    placeholder="Kullanıcı adınızı girin" 
                    {...loginForm.register("username")} 
                  />
                  {loginForm.formState.errors.username && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Şifre</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Şifrenizi girin" 
                    {...loginForm.register("password")} 
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Giriş Yapılıyor..." : "Giriş Yap"}
                </Button>
              </CardFooter>
            </form>
            
            <div className="px-6 pb-6">
              <p className="text-sm text-gray-500 mt-4 text-center">
                Default yönetici hesabı: <br />
                <span className="font-semibold">Kullanıcı adı: admin</span> <br />
                <span className="font-semibold">Şifre: admin123</span>
              </p>
              <p className="text-xs text-gray-400 mt-2 text-center">
                İlk girişten sonra güvenlik için şifrenizi değiştirmeniz önerilir.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}