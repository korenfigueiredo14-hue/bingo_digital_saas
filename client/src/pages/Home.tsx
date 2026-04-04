import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Home() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    // Redirecionar por role
    const role = (user as any)?.role ?? "user";
    if (role === "seller") {
      navigate("/seller");
    } else {
      // admin ou user → painel principal
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, user]);

  return (
    <div className="min-h-screen bg-[#050d1a] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-white/50 text-sm">Carregando...</p>
      </div>
    </div>
  );
}
