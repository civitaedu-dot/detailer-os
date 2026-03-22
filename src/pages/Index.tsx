import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { Problems } from "@/components/landing/Problems";
import { Features } from "@/components/landing/Features";
import { SocioIA } from "@/components/landing/SocioIA";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A' }}>
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Problems />
        <section id="features">
          <Features />
        </section>
        <SocioIA />
        <section id="pricing">
          <Pricing />
        </section>
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
