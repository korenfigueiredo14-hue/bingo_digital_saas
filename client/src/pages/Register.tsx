import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User, Dices } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const utils = trpc.useUtils();

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      toast.success("Conta criada com sucesso! Bem-vindo!");
      navigate("/dashboard");
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
    registerMutation.mutate({ name, email, password });
  }

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
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: Math.random() * 2 + 0.5,
          height: Math.random() * 2 + 0.5,
          borderRadius: "50%",
          background: "#fff",
          opacity: Math.random() * 0.5 + 0.1,
          pointerEvents: "none",
        }} />
      ))}

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
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
              Preencha os dados para começar a usar o Bingo Digital
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label htmlFor="name" style={{ color: "#90caf9", fontSize: 13 }}>
                  <User size={13} style={{ display: "inline", marginRight: 4 }} />
                  Nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  style={{
                    background: "rgba(20, 40, 80, 0.8)",
                    border: "1px solid rgba(30, 144, 255, 0.3)",
                    color: "#fff", borderRadius: 8,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label htmlFor="email" style={{ color: "#90caf9", fontSize: 13 }}>
                  <Mail size={13} style={{ display: "inline", marginRight: 4 }} />
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{
                    background: "rgba(20, 40, 80, 0.8)",
                    border: "1px solid rgba(30, 144, 255, 0.3)",
                    color: "#fff", borderRadius: 8,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label htmlFor="password" style={{ color: "#90caf9", fontSize: 13 }}>
                  <Lock size={13} style={{ display: "inline", marginRight: 4 }} />
                  Senha (mínimo 6 caracteres)
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{
                    background: "rgba(20, 40, 80, 0.8)",
                    border: "1px solid rgba(30, 144, 255, 0.3)",
                    color: "#fff", borderRadius: 8,
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label htmlFor="confirm" style={{ color: "#90caf9", fontSize: 13 }}>
                  <Lock size={13} style={{ display: "inline", marginRight: 4 }} />
                  Confirmar senha
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  style={{
                    background: "rgba(20, 40, 80, 0.8)",
                    border: confirm && confirm !== password
                      ? "1px solid rgba(239, 68, 68, 0.6)"
                      : "1px solid rgba(30, 144, 255, 0.3)",
                    color: "#fff", borderRadius: 8,
                  }}
                />
                {confirm && confirm !== password && (
                  <span style={{ color: "#ef4444", fontSize: 11 }}>As senhas não coincidem</span>
                )}
              </div>

              <Button
                type="submit"
                disabled={registerMutation.isPending}
                style={{
                  background: "linear-gradient(90deg, #1565c0, #1e90ff)",
                  border: "none", borderRadius: 8,
                  height: 44, fontSize: 15, fontWeight: 700,
                  color: "#fff", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(30, 144, 255, 0.4)",
                  marginTop: 4,
                }}
              >
                {registerMutation.isPending ? (
                  <><Loader2 size={16} className="animate-spin" style={{ marginRight: 8 }} />Criando conta...</>
                ) : "Criar Conta"}
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
