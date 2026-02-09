import logo from "@/assets/logoenmeta.png";

export interface LabelData {
    id: string;
    clinic: string;
    templateTitle: string;
    patientName: string;
    bed: string;
    record: string;
    dob: string;
    scheduleTime?: string;
    infusionRate?: string;
    route: string;
    formulaText?: string;
    compositionText?: string;
    volumeText?: string;
    manipulationDate: string;
    manipulationTime?: string;
    validityText: string;
    controlText?: string;
    conservationText?: string;
    rtName: string;
    rtCrn: string;
}

const LabelPreview = ({ data }: { data: LabelData }) => {
    return (
        <article className="w-[63.5mm] h-[46.6mm] border border-black bg-white text-black p-[2.2mm] overflow-hidden text-[10px] leading-[1.1] font-sans print:shadow-none shadow-sm">
            <header className="flex items-start justify-between mb-[1.3mm]">
                <div className="flex items-center gap-[1.2mm] min-w-0">
                    <img src={logo} alt="ENMeta" className="h-[5mm] w-auto shrink-0" />
                    <p className="font-semibold uppercase tracking-tight truncate">{data.templateTitle}</p>
                </div>
                {data.scheduleTime && (
                    <span className="border border-black px-[1.1mm] py-[0.3mm] text-[9px] font-bold leading-none shrink-0">
                        {data.scheduleTime}
                    </span>
                )}
            </header>

            <div className="space-y-[0.7mm]">
                <p className="font-bold">Leito: {data.bed} Paciente: {data.patientName}</p>
                <p className="font-bold">Registro: {data.record}</p>
                <p>Data de nasc: {data.dob}</p>

                {data.infusionRate && <p className="font-bold">Velocidade de infusao: {data.infusionRate}</p>}
                <p className="font-bold">Via: {data.route}</p>

                {data.formulaText && <p>Formula: {data.formulaText}</p>}
                {data.compositionText && <p>Composicao: {data.compositionText}</p>}
                {data.volumeText && <p>Volume: {data.volumeText}</p>}

                <p>
                    Data manip: {data.manipulationDate}
                    {data.manipulationTime ? ` Horario manip: ${data.manipulationTime}` : ""}
                </p>

                <p>{data.validityText}</p>
                {data.controlText && <p>Controle: {data.controlText}</p>}
                {data.conservationText && <p>{data.conservationText}</p>}
                <p>Resp tecnico: {data.rtName} ({data.rtCrn})</p>
            </div>
        </article>
    );
};

export default LabelPreview;

