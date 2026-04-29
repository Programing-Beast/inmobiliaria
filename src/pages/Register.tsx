import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import logoOriginal from "@/assets/logo-original.png";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error(t("register.validationRequired"));
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t("register.validationEmail"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t("register.validationPasswordsMismatch"));
      return;
    }

    if (formData.password.length < 8) {
      toast.error(t("register.validationPasswordLength"));
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      toast.error(t("register.validationPasswordStrength"));
      return;
    }

    if (!agreeTerms) {
      toast.error(t("register.validationAcceptTerms"));
      return;
    }

    setIsLoading(true);

    try {
      // Sign up with Supabase
      const { error } = await signUp(formData.email, formData.password, formData.fullName);

      if (error) {
        // Handle specific error messages
        if (error.message.includes('already registered')) {
          toast.error(t("register.errorUserExists"));
        } else if (error.message.includes('Password')) {
          toast.error(t("register.errorPasswordMin"));
        } else {
          toast.error(error.message || t("register.errorGeneric"));
        }
        setIsLoading(false);
        return;
      }

      // Success
      toast.success(t("register.successMessage"), { duration: 5000 });

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(t("register.unexpectedError"));
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f7f3ec]">
      {/* Left Side - Form */}
      <div className="relative flex w-full items-center justify-center overflow-hidden bg-[#fbf8f4] p-6 lg:w-[46%] lg:p-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo */}
          <div className="mb-8 flex justify-center animate-in fade-in slide-in-from-top-4 duration-700">
            <img src={logoOriginal} alt="Logo" className="h-16 w-auto" />
          </div>

          {/* Title */}
          <div className="text-center mb-8 animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
            <h1 className="mb-2 text-4xl font-bold text-zinc-950">
              {t('register.title')}
            </h1>
            <p className="text-sm text-zinc-500">
              {t('register.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="font-medium text-zinc-700">
                {t('register.fullName')}
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t("register.fullNamePlaceholder")}
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="h-12 border-[#d6e1f4] bg-[#eef4ff] pl-10 text-zinc-800 transition-all placeholder:text-zinc-400 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium text-zinc-700">
                {t('register.email')}
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("register.emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="h-12 border-[#d6e1f4] bg-[#eef4ff] pl-10 text-zinc-800 transition-all placeholder:text-zinc-400 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium text-zinc-700">
                {t('register.password')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("register.passwordPlaceholder")}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="h-12 border-[#d6e1f4] bg-[#eef4ff] pl-10 pr-10 text-zinc-800 transition-all placeholder:text-zinc-400 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-zinc-400">
                {t("register.passwordHint")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-medium text-zinc-700">
                {t('register.confirmPassword')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-colors group-focus-within:text-primary" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("register.confirmPasswordPlaceholder")}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  className="h-12 border-[#d6e1f4] bg-[#eef4ff] pl-10 pr-10 text-zinc-800 transition-all placeholder:text-zinc-400 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/15"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={agreeTerms}
                onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                disabled={isLoading}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-zinc-500 cursor-pointer select-none leading-tight hover:text-zinc-800 transition-colors">
                {t("register.termsPrefix")}{" "}
                <Link to="/terms" className="text-primary hover:underline font-medium">
                  {t("register.termsOfService")}
                </Link>{" "}
                {t("register.termsAnd")}{" "}
                <Link to="/privacy" className="text-primary hover:underline font-medium">
                  {t("register.privacyPolicy")}
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-primary font-semibold text-primary-foreground shadow-[0_14px_30px_rgba(255,92,0,0.24)] transition-all hover:scale-[1.01] hover:bg-[#e55300] hover:shadow-[0_18px_36px_rgba(255,92,0,0.28)]"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("register.loading")}
                </span>
              ) : (
                t('register.registerButton')
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center text-sm animate-in fade-in duration-700 delay-500">
            <span className="text-zinc-500">{t('register.haveAccount')} </span>
            <Link to="/login" className="font-semibold text-primary transition-colors hover:underline">
              {t('register.signIn')}
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Image/Branding */}
      <div
        className="relative hidden items-center justify-center overflow-hidden bg-cover bg-center p-12 lg:flex lg:w-[54%]"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(16, 16, 16, 0.74), rgba(16, 16, 16, 0.38)), url('/Encabezado%20(2).jpg.jpeg')",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(255,92,0,0.24),_transparent_32%)]" />
        <div className="relative z-10 max-w-[34rem] text-left text-white animate-in fade-in slide-in-from-right-6 duration-1000">
          <h2 className="mb-6 max-w-[30rem] text-5xl font-bold leading-tight text-white">{t("register.heroTitle")}</h2>
          <p className="mb-12 max-w-[30rem] rounded-2xl border border-primary/35 bg-black/20 px-5 py-4 text-lg leading-relaxed text-white/95 backdrop-blur-sm">
            {t("register.heroSubtitle")}
          </p>
          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_12px_30px_rgba(255,92,0,0.28)] transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-left text-lg font-medium text-white">{t("register.heroBullet1")}</p>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_12px_30px_rgba(255,92,0,0.28)] transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 0 00-2 2v6a2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-left text-lg font-medium text-white">{t("register.heroBullet2")}</p>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_12px_30px_rgba(255,92,0,0.28)] transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-left text-lg font-medium text-white">{t("register.heroBullet3")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
