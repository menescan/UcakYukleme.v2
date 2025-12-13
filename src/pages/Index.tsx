'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioactiveCheck } from '@/components/ui/radioactive-check';
import { ThemeToggle } from '@/components/theme-toggle';
import { Trash2 } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const WATER_INDEXES = {
  // A330 Groups (Full Tail List for Lookup)
  'A330 (JNA-JNB)': {
    '%25': ['-525', '-2.6'],
    '%50': ['-350', '-1.7'],
    '%75': ['-175', '-0.9'],
  },
  'A330 (JNC-JND-JNE-JIO-JIP-JIR-JIS-JIT-JIY-JIV-JIZ-LNB-LOH-LOI-LOM)': {
    '%25': ['-525', '-1.6'],
    '%50': ['-350', '-1.1'],
    '%75': ['-175', '-0.5'],
  },
  'A330 (JNF-JNG-JIL-JIM-JIN)': {
    '%25': ['-788', '-3.5'],
    '%50': ['-525', '-2.4'],
    '%75': ['-263', '-1.2'],
  },
  'A330 (JNH-JNI-JNJ-JNK-JNL-JNM-JNN-JNO-JNP-JNQ-JNR-JNS-JNT-JNU-JNV-JNW-JNX-JNY-JNZ-LNC-LND-LNE-LNF-LNG-JOA-JOB-JOC-JOD-JOE-JOF-JOG-JOH-JOJ-JOI-JOK-JOL-JOM-LOA-LOB-LOC-LOD-LOE-LOF-LOG-LOJ-LOK)': {
    '%25': ['-525', '-2.0'],
    '%50': ['-350', '-1.4'],
    '%75': ['-175', '-0.9'],
  },
  'A330 (LON)': {
    '%25': ['788', '-4.2'],
    '%50': ['525', '-2.8'],
    '%75': ['263', '-1.4'],
  },
  'B737 800': {
    '%25': ['-177', '-2.5'],
    '%50': ['-118', '-1.7'],
    '%75': ['-59', '-0.8'],
  },
  'B737 900': {
    '%25': ['-178', '-2.7'],
    '%50': ['-119', '-1.8'],
    '%75': ['-59', '-0.9'],
  },
  'A319': {
    '%25': ['-150', '-1.7'],
    '%50': ['-100', '-1.1'],
    '%75': ['-50', '-0.6'],
  },
  'A320': {
    '%25': ['-150', '+0.5'],
    '%50': ['-100', '+0.3'],
    '%75': ['-50', '+0.2'],
  },
  'A321': {
    '%25': ['-150', '-2.3'],
    '%50': ['-100', '-1.6'],
    '%75': ['-50', '-0.8'],
  },
  'B787': {
    '1/8': ['-824', '-3.9'],
    '2/8': ['-792', '-3.3'],
    '3/8': ['-660', '-2.8'],
    '4/8': ['-528', '-2.2'],
    '5/8': ['-396', '-1.7'],
    '6/8': ['-264', '-1.1'],
    '7/8': ['-132', '-0.6'],
  },
  'B777': {
    '1/8': ['-1172', '-3.9'],
    '2/8': ['-1004', '-3.3'],
    '3/8': ['-837', '-2.8'],
    '4/8': ['-670', '-2.2'],
    '5/8': ['-502', '-1.6'],
    '6/8': ['-335', '-1.1'],
    '7/8': ['-167', '-0.5'],
  },
  'A350 (LGA-LGB-LGC-LGD-LGE)': {
    '1/10': ['-954', '-4.4'],
    '2/10': ['-848', '-3.9'],
    '3/10': ['-742', '-3.4'],
    '4/10': ['-636', '-2.9'],
    '5/10': ['-530', '-2.4'],
    '6/10': ['-424', '-1.9'],
    '7/10': ['-318', '-1.5'],
    '8/10': ['-212', '-1.0'],
    '9/10': ['-106', '-0.5'],
  },
  'A350 (LGF-LGG-LGH-LGI-LGJ)': {
    '1/10': ['-1350', '-6.0'],
    '2/10': ['-1200', '-5.4'],
    '3/10': ['-1050', '-4.7'],
    '4/10': ['-900', '-4.0'],
    '5/10': ['-750', '-3.3'],
    '6/10': ['-600', '-2.7'],
    '7/10': ['-450', '-2.0'],
    '8/10': ['-300', '-1.3'],
    '9/10': ['-150', '-0.7'],
  },
} as const;

const ULD_TYPES = {
  'AKE': 70,
  'PMC': 85,
  'PAG': 80,
  'PLA': 90,
} as const;

const AIRCRAFT_CONFIGS = {
  'A319': {
    name: 'Airbus A319',
    compartments: ['Compartment 1', 'Compartment 4', 'Compartment 5'],
    uldPositions: {
      'Compartment 1': ['11P', '12P'],
      'Compartment 4': ['41P', '42P'],
      'Compartment 5': ['5 (Bulk)'],
    },
  },
  'A320': {
    name: 'Airbus A320',
    compartments: ['Compartment 1', 'Compartment 3', 'Compartment 4', 'Compartment 5'],
    uldPositions: {
      'Compartment 1': ['11P', '12P', '13P'],
      'Compartment 3': ['31P', '32P'],
      'Compartment 4': ['41P', '42P'],
      'Compartment 5': ['5 (Bulk)'],
    },
  },
  'A321': {
    name: 'Airbus A321',
    compartments: ['Compartment 1', 'Compartment 2', 'Compartment 3', 'Compartment 4', 'Compartment 5'],
    uldPositions: {
      'Compartment 1': ['11P', '12P'],
      'Compartment 2': ['21P', '22P', '23P'],
      'Compartment 3': ['31P', '32P', '33P'],
      'Compartment 4': ['41P', '42P'],
      'Compartment 5': ['5 (Bulk)'],
    },
  },
  'B737': {
    name: 'Boeing 737',
    compartments: ['Compartment 1', 'Compartment 2', 'Compartment 3', 'Compartment 4'],
    uldPositions: {
      'Compartment 1': ['1 (Bulk)'],
      'Compartment 2': ['2 (Bulk)'],
      'Compartment 3': ['3 (Bulk)'],
      'Compartment 4': ['4 (Bulk)'],
    },
  },
  'WIDE_BODY': {
    name: 'Geniş Gövde (A330/A350/B777/B787)',
    compartments: ['Compartment 1', 'Compartment 2', 'Compartment 3', 'Compartment 4', 'Compartment 5'],
    uldPositions: {
      'Compartment 1': [], // Dynamic
      'Compartment 2': [], // Dynamic
      'Compartment 3': [], // Dynamic
      'Compartment 4': [], // Dynamic
      'Compartment 5': ['5 (Bulk)'],
    },
    isWideBody: true
  }
} as const;

interface CompartmentData {
  baggageCount?: number;
  bulkCargoWeight?: number;
  cargoWeight?: number;
  uldType?: keyof typeof ULD_TYPES;
}

// Flexible interface to accommodate both static narrow body and dynamic wide body configs
interface IAircraftConfig {
  name: string;
  compartments: readonly string[];
  uldPositions: Record<string, readonly string[] | string[]>;
  isWideBody?: boolean;
}

type AircraftConfig = IAircraftConfig;
// Previously: typeof AIRCRAFT_CONFIGS[keyof typeof AIRCRAFT_CONFIGS];
// We override this to be more permissive for the build.

const DigitalClock = React.memo(({ type }: { type: 'local' | 'utc' }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    const hours = type === 'local' ? time.getHours() : time.getUTCHours();
    const minutes = time.getMinutes();
    return `${type === 'local' ? 'L' : 'U'} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, [time, type]);

  return (
    <span className="text-xs font-mono font-medium text-gray-500 dark:text-slate-400 w-12 text-center select-none">
      {formattedTime}
    </span>
  );
});
DigitalClock.displayName = 'DigitalClock';

interface HeaderProps {
  onClearData: () => void;
}
const Header = React.memo(({ onClearData }: HeaderProps) => (
  <div className="text-center space-y-4 mb-6">
    <div className="space-y-1">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">✈️ Uçak Kargo Yöneticisi</h1>
      <p className="text-sm text-gray-600 dark:text-slate-400">Balans hesaplama yardım sistemi</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 opacity-60">Muhammed Enes İŞCAN tarafından geliştirildi</p>
    </div>

    <div className="flex items-center justify-center gap-3 bg-white/50 dark:bg-slate-800/50 p-2 rounded-lg w-fit mx-auto backdrop-blur-sm">
      <DigitalClock type="local" />
      <ThemeToggle />
      <DigitalClock type="utc" />
      <Separator orientation="vertical" className="h-6" />
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearData}
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Verileri Temizle"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
));
Header.displayName = 'Header';

interface AirportSelectorProps {
  iataCode: string;
  setIataCode: React.Dispatch<React.SetStateAction<string>>;
  airportInfo: { name: string; country: string } | null;
  setAirportInfo: React.Dispatch<React.SetStateAction<{ name: string; country: string } | null>>;
}
const AirportSelector: React.FC<AirportSelectorProps> = React.memo(({ iataCode, setIataCode, airportInfo, setAirportInfo }) => (
  <div className="flex gap-2 items-center bg-white/50 dark:bg-slate-800/80 px-3 py-2 rounded-lg shadow-sm border border-transparent dark:border-slate-700 transition-colors">
    <div className="flex-shrink-0">
      <Input
        value={iataCode}
        onChange={(e) => {
          const code = e.target.value.toUpperCase();
          setIataCode(code);
          if (code.length === 3) {
            fetch('/iata.xlsx.csv')
              .then(response => response.text())
              .then(csv => {
                const lines = csv.split('\n');
                const airport = lines
                  .slice(1)
                  .map(line => {
                    const [name, country, iata] = line.split(',');
                    return { name, country, iata: iata?.trim() };
                  })
                  .find(a => a.iata === code);
                setAirportInfo(airport ? { name: airport.name, country: airport.country } : null);
              });
          }
        }}
        placeholder="IATA"
        className="w-16 h-7 text-xs"
        maxLength={3}
        style={{ textTransform: 'uppercase' }}
      />
    </div>
    {airportInfo && (
      <Badge variant="outline" className="text-xs font-normal">
        {airportInfo.name}, {airportInfo.country}
      </Badge>
    )}
  </div>
));
AirportSelector.displayName = 'AirportSelector';

const RadioactiveToggleButton = ({ show, onToggle }: { show: boolean, onToggle: (checked: boolean) => void }) => (
  <div className="flex items-center gap-2 mt-2">
    <Switch id="radioactive-toggle" checked={show} onCheckedChange={onToggle} />
    <Label htmlFor="radioactive-toggle" className="text-xs cursor-pointer">Radyoaktif Kargo Girişi</Label>
  </div>
);

interface AircraftSelectorProps {
  selectedAircraft: keyof typeof AIRCRAFT_CONFIGS | '';
  onAircraftSelect: (aircraft: string) => void;
}
const AircraftSelector: React.FC<AircraftSelectorProps> = React.memo(({ selectedAircraft, onAircraftSelect }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Uçak Seçimi</CardTitle>
    </CardHeader>
    <CardContent>
      <Select value={selectedAircraft} onValueChange={onAircraftSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Uçak modelini seçin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="A319">Airbus A319</SelectItem>
          <SelectItem value="A320">Airbus A320</SelectItem>
          <SelectItem value="A321">Airbus A321</SelectItem>
          <SelectItem value="B737">Boeing 737</SelectItem>
          <SelectItem value="WIDE_BODY">Geniş Gövde (A330/A350/B777/B787)</SelectItem>
        </SelectContent>
      </Select>
    </CardContent>
  </Card>
));
AircraftSelector.displayName = 'AircraftSelector';

interface LoadingTypeSelectorProps {
  loadingType: string;
  selectedAircraft: keyof typeof AIRCRAFT_CONFIGS | '';
  planBaggageCount: number | '';
  planBaggageWeight: number | '';
  averageBaggageWeight: number | '';
  onLoadingTypeSelect: (type: string) => void;
  setPlanBaggageCount: React.Dispatch<React.SetStateAction<number | ''>>;
  setPlanBaggageWeight: React.Dispatch<React.SetStateAction<number | ''>>;
  setAverageBaggageWeight: React.Dispatch<React.SetStateAction<number | ''>>;
}
const LoadingTypeSelector: React.FC<LoadingTypeSelectorProps> = React.memo(({
  loadingType, selectedAircraft, planBaggageCount, planBaggageWeight, averageBaggageWeight,
  onLoadingTypeSelect, setPlanBaggageCount, setPlanBaggageWeight, setAverageBaggageWeight
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg">Yükleme Tipi</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={loadingType === 'bulk' ? 'default' : 'outline'}
          onClick={() => onLoadingTypeSelect('bulk')}
          className="h-12"
          type="button"
          disabled={selectedAircraft === 'WIDE_BODY'}
        >
          Bulk Yükleme
        </Button>
        {selectedAircraft !== 'B737' && (
          <Button
            variant={loadingType === 'uld' ? 'default' : 'outline'}
            onClick={() => onLoadingTypeSelect('uld')}
            className="h-12"
            type="button"
          >
            ULD Yükleme
          </Button>
        )}
      </div>
      {loadingType && (
        <div className="space-y-4 bg-blue-50 dark:bg-slate-900/50 p-4 rounded-lg mt-4 border border-blue-100 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Toplam Bagaj Sayısı</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={planBaggageCount}
                onChange={(e) => {
                  const value = e.target.value;
                  const count = value === '' ? '' : Number(value);
                  setPlanBaggageCount(count);

                  // Auto-calculate average if total weight exists
                  if (count !== '' && count > 0 && planBaggageWeight !== '' && planBaggageWeight > 0) {
                    setAverageBaggageWeight(Number((Number(planBaggageWeight) / count).toFixed(2)));
                  } else if (count !== '' && count > 0 && averageBaggageWeight !== '') {
                    // Update total weight if average exists
                    setPlanBaggageWeight(Number((count * Number(averageBaggageWeight)).toFixed(1)));
                  }
                }}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Toplam Bagaj Ağırlığı (kg)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={planBaggageWeight}
                onChange={(e) => {
                  const value = e.target.value;
                  const weight = value === '' ? '' : Number(value);
                  setPlanBaggageWeight(weight);

                  // Auto-calculate average if count exists
                  if (weight !== '' && planBaggageCount !== '' && Number(planBaggageCount) > 0) {
                    setAverageBaggageWeight(Number((weight / Number(planBaggageCount)).toFixed(2)));
                  }
                }}
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="avg-baggage-weight" className="text-xs">Ortalama Bagaj Ağırlığı (kg)</Label>
            <Input
              id="avg-baggage-weight"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={averageBaggageWeight}
              onChange={(e) => {
                const value = e.target.value;
                const avg = value === '' ? '' : Number(value);
                setAverageBaggageWeight(avg);
                if (avg !== '' && planBaggageCount !== '') {
                  setPlanBaggageWeight(Number((avg * Number(planBaggageCount)).toFixed(1)));
                } else if (avg === '') {
                  // Don't clear total weight if just clearing average manually, 
                  // or maybe we should? User asked to be able to change average manually.
                  // If they clear average, maybe we shouldn't wipe total weight immediately unless desired.
                  // But logic says Total = Avg * Count. If Avg is unknown, Total is decoupled?
                  // Let's keep logic simple: update total if possible.
                }
              }}
              className="h-8 text-sm mt-1"
            />
          </div>
        </div>
      )}
    </CardContent>
  </Card>
));
LoadingTypeSelector.displayName = 'LoadingTypeSelector';

interface WaterPercentSelectorProps {
  selectedWaterPercent: string;
  selectedAircraft: keyof typeof AIRCRAFT_CONFIGS | '';
  onWaterPercentSelect: (percent: string) => void;
}
const WaterPercentSelector: React.FC<WaterPercentSelectorProps> = React.memo(({ selectedWaterPercent, selectedAircraft, onWaterPercentSelect }) => {
  const [wideBodyModel, setWideBodyModel] = useState<string>('');
  const [tailNumber, setTailNumber] = useState<string>('');

  // Reset internal state if aircraft changes
  useEffect(() => {
    if (selectedAircraft !== 'WIDE_BODY') {
      setWideBodyModel('');
      setTailNumber('');
    }
  }, [selectedAircraft]);

  const getWideBodyIndexes = useCallback(() => {
    if (!wideBodyModel) return null;

    // Immediate return for B787 and B777 (No tail required)
    if (wideBodyModel === 'B787') return { groupName: 'B787', data: WATER_INDEXES['B787'] };
    if (wideBodyModel === 'B777') return { groupName: 'B777', data: WATER_INDEXES['B777'] };

    // Tail required for A330 and A350
    if (!tailNumber) return null;
    const tail = tailNumber.toUpperCase().trim();

    // Logic to find group based on tail
    // A330 logic

    // Other models logic (B787, B777, A350 - simpler direct lookups or single group for now?)
    // User provided: B-787, B-777, A-350. These keys are currently in WATER_INDEXES.
    // If user enters a tail, we assume it maps to one of these generic groups if not A330?
    // Or we just map purely by Model selection?
    // User said: "kuyruk yaz sadece oraya kuyruğu biz girelim ona göre su değeri çıkar"
    // This implies we need to KNOW which group the tail belongs to.
    // Creating a mapping from prompt data:
    // B787 -> B787 group (generic?)
    // B777 -> B777 group (generic?)
    // A350 has A/C and B variants. We ask user to select Model + Variant? Or just Model and we guess?
    // Let's implement Model Selection: A330, B787, B777, A350.
    // A350 tails are listed in the keys 'A350 A/C (LGA...)' etc. So we search there too.

    if (wideBodyModel === 'B787') return { groupName: 'B787', data: WATER_INDEXES['B787'] };
    if (wideBodyModel === 'B777') return { groupName: 'B777', data: WATER_INDEXES['B777'] };

    if (wideBodyModel === 'A330' || wideBodyModel === 'A350') {
      if (tail.length < 3) return null; // Wait for at least 3 chars

      const prefix = wideBodyModel; // 'A330' or 'A350'
      const groups = Object.keys(WATER_INDEXES).filter(k => k.startsWith(prefix));

      for (const group of groups) {
        if (!group.includes('(')) continue;
        // Extract the list part
        const listPart = group.split('(')[1].replace(')', '');
        // Split by '-' to get individual tails
        const tailsInGroup = listPart.split('-').map(t => t.trim());

        if (tailsInGroup.includes(tail)) {
          return { groupName: group, data: WATER_INDEXES[group as keyof typeof WATER_INDEXES] };
        }
      }
      return 'NOT_FOUND';
    }

    return null;
  }, [wideBodyModel, tailNumber]);

  const wideBodyResult = getWideBodyIndexes();
  const options = (typeof wideBodyResult === 'object' && wideBodyResult !== null) ? Object.keys(wideBodyResult.data) : [];

  if (selectedAircraft === 'WIDE_BODY') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Su Yüzdesi (Geniş Gövde)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Uçak Tipi</Label>
              <Select value={wideBodyModel} onValueChange={setWideBodyModel}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A330">Airbus A330</SelectItem>
                  <SelectItem value="A350">Airbus A350</SelectItem>
                  <SelectItem value="B777">Boeing 777</SelectItem>
                  <SelectItem value="B787">Boeing 787</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(wideBodyModel === 'A330' || wideBodyModel === 'A350') && (
              <div>
                <Label className="text-xs">Kuyruk (Örn: JNA)</Label>
                <Input
                  value={tailNumber}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    if (val.length <= 3) setTailNumber(val);
                  }}
                  placeholder="Kuyruk Giriniz"
                  className="h-8 text-xs font-mono"
                  maxLength={3}
                />
              </div>
            )}
          </div>

          {wideBodyResult === 'NOT_FOUND' && tailNumber.length === 3 && (
            <div className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded border border-red-200 dark:border-red-800">
              Kuyruk listede bulunamadı! Lütfen kontrol ediniz.
            </div>
          )}

          {typeof wideBodyResult === 'object' && wideBodyResult !== null && (
            <div className="space-y-2">
              <Label className="text-xs">Su Oranı</Label>
              <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                  <Button
                    key={opt}
                    variant={selectedWaterPercent === opt ? 'default' : 'outline'}
                    onClick={() => onWaterPercentSelect(opt)}
                    size="sm"
                    className="min-w-[3rem]"
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {selectedWaterPercent && typeof wideBodyResult === 'object' && wideBodyResult !== null && wideBodyResult.data[selectedWaterPercent as any] && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded text-sm text-center">
              <span className="font-mono font-bold text-lg">{wideBodyResult.data[selectedWaterPercent as any]?.join(' / ')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Narrow Body UI
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Su Yüzdesi Seçimi</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          {['%25', '%50', '%75'].map((percent) => (
            <Button
              key={percent}
              variant={selectedWaterPercent === percent ? 'default' : 'outline'}
              onClick={() => onWaterPercentSelect(percent)}
            >
              {percent}
            </Button>
          ))}
        </div>
        {selectedWaterPercent && selectedAircraft && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200 dark:border-slate-700">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800">
                  <th className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300">Uçak</th>
                  <th className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300">Yüzde</th>
                  <th className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300">İndeks / MAC</th>
                </tr>
              </thead>
              <tbody>
                {selectedAircraft === 'B737' ? (
                  <>
                    <tr>
                      <td className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-600 dark:text-slate-400">B737 800</td>
                      <td className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-600 dark:text-slate-400">{selectedWaterPercent}</td>
                      <td className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-600 dark:text-slate-400">
                        {WATER_INDEXES['B737 800'][selectedWaterPercent as '%25' | '%50' | '%75']?.join(' / ')}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-600 dark:text-slate-400">B737 900</td>
                      <td className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-600 dark:text-slate-400">{selectedWaterPercent}</td>
                      <td className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-600 dark:text-slate-400">
                        {WATER_INDEXES['B737 900'][selectedWaterPercent as '%25' | '%50' | '%75']?.join(' / ')}
                      </td>
                    </tr>
                  </>
                ) : selectedAircraft ? (
                  <tr>
                    <td className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-600 dark:text-slate-400">{selectedAircraft}</td>
                    <td className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-600 dark:text-slate-400">{selectedWaterPercent}</td>
                    <td className="border border-gray-200 dark:border-slate-700 px-4 py-2 text-sm text-gray-600 dark:text-slate-400">
                      {WATER_INDEXES[selectedAircraft as keyof typeof WATER_INDEXES]?.[selectedWaterPercent as '%25' | '%50' | '%75']?.join(' / ')}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
WaterPercentSelector.displayName = 'WaterPercentSelector';

interface CompartmentsSectionProps {
  aircraftConfig: AircraftConfig | null;
  loadingType: string;
  compartmentData: Record<string, CompartmentData>;
  uldWeights: Record<string, number>;
  emptyUldPositions: Record<string, boolean>;
  calculateCompartmentWeight: (compartment: string) => number;
  updateCompartmentData: (compartment: string, field: keyof CompartmentData, value: number) => void;
  setUldWeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setEmptyUldPositions: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onAddSubCompartment?: (compartment: string) => void;
  onRemoveSubCompartment?: (compartment: string) => void;
  wideBodySubCompartments?: Record<string, string[]>;
}
const CompartmentsSection: React.FC<CompartmentsSectionProps> = React.memo(({
  aircraftConfig, loadingType, compartmentData, uldWeights, emptyUldPositions,
  calculateCompartmentWeight, updateCompartmentData, setUldWeights, setEmptyUldPositions,
  onAddSubCompartment, onRemoveSubCompartment, wideBodySubCompartments
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex justify-between items-center">
        Kompartmanlar
        <Badge variant="secondary" className="text-xs">
          {aircraftConfig?.name}
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {aircraftConfig?.compartments.map((compartment) => (
        <div key={compartment} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-800/80 mb-4 transition-colors">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-900 dark:text-slate-100 flex items-center gap-2">
              {compartment}
              {aircraftConfig.isWideBody && compartment !== 'Compartment 5' && (
                <div className="flex items-center gap-2 ml-4 bg-slate-100 dark:bg-slate-700 rounded-md p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded"
                    onClick={() => onRemoveSubCompartment?.(compartment)}
                    disabled={!aircraftConfig.uldPositions[compartment]?.length}
                  >
                    <span className="text-lg font-bold leading-none mb-1">-</span>
                  </Button>

                  <span className="text-sm font-semibold w-6 text-center">
                    {(aircraftConfig.isWideBody
                      ? wideBodySubCompartments?.[compartment]?.length
                      : aircraftConfig.uldPositions[compartment]?.length) || 0}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 rounded"
                    onClick={() => onAddSubCompartment?.(compartment)}
                  >
                    <span className="text-lg font-bold leading-none mb-1">+</span>
                  </Button>
                </div>
              )}
            </h3>
            <Badge variant="outline" className="text-xs dark:border-slate-600 dark:text-slate-300">
              {calculateCompartmentWeight(compartment).toFixed(1)} kg
            </Badge>
          </div>

          {loadingType === 'bulk' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Bagaj Sayısı</Label>
                  <div className="flex mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        const currentCount = compartmentData[compartment]?.baggageCount || 0;
                        if (currentCount > 0) {
                          updateCompartmentData(compartment, 'baggageCount', currentCount - 1);
                        }
                      }}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      value={compartmentData[compartment]?.baggageCount || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateCompartmentData(compartment, 'baggageCount', Number(value));
                      }}
                      className="h-8 text-sm text-center mx-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => {
                        const currentCount = compartmentData[compartment]?.baggageCount || 0;
                        updateCompartmentData(compartment, 'baggageCount', currentCount + 1);
                      }}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Kargo Ağırlığı (kg)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={compartmentData[compartment]?.bulkCargoWeight || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateCompartmentData(compartment, 'bulkCargoWeight', Number(value));
                    }}
                    className="h-8 text-sm mt-1"
                  />
                </div>
              </div>
            </div>
          ) : ((loadingType === 'uld' || aircraftConfig?.isWideBody) && aircraftConfig) ? (
            <div className="space-y-4 mt-3">
              {(aircraftConfig.isWideBody
                ? (wideBodySubCompartments?.[compartment] || (compartment === 'Compartment 5' ? ['5 (Bulk)'] : []))
                : aircraftConfig.uldPositions[compartment] || []
              ).map((position) => {
                const positionKey = `${compartment}-${position}`;
                const isEmpty = emptyUldPositions[positionKey];

                return (
                  <div key={position} className="border border-gray-200 dark:border-slate-700 p-2 rounded-lg bg-white dark:bg-slate-800 mb-2 transition-colors">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-slate-100">{position}</span>
                      </div>

                      {!position.includes('Bulk') && (
                        <div className="flex items-center gap-1">
                          <Label className="text-[10px]" htmlFor={`empty-${positionKey}`}>Boş ULD</Label>
                          <Switch
                            id={`empty-${positionKey}`}
                            className="scale-75"
                            checked={isEmpty}
                            onCheckedChange={(checked) => {
                              setEmptyUldPositions(prev => ({ ...prev, [positionKey]: checked }));
                              if (checked) {
                                updateCompartmentData(positionKey, 'baggageCount', 0);
                                updateCompartmentData(positionKey, 'cargoWeight', 0);
                                // Set weight based on current selected type
                                const currentType = compartmentData[positionKey]?.uldType || 'AKE';
                                const weight = ULD_TYPES[currentType] || 65;
                                setUldWeights(prev => ({ ...prev, [positionKey]: weight }));
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Bagaj Sayısı</Label>
                          <div className="flex mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => {
                                const currentCount = compartmentData[positionKey]?.baggageCount || 0;
                                if (currentCount > 0) {
                                  updateCompartmentData(positionKey, 'baggageCount', currentCount - 1);
                                }
                              }}
                              disabled={isEmpty}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              value={compartmentData[positionKey]?.baggageCount || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateCompartmentData(positionKey, 'baggageCount', Number(value));
                              }}
                              className="h-8 text-sm text-center mx-1"
                              disabled={isEmpty}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => {
                                const currentCount = compartmentData[positionKey]?.baggageCount || 0;
                                updateCompartmentData(positionKey, 'baggageCount', currentCount + 1);
                              }}
                              disabled={isEmpty}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Kargo Ağırlığı</Label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="kg"
                            value={compartmentData[positionKey]?.cargoWeight || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateCompartmentData(positionKey, 'cargoWeight', Number(value));
                            }}
                            className="h-8 text-sm text-center mt-1"
                            disabled={isEmpty}
                          />
                        </div>
                      </div>

                      {!position.includes('Bulk') && compartment !== 'Compartment 5' && (
                        <div>
                          <Label className="text-xs">ULD Tipi / Ağırlığı</Label>
                          <div className="flex gap-1 mt-1">
                            <Select
                              value={compartmentData[positionKey]?.uldType || 'AKE'}
                              onValueChange={(value) => {
                                const type = value as keyof typeof ULD_TYPES;
                                updateCompartmentData(positionKey, 'uldType', type as any);
                                const weight = ULD_TYPES[type] || 65;
                                setUldWeights(prev => ({ ...prev, [positionKey]: weight }));
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs flex-1 px-2">
                                <SelectValue placeholder="Tip" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ULD_TYPES).map(([key, weight]) => (
                                  <SelectItem key={key} value={key} className="text-xs">
                                    {key} ({weight}kg)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Input
                              type="number"
                              min="0"
                              placeholder="kg"
                              value={uldWeights[positionKey] ?? (isEmpty ? '65' : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '') {
                                  setUldWeights(prev => {
                                    const newState = { ...prev };
                                    delete newState[positionKey];
                                    return newState;
                                  });
                                } else {
                                  const newWeight = Number(value);
                                  if (!isNaN(newWeight)) {
                                    setUldWeights(prev => ({ ...prev, [positionKey]: newWeight }));
                                  }
                                }
                              }}
                              className="h-8 text-sm flex-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}
    </CardContent >
  </Card >
));
CompartmentsSection.displayName = 'CompartmentsSection';

interface EICSettingsProps {
  eicWeight: number;
  eicCompartment: string;
  aircraftConfig: AircraftConfig | null;
  setEicWeight: React.Dispatch<React.SetStateAction<number>>;
  setEicCompartment: React.Dispatch<React.SetStateAction<string>>;
}
const EICSettings: React.FC<EICSettingsProps> = React.memo(({ eicWeight, eicCompartment, aircraftConfig, setEicWeight, setEicCompartment }) => (
  <Card className="bg-green-50 border-green-200 dark:bg-emerald-950/30 dark:border-emerald-900/50">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm">EIC Ayarları</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="eic-weight" className="text-xs">EIC Ağırlığı (kg)</Label>
          <Input
            id="eic-weight"
            type="number"
            value={eicWeight}
            onChange={(e) => {
              const value = e.target.value;
              setEicWeight(Number(value));
            }}
            className="mt-1 h-8 text-sm"
            min="0"
          />
        </div>
        <div>
          <Label htmlFor="eic-compartment" className="text-xs">EIC Kompartmanı</Label>
          <Select value={eicCompartment} onValueChange={setEicCompartment}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Seçin" />
            </SelectTrigger>
            <SelectContent>
              {aircraftConfig?.compartments.map((compartment) => (
                <SelectItem key={compartment} value={compartment}>
                  {compartment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </CardContent>
  </Card>
));
EICSettings.displayName = 'EICSettings';

interface WeightSummaryProps {
  aircraftConfig: AircraftConfig | null;
  eicCompartment: string;
  calculateTotalWeight: () => number;
  calculateCompartmentWeight: (compartment: string) => number;
}
const WeightSummary: React.FC<WeightSummaryProps> = React.memo(({ aircraftConfig, eicCompartment, calculateTotalWeight, calculateCompartmentWeight }) => (
  <Card>
    <CardContent>
      <div className="space-y-2 p-4 bg-blue-50 dark:bg-slate-900/50 rounded-lg border border-blue-100 dark:border-slate-800">
        {aircraftConfig?.compartments
          .filter((compartment) => calculateCompartmentWeight(compartment) > 0)
          .map((compartment) => (
            <div key={compartment} className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">
                {compartment}
                {compartment === eicCompartment && ' (EIC dahil)'}
              </span>
              <span className="font-medium text-gray-900 dark:text-slate-200">
                {calculateCompartmentWeight(compartment).toFixed(1)} kg
              </span>
            </div>
          ))}
        <Separator className="dark:bg-slate-700" />
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900 dark:text-slate-100">Toplam:</span>
          <Badge className="text-base px-3 py-1 bg-primary text-primary-foreground dark:bg-blue-600">
            {calculateTotalWeight().toFixed(1)} kg
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>
));
WeightSummary.displayName = 'WeightSummary';

const Index = () => {
  // Helper hook for persistent state
  // Helper hook for persistent state
  const usePersistentState = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => {
      try {
        if (typeof window !== 'undefined') {
          const item = window.localStorage.getItem(key);
          return item ? JSON.parse(item) : initialValue;
        }
        return initialValue;
      } catch (error) {
        console.error(error);
        return initialValue;
      }
    });

    useEffect(() => {
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(state));
        }
      } catch (error) {
        console.error(error);
      }
    }, [key, state]);

    return [state, setState];
  };

  const [selectedAircraft, setSelectedAircraft] = usePersistentState<keyof typeof AIRCRAFT_CONFIGS | ''>('selectedAircraft', '');
  const [loadingType, setLoadingType] = usePersistentState('loadingType', '');
  const [planBaggageCount, setPlanBaggageCount] = usePersistentState<number | ''>('planBaggageCount', '');
  const [planBaggageWeight, setPlanBaggageWeight] = usePersistentState<number | ''>('planBaggageWeight', '');
  const [averageBaggageWeight, setAverageBaggageWeight] = usePersistentState<number | ''>('averageBaggageWeight', '');
  const [compartmentData, setCompartmentData] = usePersistentState<Record<string, CompartmentData>>('compartmentData', {});
  const [uldWeights, setUldWeights] = usePersistentState<Record<string, number>>('uldWeights', {});
  const [eicWeight, setEicWeight] = usePersistentState('eicWeight', 35);
  const [eicCompartment, setEicCompartment] = usePersistentState('eicCompartment', '');
  const [selectedWaterPercent, setSelectedWaterPercent] = usePersistentState('selectedWaterPercent', '');
  const [iataCode, setIataCode] = usePersistentState('iataCode', "");
  const [airportInfo, setAirportInfo] = usePersistentState<{ name: string; country: string } | null>('airportInfo', null);
  const [emptyUldPositions, setEmptyUldPositions] = usePersistentState<Record<string, boolean>>('emptyUldPositions', {});
  const [showRadioactive, setShowRadioactive] = usePersistentState('showRadioactive', false);
  const [wideBodySubCompartments, setWideBodySubCompartments] = usePersistentState<Record<string, string[]>>('wideBodyCompV2', {
    'Compartment 1': [],
    'Compartment 2': [],
    'Compartment 3': [],
    'Compartment 4': [],
  });

  const handleClearData = useCallback(() => {
    if (confirm('Tüm verileri temizlemek istediğinize emin misiniz?')) {
      setSelectedAircraft('');
      setLoadingType('');
      setPlanBaggageCount('');
      setPlanBaggageWeight('');
      setAverageBaggageWeight('');
      setCompartmentData({});
      setUldWeights({});
      setEicWeight(35);
      setEicCompartment('');
      setSelectedWaterPercent('');
      setIataCode('');
      setAirportInfo(null);
      setEmptyUldPositions({});
      setWideBodySubCompartments({
        'Compartment 1': [],
        'Compartment 2': [],
        'Compartment 3': [],
        'Compartment 4': [],
      });
    }
  }, []);

  const aircraftConfig = useMemo(() => {
    if (!selectedAircraft) return null;
    const baseConfig = AIRCRAFT_CONFIGS[selectedAircraft];

    // If Wide Body, merge dynamic compartments
    // We need to type guard or check property existence safely because TS might complain 
    // that 'isWideBody' doesn't exist on all unions. 
    // We can cast to any or check specific property if we had a discriminator.
    // For now, let's just check the property using 'in' operator or simple access with casting.
    if ('isWideBody' in baseConfig && (baseConfig as any).isWideBody) {
      const dynamicPositions: Record<string, string[]> = { ...(baseConfig.uldPositions as any) }; // copy base
      // Override explicit compartments with state
      Object.keys(wideBodySubCompartments).forEach(comp => {
        // Only override if it exists in base config to be safe
        dynamicPositions[comp] = wideBodySubCompartments[comp as keyof typeof wideBodySubCompartments];
      });

      return {
        ...baseConfig,
        uldPositions: dynamicPositions
      };
    }

    return baseConfig;
  }, [selectedAircraft, wideBodySubCompartments]);

  const handleAddSubCompartment = useCallback((compartment: string) => {
    setWideBodySubCompartments(prev => {
      const current = prev[compartment] || [];
      const compId = compartment.split(' ')[1];
      const nextIndex = current.length + 1;
      const newPos = `C${compId}.${nextIndex}`;
      return { ...prev, [compartment]: [...current, newPos] };
    });
  }, []);

  const handleRemoveSubCompartment = useCallback((compartment: string) => {
    setWideBodySubCompartments(prev => {
      const current = prev[compartment] || [];
      if (current.length === 0) return prev;
      const newCurrent = current.slice(0, -1);

      // Cleanup data for removed position? 
      // Ideally yes, but persistent state might keep it orphaned which is fine.

      return { ...prev, [compartment]: newCurrent };
    });
  }, []);

  const handleAircraftSelect = useCallback((aircraft: string) => {
    const ac = aircraft as keyof typeof AIRCRAFT_CONFIGS | '';
    setSelectedAircraft(ac);
    setLoadingType('');
    setCompartmentData({});
    setPlanBaggageWeight('');
    setPlanBaggageCount('');
    setAverageBaggageWeight('');
    setAverageBaggageWeight('');
    setEmptyUldPositions({});
    setSelectedWaterPercent('');

    // Auto-set loading type for Wide Body
    if (ac === 'WIDE_BODY') {
      setLoadingType('uld');
    }

    if (ac === 'B737') {
      setEicWeight(23);
      setEicCompartment('Compartment 4');
    } else {
      setEicWeight(35);
      setEicCompartment('Compartment 5');
    }
  }, []);

  const handleLoadingTypeSelect = useCallback((type: string) => {
    setLoadingType(type);
    setCompartmentData({});
    setUldWeights({});
    setPlanBaggageWeight('');
    setPlanBaggageCount('');
    setAverageBaggageWeight('');
  }, []);

  const updateCompartmentData = useCallback((compartment: string, field: keyof CompartmentData, value: number) => {
    setCompartmentData(prev => {
      // Create a deep copy of the previous state for the specific compartment to avoid overwriting other fields
      const currentCompartmentData = prev[compartment] || {};

      const newData = {
        ...prev,
        [compartment]: {
          ...currentCompartmentData,
          [field]: value,
        },
      };

      if (loadingType === 'uld' && (field === 'baggageCount' || field === 'cargoWeight')) {
        const isUldPosition = compartment.includes('-') && !compartment.includes('Bulk');
        const isCompartment5Position = compartment.includes('Compartment 5-');
        const isAirbusAircraft = ['A319', 'A320', 'A321'].includes(selectedAircraft);

        if (isUldPosition && !isCompartment5Position && value > 0) {
          setUldWeights(prevUld => ({ ...prevUld, [compartment]: 65 }));
        } else if (isCompartment5Position && isAirbusAircraft) {
          setUldWeights(prevUld => ({ ...prevUld, [compartment]: 0 }));
        }
      }
      return newData;
    });
  }, [loadingType, selectedAircraft]);

  const calculateCompartmentWeight = useCallback((compartment: string): number => {
    if (!selectedAircraft || !aircraftConfig) return 0;
    const positions = aircraftConfig.uldPositions[compartment] || [];
    let baseWeight = 0;

    const isCompartment5 = compartment === 'Compartment 5' && ['A319', 'A320', 'A321'].includes(selectedAircraft);

    if (loadingType === 'bulk') {
      const data = compartmentData[compartment];
      if (data) {
        const baggageWeight = data.baggageCount && averageBaggageWeight !== '' ? data.baggageCount * Number(averageBaggageWeight) : 0;
        const cargoWeight = data.bulkCargoWeight || 0;
        baseWeight = baggageWeight + cargoWeight;
      }
    } else if (loadingType === 'uld') {
      positions.forEach(position => {
        const positionKey = `${compartment}-${position}`;
        const data = compartmentData[positionKey];

        const baggageWeight = data?.baggageCount && averageBaggageWeight !== '' ? data.baggageCount * Number(averageBaggageWeight) : 0;
        const cargoWeight = data?.cargoWeight || 0;

        let uldWeight = 0;
        if (!isCompartment5 && !position.includes('Bulk')) {
          uldWeight = uldWeights[positionKey] ?? 0;
          if ((baggageWeight > 0 || cargoWeight > 0) && uldWeight === 0) {
            uldWeight = 65;
          }
        }

        baseWeight += baggageWeight + cargoWeight + uldWeight;
      });
    }

    if (compartment === eicCompartment) {
      baseWeight += eicWeight;
    }
    return baseWeight;
  }, [selectedAircraft, aircraftConfig, loadingType, compartmentData, averageBaggageWeight, uldWeights, eicCompartment, eicWeight]);

  const calculateTotalWeight = useCallback((): number => {
    if (!selectedAircraft || !aircraftConfig) return 0;
    return aircraftConfig.compartments.reduce(
      (total, compartment) => total + calculateCompartmentWeight(compartment),
      0
    );
  }, [selectedAircraft, aircraftConfig, calculateCompartmentWeight]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 p-4 transition-colors duration-300">
      <div className="max-w-md mx-auto space-y-6 pb-12">
        <Header onClearData={handleClearData} />
        <AirportSelector iataCode={iataCode} setIataCode={setIataCode} airportInfo={airportInfo} setAirportInfo={setAirportInfo} />

        <RadioactiveToggleButton show={showRadioactive} onToggle={setShowRadioactive} />
        {showRadioactive && (
          <div className="pt-2 border-t dark:border-slate-700">
            <RadioactiveCheck />
          </div>
        )}

        <AircraftSelector selectedAircraft={selectedAircraft} onAircraftSelect={handleAircraftSelect} />

        <Accordion type="single" collapsible className="w-full bg-white/50 dark:bg-slate-800/50 rounded-lg">
          <AccordionItem value="settings" className="border-none">
            <AccordionTrigger className="px-4 py-2 hover:no-underline">
              <span className="text-sm font-medium">Su Oranı Seçimi</span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2 space-y-4">
              <WaterPercentSelector
                selectedWaterPercent={selectedWaterPercent}
                selectedAircraft={selectedAircraft}
                onWaterPercentSelect={setSelectedWaterPercent}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        {selectedAircraft && (
          <>
            <LoadingTypeSelector
              loadingType={loadingType}
              selectedAircraft={selectedAircraft}
              planBaggageCount={planBaggageCount}
              planBaggageWeight={planBaggageWeight}
              averageBaggageWeight={averageBaggageWeight}
              onLoadingTypeSelect={handleLoadingTypeSelect}
              setPlanBaggageCount={setPlanBaggageCount}
              setPlanBaggageWeight={setPlanBaggageWeight}
              setAverageBaggageWeight={setAverageBaggageWeight}
            />
            {loadingType && (
              <>

                <CompartmentsSection
                  aircraftConfig={aircraftConfig as any}
                  loadingType={loadingType}
                  compartmentData={compartmentData}
                  uldWeights={uldWeights}
                  emptyUldPositions={emptyUldPositions}
                  calculateCompartmentWeight={calculateCompartmentWeight}
                  updateCompartmentData={updateCompartmentData}
                  setUldWeights={setUldWeights}
                  setEmptyUldPositions={setEmptyUldPositions}
                  onAddSubCompartment={handleAddSubCompartment}
                  onRemoveSubCompartment={handleRemoveSubCompartment}
                  wideBodySubCompartments={wideBodySubCompartments}
                />
                <EICSettings
                  eicWeight={eicWeight}
                  eicCompartment={eicCompartment}
                  aircraftConfig={aircraftConfig as any}
                  setEicWeight={setEicWeight}
                  setEicCompartment={setEicCompartment}
                />
                <WeightSummary
                  aircraftConfig={aircraftConfig as any}
                  eicCompartment={eicCompartment}
                  calculateTotalWeight={calculateTotalWeight}
                  calculateCompartmentWeight={calculateCompartmentWeight}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Index;