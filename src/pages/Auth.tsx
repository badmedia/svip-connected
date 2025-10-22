import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { checkRateLimit, authRateLimiter } from "@/lib/rateLimiter";
import { validatePassword, logSecurityEvent, sanitizeError } from "@/lib/security";

const authSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters").optional(),
});

const COLLEGE_OPTIONS = [
  "SAI VIDYA INSTITUTE OF TECHNOLOGY",
  "RASHTREEYA VIDYALAYA COLLEGE OF ENGINEERING (RVCE)",
  "SRI SIDDHARTHA COLLEGE OF ENGINEERING (SSCE)",
  "BMS INSTITUTE OF TECHNOLOGY (BMSIT)",
  "BANGALORE INSTITUTE OF TECHNOLOGY (BIT)",
  "PES UNIVERSITY",
  "CHRIST UNIVERSITY",
  "JAIN UNIVERSITY",
  "MANIPAL INSTITUTE OF TECHNOLOGY",
  "NIT KARNATAKA",
  "IISc BANGALORE",
  "OTHER"
];

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [customCollege, setCustomCollege] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check rate limit for auth attempts
      const rateLimitCheck = checkRateLimit(authRateLimiter, email);
      if (!rateLimitCheck.allowed) {
        toast({
          title: "Too Many Attempts",
          description: `Please wait ${rateLimitCheck.retryAfter} seconds before trying again.`,
          variant: "destructive",
        });
        return;
      }

      // Validate input
      const validationData = isLogin
        ? { email, password }
        : { email, password, fullName };
      
      authSchema.parse(validationData);

      // Enhanced password validation for signup
      if (!isLogin) {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          throw new Error(`Password requirements not met: ${passwordValidation.errors.join(', ')}`);
        }
      }

      if (!isLogin && !college.trim()) {
        throw new Error("Please select your college");
      }
      
      if (!isLogin && college === "OTHER" && !customCollege.trim()) {
        throw new Error("Please enter your college name");
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Log failed login attempt
          await logSecurityEvent('login_failed', {
            email,
            error: error.message
          });
          
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Invalid email or password. Please try again.");
          }
          throw error;
        }

        // Log successful login
        await logSecurityEvent('login_success', { email });

        toast({
          title: "Welcome back to SVIPit!",
          description: "Successfully logged in to SVIPit — Skill Value Interaction Platform",
        });
      } else {
        const collegeValue = college === "OTHER" ? customCollege : college;
        
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
              college: collegeValue,
            },
          },
        });

        if (error) {
          // Log failed signup attempt
          await logSecurityEvent('signup_failed', {
            email,
            error: error.message
          });
          
          if (error.message.includes("already registered")) {
            throw new Error("This email is already registered. Please login instead.");
          }
          throw error;
        }

        // Log successful signup
        await logSecurityEvent('signup_success', { 
          email, 
          college: collegeValue 
        });

        // Check for admin key and grant admin access
        if (adminKey.trim() === "SVIPit2025Admin!") {
          await supabase
            .from("profiles" as any)
            .update({ is_admin: true })
            .eq("id", data.user.id);
        }

        // Update profile with college info
        if (data.user) {
          await supabase
            .from("profiles")
            .update({ college: collegeValue })
            .eq("id", data.user.id);
        }

        toast({
          title: "Account created!",
          description: "Welcome to the S.v.i.p community!",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: sanitizeError(error) || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8 group"
        >
          <ArrowLeft className="mr-2 w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Button>

        <div className="glass-card p-8 rounded-3xl space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-glow">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">
              {isLogin ? "Welcome Back" : "Join S.v.i.p"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Login to connect with your trusted student community"
                : "Start building trust with fellow students"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required={!isLogin}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="college">College</Label>
                  <Select
                    value={college}
                    onValueChange={(value) => {
                      setCollege(value);
                      if (value !== "OTHER") {
                        setCustomCollege("");
                      }
                    }}
                    required={!isLogin}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your college" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLEGE_OPTIONS.map((collegeOption) => (
                        <SelectItem key={collegeOption} value={collegeOption}>
                          {collegeOption}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {college === "OTHER" && (
                    <Input
                      placeholder="Enter your college name"
                      value={customCollege}
                      onChange={(e) => setCustomCollege(e.target.value)}
                      required={!isLogin}
                    />
                  )}
                </div>
              </>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="adminKey">Admin Key (Optional)</Label>
                <Input
                  id="adminKey"
                  type="password"
                  placeholder="Enter admin key to get admin access"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:shadow-2xl hover:scale-105 transition-all duration-300"
              disabled={loading}
            >
              {loading ? "Please wait..." : isLogin ? "Login" : "Create Account"}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full"
            >
              {isLogin ? "Create new account" : "Login instead"}
            </Button>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to S.v.i.p's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
