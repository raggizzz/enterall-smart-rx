import React from 'react';
import { RequisitionData } from '@/types/requisition';

interface RequisitionDocumentProps {
    data: RequisitionData | null;
}

export const RequisitionDocument: React.FC<RequisitionDocumentProps> = ({ data }) => {
    if (!data) return null;

    return (
        <div className="hidden print:block font-sans text-xs text-black bg-white p-4">
            {/* Cabeçalho Institucional */}
            <div className="border-b-2 border-black pb-4 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-wide">Hospital Modelo</h1>
                        <h2 className="text-lg font-semibold mt-1">Requisição de Nutrição Enteral e Oral</h2>
                    </div>
                    <div className="text-right">
                        <p className="font-medium">Emissão: {data.printDate}</p>
                        <p className="font-medium">Período: {data.startDate} a {data.endDate}</p>
                        <p className="font-bold mt-1 text-sm bg-gray-100 px-2 py-1 rounded inline-block">
                            Unidade: {data.unitName}
                        </p>
                    </div>
                </div>
            </div>

            {/* Mapa de Dietas por Paciente */}
            <div className="mb-8">
                <h3 className="text-base font-bold mb-2 uppercase border-l-4 border-black pl-2">Mapa de Distribuição</h3>
                <table className="w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 text-left w-16">Leito</th>
                            <th className="border border-gray-300 p-2 text-left">Paciente</th>
                            <th className="border border-gray-300 p-2 text-center w-16">Via</th>
                            <th className="border border-gray-300 p-2 text-left w-20">Cód.</th>
                            <th className="border border-gray-300 p-2 text-left">Produto / Item</th>
                            <th className="border border-gray-300 p-2 text-right w-20">Qtd/Dose</th>
                            <th className="border border-gray-300 p-2 text-center w-24">Velocidade</th>
                            <th className="border border-gray-300 p-2 text-left">Horários</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.dietMap.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="border border-gray-300 p-4 text-center text-gray-500 italic">
                                    Nenhuma dieta encontrada para os filtros selecionados.
                                </td>
                            </tr>
                        ) : (
                            data.dietMap.map((item, index) => (
                                <tr key={`${item.patientId}-${item.productName}-${index}`} className="group hover:bg-gray-50">
                                    <td className="border border-gray-300 p-1 text-center font-medium">{item.bed}</td>
                                    <td className="border border-gray-300 p-1">
                                        <div className="font-semibold">{item.patientName}</div>
                                        {item.dob && <div className="text-[10px] text-gray-500">DN: {new Intl.DateTimeFormat('pt-BR').format(new Date(item.dob))}</div>}
                                    </td>
                                    <td className="border border-gray-300 p-1 text-center text-[10px] uppercase">{item.route}</td>
                                    <td className="border border-gray-300 p-1 text-center text-[10px] font-mono">{item.productCode}</td>
                                    <td className={`border border-gray-300 p-1 ${item.type === 'water' ? 'text-gray-400 text-[10px]' : ''}`}>
                                        <span className={`px-1 rounded text-[10px] uppercase font-bold mr-1 
                                            ${item.type === 'water' ? 'bg-gray-100 text-gray-500' :
                                                item.type === 'module' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                            {item.type === 'water' ? 'ÁGUA' : item.type === 'module' ? 'MÓDULO' : item.type === 'supplement' ? 'SUPLEMENTO' : ''}
                                        </span>
                                        {item.productName}
                                    </td>
                                    <td className="border border-gray-300 p-1 text-right font-medium">
                                        {item.volumeOrAmount} {item.unit}
                                    </td>
                                    <td className="border border-gray-300 p-1 text-center text-[10px]">
                                        {item.rate || '-'}
                                    </td>
                                    <td className="border border-gray-300 p-1 text-[10px]">
                                        <div className="flex flex-wrap gap-1">
                                            {item.times.map(t => (
                                                <span key={t} className="bg-gray-200 px-1 rounded">{t}</span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Requisição Consolidada */}
            <div className="mb-8 break-inside-avoid">
                <h3 className="text-base font-bold mb-2 uppercase border-l-4 border-black pl-2">Consolidado para Faturamento</h3>
                <table className="w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 p-2 text-left w-24">Código</th>
                            <th className="border border-gray-300 p-2 text-left">Produto</th>
                            <th className="border border-gray-300 p-2 text-center w-20">Unidade</th>
                            <th className="border border-gray-300 p-2 text-right w-24">Qtd. Total</th>
                            <th className="border border-gray-300 p-2 text-right w-24">Valor Unit.</th>
                            <th className="border border-gray-300 p-2 text-right w-28">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.consolidated.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="border border-gray-300 p-4 text-center text-gray-500 italic">
                                    Nenhum item para faturamento.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {data.consolidated.map((item, index) => (
                                    <tr key={`${item.code}-${index}`}>
                                        <td className="border border-gray-300 p-1 text-center font-mono text-[10px]">{item.code || '-'}</td>
                                        <td className="border border-gray-300 p-1 font-medium">{item.name}</td>
                                        <td className="border border-gray-300 p-1 text-center text-[10px] uppercase">{item.billingUnit}</td>
                                        <td className="border border-gray-300 p-1 text-right font-bold">{item.totalQuantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                                        <td className="border border-gray-300 p-1 text-right text-gray-600">
                                            {item.unitPrice ? item.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                        </td>
                                        <td className="border border-gray-300 p-1 text-right font-medium">
                                            {item.subtotal ? item.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-gray-100 font-bold">
                                    <td colSpan={5} className="border border-gray-300 p-2 text-right uppercase">Total do Período</td>
                                    <td className="border border-gray-300 p-2 text-right text-lg">
                                        {data.consolidated.reduce((sum, item) => sum + (item.subtotal || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Assinaturas */}
            <div className="mt-16 break-inside-avoid">
                <div className="grid grid-cols-3 gap-8 text-center text-[10px]">
                    <div>
                        <div className="border-t border-black mb-2 pt-2 mx-auto w-3/4"></div>
                        <p className="font-bold uppercase">{data.signatures.technician}</p>
                    </div>
                    <div>
                        <div className="border-t border-black mb-2 pt-2 mx-auto w-3/4"></div>
                        <p className="font-bold uppercase">{data.signatures.prescriber}</p>
                    </div>
                    <div>
                        <div className="border-t border-black mb-2 pt-2 mx-auto w-3/4"></div>
                        <p className="font-bold uppercase">{data.signatures.manager}</p>
                    </div>
                </div>
                <div className="mt-8 text-center text-[8px] text-gray-400">
                    Documento gerado eletronicamente em {data.printDate} - EnterAll Smart RX
                </div>
            </div>
        </div>
    );
};
