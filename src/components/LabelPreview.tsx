import type { CSSProperties } from "react";

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

const labelStyles = {
    article: {
        position: "relative",
        width: "6.3333cm",
        minWidth: "6.3333cm",
        maxWidth: "6.3333cm",
        height: "4.66cm",
        minHeight: "4.66cm",
        maxHeight: "4.66cm",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "1.8mm",
        color: "#000",
        background: "#fff",
        border: "0.35pt solid #d1d5db",
        borderRadius: "1.5mm",
        fontFamily: "Arial, Helvetica, sans-serif",
        boxShadow: "none",
        breakInside: "avoid",
        pageBreakInside: "avoid",
    },
    header: {
        borderBottom: "0.35pt solid #d1d5db",
        paddingBottom: "1.2mm",
    },
    top: {
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1mm",
    },
    title: {
        overflow: "hidden",
        fontSize: "9.5px",
        fontWeight: 800,
        lineHeight: 1,
        textTransform: "uppercase",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    time: {
        flex: "none",
        fontSize: "8px",
        fontWeight: 800,
        lineHeight: 1,
        textAlign: "right",
        whiteSpace: "nowrap",
    },
    patient: {
        marginTop: "1.2mm",
    },
    caption: {
        fontSize: "6.6px",
        fontWeight: 700,
        lineHeight: 1,
        textTransform: "uppercase",
    },
    patientName: {
        marginTop: "0.5mm",
        fontSize: "11px",
        fontWeight: 800,
        lineHeight: 1.05,
        textTransform: "uppercase",
        overflowWrap: "anywhere",
    },
    metaGrid: {
        display: "grid",
        gridTemplateColumns: "0.72fr 1.08fr 0.7fr",
        gap: "0.8mm",
        marginTop: "1mm",
    },
    field: {
        border: "0.35pt solid #d1d5db",
        borderRadius: "1mm",
        padding: "0.8mm 1.2mm",
    },
    fieldValue: {
        marginTop: "0.6mm",
        fontWeight: 800,
        lineHeight: 1,
    },
    body: {
        paddingTop: "1.1mm",
        paddingBottom: "11.8mm",
    },
    diet: {
        marginBottom: "1mm",
        fontSize: "8.2px",
        lineHeight: 1.2,
    },
    composition: {
        marginBottom: "1mm",
        border: "0.35pt solid #d1d5db",
        borderRadius: "1mm",
        padding: "0.9mm 1.2mm",
        fontSize: "6.7px",
        lineHeight: 1.15,
        overflowWrap: "anywhere",
    },
    metrics: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "1mm",
    },
    metric: {
        border: "0.35pt solid #d1d5db",
        borderRadius: "1mm",
        padding: "0.75mm 1.2mm",
    },
    metricInline: {
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "1mm",
    },
    metricValue: {
        marginTop: "0.8mm",
        fontSize: "10.8px",
        fontWeight: 800,
        lineHeight: 1,
    },
    record: {
        display: "grid",
        gridTemplateColumns: "1fr",
        marginTop: "1mm",
        fontSize: "6.8px",
        lineHeight: 1.15,
    },
    footer: {
        position: "absolute",
        right: 0,
        bottom: 0,
        left: 0,
        padding: "1mm 1.8mm",
        borderTop: "0.35pt solid #d1d5db",
        background: "#f8fafc",
        fontSize: "6.2px",
        lineHeight: 1.15,
    },
    footerGrid: {
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "1mm",
    },
    footerLeft: {
        minWidth: 0,
    },
    rt: {
        minWidth: "22mm",
        textAlign: "right",
    },
} satisfies Record<string, CSSProperties>;

const mergeStyle = (...styles: CSSProperties[]): CSSProperties => Object.assign({}, ...styles);

const LabelPreview = ({ data }: { data: LabelData }) => {
    const normalizedWaterText = `${data.templateTitle} ${data.formulaText || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
    const isWaterLabel = normalizedWaterText.includes("AGUA");
    const showInfusionRate = Boolean(data.infusionRate) && !isWaterLabel;
    const volumeMetricStyle = isWaterLabel && !showInfusionRate
        ? mergeStyle(labelStyles.metric, { gridColumn: "1 / -1", padding: "0.85mm 1.2mm" })
        : labelStyles.metric;
    const waterCompositionStyle = mergeStyle(labelStyles.composition, {
        marginTop: "1mm",
        marginBottom: 0,
        maxHeight: "7.5mm",
        overflow: "hidden",
        padding: "0.7mm 1.2mm",
        fontSize: "6.2px",
        lineHeight: 1.1,
    });

    return (
        <article
            className="clinical-label w-[63.5mm] h-[46.6mm] bg-white text-black p-[1.8mm] overflow-hidden font-sans print:shadow-none shadow-md rounded relative box-border border-[0.35pt] border-gray-500 print:border-gray-300"
            style={labelStyles.article}
        >
            <header className="clinical-label__header border-b border-gray-500 print:border-gray-300 pb-[1.2mm]" style={labelStyles.header}>
                <div className="clinical-label__top flex items-start justify-between gap-1" style={labelStyles.top}>
                    <div className="clinical-label__title font-extrabold text-[9.5px] uppercase leading-none truncate" style={labelStyles.title}>
                        {data.templateTitle}
                    </div>
                    {data.scheduleTime && (
                        <div className="clinical-label__time text-[8px] font-extrabold leading-none text-right whitespace-nowrap" style={labelStyles.time}>
                            {data.scheduleTime}
                        </div>
                    )}
                </div>

                <div className="clinical-label__patient mt-[1.2mm]" style={labelStyles.patient}>
                    <div className="clinical-label__patient-caption text-[6.8px] font-bold uppercase leading-none" style={labelStyles.caption}>Paciente</div>
                    <div className="clinical-label__patient-name mt-[0.5mm] text-[11px] font-extrabold uppercase leading-[1.05] break-words" style={labelStyles.patientName}>
                        {data.patientName}
                    </div>
                </div>

                <div className="clinical-label__meta-grid mt-[1mm] grid grid-cols-[0.72fr_1.08fr_0.7fr] gap-[0.8mm]" style={labelStyles.metaGrid}>
                    <div className="clinical-label__field rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[0.8mm]" style={labelStyles.field}>
                        <div className="clinical-label__field-label text-[6.4px] font-bold uppercase leading-none" style={labelStyles.caption}>Leito</div>
                        <div className="clinical-label__field-value clinical-label__field-value--bed mt-[0.6mm] text-[10.5px] font-extrabold leading-none" style={mergeStyle(labelStyles.fieldValue, { fontSize: "10.5px" })}>{data.bed}</div>
                    </div>
                    <div className="clinical-label__field rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[0.8mm]" style={labelStyles.field}>
                        <div className="clinical-label__field-label text-[6.4px] font-bold uppercase leading-none" style={labelStyles.caption}>DN</div>
                        <div className="clinical-label__field-value clinical-label__field-value--dob mt-[0.6mm] text-[8.4px] font-extrabold leading-none" style={mergeStyle(labelStyles.fieldValue, { fontSize: "8.4px" })}>{data.dob}</div>
                    </div>
                    <div className="clinical-label__field rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[0.8mm]" style={labelStyles.field}>
                        <div className="clinical-label__field-label text-[6.4px] font-bold uppercase leading-none" style={labelStyles.caption}>Via</div>
                        <div className="clinical-label__field-value clinical-label__field-value--route mt-[0.6mm] text-[9.4px] font-extrabold leading-none" style={mergeStyle(labelStyles.fieldValue, { fontSize: "9.4px" })}>{data.route}</div>
                    </div>
                </div>
            </header>

            <main className="clinical-label__body pt-[1.1mm] pb-[11.8mm] space-y-[1mm]" style={labelStyles.body}>
                {data.formulaText && (
                    <div className="clinical-label__diet text-[8.2px] leading-tight" style={labelStyles.diet}>
                        <strong>Dieta:</strong>{" "}
                        <strong>{data.formulaText}</strong>
                    </div>
                )}

                <div className="clinical-label__metrics grid grid-cols-2 gap-[1mm]" style={labelStyles.metrics}>
                    {data.volumeText && (
                        <div className="clinical-label__metric rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[1mm]" style={volumeMetricStyle}>
                            <div className="clinical-label__metric-inline" style={labelStyles.metricInline}>
                                <div className="clinical-label__metric-label text-[6.6px] font-bold uppercase leading-none whitespace-nowrap" style={labelStyles.caption}>Volume total</div>
                                <div className={`clinical-label__metric-value${isWaterLabel ? " clinical-label__metric-value--water" : ""} text-[12.4px] font-extrabold leading-none whitespace-nowrap`} style={mergeStyle(labelStyles.metricValue, { marginTop: 0, fontSize: isWaterLabel ? "13.5px" : "12.4px" })}>{data.volumeText}</div>
                            </div>
                        </div>
                    )}
                    {showInfusionRate && (
                        <div className="clinical-label__metric rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[1mm]" style={labelStyles.metric}>
                            <div className="clinical-label__metric-label text-[6.6px] font-bold uppercase leading-none" style={labelStyles.caption}>Vazao</div>
                            <div className="clinical-label__metric-value mt-[0.8mm] text-[10.2px] font-extrabold leading-none" style={mergeStyle(labelStyles.metricValue, { fontSize: "10.2px" })}>{data.infusionRate}</div>
                        </div>
                    )}
                </div>

                {isWaterLabel && data.compositionText && (
                    <div className="clinical-label__composition rounded-[1mm] border border-gray-500 print:border-gray-300 px-[1.2mm] py-[0.9mm] text-[6.7px] leading-tight break-words" style={waterCompositionStyle}>
                        <strong>Módulos:</strong> {data.compositionText}
                    </div>
                )}

                <div className="clinical-label__record grid grid-cols-1 gap-x-[1.2mm] text-[6.8px] leading-tight" style={labelStyles.record}>
                    <div><strong>Registro:</strong> {data.record}</div>
                </div>
            </main>

            <footer className="clinical-label__footer absolute bottom-0 left-0 right-0 border-t border-gray-500 print:border-gray-300 bg-gray-50 px-[1.8mm] py-[1mm] text-[6.2px] leading-tight" style={labelStyles.footer}>
                <div className="clinical-label__footer-grid grid grid-cols-[1fr_auto] gap-x-1" style={labelStyles.footerGrid}>
                    <div className="clinical-label__footer-left min-w-0" style={labelStyles.footerLeft}>
                        <div>
                            <strong>{data.manipulationTime ? "Manipulado em:" : "Data:"}</strong> {data.manipulationDate}
                            {data.manipulationTime ? `, ${data.manipulationTime}` : ""}
                        </div>
                        <div style={{ fontWeight: 600 }}>{data.validityText}</div>
                        {data.conservationText && (
                            <div><strong>Conservacao:</strong> {data.conservationText}</div>
                        )}
                    </div>
                    <div className="clinical-label__rt text-right min-w-[22mm]" style={labelStyles.rt}>
                        <div style={{ fontWeight: 700, textTransform: "uppercase" }}>Responsavel Tecnico</div>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.rtName}</div>
                        <div>{data.rtCrn}</div>
                    </div>
                </div>
            </footer>
        </article>
    );
};

export default LabelPreview;
