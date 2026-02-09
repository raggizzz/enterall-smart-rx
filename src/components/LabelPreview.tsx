import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import logo from "@/assets/logoenmeta.png";

interface LabelData {
    patientName: string;
    bed: string;
    dob: string;
    formulaName: string;
    totalVolume: number;
    infusionRate: string;
    route: string;
    manipulationDate: string;
    validity: string;
    conservation: string;
    rtName: string;
    rtCrn: string;
    lot: string;
    systemType: 'open' | 'closed';
}

const LabelPreview = ({ data }: { data: LabelData }) => {
    return (
        <div className="w-[400px] border-2 border-black p-4 bg-white text-black font-sans text-sm">
            <div className="flex items-center gap-2 border-b-2 border-black pb-2 mb-2">
                <img src={logo} alt="ENMeta" className="h-8 w-auto" />
                <div className="flex-1 text-center font-bold text-lg">NUTRI??O ENTERAL</div>
            </div>

            <div className="space-y-2">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="font-bold">NOME:</span>
                    <span className="uppercase">{data.patientName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-[50px_1fr] gap-2">
                        <span className="font-bold">LEITO:</span>
                        <span>{data.bed}</span>
                    </div>
                    <div className="grid grid-cols-[50px_1fr] gap-2">
                        <span className="font-bold">NASC:</span>
                        <span>{data.dob}</span>
                    </div>
                </div>

                <Separator className="bg-black my-2" />

                <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="font-bold">DIETA:</span>
                    <span className="uppercase font-bold">{data.formulaName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="font-bold block">VOLUME TOTAL:</span>
                        <span className="text-lg">{data.totalVolume} ml</span>
                    </div>
                    <div>
                        <span className="font-bold block">VELOCIDADE:</span>
                        <span>{data.infusionRate}</span>
                    </div>
                </div>

                <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="font-bold">VIA ADM:</span>
                    <span className="uppercase">{data.route}</span>
                </div>

                <Separator className="bg-black my-2" />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="font-bold block">MANIPULAÇÃO:</span>
                        <span>{data.manipulationDate}</span>
                    </div>
                    <div>
                        <span className="font-bold block">VALIDADE:</span>
                        <span className="font-bold text-red-600">{data.validity}</span>
                    </div>
                </div>

                <div>
                    <span className="font-bold block">CONSERVAÇÃO:</span>
                    <span>{data.conservation}</span>
                </div>

                <Separator className="bg-black my-2" />

                <div className="grid grid-cols-[50px_1fr] gap-2">
                    <span className="font-bold">RT:</span>
                    <span>{data.rtName} - CRN: {data.rtCrn}</span>
                </div>

                <div className="grid grid-cols-[50px_1fr] gap-2">
                    <span className="font-bold">LOTE:</span>
                    <span>{data.lot}</span>
                </div>
            </div>
        </div>
    );
};

export default LabelPreview;
