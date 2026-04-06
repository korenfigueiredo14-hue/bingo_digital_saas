import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Dices, Store, ShieldCheck, ChevronRight } from "lucide-react";

type AccountType = "user" | "seller";

export default function Register() {
  const [, navigate] = useLocation();
  const [accountType, setAccountType] = useState<AccountType>("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [establishmentName, setEstablishmentName] = useState("");
  const [establishmentPhone, setEstablishmentPhone] = useState("");

  const utils = trpc.useUtils();

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success("Conta criada com sucesso! Bem-vindo!");
      // Redirecionar baseado no role
      if (data.role === "seller") {
        navigate("/seller");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (err) => {
      if (err.message?.includes("já cadastrado")) {
        toast.error("Este e-mail já está cadastrado. Tente fazer login.");
      } else {
        toast.error(err.message ?? "Erro ao criar conta");
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password || !confirm) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (accountType === "seller" && !establishmentName.trim()) {
      toast.error("Informe o nome do seu estabelecimento");
      return;
    }
    registerMutation.mutate({
      name,
      email,
      password,
      role: accountType,
      establishmentName: accountType === "seller" ? establishmentName : undefined,
      establishmentPhone: accountType === "seller" ? establishmentPhone : undefined,
    });
  }

  const inputStyle = {
    background: "rgba(20, 40, 80, 0.8)",
    border: "1px solid rgba(30, 144, 255, 0.3)",
    color: "#fff",
    borderRadius: 8,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #020c1e 0%, #041637 40%, #071f4e 70%, #0a2762 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Stars decorativas */}
      {Array.from({ length: 60 }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${(i * 17 + 7) % 100}%`,
          top: `${(i * 13 + 5) % 100}%`,
          width: (i % 3) + 0.5,
          height: (i % 3) + 0.5,
          borderRadius: "50%",
          background: "#fff",
          opacity: (i % 5) * 0.1 + 0.1,
          pointerEvents: "none",
        }} />
      ))}

      <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, #1e90ff, #0a2560)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 0 30px #1e90ff44",
          }}>
            <Dices size={32} color="#fff" />
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: "#fff",
            letterSpacing: 2, textTransform: "uppercase",
            background: "linear-gradient(90deg, #fff, #90caf9)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Bingo Digital
          </h1>
          <p style={{ color: "#90caf9", fontSize: 14, marginTop: 4 }}>
            Crie sua conta gratuitamente
          </p>
        </div>

        <Card style={{
          background: "rgba(10, 22, 55, 0.92)",
          border: "1px solid rgba(30, 144, 255, 0.25)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)",
        }}>
          <CardHeader style={{ paddingBottom: 8 }}>
            <CardTitle style={{ color: "#fff", fontSize: 20 }}>Criar Conta</CardTitle>
            <CardDescription style={{ color: "#90caf9" }}>
              Escolha o tipo de conta e preencha os dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Seletor de tipo de conta */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setAccountType("user")}
                style={{
                  padding: "14px 10px",
                  borderRadius: 10,
                  border: accountType === "user"
                    ? "2px solid #1e90ff"
                    : "2px solid rgba(30, 144, 255, 0.2)",
                  background: accountType === "user"
                    ? "rgba(30, 144, 255, 0.15)"
                    : "rgba(20, 40, 80, 0.5)",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s",
                }}
              >
                <ShieldCheck size={24} style={{ margin: "0 auto 6px", color: accountType === "user" ? "#1e90ff" : "#5a7aaa" }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>Administrador</div>
                <div style={{ fontSize: 10, color: "#5a7aaa", marginTop: 2 }}>Cria e opera bingos</div>
              </button>
              <button
                type="button"
                onClick={() => setAccountType("seller")}
                style={{
                  padding: "14px 10px",
                  borderRadius: 10,
                  border: accountType === "seller"
                    ? "2px solid #22c55e"
                    : "2px solid rgba(30, 144, 255, 0.2)",
                  background: accountType === "seller"
                    ? "rgba(34, 197, 94, 0.12)"
                    : "rgba(20, 40, 80, 0.5)",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s",
                }}
              >
                <Store size={24} style={{ margin: "0 auto 6px", color: accountType === "seller" ? "#22c55e" : "#5a7aaa" }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>Vendedor</div>
                <div style={{ fontSize: 10, color: "#5a7aaa", marginTop: 2 }}>Vende cartelas na loja</div>
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label htmlFor="name" style={{ color: "#90caf9", fontSize: 13 }}>
                  <User size={13} style={{ display: "inline", marginRight: 4 }} />
                  Nome completo
                </Label>
                <Input id="name" type="text" placeholder="Seu nome" value={name}
                  onChange={(e) => setName(e.target.value)} autoComplete="name" style={inputStyle} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label htmlFor="email" style={{ color: "#90caf9", fontSize: 13 }}>
                  <Mail size={13} style={{ display: "inline", marginRight: 4 }} />
                  E-mail
                </Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} autoComplete="email" style={inputStyle} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label htmlFor="password" style={{ color: "#90caf9", fontSize: 13 }}>
                  <Lock size={13} style={{ display: "inline", marginRight: 4 }} />
                  Senha (mínimo 6 caracteres)
                </Label>
                <Input id="password" type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" style={inputStyle} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label htmlFor="confirm" style={{ color: "#90caf9", fontSize: 13 }}>
                  <Lock size={13} style={{ display: "inline", marginRight: 4 }} />
                  Confirmar senha
                </Label>
                <Input id="confirm" type="password" placeholder="••••••••" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password"
                  style={{
                    ...inputStyle,
                    border: confirm && confirm !== password
                      ? "1px solid rgba(239, 68, 68, 0.6)"
                      : "1px solid rgba(30, 144, 255, 0.3)",
                  }} />
                {confirm && confirm !== password && (
                  <span style={{ color: "#ef4444", fontSize: 11 }}>As senhas não coincidem</span>
                )}
              </div>

              {/* Campos extras para vendedor */}
              {accountType === "seller" && (
                <div style={{
                  background: "rgba(34, 197, 94, 0.06)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  borderRadius: 10,
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}>
                  <p style={{ color: "#22c55e", fontSize: 12, fontWeight: 600, margin: 0 }}>
                    <Store size={12} style={{ display: "inline", marginRight: 4 }} />
                    Dados do Estabelecimento
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Label style={{ color: "#90caf9", fontSize: 12 }}>Nome do estabelecimento *</Label>
                    <Input placeholder="Ex: Bar do João, Mercado Central..."
                      value={establishmentName} onChange={(e) => setEstablishmentName(e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <Label style={{ color: "#90caf9", fontSize: 12 }}>Telefone (opcional)</Label>
                    <Input placeholder="(00) 00000-0000" value={establishmentPhone}
                      onChange={(e) => setEstablishmentPhone(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={registerMutation.isPending}
                style={{
                  background: accountType === "seller"
                    ? "linear-gradient(90deg, #16a34a, #22c55e)"
                    : "linear-gradient(90deg, #1565c0, #1e90ff)",
                  border: "none", borderRadius: 8,
                  height: 44, fontSize: 15, fontWeight: 700,
                  color: "#fff", cursor: "pointer",
                  boxShadow: accountType === "seller"
                    ? "0 4px 20px rgba(34, 197, 94, 0.3)"
                    : "0 4px 20px rgba(30, 144, 255, 0.4)",
                  marginTop: 4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {registerMutation.isPending ? (
                  <><Loader2 size={16} className="animate-spin" />Criando conta...</>
                ) : (
                  <><ChevronRight size={16} />Criar Conta {accountType === "seller" ? "de Vendedor" : "de Administrador"}</>
                )}
              </Button>
            </form>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <span style={{ color: "#5a7aaa", fontSize: 13 }}>Já tem conta? </span>
              <button
                onClick={() => navigate("/login")}
                style={{
                  background: "none", border: "none",
                  color: "#1e90ff", cursor: "pointer",
                  fontSize: 13, fontWeight: 700,
                  textDecoration: "underline",
                }}
              >
                Fazer login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
