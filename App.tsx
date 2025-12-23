
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  Activity, Map as MapIcon, 
  Calendar, Building2, Upload, 
  Trash2, FileText, Loader2, CheckCircle2, MousePointer2,
  X, List, User, Home, ChevronRight, AlertCircle
} from 'lucide-react';
import { parseRawData } from './data';
import { CaseRecord } from './types';
import CaseMap from './components/CaseMap';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  const [allCases, setAllCases] = useState<CaseRecord[]>([]);
  const [selectedBairro, setSelectedBairro] = useState<string>('Todos');
  const [selectedMes, setSelectedMes] = useState<string>('Todos');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicialização de filtros via URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const b = params.get('bairro');
      const m = params.get('mes');
      if (b) setSelectedBairro(decodeURIComponent(b));
      if (m) setSelectedMes(decodeURIComponent(m));
    } catch (e) {
      console.warn("URL State Init Error:", e);
    }
  }, []);

  // Persistência de Filtros (Compatível com Vercel/GitHub)
  useEffect(() => {
    try {
      // Impede erro de segurança em domínios blob (comum em sandboxes)
      if (window.location.protocol === 'blob:') return;

      const url = new URL(window.location.href);
      if (selectedBairro !== 'Todos') url.searchParams.set('bairro', selectedBairro);
      else url.searchParams.delete('bairro');
      
      if (selectedMes !== 'Todos') url.searchParams.set('mes', selectedMes);
      else url.searchParams.delete('mes');
      
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.debug("Navegação de histórico indisponível neste ambiente");
    }
  }, [selectedBairro, selectedMes]);

  const bairros = useMemo(() => 
    ['Todos', ...Array.from(new Set(allCases.map(c => c.bairro)))].sort()
  , [allCases]);

  const mesesOrder = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const meses = useMemo(() => 
    ['Todos', ...mesesOrder.filter(m => allCases.some(c => c.mes === m))]
  , [allCases]);

  const filteredCases = useMemo(() => {
    return allCases.filter(c => {
      const matchBairro = selectedBairro === 'Todos' || c.bairro === selectedBairro;
      const matchMes = selectedMes === 'Todos' || c.mes === selectedMes;
      return matchBairro && matchMes;
    });
  }, [allCases, selectedBairro, selectedMes]);

  const statsByBairro = useMemo(() => {
    const casesForRanking = selectedMes === 'Todos' 
      ? allCases 
      : allCases.filter(c => c.mes === selectedMes);

    const counts = casesForRanking.reduce((acc, curr) => {
      acc[curr.bairro] = (acc[curr.bairro] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Fixed arithmetic operation error by ensuring operands are treated as numbers
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [allCases, selectedMes]);

  const statsByMonth = useMemo(() => {
    const casesForMonthChart = selectedBairro === 'Todos'
      ? allCases
      : allCases.filter(c => c.bairro === selectedBairro);

    const counts = casesForMonthChart.reduce((acc, curr) => {
      acc[curr.mes] = (acc[curr.mes] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return mesesOrder
      .filter(m => counts[m] !== undefined || allCases.some(c => c.mes === m))
      .map(m => ({ name: m.substring(0, 3).toUpperCase(), value: Number(counts[m] || 0) }));
  }, [allCases, selectedBairro]);

  const geocodeAddress = async (record: CaseRecord): Promise<[number, number]> => {
    const query = `${record.logradouro}, ${record.numero}, ${record.bairro}, Timóteo, MG, Brasil`;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      if (!res.ok) throw new Error("Erro");
      const data = await res.json();
      if (data && data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      return record.coords;
    } catch (e) {
      return record.coords;
    }
  };

  const processGeocoding = async (records: CaseRecord[]) => {
    if (records.length === 0 || isGeocoding) return;
    setIsGeocoding(true);
    setGeocodingProgress({ current: 0, total: records.length });
    const updatedList = [...records];
    
    try {
      for (let i = 0; i < records.length; i++) {
        setGeocodingProgress({ current: i + 1, total: records.length });
        const preciseCoords = await geocodeAddress(records[i]);
        updatedList[i] = { ...records[i], coords: preciseCoords };
        if (i % 3 === 0 || i === records.length - 1) {
          setAllCases([...updatedList]);
        }
        await delay(1100); 
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        const csvStr = data
          .filter(row => row && row.length > 0 && row.some(cell => cell !== null))
          .map(row => row.map(cell => {
              if (cell instanceof Date) {
                const d = cell.getDate().toString().padStart(2, '0');
                const m = (cell.getMonth() + 1).toString().padStart(2, '0');
                const y = cell.getFullYear();
                return `${d}/${m}/${y}`;
              }
              return cell === null || cell === undefined ? "" : String(cell);
            }).join(';'))
          .join('\n');
        const newCases = parseRawData(csvStr);
        setIsImporting(false);
        if (newCases.length > 0) processGeocoding(newCases);
      } catch (error) {
        setIsImporting(false);
        alert("Erro ao ler planilha. Verifique o formato.");
      }
    };
    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  const handleChartClick = (data: any) => {
    if (data && data.name) {
      setSelectedBairro(prev => prev === data.name ? 'Todos' : data.name);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Relatório Epidemiológico DengueMapper 2025', 14, 20);
    autoTable(doc, {
      startY: 30,
      head: [['Paciente', 'Bairro', 'Data Sintomas', 'Classificação']],
      body: filteredCases.map(c => [c.nome, c.bairro, c.dataSintomas.toLocaleDateString(), c.suspeita]),
    });
    doc.save(`Dengue_Timoteo_${selectedBairro}_${selectedMes}.pdf`);
  };

  // Improved calculation to avoid arithmetic errors with zero total
  const geocodingProgressPercentage = geocodingProgress.total > 0 
    ? Math.round((Number(geocodingProgress.current) / Number(geocodingProgress.total)) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-x-hidden">
      
      {/* Modais de Carregamento */}
      {(isGeocoding || isImporting) && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[3000] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] p-10 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-slate-100 flex items-center justify-center">
                <Loader2 size={40} className="text-blue-600 animate-spin" />
              </div>
              {isGeocoding && <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-slate-400 mt-14">{geocodingProgressPercentage}%</div>}
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">{isImporting ? 'Lendo Planilha' : 'Mapeando Coordenadas'}</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">Aguarde a finalização do georreferenciamento para garantir a precisão no mapa territorial.</p>
            {isGeocoding && (
              <div className="w-full">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-blue-600 transition-all duration-500 ease-out" style={{ width: `${geocodingProgressPercentage}%` }} />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{geocodingProgress.current} / {geocodingProgress.total} Registros</p>
              </div>
            )}
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-200 sticky top-0 z-[500] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <div className="bg-red-600 p-2.5 rounded-2xl text-white shadow-lg shadow-red-100"><Activity size={24} /></div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">DengueMapper <span className="text-red-600">2025</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sistema de Vigilância Epidemiológica</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
          
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black transition-all shadow-md active:scale-95">
            <Upload size={18} /> Importar Planilha
          </button>

          {allCases.length > 0 && (
            <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
              <div className="flex items-center gap-2 px-4 py-2 text-slate-600">
                <Building2 size={16} />
                <select className="bg-transparent text-xs font-black uppercase outline-none cursor-pointer" value={selectedBairro} onChange={(e) => setSelectedBairro(e.target.value)}>
                  {bairros.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div className="flex items-center gap-2 px-4 py-2 text-slate-600">
                <Calendar size={16} />
                <select className="bg-transparent text-xs font-black uppercase outline-none cursor-pointer" value={selectedMes} onChange={(e) => setSelectedMes(e.target.value)}>
                  {meses.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          )}
          
          {allCases.length > 0 && (
            <button onClick={() => { if(confirm("Deseja apagar todos os dados importados?")) { setAllCases([]); setSelectedBairro('Todos'); setSelectedMes('Todos'); } }} className="p-2.5 text-slate-300 hover:text-red-600 rounded-2xl transition-all" title="Limpar Tudo">
              <Trash2 size={24} />
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-6 max-w-[1920px] mx-auto w-full">
        {allCases.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border-4 border-dashed border-slate-200">
            <div className="bg-slate-50 p-10 rounded-full mb-8"><Upload size={64} className="text-slate-300" /></div>
            <h2 className="text-4xl font-black text-slate-800 mb-4">Mapeamento de Casos Suspeitos</h2>
            <p className="text-slate-500 max-w-lg mb-10 text-lg">Faça o upload da planilha oficial para iniciar o monitoramento espacial do território.</p>
            <button onClick={() => fileInputRef.current?.click()} className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl text-xl font-black shadow-2xl shadow-blue-200 transition-all active:scale-95">
              Selecionar Planilha (.xlsx / .csv)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden h-[600px] relative">
                <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-md z-10 relative">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center"><MapIcon size={20} className="text-red-600" /></div>
                    <div>
                      <h2 className="text-md font-black text-slate-800 leading-tight">Painel Georreferenciado</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedBairro === 'Todos' ? 'Território Total - Timóteo' : `Setor: ${selectedBairro}`}</p>
                    </div>
                  </div>
                  {selectedBairro !== 'Todos' && (
                    <button onClick={() => setSelectedBairro('Todos')} className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-2">
                      <ChevronRight size={12} className="rotate-180" /> Município Completo
                    </button>
                  )}
                </div>
                <div className="flex-1 relative h-full">
                  <CaseMap cases={filteredCases} />
                </div>
              </div>

              {/* Evolução Sazonal */}
              <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-3">
                    <Calendar size={18} className="text-blue-600" /> Evolução de Casos por Mês
                  </h3>
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <AlertCircle size={10} /> Tendência de Incidência
                  </div>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                      <Tooltip cursor={{ fill: '#f8fafc', radius: 10 }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                      <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={45}>
                        {statsByMonth.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={Number(entry.value) > 10 ? '#ef4444' : '#2563eb'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-lg text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notificados</p>
                  <p className="text-4xl font-black text-slate-800">{allCases.length}</p>
                </div>
                <div className="bg-blue-600 p-7 rounded-[2rem] shadow-lg text-white text-center">
                  <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Exibidos</p>
                  <p className="text-4xl font-black">{filteredCases.length}</p>
                </div>
              </div>

              {/* Ranking e Detalhes Contextuais */}
              <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-slate-200 flex flex-col flex-1 max-h-[1000px] overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-3">
                    <Building2 size={18} className="text-blue-600" /> Ranking de Bairros
                  </h3>
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                    <MousePointer2 size={10} /> Clique no Bairro
                  </div>
                </div>

                <div className="h-[280px] w-full mb-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={statsByBairro} 
                      layout="vertical" 
                      onClick={(data: any) => {
                        if (data && data.activePayload && data.activePayload.length > 0) {
                          handleChartClick(data.activePayload[0].payload);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} width={90} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#f1f5f9', radius: 8 }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18} style={{ cursor: 'pointer' }}>
                        {statsByBairro.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={selectedBairro === entry.name ? '#ef4444' : (index < 3 ? '#2563eb' : '#cbd5e1')} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista Detalhada Sob Demanda */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                  {selectedBairro === 'Todos' ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                      <div className="bg-white p-5 rounded-full shadow-sm mb-5 text-slate-300">
                        <List size={40} />
                      </div>
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Detalhamento Territorial</h4>
                      <p className="text-[11px] text-slate-400 font-bold leading-relaxed max-w-[200px]">
                        Clique em uma das barras do ranking para visualizar os dados nominais de cada caso.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-white p-6">
                        <div>
                          <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">{selectedBairro}</h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{filteredCases.length} Pacientes no setor</p>
                        </div>
                        <button onClick={() => setSelectedBairro('Todos')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-red-500 transition-all"><X size={18} /></button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                        {filteredCases.map((c) => (
                          <div key={c.id} className="p-5 bg-white rounded-3xl border border-slate-100 hover:border-blue-200 shadow-sm transition-all group">
                            <div className="flex items-start justify-between mb-3">
                              <p className="text-[11px] font-black text-slate-800 uppercase flex items-center gap-2">
                                <User size={12} className="text-blue-500" /> {c.nome}
                              </p>
                              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${c.suspeita.toLowerCase().includes('dengue') ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                {c.suspeita}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] text-slate-500 font-bold flex items-center gap-2">
                                <Home size={12} className="text-slate-300 shrink-0" /> {c.logradouro}, {c.numero}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-2 uppercase">
                                <Calendar size={12} className="text-slate-300 shrink-0" /> Início: {c.dataSintomas.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={exportPDF} className="mt-6 flex items-center justify-center gap-3 w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95">
                  <FileText size={16} /> Exportar Cenário Atual
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 px-10 py-6 no-print">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
          <p>© 2025 CCZ Timóteo - Monitoramento Epidemiológico em Tempo Real</p>
          <div className="flex items-center gap-8">
            <span className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500" /> Vercel Optimized Build</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
