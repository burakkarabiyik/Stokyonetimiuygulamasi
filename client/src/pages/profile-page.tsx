import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Form şemaları
const profileSchema = z.object({
  name: z.string().nullable().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifre gereklidir"),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalıdır"),
  confirmPassword: z.string().min(1, "Şifre tekrarı gereklidir"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, updateProfileMutation, changePasswordMutation } = useAuth();

  // Profil formu
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  // Şifre formu
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Kullanıcı verisi değiştiğinde formu güncelle
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
      });
    }
  }, [user, profileForm]);

  // Submit handlers
  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate({ name: data.name || "" });
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    
    // Başarılı olduğunda formu sıfırla
    if (!changePasswordMutation.error) {
      passwordForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Profil Ayarları</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Kullanıcı Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Bilgileri</CardTitle>
            <CardDescription>Profilinizi görüntüleyin ve düzenleyin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Kullanıcı Adı</Label>
              <div className="p-2 border rounded-md bg-gray-50">{user?.username || "Yükleniyor..."}</div>
            </div>
            
            <div className="space-y-1">
              <Label>Rol</Label>
              <div className="p-2 border rounded-md bg-gray-50 capitalize">{user?.role || "Yükleniyor..."}</div>
            </div>
          </CardContent>
        </Card>
        
        {/* Profil ve Şifre Güncellemeleri */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="password">Şifre</TabsTrigger>
          </TabsList>
          
          {/* Profil Düzenleme */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profil Bilgilerini Düzenle</CardTitle>
                <CardDescription>
                  İsim bilgilerinizi güncelleyin.
                </CardDescription>
              </CardHeader>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">İsim</Label>
                    <Input 
                      id="name" 
                      placeholder="Adınız ve soyadınız" 
                      {...profileForm.register("name")} 
                    />
                    {profileForm.formState.errors.name && (
                      <p className="text-sm text-red-500">{profileForm.formState.errors.name.message}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Güncelleniyor..." : "Güncelle"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          {/* Şifre Değiştirme */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Şifre Değiştir</CardTitle>
                <CardDescription>
                  Hesabınızın şifresini güncelleyin.
                </CardDescription>
              </CardHeader>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      placeholder="Mevcut şifreniz" 
                      {...passwordForm.register("currentPassword")} 
                    />
                    {passwordForm.formState.errors.currentPassword && (
                      <p className="text-sm text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Yeni Şifre</Label>
                    <Input 
                      id="newPassword" 
                      type="password" 
                      placeholder="Yeni şifreniz" 
                      {...passwordForm.register("newPassword")} 
                    />
                    {passwordForm.formState.errors.newPassword && (
                      <p className="text-sm text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Şifre Tekrarı</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password"
                      placeholder="Şifrenizi tekrar girin" 
                      {...passwordForm.register("confirmPassword")} 
                    />
                    {passwordForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? "Şifre Değiştiriliyor..." : "Şifre Değiştir"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}