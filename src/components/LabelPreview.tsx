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
        <article className="w-[63.5mm] h-[46.6mm] bg-white text-black p-[1.8mm] overflow-hidden font-sans print:shadow-none shadow-md rounded relative box-border border border-black">
            <header className="border-b border-black pb-[1mm]">
                <div className="flex items-start justify-between gap-1">
                    <div className="font-extrabold text-[9px] uppercase leading-none truncate">
                        {data.templateTitle}
                    </div>
                    {data.controlText && (
                        <div className="text-[6px] leading-none text-right whitespace-nowrap">
                            Controle: <span className="font-bold">{data.controlText}</span>
                        </div>
                    )}
                </div>

                <div className="mt-[1mm] text-[8px] leading-tight">
                    <span className="font-bold">Paciente:</span>{" "}
                    <span className="font-extrabold uppercase">{data.patientName}</span>
                </div>

                <div className="grid grid-cols-[1fr_1fr] gap-x-1 text-[7px] leading-tight">
                    <div><span className="font-bold">Leito:</span> {data.bed}</div>
                    <div><span className="font-bold">Via:</span> {data.route}</div>
                    <div><span className="font-bold">Registro:</span> {data.record}</div>
                    <div><span className="font-bold">DN:</span> {data.dob}</div>
                </div>
            </header>

            <main className="pt-[1mm] pb-[12.5mm] space-y-[0.7mm]">
                {data.formulaText && (
                    <div className="text-[8px] leading-tight">
                        <span className="font-bold">Fórmula:</span>{" "}
                        <span className="font-semibold">{data.formulaText}</span>
                    </div>
                )}

                {data.compositionText && (
                    <div className="text-[6.5px] leading-tight whitespace-pre-line max-h-[9mm] overflow-hidden">
                        <span className="font-bold">Composição:</span> {data.compositionText}
                    </div>
                )}

                <div className="grid grid-cols-[1fr_1fr] gap-x-1 text-[7.5px] leading-tight">
                    {data.volumeText && (
                        <div><span className="font-bold">Volume:</span> {data.volumeText}</div>
                    )}
                    {data.infusionRate && (
                        <div><span className="font-bold">Vazão:</span> {data.infusionRate}</div>
                    )}
                    {data.scheduleTime && (
                        <div><span className="font-bold">Horário:</span> {data.scheduleTime}</div>
                    )}
                </div>
            </main>

            <footer className="absolute bottom-0 left-0 right-0 border-t border-black bg-gray-50 px-[1.8mm] py-[1mm] text-[6.4px] leading-tight">
                <div className="grid grid-cols-[1fr_auto] gap-x-1">
                    <div className="min-w-0">
                        <div>
                            <span className="font-bold">{data.manipulationTime ? "Manipulado em:" : "Data:"}</span> {data.manipulationDate}
                            {data.manipulationTime ? `, ${data.manipulationTime}` : ""}
                        </div>
                        <div className="font-semibold">{data.validityText}</div>
                        {data.conservationText && (
                            <div><span className="font-bold">Conservação:</span> {data.conservationText}</div>
                        )}
                    </div>
                    <div className="text-right min-w-[22mm]">
                        <div className="font-bold uppercase">Resp. Técnico</div>
                        <div className="truncate">{data.rtName}</div>
                        <div>{data.rtCrn}</div>
                    </div>
                </div>
            </footer>
        </article>
    );
};

export default LabelPreview;
