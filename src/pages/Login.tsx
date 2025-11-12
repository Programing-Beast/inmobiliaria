import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoOriginal from "@/assets/logo-original.png";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock login - in real app, this would call an API
    if (email && password) {
      toast.success("Ingreso exitoso");
      navigate("/dashboard");
    } else {
      toast.error("Por favor complete todos los campos");
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
              Portal de Residentes
            </h1>
            <p className="text-muted-foreground text-sm">
              Ingrese sus credenciales para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
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
              <Label htmlFor="password">Contraseña</Label>
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
                <span className="text-muted-foreground">Recordarme</span>
              </label>
              <a href="#" className="text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
            >
              Ingresar
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            <p>¿No tienes una cuenta?</p>
            <a href="#" className="text-primary hover:underline font-medium">
              Contacta con tu administrador
            </a>
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-center mt-6 text-sm text-muted-foreground">
          © 2025 VIEW Inmobiliaria. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default Login;
