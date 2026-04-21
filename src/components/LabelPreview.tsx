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
    const isWaterLabel = `${data.templateTitle} ${data.formulaText || ""}`.toUpperCase().includes("AGUA");

    return (
        <article className="w-[63.5mm] h-[46.6mm] bg-white text-black p-[1.8mm] overflow-hidden font-sans print:shadow-none shadow-md rounded relative box-border border border-black">
            <header className="border-b border-black pb-[1.2mm]">
                <div className="flex items-start justify-between gap-1">
                    <div className="font-extrabold text-[9.5px] uppercase leading-none truncate">
                        {data.templateTitle}
                    </div>
                    {data.scheduleTime && (
                        <div className="text-[8px] font-extrabold leading-none text-right whitespace-nowrap">
                            {data.scheduleTime}
                        </div>
                    )}
                </div>

                <div className="mt-[1.2mm]">
                    <div className="text-[6.8px] font-bold uppercase leading-none">Paciente</div>
                    <div className="mt-[0.5mm] text-[11px] font-extrabold uppercase leading-[1.05] break-words">
                        {data.patientName}
                    </div>
                </div>

                <div className="mt-[1mm] grid grid-cols-[1.05fr_0.95fr] gap-[1mm]">
                    <div className="rounded-[1mm] border border-black px-[1.2mm] py-[0.8mm]">
                        <div className="text-[6.4px] font-bold uppercase leading-none">Leito</div>
                        <div className="mt-[0.6mm] text-[10.5px] font-extrabold leading-none">{data.bed}</div>
                    </div>
                    <div className="rounded-[1mm] border border-black px-[1.2mm] py-[0.8mm]">
                        <div className="text-[6.4px] font-bold uppercase leading-none">Via</div>
                        <div className="mt-[0.6mm] text-[9.4px] font-extrabold leading-none">{data.route}</div>
                    </div>
                </div>
            </header>

            <main className="pt-[1.1mm] pb-[11.8mm] space-y-[1mm]">
                {data.formulaText && (
                    <div className="text-[8.2px] leading-tight">
                        <span className="font-bold">Dieta:</span>{" "}
                        <span className="font-semibold">{data.formulaText}</span>
                    </div>
                )}

                {isWaterLabel && data.compositionText && (
                    <div className="rounded-[1mm] border border-black px-[1.2mm] py-[0.9mm] text-[7.1px] leading-tight">
                        <span className="font-bold">Aditivos:</span> {data.compositionText}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-[1mm]">
                    {data.volumeText && (
                        <div className="rounded-[1mm] border border-black px-[1.2mm] py-[1mm]">
                            <div className="text-[6.6px] font-bold uppercase leading-none">Volume total</div>
                            <div className="mt-[0.8mm] text-[10.8px] font-extrabold leading-none">{data.volumeText}</div>
                        </div>
                    )}
                    {data.infusionRate && (
                        <div className="rounded-[1mm] border border-black px-[1.2mm] py-[1mm]">
                            <div className="text-[6.6px] font-bold uppercase leading-none">Vazao</div>
                            <div className="mt-[0.8mm] text-[10.2px] font-extrabold leading-none">{data.infusionRate}</div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-x-[1.2mm] text-[6.8px] leading-tight">
                    <div><span className="font-bold">Registro:</span> {data.record}</div>
                    <div><span className="font-bold">DN:</span> {data.dob}</div>
                </div>
            </main>

            <footer className="absolute bottom-0 left-0 right-0 border-t border-black bg-gray-50 px-[1.8mm] py-[1mm] text-[6.2px] leading-tight">
                <div className="grid grid-cols-[1fr_auto] gap-x-1">
                    <div className="min-w-0">
                        <div>
                            <span className="font-bold">{data.manipulationTime ? "Manipulado em:" : "Data:"}</span> {data.manipulationDate}
                            {data.manipulationTime ? `, ${data.manipulationTime}` : ""}
                        </div>
                        <div className="font-semibold">{data.validityText}</div>
                        {data.conservationText && (
                            <div><span className="font-bold">Conservacao:</span> {data.conservationText}</div>
                        )}
                    </div>
                    <div className="text-right min-w-[22mm]">
                        <div className="font-bold uppercase">Resp. Tecnico</div>
                        <div className="truncate">{data.rtName}</div>
                        <div>{data.rtCrn}</div>
                    </div>
                </div>
            </footer>
        </article>
    );
};

export default LabelPreview;
