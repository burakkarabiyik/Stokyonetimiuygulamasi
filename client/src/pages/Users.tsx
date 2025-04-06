import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, UserRole } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Search,
  RefreshCw,
  PlusCircle,
  UserPlus,
  UserCog,
  Key,
  MoreHorizontal,
  Trash2,
  AlertCircle,
  Shield,
  CheckCircle2,
  User as UserIcon,
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDate } from "@/lib/utils";

// Form şemaları
const createUserSchema = z.object({
  username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  fullName: z.string().optional(),
  email: z.string().email("Geçerli bir e-posta adresi girin").optional(),
  role: z.enum([UserRole.ADMIN, UserRole.USER]),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
  confirmPassword: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function Users() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modaller
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Kullanıcıları çek
  const { data: users = [], isLoading, error } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!user?.role && user.role === UserRole.ADMIN,
  });

  // Arama ve filtreleme
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      (user.fullName && user.fullName.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower))
    );
  });

  // Kullanıcı oluşturma formu
  const {
    register: registerCreateUser,
    handleSubmit: handleSubmitCreateUser,
    formState: { errors: createUserErrors },
    reset: resetCreateUserForm,
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: UserRole.USER,
    },
  });

  // Şifre sıfırlama formu
  const {
    register: registerResetPassword,
    handleSubmit: handleSubmitResetPassword,
    formState: { errors: resetPasswordErrors },
    reset: resetResetPasswordForm,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Kullanıcı oluşturma mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const response = await apiRequest("POST", "/api/users", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kullanıcı oluşturulurken bir hata oluştu");
      }
      return await response.json() as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Kullanıcı oluşturuldu",
        description: "Yeni kullanıcı başarıyla oluşturuldu.",
      });
      setShowCreateModal(false);
      resetCreateUserForm();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Kullanıcı oluşturulurken bir hata oluştu.",
      });
    }
  });

  // Şifre sıfırlama mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number, password: string }) => {
      const response = await apiRequest("POST", `/api/users/${userId}/reset-password`, { password });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Şifre sıfırlanırken bir hata oluştu");
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Şifre sıfırlandı",
        description: "Kullanıcı şifresi başarıyla sıfırlandı.",
      });
      setShowResetPasswordModal(false);
      resetResetPasswordForm();
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Şifre sıfırlanırken bir hata oluştu.",
      });
    }
  });

  // Kullanıcı silme mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("DELETE", `/api/users/${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Kullanıcı silinirken bir hata oluştu");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Kullanıcı silindi",
        description: "Kullanıcı başarıyla silindi.",
      });
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Kullanıcı silinirken bir hata oluştu.",
      });
    }
  });

  // Form işleyicileri
  const onCreateUser = (data: CreateUserFormData) => {
    createUserMutation.mutate(data);
  };

  const onResetPassword = (data: ResetPasswordFormData) => {
    if (selectedUser) {
      resetPasswordMutation.mutate({ userId: selectedUser.id, password: data.password });
    }
  };

  const onDeleteUser = () => {
    if (selectedUser) {
      deleteUserMutation.mutate(selectedUser.id);
    }
  };

  // Şifre sıfırlama işlemi
  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    setShowResetPasswordModal(true);
  };

  // Silme işlemi
  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  // Kullanıcı admin kontrolü
  if (!user || user.role !== UserRole.ADMIN) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Yetkisiz Erişim</AlertTitle>
        <AlertDescription>
          Bu sayfaya erişmek için yönetici haklarına sahip olmanız gerekmektedir.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Hata</AlertTitle>
        <AlertDescription>
          Kullanıcı bilgileri yüklenirken bir hata oluştu.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kullanıcı Yönetimi</h1>
          <p className="text-muted-foreground">
            Sisteme erişim yetkisi olan kullanıcıları yönetin.
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Yeni Kullanıcı</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Kullanıcılar</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Kullanıcı ara..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserIcon className="h-12 w-12 text-muted-foreground/60 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Kullanıcı Bulunamadı</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                {searchQuery
                  ? "Arama kriterlerinize uygun kullanıcı bulunamadı."
                  : "Sistemde henüz kullanıcı bulunmuyor. Yeni kullanıcı ekleyin."}
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Yeni Kullanıcı Ekle
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kullanıcı Adı</TableHead>
                    <TableHead>Ad Soyad</TableHead>
                    <TableHead>E-posta</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Kayıt Tarihi</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.fullName || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        {user.role === UserRole.ADMIN ? (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 gap-1">
                            <Shield className="h-3 w-3" />
                            <span>Yönetici</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <UserIcon className="h-3 w-3" />
                            <span>Kullanıcı</span>
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Menüyü aç</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleResetPassword(user)}
                              className="gap-2"
                            >
                              <Key className="h-4 w-4" />
                              <span>Şifre Sıfırla</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(user)}
                              className="text-red-600 focus:text-red-600 gap-2"
                              disabled={user.id === user.id} // Kendini silmeyi engelle
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Kullanıcıyı Sil</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni Kullanıcı Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
            <DialogDescription>
              Sisteme erişebilecek yeni bir kullanıcı oluşturun.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitCreateUser(onCreateUser)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Kullanıcı Adı <span className="text-red-500">*</span></Label>
                <Input
                  id="username"
                  {...registerCreateUser("username")}
                  autoComplete="username"
                />
                {createUserErrors.username && (
                  <p className="text-sm text-red-500">
                    {createUserErrors.username.message}
                  </p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Şifre <span className="text-red-500">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  {...registerCreateUser("password")}
                  autoComplete="new-password"
                />
                {createUserErrors.password && (
                  <p className="text-sm text-red-500">
                    {createUserErrors.password.message}
                  </p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="fullName">Ad Soyad</Label>
                <Input
                  id="fullName"
                  {...registerCreateUser("fullName")}
                />
                {createUserErrors.fullName && (
                  <p className="text-sm text-red-500">
                    {createUserErrors.fullName.message}
                  </p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  {...registerCreateUser("email")}
                  autoComplete="email"
                />
                {createUserErrors.email && (
                  <p className="text-sm text-red-500">
                    {createUserErrors.email.message}
                  </p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="role">Kullanıcı Rolü <span className="text-red-500">*</span></Label>
                <Select 
                  defaultValue={UserRole.USER}
                  onValueChange={(value) => {
                    // Bu hack react-hook-form'un Select ile çalışabilmesi için
                    const event = {
                      target: { name: "role", value }
                    } as React.ChangeEvent<HTMLSelectElement>;
                    registerCreateUser("role").onChange(event);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.USER}>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        <span>Kullanıcı</span>
                      </div>
                    </SelectItem>
                    <SelectItem value={UserRole.ADMIN}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>Yönetici</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {createUserErrors.role && (
                  <p className="text-sm text-red-500">
                    {createUserErrors.role.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                disabled={createUserMutation.isPending}
              >
                İptal
              </Button>
              <Button 
                type="submit"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Oluşturuluyor...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Kullanıcı Oluştur</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Şifre Sıfırlama Modal */}
      <Dialog open={showResetPasswordModal} onOpenChange={setShowResetPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Şifre Sıfırlama</DialogTitle>
            <DialogDescription>
              {selectedUser?.username} kullanıcısı için yeni bir şifre belirleyin.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitResetPassword(onResetPassword)}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">Yeni Şifre</Label>
                <Input
                  id="new-password"
                  type="password"
                  {...registerResetPassword("password")}
                  autoComplete="new-password"
                />
                {resetPasswordErrors.password && (
                  <p className="text-sm text-red-500">
                    {resetPasswordErrors.password.message}
                  </p>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Yeni Şifre (Tekrar)</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  {...registerResetPassword("confirmPassword")}
                  autoComplete="new-password"
                />
                {resetPasswordErrors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {resetPasswordErrors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowResetPasswordModal(false)}
                disabled={resetPasswordMutation.isPending}
              >
                İptal
              </Button>
              <Button 
                type="submit"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Şifre Sıfırlanıyor...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span>Şifreyi Sıfırla</span>
                  </div>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Modalı */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcıyı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. {selectedUser?.username} kullanıcısını silmek istediğinizden emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteUserMutation.isPending}>
              İptal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteUserMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Siliniyor...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  <span>Kullanıcıyı Sil</span>
                </div>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}