import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="py-12 bg-card border-t border-border">
      <div className="container px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <span className="font-display font-bold text-primary-foreground">D</span>
            </div>
            <span className="font-display font-semibold">
              Detailer<span className="text-primary">OS</span>
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Privacidade
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Suporte
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © 2025 DetailerOS. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};