import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoOriginal from "@/assets/logo-original.png";
import { useTranslation } from "react-i18next";

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock login - in real app, this would call an API
    if (email && password) {
      toast.success(t('login.loginButton'));
      navigate("/dashboard");
    } else {
      toast.error("Please complete all fields");
    }
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
              {t('login.title')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t('login.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('login.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-muted-foreground">{t('login.rememberMe')}</span>
              </label>
              <a href="#" className="text-primary hover:underline">
                {t('login.forgotPassword')}
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
            >
              {t('login.loginButton')}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            <p>{t('login.noAccount')}</p>
            <a href="#" className="text-primary hover:underline font-medium">
              {t('login.signUp')}
            </a>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center mt-6 text-sm text-muted-foreground">
          © 2025 VIEW Inmobiliaria. {t('footer.rights')}
        </p>
      </div>
    </div>
  );
};

export default Login;
