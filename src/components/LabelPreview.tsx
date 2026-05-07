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
    const normalizedWaterText = `${data.templateTitle} ${data.formulaText || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
    const isWaterLabel = normalizedWaterText.includes("AGUA");

    return (
        <article className="clinical-label w-[63.5mm] h-[46.6mm] bg-white text-black p-[1.8mm] overflow-hidden font-sans print:shadow-none shadow-md rounded relative box-border border-[0.35pt] border-gray-500 print:border-gray-300">
            <header className="clinical-label__header border-b border-gray-500 print:border-gray-300 pb-[1.2mm]">
                <div className="clinical-label__top flex items-start justify-between gap-1">
                    <div className="clinical-label__title font-extrabold text-[9.5px] uppercase leading-none truncate">
                        {data.templateTitle}
                    </div>
                    {data.scheduleTime && (
                        <div className="clinical-label__time text-[8px] font-extrabold leading-none text-right whitespace-nowrap">
                            {data.scheduleTime}
                        </div>
                    )}
                </div>

                <div className="clinical-label__patient mt-[1.2mm]">
                    <div className="clinical-label__patient-caption text-[6.8px] font-bold uppercase leading-none">Paciente</div>
                    <div className="clinical-label__patient-name mt-[0.5mm] text-[11px] font-extrabold uppercase leading-[1.05] break-words">
                        {data.patientName}
                    </div>
                </div>

                <div className="clinical-label__meta-grid mt-[1mm] grid grid-cols-[0.72fr_1.08fr_0.7fr] gap-[0.8mm]">
                    <div className="clinical-label__field rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[0.8mm]">
                        <div className="clinical-label__field-label text-[6.4px] font-bold uppercase leading-none">Leito</div>
                        <div className="clinical-label__field-value clinical-label__field-value--bed mt-[0.6mm] text-[10.5px] font-extrabold leading-none">{data.bed}</div>
                    </div>
                    <div className="clinical-label__field rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[0.8mm]">
                        <div className="clinical-label__field-label text-[6.4px] font-bold uppercase leading-none">DN</div>
                        <div className="clinical-label__field-value clinical-label__field-value--dob mt-[0.6mm] text-[8.4px] font-extrabold leading-none">{data.dob}</div>
                    </div>
                    <div className="clinical-label__field rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[0.8mm]">
                        <div className="clinical-label__field-label text-[6.4px] font-bold uppercase leading-none">Via</div>
                        <div className="clinical-label__field-value clinical-label__field-value--route mt-[0.6mm] text-[9.4px] font-extrabold leading-none">{data.route}</div>
                    </div>
                </div>
            </header>

            <main className="clinical-label__body pt-[1.1mm] pb-[11.8mm] space-y-[1mm]">
                {data.formulaText && (
                    <div className="clinical-label__diet text-[8.2px] leading-tight">
                        <span className="font-bold">Dieta:</span>{" "}
                        <span className="font-semibold">{data.formulaText}</span>
                    </div>
                )}

                {isWaterLabel && data.compositionText && (
                    <div className="clinical-label__composition rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[0.9mm] text-[6.7px] leading-tight break-words">
                        <span className="font-bold">Módulos:</span> {data.compositionText}
                    </div>
                )}

                <div className="clinical-label__metrics grid grid-cols-2 gap-[1mm]">
                    {data.volumeText && (
                        <div className="clinical-label__metric rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[1mm]">
                            <div className="clinical-label__metric-label text-[6.6px] font-bold uppercase leading-none">Volume total</div>
                            <div className="clinical-label__metric-value mt-[0.8mm] text-[10.8px] font-extrabold leading-none">{data.volumeText}</div>
                        </div>
                    )}
                    {data.infusionRate && (
                        <div className="clinical-label__metric rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[1mm]">
                            <div className="clinical-label__metric-label text-[6.6px] font-bold uppercase leading-none">Vazao</div>
                            <div className="clinical-label__metric-value mt-[0.8mm] text-[10.2px] font-extrabold leading-none">{data.infusionRate}</div>
                        </div>
                    )}
                </div>

                <div className="clinical-label__record grid grid-cols-1 gap-x-[1.2mm] text-[6.8px] leading-tight">
                    <div><span className="font-bold">Registro:</span> {data.record}</div>
                </div>
            </main>

            <footer className="clinical-label__footer absolute bottom-0 left-0 right-0 border-t border-gray-500 print:border-gray-300 bg-gray-50 px-[1.8mm] py-[1mm] text-[6.2px] leading-tight">
                <div className="clinical-label__footer-grid grid grid-cols-[1fr_auto] gap-x-1">
                    <div className="clinical-label__footer-left min-w-0">
                        <div>
                            <span className="font-bold">{data.manipulationTime ? "Manipulado em:" : "Data:"}</span> {data.manipulationDate}
                            {data.manipulationTime ? `, ${data.manipulationTime}` : ""}
                        </div>
                        <div className="font-semibold">{data.validityText}</div>
                        {data.conservationText && (
                            <div><span className="font-bold">Conservacao:</span> {data.conservationText}</div>
                        )}
                    </div>
                    <div className="clinical-label__rt text-right min-w-[22mm]">
                        <div className="font-bold uppercase">Responsavel Tecnico</div>
                        <div className="truncate">{data.rtName}</div>
                        <div>{data.rtCrn}</div>
                    </div>
                </div>
            </footer>
        </article>
    );
};

export default LabelPreview;
