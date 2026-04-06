import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Dices, Store, ShieldCheck } from "lucide-react";

type LoginMode = "admin" | "seller";

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<LoginMode>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.loginLocal.useMutation({
    onSuccess: async (data) => {
      await utils.auth.me.invalidate();
      toast.success("Login realizado com sucesso!");
      // Redirecionar baseado no role retornado pelo servidor
      if (data.role === "seller") {
        navigate("/seller");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (err) => {
      toast.error(err.message ?? "E-mail ou senha inválidos");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    loginMutation.mutate({ email, password });
  }

  const inputStyle = {
    background: "rgba(20, 40, 80, 0.8)",
    border: "1px solid rgba(30, 144, 255, 0.3)",
    color: "#fff",
    borderRadius: 8,
  };

  const isSeller = mode === "seller";

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

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
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
            Plataforma de Bingo Online
          </p>
        </div>

        {/* Seletor de modo */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
          marginBottom: 16,
        }}>
          <button
            type="button"
            onClick={() => setMode("admin")}
            style={{
              padding: "12px 8px",
              borderRadius: 10,
              border: !isSeller ? "2px solid #1e90ff" : "2px solid rgba(30, 144, 255, 0.2)",
              background: !isSeller ? "rgba(30, 144, 255, 0.15)" : "rgba(10, 22, 55, 0.7)",
              color: "#fff",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s",
            }}
          >
            <ShieldCheck size={20} style={{ margin: "0 auto 4px", color: !isSeller ? "#1e90ff" : "#5a7aaa" }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: !isSeller ? "#fff" : "#5a7aaa" }}>Administrador</div>
          </button>
          <button
            type="button"
            onClick={() => setMode("seller")}
            style={{
              padding: "12px 8px",
              borderRadius: 10,
              border: isSeller ? "2px solid #22c55e" : "2px solid rgba(30, 144, 255, 0.2)",
              background: isSeller ? "rgba(34, 197, 94, 0.12)" : "rgba(10, 22, 55, 0.7)",
              color: "#fff",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s",
            }}
          >
            <Store size={20} style={{ margin: "0 auto 4px", color: isSeller ? "#22c55e" : "#5a7aaa" }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: isSeller ? "#fff" : "#5a7aaa" }}>Vendedor</div>
          </button>
        </div>

        <Card style={{
          background: "rgba(10, 22, 55, 0.92)",
          border: `1px solid ${isSeller ? "rgba(34, 197, 94, 0.25)" : "rgba(30, 144, 255, 0.25)"}`,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)",
        }}>
          <CardHeader style={{ paddingBottom: 8 }}>
            <CardTitle style={{ color: "#fff", fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}>
              {isSeller
                ? <><Store size={18} color="#22c55e" /> Acesso do Vendedor</>
                : <><ShieldCheck size={18} color="#1e90ff" /> Acesso do Administrador</>
              }
            </CardTitle>
            <CardDescription style={{ color: "#90caf9" }}>
              {isSeller
                ? "Entre com sua conta de vendedor para acessar as cartelas"
                : "Acesse o painel de controle do bingo"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                  Senha
                </Label>
                <Input id="password" type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={inputStyle} />
              </div>

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                style={{
                  background: isSeller
                    ? "linear-gradient(90deg, #16a34a, #22c55e)"
                    : "linear-gradient(90deg, #1565c0, #1e90ff)",
                  border: "none", borderRadius: 8,
                  height: 44, fontSize: 15, fontWeight: 700,
                  color: "#fff", cursor: "pointer",
                  boxShadow: isSeller
                    ? "0 4px 20px rgba(34, 197, 94, 0.3)"
                    : "0 4px 20px rgba(30, 144, 255, 0.4)",
                  marginTop: 4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {loginMutation.isPending ? (
                  <><Loader2 size={16} className="animate-spin" />Entrando...</>
                ) : (
                  isSeller ? "Entrar como Vendedor" : "Entrar como Administrador"
                )}
              </Button>
            </form>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <span style={{ color: "#5a7aaa", fontSize: 13 }}>Não tem conta? </span>
              <button
                onClick={() => navigate("/register")}
                style={{
                  background: "none", border: "none",
                  color: "#1e90ff", cursor: "pointer",
                  fontSize: 13, fontWeight: 700,
                  textDecoration: "underline",
                }}
              >
                Criar conta grátis
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
