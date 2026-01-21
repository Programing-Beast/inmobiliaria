import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface UnauthorizedProps {
  message?: string;
}

const Unauthorized = ({ message }: UnauthorizedProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fallback = t("common.noAccess");

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-muted-foreground mb-4">{message || fallback}</p>
      <Button variant="outline" onClick={() => navigate(-1)}>
        Back
      </Button>
    </div>
  );
};

export default Unauthorized;
