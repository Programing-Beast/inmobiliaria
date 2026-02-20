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
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Branding */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.25)), url('/Encabezado%20(2).jpg.jpeg')",
        }}
      >
        <div className="relative z-10 text-center text-white max-w-md animate-in fade-in slide-in-from-left-6 duration-1000">
          <h2 className="text-5xl font-bold mb-6 leading-tight">{t("register.heroTitle")}</h2>
          <p className="text-lg text-white/95 mb-12 leading-relaxed">
            {t("register.heroSubtitle")}
          </p>
          <div className="space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-left text-lg font-medium">{t("register.heroBullet1")}</p>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-left text-lg font-medium">{t("register.heroBullet2")}</p>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-left text-lg font-medium">{t("register.heroBullet3")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 overflow-y-auto relative">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-success/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

        <div className="w-full max-w-md py-8 relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <img src={logoOriginal} alt="Logo" className="h-16 w-auto" />
          </div>

          {/* Title */}
          <div className="text-center mb-6 animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
            <h1 className="text-3xl font-bold text-secondary mb-2">
              {t('register.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('register.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-secondary font-medium">
                {t('register.fullName')}
              </Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-success" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t("register.fullNamePlaceholder")}
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="h-12 pl-10 transition-all focus:shadow-md"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-secondary font-medium">
                {t('register.email')}
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-success" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t("register.emailPlaceholder")}
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="h-12 pl-10 transition-all focus:shadow-md"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-secondary font-medium">
                {t('register.password')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-success" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("register.passwordPlaceholder")}
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="h-12 pl-10 pr-10 transition-all focus:shadow-md"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("register.passwordHint")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-secondary font-medium">
                {t('register.confirmPassword')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-success" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("register.confirmPasswordPlaceholder")}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  className="h-12 pl-10 pr-10 transition-all focus:shadow-md"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
              <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer select-none leading-tight hover:text-foreground transition-colors">
                {t("register.termsPrefix")}{" "}
                <Link to="/terms" className="text-success hover:underline font-medium">
                  {t("register.termsOfService")}
                </Link>{" "}
                {t("register.termsAnd")}{" "}
                <Link to="/privacy" className="text-success hover:underline font-medium">
                  {t("register.privacyPolicy")}
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
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
          <div className="mt-6 text-center text-sm animate-in fade-in duration-700 delay-500">
            <span className="text-muted-foreground">{t('register.haveAccount')} </span>
            <Link to="/login" className="text-success hover:underline font-semibold transition-colors">
              {t('register.signIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
