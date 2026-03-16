import React from 'react';
import { RequisitionData, DietMapItem } from '@/types/requisition';

interface RequisitionDocumentProps {
    data: RequisitionData | null;
}

const formatQuantity = (value?: number, unit?: string) => {
    if (value === undefined || value === null || Number.isNaN(value)) return '-';
    const normalized = Number.isInteger(value) ? value.toString() : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    return unit ? `${normalized} ${unit}` : normalized;
};

const getTypeBadge = (item: DietMapItem) => {
    if (item.type === 'water') return 'AGUA';
    if (item.type === 'module') return 'MODULO';
    if (item.type === 'supplement') return 'SUPLEMENTO';
    return 'DIETA';
};

export const RequisitionDocument: React.FC<RequisitionDocumentProps> = ({ data }) => {
    if (!data) return null;

    const patientRowCount = data.dietMap.reduce<Record<string, number>>((acc, item) => {
        acc[item.patientId] = (acc[item.patientId] || 0) + 1;
        return acc;
    }, {});

    const consolidatedTotal = data.consolidated.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    return (
        <div className="hidden print:block bg-white p-4 text-[10px] text-black">
            <div className="mb-4 border-b border-black pb-3">
                <div className="text-center">
                    <p className="text-lg font-bold uppercase">{data.unitName}</p>
                    <p className="text-sm font-semibold uppercase">Requisicao de insumos para faturamento</p>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
                    <div>
                        <p><span className="font-semibold">Ala:</span> {data.unitName}</p>
                        <p><span className="font-semibold">Via:</span> {data.therapyLabel}</p>
                    </div>
                    <div>
                        <p><span className="font-semibold">Data da requisicao:</span> {data.printDate}</p>
                        <p><span className="font-semibold">Periodo:</span> {data.startDate} a {data.endDate}</p>
                    </div>
                    <div>
                        <p><span className="font-semibold">Horarios:</span> {data.selectedTimes.length > 0 ? data.selectedTimes.join(', ') : 'Todos'}</p>
                        <p><span className="font-semibold">Pacientes no mapa:</span> {new Set(data.dietMap.map((item) => item.patientId)).size}</p>
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <h2 className="mb-2 text-xs font-bold uppercase">Mapa da dieta por paciente</h2>
                <table className="w-full border-collapse border border-black">
                    <thead>
                        <tr>
                            <th className="border border-black p-1 text-left">Leito</th>
                            <th className="border border-black p-1 text-left">Data Nasc</th>
                            <th className="border border-black p-1 text-left">Paciente</th>
                            <th className="border border-black p-1 text-left">Via</th>
                            <th className="border border-black p-1 text-left">Produto</th>
                            <th className="border border-black p-1 text-center">Vol/gr</th>
                            <th className="border border-black p-1 text-center">Volume total/etapa</th>
                            <th className="border border-black p-1 text-center">Vel Inf</th>
                            <th className="border border-black p-1 text-center">Horarios</th>
                            <th className="border border-black p-1 text-left">Observacoes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.dietMap.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="border border-black p-3 text-center italic">
                                    Nenhum item encontrado para os filtros selecionados.
                                </td>
                            </tr>
                        ) : (
                            data.dietMap.map((item, index) => {
                                const isFirstPatientRow = index === 0 || data.dietMap[index - 1].patientId !== item.patientId;
                                const rowSpan = patientRowCount[item.patientId] || 1;

                                return (
                                    <tr key={`${item.patientId}-${item.productName}-${index}`}>
                                        {isFirstPatientRow && (
                                            <>
                                                <td rowSpan={rowSpan} className="border border-black p-1 align-top font-semibold">
                                                    {item.bed || '-'}
                                                </td>
                                                <td rowSpan={rowSpan} className="border border-black p-1 align-top">
                                                    {item.dob ? new Intl.DateTimeFormat('pt-BR').format(new Date(item.dob)) : '-'}
                                                </td>
                                                <td rowSpan={rowSpan} className="border border-black p-1 align-top">
                                                    <div className="font-semibold">{item.patientName}</div>
                                                    {item.patientRecord && (
                                                        <div className="text-[9px] text-slate-600">Prontuario: {item.patientRecord}</div>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                        <td className="border border-black p-1 align-top uppercase">{item.route}</td>
                                        <td className="border border-black p-1 align-top">
                                            <div className="font-semibold">{item.productName}</div>
                                            <div className="text-[9px] uppercase text-slate-600">
                                                {getTypeBadge(item)} {item.productCode ? `| Cod. ${item.productCode}` : ''}
                                            </div>
                                        </td>
                                        <td className="border border-black p-1 text-center align-top">
                                            {formatQuantity(item.volumeOrAmount, item.unit)}
                                        </td>
                                        <td className="border border-black p-1 text-center align-top">
                                            {formatQuantity(item.stageVolume, item.stageVolumeUnit)}
                                        </td>
                                        <td className="border border-black p-1 text-center align-top">{item.rate || '-'}</td>
                                        <td className="border border-black p-1 text-center align-top">
                                            {item.times.length > 0 ? item.times.join('  ') : '-'}
                                        </td>
                                        <td className="border border-black p-1 align-top">{item.observation || '-'}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mb-6 break-inside-avoid">
                <h2 className="mb-2 text-xs font-bold uppercase">Requisicao consolidada de produtos</h2>
                <table className="w-full border-collapse border border-black">
                    <thead>
                        <tr>
                            <th className="border border-black p-1 text-left">Item</th>
                            <th className="border border-black p-1 text-left">Codigo</th>
                            <th className="border border-black p-1 text-center">Quantidade total</th>
                            <th className="border border-black p-1 text-center">Unidade</th>
                            <th className="border border-black p-1 text-right">Preco unitario</th>
                            <th className="border border-black p-1 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.consolidated.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="border border-black p-3 text-center italic">
                                    Nenhum item para faturamento.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {data.consolidated.map((item, index) => (
                                    <tr key={`${item.code}-${index}`}>
                                        <td className="border border-black p-1">{item.name}</td>
                                        <td className="border border-black p-1">{item.code || '-'}</td>
                                        <td className="border border-black p-1 text-center">
                                            {item.totalQuantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="border border-black p-1 text-center uppercase">{item.billingUnit}</td>
                                        <td className="border border-black p-1 text-right">
                                            {item.unitPrice ? item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                        </td>
                                        <td className="border border-black p-1 text-right">
                                            {item.subtotal ? item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                        </td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan={5} className="border border-black p-1 text-right font-bold uppercase">Total</td>
                                    <td className="border border-black p-1 text-right font-bold">
                                        {consolidatedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-8 text-[10px]">
                <div>
                    <p className="border-t border-black pt-2 font-semibold">Tecnico responsavel / Matricula:</p>
                    <p className="mt-2">{data.signatures.technician}</p>
                </div>
                <div>
                    <p className="border-t border-black pt-2 font-semibold">Nutricionista prescritor / Matricula:</p>
                    <p className="mt-2">{data.signatures.prescriber}</p>
                </div>
                <div>
                    <p className="border-t border-black pt-2 font-semibold">Nutricionista RT ou da Concessionaria / Matricula:</p>
                    <p className="mt-2">{data.signatures.manager}</p>
                </div>
            </div>
        </div>
    );
};
