import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// --- Constants & Geometry ---

type ZoneGeometry = {
    key: string;
    yStart: number;
    yEnd: number;
    drift: number; // Total X shift due to grid slope (Neutral line)
    widthPerDivisor: number; // Pixels per "Divisor" unit width
    divisor: number;
    direction: 1 | -1; // 1 = Right, -1 = Left
};

const DOI_CONFIG = {
    y: 30,
    xMin: 178,
    valMin: 1,
    xMax: 991,
    valMax: 110
};

// Drift = X_Bottom - X_Top of a reference vertical line
const ZONES: ZoneGeometry[] = [
    {
        key: 'paxA', yStart: 32, yEnd: 64,
        drift: -35,
        widthPerDivisor: 35,
        divisor: 5, direction: -1
    },
    {
        key: 'paxB', yStart: 64, yEnd: 97,
        drift: -20,
        widthPerDivisor: 20,
        divisor: 10, direction: -1
    },
    {
        key: 'paxC', yStart: 97, yEnd: 130,
        drift: 22,
        widthPerDivisor: 22,
        divisor: 10, direction: 1
    },
    {
        key: 'paxD', yStart: 130, yEnd: 162,
        drift: 32,
        widthPerDivisor: 32,
        divisor: 5, direction: 1
    },
    {
        key: 'c1', yStart: 162, yEnd: 198,
        drift: -45,
        widthPerDivisor: 45,
        divisor: 500, direction: -1
    },
    {
        key: 'c2', yStart: 198, yEnd: 227,
        drift: -22,
        widthPerDivisor: 22,
        divisor: 500, direction: -1
    },
    {
        key: 'c3', yStart: 227, yEnd: 261,
        drift: 37,
        widthPerDivisor: 37,
        divisor: 500, direction: 1
    },
    {
        key: 'c4', yStart: 261, yEnd: 293,
        drift: 38,
        widthPerDivisor: 38,
        divisor: 500, direction: 1
    },
    {
        key: 'c5', yStart: 293, yEnd: 327,
        drift: 25,
        widthPerDivisor: 25,
        divisor: 250, direction: 1
    },
];

const FUEL_INDEX_Y = 364;

// Native Image Dimensions (1016 x 990)
const CHART_WIDTH = 1016;
const CHART_HEIGHT = 990;
const CHART_VIEWBOX = `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`;

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

    // Pax Inputs
    const [paxA, setPaxA] = useState<string>('');
    const [paxB, setPaxB] = useState<string>('');
    const [paxC, setPaxC] = useState<string>('');
    const [paxD, setPaxD] = useState<string>('');

    // Compartment Inputs
    const [compartments, setCompartments] = useState<Record<string, CompartmentCore>>({
        c1: { baggage: '', cargo: '', eic: '' },
        c2: { baggage: '', cargo: '', eic: '' },
        c3: { baggage: '', cargo: '', eic: '' },
        c4: { baggage: '', cargo: '', eic: '' },
        c5: { baggage: '', cargo: '', eic: '35' },
    });

    // Results
    const [calculatedData, setCalculatedData] = useState<{ weight: number; doi: number; dow: number; msg?: string } | null>(null);

    // ViewBox Settings
    const [showSettings, setShowSettings] = useState(false);
    const [viewBox, setViewBox] = useState(CHART_VIEWBOX);

    useEffect(() => {
        const loadCSV = async () => {
            try {
                const res = await fetch('/dry_operating_data.csv');
                if (!res.ok) throw new Error('CSV load failed');
                const text = await res.text();
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
            } catch (err) {
                console.error('Failed to load CSV', err);
            }
        };
        loadCSV();
    }, []);

    const updateCompartment = (comp: string, field: keyof CompartmentCore, value: string) => {
        setCompartments(prev => ({
            ...prev,
            [comp]: { ...prev[comp], [field]: value }
        }));
    };

    const handleCalculate = () => {
        const match = dryData.find(d =>
            d.Aircraft === aircraftType &&
            d.Reg === tailNumber &&
            d.Cockpit === cockpit &&
            d.Cabin === cabin &&
            d.Pantry === pantry.toUpperCase() &&
            d.WaterPercent === water
        );

        if (!match) {
            setCalculatedData({ weight: 0, doi: 0, dow: 0, msg: 'Konfigürasyon bulunamadı!' });
            return;
        }

        let totalPayload = 0;
        Object.values(compartments).forEach(c => {
            totalPayload += Number(c.baggage || 0) + Number(c.cargo || 0) + Number(c.eic || 0);
        });

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

    // --- 1. Grid Lines (Background Reference) ---
    const gridPaths = useMemo(() => {
        // Step 4 units
        const indices: number[] = [];
        for (let i = DOI_CONFIG.valMin; i <= DOI_CONFIG.valMax; i += 4) {
            indices.push(i);
        }

        const allPaths: { x: number; y: number }[][] = [];

        // Helper for X calculation
        const totalIndexRange = DOI_CONFIG.valMax - DOI_CONFIG.valMin;
        const totalPixelRange = DOI_CONFIG.xMax - DOI_CONFIG.xMin;
        const pxPerIndex = totalPixelRange / totalIndexRange;

        indices.forEach(idx => {
            const startX = DOI_CONFIG.xMin + (idx - DOI_CONFIG.valMin) * pxPerIndex;
            let currentX = startX;
            let currentY = DOI_CONFIG.y;

            const path = [{ x: currentX, y: currentY }];

            ZONES.forEach((zone) => {
                if (currentY < zone.yStart) {
                    currentY = zone.yStart;
                    path.push({ x: currentX, y: currentY });
                }

                // Display Natural Drift
                const nextX = currentX + zone.drift;
                const nextY = zone.yEnd;

                path.push({ x: nextX, y: nextY });

                currentX = nextX;
                currentY = nextY;
            });

            // Extend to bottom
            path.push({ x: currentX, y: 950 });
            allPaths.push(path);
        });

        return allPaths;
    }, []);

    // --- 2. Chart Trim Line (Foreground Red) ---
    const chartPoints = useMemo(() => {
        if (!calculatedData) return [];

        const points: { x: number; y: number }[] = [];

        // Start Point
        const totalIndexRange = DOI_CONFIG.valMax - DOI_CONFIG.valMin;
        const totalPixelRange = DOI_CONFIG.xMax - DOI_CONFIG.xMin;
        const pxPerIndex = totalPixelRange / totalIndexRange;

        const startX = DOI_CONFIG.xMin + (calculatedData.doi - DOI_CONFIG.valMin) * pxPerIndex;
        let currentX = startX;
        let currentY = DOI_CONFIG.y;

        points.push({ x: currentX, y: currentY });

        // Helper
        const getValue = (key: string) => {
            if (key === 'paxA') return Number(paxA || 0);
            if (key === 'paxB') return Number(paxB || 0);
            if (key === 'paxC') return Number(paxC || 0);
            if (key === 'paxD') return Number(paxD || 0);
            if (key.startsWith('c')) {
                const c = compartments[key];
                return Number(c.baggage || 0) + Number(c.cargo || 0) + Number(c.eic || 0);
            }
            return 0;
        };

        ZONES.forEach((zone) => {
            if (currentY < zone.yStart) {
                currentY = zone.yStart;
                points.push({ x: currentX, y: currentY });
            }

            const val = getValue(zone.key);

            // Calc
            // IMPORTANT: Removed 'naturalDrift' from totalDeltaX to satisfy "Zero Input = Straight Line" requirement.
            const payloadShift = (val / zone.divisor) * zone.widthPerDivisor * zone.direction;
            const totalDeltaX = payloadShift;

            const nextX = currentX + totalDeltaX;
            const nextY = zone.yEnd;

            // Staircase
            points.push({ x: currentX, y: nextY });
            points.push({ x: nextX, y: nextY });

            currentX = nextX;
            currentY = nextY;
        });

        if (currentY < FUEL_INDEX_Y) {
            points.push({ x: currentX, y: FUEL_INDEX_Y });
        }
        points.push({ x: currentX, y: 950 });

        return points;
    }, [calculatedData, paxA, paxB, paxC, paxD, compartments]);


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-4 transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="flex justify-between items-center bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg backdrop-blur-sm">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-xs font-bold gap-2">
                        <Home className="h-4 w-4" />
                        {TRANSLATIONS[language].home}
                    </Button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{TRANSLATIONS[language].manualBalanceTitle}</h1>
                    <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
                        <Settings2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Debug Settings */}
                {showSettings && (
                    <Card className="mb-6 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                        <CardHeader className="py-3"><CardTitle className="text-sm">Görünüm Ayarı</CardTitle></CardHeader>
                        <CardContent>
                            <Label>ViewBox</Label>
                            <Input value={viewBox} onChange={e => setViewBox(e.target.value)} />
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-lg">{TRANSLATIONS[language].inputs}</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {/* Inputs */}
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
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold">{TRANSLATIONS[language].compartments}</Label>
                                    {[1, 2, 3, 4, 5].map((num) => {
                                        const key = `c${num}`;
                                        return (
                                            <div key={key} className="p-2 border rounded-md dark:border-slate-800 bg-white dark:bg-slate-900/20">
                                                <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-gray-500">Comp {num}</span></div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Input type="number" placeholder="Bag" value={compartments[key].baggage} onChange={(e) => updateCompartment(key, 'baggage', e.target.value)} className="h-7 text-xs px-2" />
                                                    <Input type="number" placeholder="Cargo" value={compartments[key].cargo} onChange={(e) => updateCompartment(key, 'cargo', e.target.value)} className="h-7 text-xs px-2" />
                                                    <Input type="number" placeholder="EIC" value={compartments[key].eic} onChange={(e) => updateCompartment(key, 'eic', e.target.value)} className="h-7 text-xs px-2" />
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

                    <div className="lg:col-span-8 space-y-6">
                        <Card className="h-full flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg">{TRANSLATIONS[language].chart}</CardTitle>
                                <div className="flex items-center gap-4 text-sm">
                                    {calculatedData && <div className="text-gray-500 font-medium">DOW Index: {calculatedData.doi.toFixed(2)}</div>}
                                </div>
                            </CardHeader>
                            {/* Relative Container */}
                            <CardContent className="w-full h-auto p-0 bg-white dark:bg-slate-200 overflow-hidden relative">
                                <svg viewBox={viewBox} className="w-full h-auto block" preserveAspectRatio="xMidYMid meet">
                                    <image href="/grafik.png" x="0" y="0" width={CHART_WIDTH} height={CHART_HEIGHT} preserveAspectRatio="none" />

                                    {/* Reference Grid Lines (Gray) */}
                                    {gridPaths.map((path, idx) => (
                                        <polyline
                                            key={`grid-${idx}`}
                                            points={path.map(p => `${p.x},${p.y}`).join(' ')}
                                            fill="none"
                                            stroke="gray"
                                            strokeWidth="1"
                                            strokeOpacity="0.25"
                                        />
                                    ))}

                                    {/* Trim Line */}
                                    {chartPoints.length > 0 && (
                                        <>
                                            <polyline
                                                points={chartPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                                fill="none"
                                                stroke="red"
                                                strokeWidth="3"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            {chartPoints.map((p, i) => (
                                                <circle key={i} cx={p.x} cy={p.y} r="4" fill="red" />
                                            ))}
                                        </>
                                    )}
                                </svg>
                                {!calculatedData && (
                                    <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[1px] pointer-events-none">
                                        <div className="bg-white/80 p-4 rounded-lg shadow text-gray-500">Veriler bekleniyor...</div>
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
