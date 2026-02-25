import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function SelectRoute() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Escolher Via de Alimentação</h1>

      <div className="flex flex-col gap-4 w-80">
        <Button onClick={() => navigate("/oral-therapy")}>Oral</Button>

        <Button onClick={() => navigate("/prescription-new")}>Enteral</Button>

        <Button onClick={() => navigate("/parenteral-therapy")}>Parenteral</Button>
      </div>
    </div>
  );
}
