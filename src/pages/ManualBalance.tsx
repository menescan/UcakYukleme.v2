import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Home, Calculator, Settings2 } from 'lucide-react';
import { TRANSLATIONS, Language } from '@/utils/translations';
import { usePersistentState } from '@/hooks/usePersistentState';

// --- Types ---

type CompartmentCore = {
    baggage: string;
    cargo: string;
    eic: string;
};

type DryOperatingData = {
    Aircraft: string;
    Reg: string;
    Cockpit: string;
    Cabin: string;
    Pantry: string;
    WaterPercent: string;
    BasicWeight: number;
    DOI: number;
};

// --- Config Types ---

type Calibration = {
    viewBoxW: number;
    viewBoxH: number;
    originX: number; // DOI 50 (or 0?) pixel X position
    originY: number; // Start Line Y
    pixelsPerUnit: number; // Pixels per 1 Index Unit (Visual Grid Width)
    stepHeight: number; // Pixels between steps
    doiScale: number; // Index value at OriginX. Usually 50?
};

// Default Calibration (Can be tweaked by user)
const DEFAULT_CALIBRATION: Calibration = {
    viewBoxW: 1000,
    viewBoxH: 1000,
    originX: 500, // Center-ish
    originY: 100, // Top-ish
    pixelsPerUnit: 10, // Grid width
    stepHeight: 50, // Row height
    doiScale: 50, // Value at OriginX
};

const ManualBalance = () => {
    const navigate = useNavigate();
    const [language] = usePersistentState<Language>('language', 'TR');

    // Config
    const [aircraftType] = useState('A321-231');
    const [tailNumber] = useState('TC-JRA');

    // Data
    const [dryData, setDryData] = useState<DryOperatingData[]>([]);

    // State - Inputs
    const [cockpit, setCockpit] = useState<string>('2');
    const [cabin, setCabin] = useState<string>('6');
    const [pantry, setPantry] = useState<string>('');
    const [water, setWater] = useState<string>('100');

    // Pax Zones
    const [paxA, setPaxA] = useState<string>('');
    const [paxB, setPaxB] = useState<string>('');
    const [paxC, setPaxC] = useState<string>('');
    const [paxD, setPaxD] = useState<string>(''); // New Zone D

    // Compartments
    const [compartments, setCompartments] = useState<Record<string, CompartmentCore>>({
        c1: { baggage: '', cargo: '', eic: '' },
        c2: { baggage: '', cargo: '', eic: '' },
        c3: { baggage: '', cargo: '', eic: '' },
        c4: { baggage: '', cargo: '', eic: '' },
        c5: { baggage: '', cargo: '', eic: '35' },
    });

    // results
    const [calculatedData, setCalculatedData] = useState<{ weight: number; doi: number; dow: number; msg?: string } | null>(null);

    // Calibration State
    const [cal, setCal] = usePersistentState<Calibration>('chartCalibration', DEFAULT_CALIBRATION);
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        fetch('/dry_operating_data.csv')
            .then(res => res.text())
            .then(text => {
                const lines = text.trim().split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                const data = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const obj: any = {};
                    headers.forEach((h, i) => obj[h] = values[i]);
                    return {
                        ...obj,
                        BasicWeight: Number(obj.BasicWeight),
                        DOI: Number(obj.DOI)
                    } as DryOperatingData;
                });
                setDryData(data);
            })
            .catch(err => console.error('Failed to load CSV', err));
    }, []);

    const updateCompartment = (comp: string, field: keyof CompartmentCore, value: string) => {
        setCompartments(prev => ({
            ...prev,
            [comp]: { ...prev[comp], [field]: value }
        }));
    };

    const handleCalculate = () => {
        // Find matching dry operating data
        const match = dryData.find(d =>
            d.Aircraft === aircraftType &&
            d.Reg === tailNumber &&
            d.Cockpit === cockpit &&
            d.Cabin === cabin &&
            d.Pantry === pantry.toUpperCase() &&
            d.WaterPercent === water
        );

        if (!match) {
            setCalculatedData({ weight: 0, doi: 0, dow: 0, msg: 'Konfigürasyon bulunamadı! (Pantry/Ekip kontrol edin)' });
            return;
        }

        let totalPayload = 0;
        Object.values(compartments).forEach(c => {
            totalPayload += Number(c.baggage || 0) + Number(c.cargo || 0) + Number(c.eic || 0);
        });

        // Add Pax weights (Assuming 84kg per pax for ZFW calculation)
        const totalPax = Number(paxA || 0) + Number(paxB || 0) + Number(paxC || 0) + Number(paxD || 0);
        const paxWeight = totalPax * 84;
        totalPayload += paxWeight;

        const zfw = match.BasicWeight + totalPayload;

        setCalculatedData({
            weight: zfw,
            doi: match.DOI,
            dow: match.BasicWeight
        });
    };

    // --- Steps Definition (Memoized to read updated cal) ---
    // User Rules:
    // Pax: A(L/5), B(L/10), C(R/10), D(R/5)
    // Comp: 1(L/500), 2(L/500), 3(R/500), 4(R/500), 5(R/250)

    const chartPoints = useMemo(() => {
        if (!calculatedData) return [];

        const points: { x: number; y: number }[] = [];

        // Helper: Convert Index to Pixels relative to OriginX (at DOIScale)
        // x = OriginX + (Value - DOIScale) * PixelsPerUnit
        const getX = (idx: number) => cal.originX + (idx - cal.doiScale) * cal.pixelsPerUnit;

        // Start: DOI
        let currentIndex = calculatedData.doi;
        let currentY = cal.originY; // Start Line Y

        points.push({ x: getX(currentIndex), y: currentY });

        const steps = [
            { key: 'paxA', val: Number(paxA || 0), div: 5, dir: -1 },  // Left 5
            { key: 'paxB', val: Number(paxB || 0), div: 10, dir: -1 }, // Left 10
            { key: 'paxC', val: Number(paxC || 0), div: 10, dir: 1 },  // Right 10
            { key: 'paxD', val: Number(paxD || 0), div: 5, dir: 1 },   // Right 5
            { key: 'c1', val: 0, div: 500, dir: -1 }, // L 500
            { key: 'c2', val: 0, div: 500, dir: -1 }, // L 500
            { key: 'c3', val: 0, div: 500, dir: 1 },  // R 500
            { key: 'c4', val: 0, div: 500, dir: 1 },  // R 500
            { key: 'c5', val: 0, div: 250, dir: 1 },  // R 250
        ];

        // Fill Comp values dynamically
        steps[4].val = Number(compartments.c1.baggage || 0) + Number(compartments.c1.cargo || 0) + Number(compartments.c1.eic || 0);
        steps[5].val = Number(compartments.c2.baggage || 0) + Number(compartments.c2.cargo || 0) + Number(compartments.c2.eic || 0);
        steps[6].val = Number(compartments.c3.baggage || 0) + Number(compartments.c3.cargo || 0) + Number(compartments.c3.eic || 0);
        steps[7].val = Number(compartments.c4.baggage || 0) + Number(compartments.c4.cargo || 0) + Number(compartments.c4.eic || 0);
        steps[8].val = Number(compartments.c5.baggage || 0) + Number(compartments.c5.cargo || 0) + Number(compartments.c5.eic || 0);

        steps.forEach(step => {
            // Move Down first
            currentY += cal.stepHeight;
            points.push({ x: getX(currentIndex), y: currentY });

            // Calculate Delta (How many index units change)
            // Each "Grid Line" represents 1 index unit?
            // User said "Sola 5" -> A value of 5 moves 1 grid unit left?
            // Or "Value / 5" = Number of units.
            // Yes: "5'e bölüm o oranla sola gidecek".
            // So DeltaIndex = Value / Divisor.

            const deltaIndex = (step.val / step.div) * step.dir;
            currentIndex += deltaIndex;

            // Move Horizontally
            points.push({ x: getX(currentIndex), y: currentY });
        });

        // Final Drop
        points.push({ x: getX(currentIndex), y: cal.viewBoxH });

        return points;
    }, [calculatedData, paxA, paxB, paxC, paxD, compartments, cal]);


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-4 transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-6 pb-12">

                {/* Header */}
                <div className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg backdrop-blur-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/')}
                        className="text-xs font-bold gap-2"
                    >
                        <Home className="h-4 w-4" />
                        {TRANSLATIONS[language].home}
                    </Button>

                    <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{TRANSLATIONS[language].manualBalanceTitle}</h1>

                    <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
                        <Settings2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <Card className="mb-6 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                        <CardHeader className="py-3"><CardTitle className="text-sm">Chart Calibration (Ayarlar)</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                                <Label>ViewBox W</Label>
                                <Input type="number" value={cal.viewBoxW} onChange={e => setCal({ ...cal, viewBoxW: Number(e.target.value) })} />
                            </div>
                            <div>
                                <Label>ViewBox H</Label>
                                <Input type="number" value={cal.viewBoxH} onChange={e => setCal({ ...cal, viewBoxH: Number(e.target.value) })} />
                            </div>
                            <div>
                                <Label>Origin X (at Center Index)</Label>
                                <Input type="number" value={cal.originX} onChange={e => setCal({ ...cal, originX: Number(e.target.value) })} />
                            </div>
                            <div>
                                <Label>Start Y</Label>
                                <Input type="number" value={cal.originY} onChange={e => setCal({ ...cal, originY: Number(e.target.value) })} />
                            </div>
                            <div>
                                <Label>Pixels Per Index Unit</Label>
                                <Input type="number" value={cal.pixelsPerUnit} onChange={e => setCal({ ...cal, pixelsPerUnit: Number(e.target.value) })} />
                            </div>
                            <div>
                                <Label>Step Height (Px)</Label>
                                <Input type="number" value={cal.stepHeight} onChange={e => setCal({ ...cal, stepHeight: Number(e.target.value) })} />
                            </div>
                            <div>
                                <Label>Center Index Value (e.g. 50)</Label>
                                <Input type="number" value={cal.doiScale} onChange={e => setCal({ ...cal, doiScale: Number(e.target.value) })} />
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Inputs Column (Left - 4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{TRANSLATIONS[language].inputs}</CardTitle>
                                <p className="text-xs text-muted-foreground">{aircraftType} - {tailNumber}</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Upper Config */}
                                <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border dark:border-slate-800">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">{TRANSLATIONS[language].cockpit}</Label>
                                        <Input value={cockpit} onChange={(e) => setCockpit(e.target.value)} className="h-8 text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">{TRANSLATIONS[language].cabin}</Label>
                                        <Input value={cabin} onChange={(e) => setCabin(e.target.value)} className="h-8 text-center" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">{TRANSLATIONS[language].pantry}</Label>
                                        <Input value={pantry} onChange={(e) => setPantry(e.target.value)} placeholder="CODE" className="h-8 text-center uppercase" />
                                    </div>
                                    <div className="space-y-1 col-span-3">
                                        <Label className="text-[10px] uppercase text-muted-foreground">{TRANSLATIONS[language].water} (%)</Label>
                                        <Select value={water} onValueChange={setWater}>
                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="100">%100</SelectItem>
                                                <SelectItem value="75">%75</SelectItem>
                                                <SelectItem value="50">%50</SelectItem>
                                                <SelectItem value="25">%25</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator />

                                {/* Pax Zones */}
                                <div>
                                    <Label className="text-sm font-semibold mb-2 block">Yolcu Dağılımı (4 Zone)</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="text-center">
                                            <Label className="text-[10px] text-muted-foreground">Zone A</Label>
                                            <Input type="number" placeholder="A" value={paxA} onChange={e => setPaxA(e.target.value)} className="text-center" />
                                        </div>
                                        <div className="text-center">
                                            <Label className="text-[10px] text-muted-foreground">Zone B</Label>
                                            <Input type="number" placeholder="B" value={paxB} onChange={e => setPaxB(e.target.value)} className="text-center" />
                                        </div>
                                        <div className="text-center">
                                            <Label className="text-[10px] text-muted-foreground">Zone C</Label>
                                            <Input type="number" placeholder="C" value={paxC} onChange={e => setPaxC(e.target.value)} className="text-center" />
                                        </div>
                                        <div className="text-center">
                                            <Label className="text-[10px] text-muted-foreground">Zone D</Label>
                                            <Input type="number" placeholder="D" value={paxD} onChange={e => setPaxD(e.target.value)} className="text-center" />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Compartments */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold">{TRANSLATIONS[language].compartments}</Label>

                                    {[1, 2, 3, 4, 5].map((num) => {
                                        const key = `c${num}`;
                                        return (
                                            <div key={key} className="p-2 border rounded-md dark:border-slate-800 bg-white dark:bg-slate-900/20">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-gray-500">Comp {num}</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder="Bag"
                                                        value={compartments[key].baggage}
                                                        onChange={(e) => updateCompartment(key, 'baggage', e.target.value)}
                                                        className="h-7 text-xs px-2"
                                                    />
                                                    <Input
                                                        type="number"
                                                        placeholder="Cargo"
                                                        value={compartments[key].cargo}
                                                        onChange={(e) => updateCompartment(key, 'cargo', e.target.value)}
                                                        className="h-7 text-xs px-2"
                                                    />
                                                    <Input
                                                        type="number"
                                                        placeholder="EIC"
                                                        value={compartments[key].eic}
                                                        onChange={(e) => updateCompartment(key, 'eic', e.target.value)}
                                                        className="h-7 text-xs px-2"
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <Button className="w-full mt-4 bg-primary hover:bg-primary/90" onClick={handleCalculate}>
                                    <Calculator className="mr-2 h-4 w-4" />
                                    {TRANSLATIONS[language].calculate}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart Column (Right - 8 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="h-full flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg">{TRANSLATIONS[language].chart}</CardTitle>
                                <div className="flex items-center gap-4 text-sm">
                                    {calculatedData && (
                                        <>
                                            <div className="text-gray-500 font-medium">DOW Index: {calculatedData.doi.toFixed(2)}</div>
                                        </>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-[500px] relative p-0 overflow-hidden bg-white dark:bg-slate-200">

                                {/* SVG Drawing Area using viewBox for Perfect Scaling */}
                                <svg
                                    viewBox={`0 0 ${cal.viewBoxW} ${cal.viewBoxH}`}
                                    className="w-full h-full"
                                    preserveAspectRatio="xMidYMid meet"
                                >
                                    {/* Embedded Image */}
                                    <image
                                        href="/chart_bg.png"
                                        x="0"
                                        y="0"
                                        width={cal.viewBoxW}
                                        height={cal.viewBoxH}
                                        preserveAspectRatio="none"
                                    />

                                    {/* Debug Grid (if Settings Open) */}
                                    {showSettings && (
                                        <>
                                            <line x1={cal.originX} y1={0} x2={cal.originX} y2={cal.viewBoxH} stroke="blue" strokeWidth="2" strokeOpacity="0.5" />
                                            <line x1={0} y1={cal.originY} x2={cal.viewBoxW} y2={cal.originY} stroke="blue" strokeWidth="2" strokeOpacity="0.5" />
                                            {/* Grid Steps */}
                                            {Array.from({ length: 20 }).map((_, i) => (
                                                <line
                                                    key={i}
                                                    x1={cal.originX + (i * 10 * cal.pixelsPerUnit)}
                                                    y1={0}
                                                    x2={cal.originX + (i * 10 * cal.pixelsPerUnit)}
                                                    y2={cal.viewBoxH}
                                                    stroke="gray"
                                                    strokeWidth="1"
                                                    strokeOpacity="0.2"
                                                />
                                            ))}
                                        </>
                                    )}

                                    {/* Trim Line */}
                                    {chartPoints.length > 0 && (
                                        <>
                                            <polyline
                                                points={chartPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                                fill="none"
                                                stroke="red"
                                                strokeWidth="4"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            {chartPoints.map((p, i) => (
                                                <circle key={i} cx={p.x} cy={p.y} r="6" fill="red" />
                                            ))}
                                        </>
                                    )}
                                </svg>

                                {calculatedData?.msg && (
                                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded shadow-lg">
                                        {calculatedData.msg}
                                    </div>
                                )}
                                {!calculatedData && (
                                    <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                                        <div className="bg-white/80 p-4 rounded-lg shadow text-gray-500">
                                            Veriler bekleniyor...
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManualBalance;
