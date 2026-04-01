import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoOriginal from "@/assets/logo-original.png";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Lock, CheckCircle2, ShieldAlert } from "lucide-react";
import { portalResetPassword } from "@/lib/portal-api";

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error(t("resetPassword.errorToken"));
    }
  }, [token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error(t("resetPassword.errorToken"));
      return;
    }

    if (!password || !confirmPassword) {
      toast.error(t("login.validationRequired"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("register.validationPasswordsMismatch"));
      return;
    }

    if (password.length < 8) {
      toast.error(t("register.validationPasswordLength"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await portalResetPassword({ token, newPassword: password });
      if (result.error) {
        toast.error(result.error.message || "Error al restablecer la contraseña");
      } else {
        setIsSuccess(true);
        toast.success(t('resetPassword.successMessage'));
        // Automatically redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err) {
      console.error("Reset password error:", err);
      toast.error("Error inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">{t("resetPassword.errorToken")}</h1>
          <p className="text-muted-foreground">
            El enlace de restablecimiento es inválido o ha expirado. Por favor, solicita uno nuevo.
          </p>
          <Link to="/forgot-password">
            <Button variant="outline" className="mt-4">
              {t("forgotPassword.title")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-info/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 transition-smooth">
          {/* Logo */}
          <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <img src={logoOriginal} alt="Logo" className="h-16 w-auto" />
          </div>

          {!isSuccess ? (
            <>
              {/* Title */}
              <div className="text-center mb-8 animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
                <h1 className="text-3xl font-bold text-zinc-950 mb-3">
                  {t('resetPassword.title')}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('resetPassword.subtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11 pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-11 pl-10"
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg transition-all hover:scale-[1.02]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('login.loading')}
                    </span>
                  ) : (
                    t('resetPassword.resetButton')
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center animate-in fade-in zoom-in duration-700">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">{t('resetPassword.successMessage')}</h2>
              <p className="text-muted-foreground mb-8">
                Redirigiendo al inicio de sesión...
              </p>
              <Link to="/login">
                <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                  {t('forgotPassword.backToLogin')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
