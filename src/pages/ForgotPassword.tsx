import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoOriginal from "@/assets/logo-original.png";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsLoading(true);

    // Mock password reset - in real app, this would call an API
    setTimeout(() => {
      setIsSubmitted(true);
      setIsLoading(false);
      toast.success("Password reset link sent!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-info/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 hover-lift transition-smooth">
          {/* Logo */}
          <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <img src={logoOriginal} alt="Logo" className="h-16 w-auto" />
          </div>

          {!isSubmitted ? (
            <>
              {/* Title */}
              <div className="text-center mb-8 animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
                <h1 className="text-3xl font-bold text-secondary mb-3">
                  {t('forgotPassword.title')}
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('forgotPassword.subtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-secondary font-medium">
                    {t('forgotPassword.email')}
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
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    We'll send you a link to reset your password
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    t('forgotPassword.sendButton')
                  )}
                </Button>
              </form>

              {/* Back to Login */}
              <div className="mt-8 text-center animate-in fade-in duration-700 delay-300">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('forgotPassword.backToLogin')}
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Success State */}
              <div className="text-center animate-in fade-in zoom-in duration-700">
                <div className="flex justify-center mb-8">
                  <div className="h-20 w-20 rounded-full bg-success/10 border-2 border-success/20 flex items-center justify-center animate-in zoom-in duration-500">
                    <CheckCircle2 className="h-10 w-10 text-success" />
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-secondary mb-3">
                  Check Your Email
                </h2>
                <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                  We've sent a password reset link to <br />
                  <span className="font-semibold text-foreground mt-1 inline-block">{email}</span>
                </p>

                <div className="bg-gradient-to-br from-muted/40 to-muted/20 border border-border rounded-xl p-5 mb-8 text-left">
                  <p className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Didn't receive the email?
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-2 ml-1">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Check your spam or junk folder</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Make sure the email address is correct</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>Wait a few minutes and try again</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                    className="w-full h-12 hover:bg-muted/50 transition-all hover:scale-[1.02]"
                  >
                    Try Another Email
                  </Button>

                  <Link to="/login">
                    <Button
                      type="button"
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {t('forgotPassword.backToLogin')}
                    </Button>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Help Text */}
        {!isSubmitted && (
          <p className="text-center mt-8 text-sm text-muted-foreground animate-in fade-in duration-700 delay-400">
            Need help?{" "}
            <a href="mailto:support@example.com" className="text-primary hover:underline font-medium transition-colors">
              Contact Support
            </a>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
