import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.jpeg";

const TrialExpired = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-md w-full text-center space-y-6"
      >
        <div className="flex justify-center">
          <img src={logo} alt="DetailerOS" className="w-16 h-16 rounded-xl object-contain" />
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-destructive" />
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold mb-2">
              Período gratuito encerrado
            </h1>
            <p className="text-muted-foreground text-sm">
              Olá, {profile?.name?.split(" ")[0] || "Usuário"}! Seu período de teste gratuito de 14 dias chegou ao fim.
              Para continuar utilizando o DetailerOS, escolha um plano pago.
            </p>
          </div>

          <div className="bg-secondary/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              ✅ Seus dados foram preservados e estarão disponíveis assim que você assinar um plano.
            </p>
          </div>

          <div className="space-y-3">
            <Button className="w-full" size="lg" asChild>
              <Link to="/planos">
                Ver planos e assinar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full text-muted-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TrialExpired;
