import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot } from "lucide-react";
import { Link } from "react-router-dom";

export const CTA = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-8 shadow-accent-glow">
            <Bot className="w-8 h-8 text-primary-foreground" />
          </div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Pronto para ter um{" "}
            <span className="text-gradient-primary">sócio inteligente</span>?
          </h2>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Comece agora e tenha clareza total sobre seu negócio. 
            O Sócio IA está pronto para ajudar você a faturar mais e lucrar melhor.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="hero" size="xl">
              <Link to="/cadastro">
                Começar agora
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button asChild variant="outlinePrimary" size="xl">
              <Link to="/login">
                Já tenho conta
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};