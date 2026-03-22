import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpeg";

const modules = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Agenda", href: "/agenda" },
  { label: "Clientes", href: "/clientes" },
  { label: "Financeiro", href: "/financeiro" },
  { label: "Estoque", href: "/estoque" },
  { label: "Vendas", href: "/vendas" },
];

const links = [
  { label: "Termos de Uso", href: "#" },
  { label: "Política de Privacidade", href: "#" },
  { label: "Suporte", href: "#" },
];

export const Footer = () => {
  return (
    <footer className="py-16 border-t border-[#1a1a1a]" style={{ background: '#0A0A0A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logo} alt="DetailerOS" className="w-8 h-8 rounded-lg object-contain" />
              <span className="font-display font-bold text-foreground">
                Detailer<span className="text-primary">OS</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O sistema de gestão completo para estéticas automotivas que querem crescer com controle e inteligência.
            </p>
          </div>

          {/* Modules */}
          <div>
            <h4 className="font-display font-semibold text-sm text-foreground mb-4">Módulos</h4>
            <ul className="space-y-2">
              {modules.map((m) => (
                <li key={m.label}>
                  <Link to={m.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold text-sm text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-sm text-foreground mb-4">Contato</h4>
            <p className="text-sm text-muted-foreground">suporte@detaileros.com.br</p>
          </div>
        </div>

        <div className="pt-8 border-t border-[#1a1a1a] text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} DetailerOS. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
