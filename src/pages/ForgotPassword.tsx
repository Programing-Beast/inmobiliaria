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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-sm p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoOriginal} alt="Logo" className="h-12 w-auto" />
          </div>

          {!isSubmitted ? (
            <>
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-semibold text-secondary mb-2">
                  {t('forgotPassword.title')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t('forgotPassword.subtitle')}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-secondary">
                    {t('forgotPassword.email')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="hello@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send you a link to reset your password
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : t('forgotPassword.sendButton')}
                </Button>
              </form>

              {/* Back to Login */}
              <div className="mt-6 text-center">
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
              {/* Success State */}
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-secondary mb-2">
                  Check Your Email
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  We've sent a password reset link to <br />
                  <span className="font-medium text-foreground">{email}</span>
                </p>

                <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6 text-left">
                  <p className="text-xs text-muted-foreground mb-3">
                    Didn't receive the email?
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure the email address is correct</li>
                    <li>Wait a few minutes and try again</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    variant="outline"
                    className="w-full h-11"
                  >
                    Try Another Email
                  </Button>

                  <Link to="/login">
                    <Button
                      type="button"
                      className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2"
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
          <p className="text-center mt-6 text-sm text-muted-foreground">
            Need help?{" "}
            <a href="mailto:support@example.com" className="text-primary hover:underline">
              Contact Support
            </a>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
