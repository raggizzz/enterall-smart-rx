import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PatientForm() {
  const navigate = useNavigate();

  const [patient, setPatient] = useState({
    name: "",
    record: "",
    birth: "",
    weight: "",
    height: "",
    diagnosis: "",
    observations: "",
  });

  const handleSubmit = () => {
    localStorage.setItem("patient", JSON.stringify(patient));
    navigate("/select-route");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Novo Paciente</h1>

      {Object.keys(patient).map(key => (
        <div key={key}>
          <Label>{key}</Label>
          <Input
            value={(patient as any)[key]}
            onChange={(e) =>
              setPatient({ ...patient, [key]: e.target.value })
            }
          />
        </div>
      ))}

      <Button onClick={handleSubmit}>Salvar</Button>
    </div>
  );
}
