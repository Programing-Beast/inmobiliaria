import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocumentosProps {
  role: string;
}

const Documentos = ({ role }: DocumentosProps) => {
  const isOwner = role === "Owner";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4 text-sm flex-wrap">
          <span className="px-3 py-1 rounded-full bg-secondary/20">Reglamentos</span>
          <span className="px-3 py-1 rounded-full bg-secondary/20">Comunicados</span>
          <span
            className={`px-3 py-1 rounded-full ${
              isOwner ? "bg-secondary/20" : "bg-muted text-muted-foreground line-through"
            }`}
          >
            Actas de Asamblea
          </span>
          <span
            className={`px-3 py-1 rounded-full ${
              isOwner ? "bg-secondary/20" : "bg-muted text-muted-foreground line-through"
            }`}
          >
            Copropiedad & Planillas
          </span>
        </div>

        <ul className="text-sm space-y-3">
          <li className="flex items-center justify-between">
            <span>Reglamento Interno v2.1</span>
            <Button variant="link" className="text-primary">
              Descargar
            </Button>
          </li>
          <li className="flex items-center justify-between">
            <span>Comunicado: Limpieza de tanques</span>
            <Button variant="link" className="text-primary">
              Abrir
            </Button>
          </li>
          <li className={`flex items-center justify-between ${!isOwner ? "opacity-50" : ""}`}>
            <span>Acta Asamblea 15/10</span>
            <Button
              variant="link"
              className={isOwner ? "text-primary" : "text-muted-foreground"}
              disabled={!isOwner}
            >
              {isOwner ? "Descargar" : "Solo Owners"}
            </Button>
          </li>
          <li className={`flex items-center justify-between ${!isOwner ? "opacity-50" : ""}`}>
            <span>Reglamento de Copropiedad y Planillas</span>
            <Button
              variant="link"
              className={isOwner ? "text-primary" : "text-muted-foreground"}
              disabled={!isOwner}
            >
              {isOwner ? "Descargar" : "Solo Owners"}
            </Button>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};

export default Documentos;
