"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { History, RefreshCw, ChevronDown } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


interface Log {
  id: string;
  time: string;
  action: 'add' | 'minus';
  amount: number;
  altarCall: string;
}

export default function TallyCounter() {
  const [count, setCount] = useState(0);
  const [altarCalls, setAltarCalls] = useState([{ id: 1, name: 'Altar Call 1' }]);
  const [selectedAltarCall, setSelectedAltarCall] = useState('Altar Call 1');
  const [history, setHistory] = useState<Log[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Combo States
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const comboRef = useRef(0);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // LOGIKA SYNC: Mengambil data live dari Firebase via API Route
  const fetchAltarCalls = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 'default' bisa diganti secara dinamis jika ada parameter serviceType di url/state
      const response = await fetch('/api/altar-calls?serviceType=default');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setAltarCalls(data);
          
          // Jika Altar Call yang sedang dipilih tiba-tiba dihapus/tidak ada di data baru,
          // otomatis pindahkan seleksi ke item pertama.
          const isSelectedStillExist = data.some((ac: any) => ac.name === selectedAltarCall);
          if (!isSelectedStillExist) {
            setSelectedAltarCall(data[0].name);
          }
        }
      }
    } catch (error) {
      console.error("Gagal mengambil Altar Call dari Firebase:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedAltarCall]);

  useEffect(() => {
    fetchAltarCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerVibration = (type: 'add' | 'minus') => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      if (type === 'add') {
        navigator.vibrate(40); // Solid thock feel
      } else {
        navigator.vibrate([30, 50, 30]); // Distinct double-tap click
      }
    }
  };

  const commitCombo = useCallback((currentCombo: number, type: 'add' | 'minus') => {
    if (currentCombo === 0) return;
    const log: Log = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action: type,
      amount: currentCombo,
      altarCall: selectedAltarCall
    };
    
    setHistory(prev => [log, ...prev]);
    
    // Memberikan jeda sebelum combo visual hilang agar otak bisa mengonfirmasi angka
    setTimeout(() => {
      setShowCombo(false);
      setCombo(0);
    }, 400);
  }, [selectedAltarCall]);

  const handleAdd = () => {
    triggerVibration('add');
    setCount(c => c + 1);
    
    comboRef.current += 1;
    setCombo(comboRef.current);
    setShowCombo(true);

    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    
    // Jika tidak ada klik selama 800ms, jadikan 1 log history
    comboTimeoutRef.current = setTimeout(() => {
      commitCombo(comboRef.current, 'add');
      comboRef.current = 0;
    }, 800);
  };

  const handleMinus = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    triggerVibration('minus');
    setCount(prev => Math.max(0, prev - 1));
    
    const log: Log = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action: 'minus',
      amount: 1,
      altarCall: selectedAltarCall
    };
    setHistory(prev => [log, ...prev]);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-background">
      {/* BAGIAN ATAS (35%) */}
      <div className="h-[35dvh] flex flex-col relative border-b shadow-sm z-10">
        <div className="flex justify-between items-center p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={fetchAltarCalls} 
            disabled={isRefreshing}
            className={`transition-transform ${isRefreshing ? 'animate-spin' : 'active:rotate-180'}`}
          >
            <RefreshCw size={20} />
          </Button>
          
          <DropdownMenu>
            {/* Hapus asChild, ganti dengan className yang memanggil fungsi buttonVariants */}
            <DropdownMenuTrigger className={buttonVariants({ variant: "outline", className: "font-bold text-lg rounded-full px-6 shadow-sm cursor-pointer" })}>
              {selectedAltarCall} <ChevronDown className="ml-2 h-4 w-4"/>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="center" className="w-48">
              {altarCalls.map(ac => (
                <DropdownMenuItem 
                  key={ac.id} 
                  onClick={() => setSelectedAltarCall(ac.name)}
                  className="font-medium"
                >
                  {ac.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet>
            <SheetTrigger className={buttonVariants({ variant: "ghost", size: "icon", className: "cursor-pointer" })}>
              <History size={20} />
            </SheetTrigger>
            
            <SheetContent side="right" className="w-[85vw] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>Log Hitungan Cepat</SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-2 overflow-y-auto max-h-[85vh] pr-2">
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground mt-10">Belum ada aktivitas</p>
                ) : (
                  history.map(log => (
                    <div key={log.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border text-sm">
                      <div className="flex flex-col">
                        <span className="font-semibold">{log.altarCall}</span>
                        <span className="text-xs text-muted-foreground">{log.time}</span>
                      </div>
                      <span className={`text-xl font-black ${log.action === 'add' ? 'text-green-500' : 'text-destructive'}`}>
                        {log.action === 'add' ? '+' : '-'}{log.amount}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative">
          <h1 className="text-[110px] leading-none font-black tabular-nums tracking-tighter text-primary">
            {count}
          </h1>
          
          {/* Combo Indicator Floating */}
          <div className={`absolute bottom-4 transition-all duration-200 ease-out ${showCombo ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
            <span className="bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-full text-lg font-bold shadow-lg flex items-center gap-1">
              +{combo} <span className="text-sm font-medium opacity-80">Combo</span>
            </span>
          </div>
        </div>
      </div>

      {/* BAGIAN BAWAH (65%) */}
      <div className="h-[65dvh] relative bg-muted touch-none select-none">
        {/* Tombol PLUS (Area Utama) */}
        <button 
          className="w-full h-full flex items-center justify-center active:bg-primary/10 transition-colors focus:outline-none"
          onClick={handleAdd}
        >
          <span className="text-[180px] font-light text-primary/20 pointer-events-none">+</span>
        </button>
        
        {/* Tombol MINUS (Kiri Bawah) */}
        <button 
          className="absolute bottom-8 left-8 w-20 h-20 bg-background border-2 border-border rounded-full flex items-center justify-center active:bg-destructive/20 active:border-destructive/50 transition-all shadow-xl focus:outline-none z-10"
          onClick={handleMinus}
        >
          <span className="text-5xl font-light text-foreground/60 pointer-events-none pb-2">-</span>
        </button>
      </div>
    </div>
  );
}