import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mic, Globe, Zap, Shield, BarChart3, Phone, Sparkles, ArrowRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  { icon: Globe, title: "10+ Indian Languages", desc: "Hindi, Tamil, Bengali, Telugu, Marathi & more — natively." },
  { icon: Zap, title: "Sub-second Latency", desc: "Real-time voice with barge-in. Your callers feel heard." },
  { icon: Shield, title: "Enterprise-grade Security", desc: "RLS, encrypted at rest, SOC2-ready architecture." },
  { icon: BarChart3, title: "Full Call Analytics", desc: "Transcripts, sentiment, conversion — all in one place." },
  { icon: Phone, title: "Inbound + Outbound", desc: "Buy numbers, run campaigns, route to humans on intent." },
  { icon: Sparkles, title: "No-code Agent Builder", desc: "Describe your agent in plain English. We do the rest." },
];

const useCases = [
  { title: "Lead Qualification", color: "primary" },
  { title: "Appointment Booking", color: "accent" },
  { title: "Customer Support", color: "primary" },
  { title: "Loan Collections", color: "accent" },
  { title: "Survey & Feedback", color: "primary" },
  { title: "Order Confirmation", color: "accent" },
];

const plans = [
  { name: "Starter", price: "₹0", desc: "For trying things out", features: ["1 agent", "30 free test calls", "Browser voice testing", "Basic analytics"], cta: "Start free" },
  { name: "Growth", price: "₹4,999", suffix: "/mo", desc: "For growing teams", features: ["10 agents", "5,000 minutes/mo", "Inbound + outbound calls", "Full analytics", "Email support"], cta: "Start trial", featured: true },
  { name: "Enterprise", price: "Custom", desc: "High-volume operations", features: ["Unlimited agents", "Custom voices", "SIP trunking", "SLA & dedicated support", "On-prem option"], cta: "Talk to sales" },
];

const Landing = () => {
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-background/70">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-smooth">Features</a>
            <a href="#use-cases" className="hover:text-foreground transition-smooth">Use cases</a>
            <a href="#pricing" className="hover:text-foreground transition-smooth">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button onClick={() => nav(isAdmin ? "/admin" : "/dashboard")}>Go to dashboard</Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
                <Button variant="hero" asChild><Link to="/signup">Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container py-24 md:py-32 text-center relative">
          <Badge variant="outline" className="mb-6 border-primary/40 bg-primary/10 text-primary-glow">
            <Sparkles className="h-3 w-3 mr-1" /> Voice AI built for Bharat
          </Badge>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
            Human-like <span className="text-gradient-primary">Voice AI agents</span><br />
            for Indian languages
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Build, deploy and scale voice agents that handle sales calls, support and operations — in Hindi, Tamil, Bengali and 10+ Indian languages.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="xl" variant="hero" asChild>
              <Link to="/signup">Start building free <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <a href="#features">See features</a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">No credit card · 30 free test calls · 5 min setup</p>

          {/* Voice viz */}
          <div className="mt-16 relative max-w-2xl mx-auto">
            <div className="absolute inset-0 bg-gradient-primary blur-3xl opacity-30 animate-pulse-ring" />
            <Card className="relative bg-gradient-card border-primary/20 p-8 shadow-elegant">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/30 animate-pulse-ring" />
                  <div className="relative h-14 w-14 rounded-full bg-gradient-primary flex items-center justify-center">
                    <Mic className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm text-muted-foreground">Aarya · Hindi · Live</p>
                  <p className="font-medium">"नमस्ते! मैं आपकी कैसे मदद कर सकती हूँ?"</p>
                </div>
                <div className="flex gap-1 items-end h-8">
                  {[3,5,7,4,6,8,5,3,6,4].map((h, i) => (
                    <div key={i} className="w-1 bg-primary rounded-full animate-pulse" style={{ height: `${h*4}px`, animationDelay: `${i*0.1}s` }} />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold">Everything you need to ship voice AI</h2>
          <p className="mt-4 text-muted-foreground text-lg">An end-to-end platform — from agent design to call analytics.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="bg-gradient-card border-border/50 p-6 hover:border-primary/40 transition-smooth group">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-gradient-primary transition-smooth">
                <f.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* USE CASES */}
      <section id="use-cases" className="container py-24 border-t border-border/50">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold">Built for every voice workflow</h2>
          <p className="mt-4 text-muted-foreground text-lg">From a single agent prototype to millions of calls in production.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {useCases.map((uc) => (
            <Card key={uc.title} className="bg-gradient-card border-border/50 p-6 hover:shadow-glow hover:border-primary/40 transition-smooth">
              <div className={`h-2 w-12 rounded-full mb-4 ${uc.color === "primary" ? "bg-gradient-primary" : "bg-gradient-accent"}`} />
              <h3 className="font-display font-semibold">{uc.title}</h3>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="container py-24 border-t border-border/50">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold">Simple, transparent pricing</h2>
          <p className="mt-4 text-muted-foreground text-lg">Pay only for what you use. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((p) => (
            <Card key={p.name} className={`relative p-8 transition-smooth ${p.featured ? "bg-gradient-card border-primary shadow-elegant scale-105" : "bg-gradient-card border-border/50"}`}>
              {p.featured && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary border-0">Most popular</Badge>}
              <h3 className="font-display font-semibold text-xl">{p.name}</h3>
              <p className="text-muted-foreground text-sm mt-1">{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold">{p.price}</span>
                {p.suffix && <span className="text-muted-foreground">{p.suffix}</span>}
              </div>
              <Button className="mt-6 w-full" variant={p.featured ? "hero" : "outline"} asChild>
                <Link to="/signup">{p.cta}</Link>
              </Button>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24">
        <Card className="bg-gradient-hero border-primary/30 p-12 md:p-16 text-center shadow-elegant">
          <h2 className="font-display text-4xl md:text-5xl font-bold">Ready to launch your first voice agent?</h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">Start free. Build in minutes. Scale to millions of calls.</p>
          <Button size="xl" variant="hero" className="mt-8" asChild>
            <Link to="/signup">Get started for free <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="container flex flex-col md:flex-row justify-between items-center gap-4">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">© 2026 VoiceAI · Built for Indian businesses</p>
          <Link to="/admin/login" className="text-xs text-muted-foreground hover:text-foreground transition-smooth">Admin login</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
