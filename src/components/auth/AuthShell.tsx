import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Sparkles, LineChart } from "lucide-react";

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** Optional node rendered above the card (e.g. progress indicator) */
  aside?: ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}

const widths = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export const AuthShell = ({ children, title, subtitle, aside, maxWidth = "sm" }: AuthShellProps) => {
  return (
    <div className="relative min-h-[100dvh] bg-gradient-hero overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -right-24 w-[380px] h-[380px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-24 w-[380px] h-[380px] rounded-full bg-primary/10 blur-[130px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-[100dvh] px-4 py-6 sm:py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 sm:mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o início
        </Link>

        <div className={`w-full ${widths[maxWidth]} mx-auto flex-1 flex flex-col justify-center pb-8`}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center mb-6">
              <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-primary items-center justify-center mb-4 shadow-lg">
                <span className="font-display font-bold text-primary-foreground text-xl">D</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-muted-foreground mt-2 text-sm sm:text-base">{subtitle}</p>
              )}
            </div>

            {aside}

            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 sm:p-8 shadow-xl">
              {children}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] sm:text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Dados protegidos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LineChart className="w-3.5 h-3.5 text-primary" /> Gestão financeira
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Sócio IA incluso
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};