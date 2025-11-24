import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoOriginal from "@/assets/logo-original.png";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Mock password reset - in real app, this would call an API
    setIsSubmitted(true);
    toast.success(t('forgotPassword.successMessage'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-view-light via-background to-view-gray flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-border p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logoOriginal} alt="VIEW Inmobiliaria" className="h-16 w-auto" />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t('forgotPassword.title')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          {!isSubmitted ? (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('forgotPassword.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
                >
                  {t('forgotPassword.sendButton')}
                </Button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 pt-6 border-t border-border text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('forgotPassword.backToLogin')}
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800 text-center">
                  {t('forgotPassword.successMessage')}
                </p>
              </div>

              {/* Back to Login Button */}
              <Link to="/login">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('forgotPassword.backToLogin')}
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Bottom text */}
        <p className="text-center mt-6 text-sm text-muted-foreground">
          © 2025 VIEW Inmobiliaria. {t('footer.rights')}
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
