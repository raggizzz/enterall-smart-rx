

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
        <article className="w-[80mm] h-[50mm] bg-white text-black p-2 overflow-hidden font-sans text-xs print:shadow-none shadow-md rounded relative box-border border-2 border-black">
            {/* Header: Patient Name, Bed, DOB */}
            <header className="flex flex-col border-b border-black pb-1 mb-1 -mx-2 px-2 pt-1 -mt-2 bg-gray-50">
                <div className="flex justify-between items-start">
                    <div className="font-extrabold text-sm uppercase truncate w-3/4 leading-tight">
                        {data.patientName}
                    </div>
                    <div className="font-bold text-xs uppercase border border-black px-1 rounded whitespace-nowrap">
                        Leito: {data.bed}
                    </div>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                    <div className="text-[11px] text-gray-800">
                        DN: <span className="font-bold text-black">{data.dob}</span>
                    </div>
                    <div className="font-bold text-[10px] uppercase border border-black px-1 rounded">
                        Via: {data.route}
                    </div>
                </div>
            </header>

            {/* Diet / Formula */}
            <div className="py-1 space-y-0.5 mb-1">
                <div className="font-bold text-xs uppercase truncate">
                    {data.templateTitle}
                </div>
                <div className="text-[11px] leading-tight line-clamp-2">
                    {data.formulaText || data.compositionText}
                </div>
                {data.volumeText && (
                    <div className="font-bold text-sm mt-1">
                        Volume: {data.volumeText}
                    </div>
                )}
            </div>

            {/* Infusion Rate & Schedule */}
            <div className="flex justify-between items-end py-1 mt-1 pb-10">
                <div className="flex flex-col">
                    {data.infusionRate && (
                        <div className="text-[11px] font-bold px-1 rounded inline-block mb-1 border border-dashed border-gray-400">
                            Vazão: {data.infusionRate}
                        </div>
                    )}
                </div>
                {data.scheduleTime && (
                    <div className="text-[10px] font-bold bg-gray-200 px-1 rounded">
                        Horário: {data.scheduleTime}
                    </div>
                )}
            </div>

            {/* Footer: Manipulation / Validity / RT */}
            <footer className="absolute bottom-0 left-0 right-0 bg-gray-100 p-1 text-[9px] leading-tight grid grid-cols-[1fr_auto] gap-x-2 h-[13mm]">
                <div className="flex flex-col justify-center">
                    <div><span className="font-bold">Manip:</span> {data.manipulationDate} {data.manipulationTime}</div>
                    <div className="font-bold truncate mt-0.5">{data.validityText}</div>
                    {/* Control text removed */}
                </div>
                <div className="text-right flex flex-col justify-center min-w-[30mm]">
                    <div className="font-bold uppercase text-[8px]">Resp. Técnico</div>
                    <div className="truncate font-medium leading-none">{data.rtName}</div>
                    <div className="leading-none">{data.rtCrn}</div>
                </div>
            </footer>
        </article>
    );
};

export default LabelPreview;
