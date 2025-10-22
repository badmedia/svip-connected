import { Shield, Users, Sparkles, Heart, Award, MapPin, ArrowRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlowButton } from "@/components/GlowButton";
import { FeatureCard } from "@/components/FeatureCard";
import { TrustBadge } from "@/components/TrustBadge";
import { TrustMapDots } from "@/components/TrustMapDots";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/hero-illustration.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, signOut, loading } = useAuth();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleJoinNow = () => {
    if (isAuthenticated) {
      navigate("/");
    } else {
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              S.v.i.p
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection("features")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              How It Works
            </button>
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {user?.email}
                </span>
                <Button
                  onClick={signOut}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
            ) : (
              <GlowButton
                variant="primary"
                className="px-6 py-2 text-sm"
                onClick={handleJoinNow}
              >
                Join Now
              </GlowButton>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center space-x-2 glass-card px-4 py-2 rounded-full">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-muted-foreground">
                  Built on trust. Powered by students.
                </span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Find someone who{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  gets it.
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed">
                S.v.i.p helps students connect locally to exchange skills, favors, or time — 
                verified through their college ID. A campus full of helpers, one click away.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <GlowButton
                  variant="primary"
                  className="group"
                  onClick={handleJoinNow}
                >
                  {isAuthenticated ? "Go to Dashboard" : "Join Now"}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </GlowButton>
                <GlowButton
                  variant="secondary"
                  onClick={() => scrollToSection("how-it-works")}
                >
                  See How It Works
                </GlowButton>
              </div>

              <div className="flex items-center space-x-8 pt-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">2,500+</p>
                    <p className="text-sm text-muted-foreground">Active Students</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold">10,000+</p>
                    <p className="text-sm text-muted-foreground">Favors Exchanged</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative animate-slide-up">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
              <img
                src={heroImage}
                alt="Students collaborating"
                className="relative rounded-3xl shadow-2xl w-full h-auto"
              />
              <div className="absolute -bottom-6 -left-6 glass-card p-4 rounded-2xl animate-float">
                <TrustBadge score={92} verified className="mb-2" />
                <p className="text-sm font-medium">Verified Helper</p>
                <p className="text-xs text-muted-foreground">RVCE</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Map Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-12 animate-fade-in">
            <h2 className="text-4xl font-bold">
              Growing Across{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Bengaluru
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Watch our trust network light up as students connect, help, and grow together
            </p>
          </div>
          <TrustMapDots />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold">Why Students Love S.v.i.p</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Not a marketplace. A movement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Shield}
              title="Trust First"
              description="Every member is verified through their college ID. Build reputation through genuine help, not anonymous reviews."
            />
            <FeatureCard
              icon={MapPin}
              title="Local First"
              description="Connect with students from your campus and neighborhood. Meet up easily, collaborate in person."
            />
            <FeatureCard
              icon={Users}
              title="Skills Exchange"
              description="From coding help to design reviews, photography to language practice — share what you're good at."
            />
            <FeatureCard
              icon={Award}
              title="Gamified Trust"
              description="Earn badges, climb leaderboards, and build your reputation as a reliable community member."
            />
            <FeatureCard
              icon={Heart}
              title="Give & Receive"
              description="Help someone today, get help tomorrow. It's karma, but with receipts and trust scores."
            />
            <FeatureCard
              icon={Sparkles}
              title="No Money, Pure Value"
              description="This isn't about payments. It's about time, skills, and building genuine connections."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-4xl font-bold">How It Works</h2>
            <p className="text-lg text-muted-foreground">Simple, trust-based, and student-friendly</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Sign Up & Verify",
                description: "Join with your college email. Get verified instantly.",
              },
              {
                step: "02",
                title: "Post or Browse",
                description: "Need help? Post a request. Want to help? Browse offers.",
              },
              {
                step: "03",
                title: "Connect & Build Trust",
                description: "Complete tasks, earn trust, and climb the leaderboard.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="glass-card p-8 rounded-3xl text-center space-y-4 hover-lift"
              >
                <div className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent opacity-50">
                  {item.step}
                </div>
                <h3 className="text-2xl font-semibold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="glass-card rounded-3xl p-12 text-center space-y-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
            <div className="relative z-10 space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold">
                Ready to join the movement?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Trust isn't built overnight — but here, it starts with your college ID.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <GlowButton
                  variant="primary"
                  className="group"
                  onClick={handleJoinNow}
                >
                  {isAuthenticated ? "Go to Dashboard" : "Get Started Now"}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </GlowButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                S.v.i.p
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 S.v.i.p. Built with trust, powered by students.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
