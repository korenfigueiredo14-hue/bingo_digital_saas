import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Plus,
  UserCheck,
  UserX,
  ShieldCheck,
  Store,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:  { label: "Admin",    color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  seller: { label: "Vendedor", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  user:   { label: "Usuário",  color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export default function AdminUsers() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.admin.listUsers.useQuery();
  const [showCreate, setShowCreate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [estName, setEstName] = useState("");
  const [estPhone, setEstPhone] = useState("");

  const createMutation = trpc.admin.createSeller.useMutation({
    onSuccess: () => {
      toast.success("Vendedor criado com sucesso!");
      utils.admin.listUsers.invalidate();
      setShowCreate(false);
      setName(""); setEmail(""); setPassword(""); setEstName(""); setEstPhone("");
    },
    onError: (err) => toast.error(err.message),
  });

  const setRoleMutation = trpc.admin.setUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role atualizado!");
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const setActiveMutation = trpc.admin.setUserActive.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "Usuário ativado!" : "Usuário bloqueado!");
      utils.admin.listUsers.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const sellers = users?.filter((u) => u.role === "seller") ?? [];
  const admins = users?.filter((u) => u.role === "admin") ?? [];
  const others = users?.filter((u) => u.role === "user") ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Gerenciar Usuários</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {users?.length ?? 0} usuário(s) cadastrado(s) · {sellers.length} vendedor(es)
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Novo Vendedor
          </Button>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, label: "Admins",    value: admins.length,  color: "text-purple-400" },
            { icon: Store,       label: "Vendedores", value: sellers.length, color: "text-blue-400" },
            { icon: Users,       label: "Usuários",   value: others.length,  color: "text-gray-400" },
          ].map((s) => (
            <Card key={s.label} className="bg-card border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`w-6 h-6 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabela de usuários */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Todos os Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : !users?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum usuário cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => {
                  const roleInfo = ROLE_LABELS[u.role ?? "user"] ?? ROLE_LABELS.user;
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        u.isActive ? "bg-secondary/50 border-border/30" : "bg-red-950/20 border-red-900/30 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {(u.name ?? "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{u.name ?? "—"}</p>
                            {!u.isActive && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Bloqueado</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</p>
                          {u.establishmentName && (
                            <p className="text-xs text-blue-400 truncate">🏪 {u.establishmentName}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge className={`text-xs border hidden sm:flex ${roleInfo.color}`}>
                          {roleInfo.label}
                        </Badge>

                        <Select
                          value={u.role ?? "user"}
                          onValueChange={(role) => setRoleMutation.mutate({ userId: u.id, role: role as any })}
                        >
                          <SelectTrigger className="h-7 w-28 text-xs bg-background border-border/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="seller">Vendedor</SelectItem>
                            <SelectItem value="user">Usuário</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 ${u.isActive ? "text-red-400 hover:text-red-300" : "text-green-400 hover:text-green-300"}`}
                          onClick={() => setActiveMutation.mutate({ userId: u.id, isActive: !u.isActive })}
                          title={u.isActive ? "Bloquear usuário" : "Ativar usuário"}
                        >
                          {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal criar vendedor */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" /> Criar Novo Vendedor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nome completo *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do vendedor" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">E-mail *</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" type="email" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Senha *</Label>
              <div className="relative mt-1">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <div className="border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground mb-2">Dados do Estabelecimento (opcional)</p>
              <div className="space-y-2">
                <Input value={estName} onChange={(e) => setEstName(e.target.value)} placeholder="Nome do estabelecimento" />
                <Input value={estPhone} onChange={(e) => setEstPhone(e.target.value)} placeholder="Telefone do estabelecimento" />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => createMutation.mutate({ name, email, password, establishmentName: estName, establishmentPhone: estPhone })}
              disabled={createMutation.isPending || !name || !email || !password}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar Vendedor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
