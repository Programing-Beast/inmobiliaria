import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import logoOriginal from "@/assets/logo-original.png";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !password) {
      toast.error("Please complete all fields");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      // Sign in with Supabase
      const { error } = await signIn(email, password);

      if (error) {
        // Handle specific error messages
        if (error.message.includes('Invalid login credentials')) {
          toast.error("Email o contraseña incorrectos");
        } else if (error.message.includes('Email not confirmed')) {
          toast.error("Por favor confirma tu email antes de iniciar sesión");
        } else {
          toast.error(error.message || "Error al iniciar sesión");
        }
        setIsLoading(false);
        return;
      }

      // Success - auth context will handle profile loading
      toast.success("¡Sesión iniciada exitosamente!");

      // Redirect to intended page or dashboard
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error("Error inesperado al iniciar sesión");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-info/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <img src={logoOriginal} alt="Logo" className="h-16 w-auto" />
          </div>

          {/* Title */}
          <div className="text-center mb-8 animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
            <h1 className="text-3xl font-bold text-secondary mb-2">
              {t('login.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-secondary font-medium">
                {t('login.email')}
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 transition-all focus:shadow-md"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-secondary font-medium">
                {t('login.password')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 pr-10 transition-all focus:shadow-md"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={isLoading}
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                >
                  {t('login.rememberMe')}
                </label>
              </div>
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline font-medium transition-colors"
              >
                {t('login.forgotPassword')}
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                t('login.loginButton')
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-sm animate-in fade-in duration-700 delay-500">
            <span className="text-muted-foreground">{t('login.noAccount')} </span>
            <Link to="/register" className="text-primary hover:underline font-semibold transition-colors">
              {t('login.signUp')}
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-primary/80 items-center justify-center p-12 relative overflow-hidden">
        {/* Animated decorative circles */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1s' }} />

        {/* Floating geometric shapes */}
        <div className="absolute top-1/4 left-1/4 w-16 h-16 border-2 border-white/20 rounded-lg rotate-12 animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-12 h-12 border-2 border-white/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />

        <div className="relative z-10 text-center text-white max-w-md animate-in fade-in slide-in-from-right-6 duration-1000">
          <h2 className="text-5xl font-bold mb-6 leading-tight">{t("login.heroTitle")}</h2>
          <p className="text-lg text-white/95 mb-12 leading-relaxed">
            {t("login.heroSubtitle")}
          </p>
          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-left text-lg font-medium">{t("login.heroBullet1")}</p>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-left text-lg font-medium">{t("login.heroBullet2")}</p>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-left text-lg font-medium">{t("login.heroBullet3")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
