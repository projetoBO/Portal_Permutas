'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Check, 
  Pencil, 
  Home as HomeIcon, 
  Plus,  
  Trash2, 
  X, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  AlertCircle,
  FileText,
  Printer,
  FileSignature,
  Database,
  Wifi,
  WifiOff,
  UserCheck,
  CalendarDays,
  Clock,
  ShieldCheck,
  TrendingUp,
  LayoutGrid,
  ExternalLink
} from 'lucide-react';
import { getFirebase } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// --- LISTA FIXA DE MILITARES (BACKUP E FUNCIONAMENTO OFFLINE) ---
const LISTA_INICIAL = [
  { idDoc: "1", nome: "Cb PM 562/14 Edmilson", idMilitar: "N/A" },
  { idDoc: "2", nome: "Cb PM 626/14 Coriolano", idMilitar: "N/A" },
  { idDoc: "3", nome: "Cb PM 636/14 Massole", idMilitar: "N/A" },
  { idDoc: "4", nome: "Cb PM 915/14 Froes", idMilitar: "N/A" },
  { idDoc: "5", nome: "Cb PM 1042/14 Mário Neto", idMilitar: "N/A" },
  { idDoc: "6", nome: "Cb PM 274/15 J. Froes", idMilitar: "N/A" },
  { idDoc: "7", nome: "Cb PM 372/15 Cruz", idMilitar: "N/A" },
  { idDoc: "8", nome: "Cb PM 196/16 Vasconcelos", idMilitar: "N/A" },
  { idDoc: "9", nome: "Cb PM 473/16 André", idMilitar: "849351" },
  { idDoc: "10", nome: "Sd PM 604/17 Élson", idMilitar: "N/A" },
  { idDoc: "11", nome: "Sd PM 868/17 P. Souza", idMilitar: "N/A" },
  { idDoc: "12", nome: "Sd PM 408/18 Ribeiro", idMilitar: "N/A" },
  { idDoc: "13", nome: "Sd PM 424/18 Rodrigues", idMilitar: "N/A" },
  { idDoc: "14", nome: "Sd PM 885/18 Albert", idMilitar: "871512" },
  { idDoc: "15", nome: "Sd PM 1034/18 Francinilson", idMilitar: "N/A" },
  { idDoc: "16", nome: "Sd PM 1083/18 Moise", idMilitar: "N/A" },
  { idDoc: "17", nome: "Sd PM 10/20 Garcez", idMilitar: "N/A" },
  { idDoc: "18", nome: "Sd PM 72/20 S. Filho", idMilitar: "N/A" },
  { idDoc: "19", nome: "Sd PM 003/21 Maycon", idMilitar: "N/A" },
  { idDoc: "20", nome: "Sd PM 006/21 Carvalho", idMilitar: "N/A" },
  { idDoc: "21", nome: "Sd PM 171/22 Fonteles", idMilitar: "N/A" },
  { idDoc: "22", nome: "Sd PM 380/22 Soares", idMilitar: "N/A" },
  { idDoc: "23", nome: "Sd PM 429/22 Castro", idMilitar: "N/A" },
  { idDoc: "24", nome: "Sd PM 502/22 Sales", idMilitar: "869293" },
  { idDoc: "25", nome: "Sd PM 572/22 Theodósio", idMilitar: "871896" },
  { idDoc: "26", nome: "Sd PM 246/24 Lobato", idMilitar: "N/A" },
  { idDoc: "27", nome: "Sd PM 457/24 Eduardo Silva", idMilitar: "869987" }
].sort((a, b) => a.nome.localeCompare(b.nome)).map((m, i) => ({ ...m, ordem: i }));

const ADMIN_PASSWORD = "32573515";

interface Militar {
  idDoc: string;
  nome: string;
  idMilitar: string;
  ordem?: number;
}

interface DateState {
  start: Date | null;
  end: Date | null;
  currentMonth: Date;
}

export default function Home() {
  // --- ESTADO LOCAL ---
  const [militares, setMilitares] = useState<Militar[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portal_militares_lista');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          return LISTA_INICIAL;
        }
      }
    }
    return LISTA_INICIAL;
  });

  const [isOfflineMode, setIsOfflineMode] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");

  const [localizacao, setLocalizacao] = useState("TURIAÇU");
  const [pmSubstituido, setPmSubstituido] = useState({ nome: "", id: "" });
  const [pmSubstituto, setPmSubstituto] = useState({ nome: "", id: "" });
  const [comandante, setComandante] = useState("JOSE RIBAMAR BRAGA JUNIOR - 1º TEN QOEM");
  const [noPagamento, setNoPagamento] = useState(false);
  const [tipoServico, setTipoServico] = useState("24H");

  const [serviceDates, setServiceDates] = useState<DateState>({ 
    start: null, 
    end: null, 
    currentMonth: new Date() 
  });
  const [paymentDates, setPaymentDates] = useState<DateState>({ 
    start: null, 
    end: null, 
    currentMonth: new Date() 
  });
  const [formAlert, setFormAlert] = useState<{ title: string; message: string } | null>(null);

  // --- ESTADO DE EDIÇÃO (ADMIN) ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIdMilitar, setEditIdMilitar] = useState("");

  // --- INICIALIZAÇÃO E SINCRONIZAÇÃO DO FIREBASE ---
  useEffect(() => {
    const { auth, db } = getFirebase();

    if (!auth || !db) {
      setIsOfflineMode(true);
      return;
    }

    let unsubscribeFirestore: (() => void) | null = null;

    const initAuthAndSync = async () => {
      try {
        await signInAnonymously(auth);
        setIsOfflineMode(false);

        const colRef = collection(db, 'militares_lista');
        unsubscribeFirestore = onSnapshot(colRef, (snapshot) => {
          const list = snapshot.docs.map(doc => ({ 
            ...(doc.data() as Omit<Militar, 'idDoc'>), 
            idDoc: doc.id 
          }));

          if (list.length > 0) {
            const sortedList = list.sort((a, b) => {
              const ordemA = typeof a.ordem === 'number' ? a.ordem : 9999;
              const ordemB = typeof b.ordem === 'number' ? b.ordem : 9999;
              if (ordemA !== ordemB) return ordemA - ordemB;
              return (a.nome || "").localeCompare(b.nome || "");
            });
            setMilitares(sortedList);
            localStorage.setItem('portal_militares_lista', JSON.stringify(sortedList));
          } else if (!snapshot.metadata.fromCache) {
            // Se o banco estiver vazio, popula com a lista inicial de forma assíncrona
            LISTA_INICIAL.forEach(async (m) => {
              await addDoc(colRef, { nome: m.nome, idMilitar: m.idMilitar, ordem: m.ordem });
            });
          }
        }, (error) => {
          console.warn("Aviso Firestore:", error);
          setIsOfflineMode(true);
        });
      } catch (err) {
        console.warn("Autenticação/Sincronização do Firebase falhou. Usando Modo Local Offline.", err);
        setIsOfflineMode(true);
      }
    };

    initAuthAndSync();

    return () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  // --- SALVAR EM LOCALSTORAGE NO MODO OFFLINE ---
  useEffect(() => {
    if (isOfflineMode) {
      localStorage.setItem('portal_militares_lista', JSON.stringify(militares));
    }
  }, [militares, isOfflineMode]);

  // --- ATUALIZAÇÃO AUTOMÁTICA DE TIPO DE SERVIÇO (BASED ON DATES) ---
  useEffect(() => {
    if (serviceDates.start && serviceDates.end) {
      const diffTime = Math.abs(serviceDates.end.getTime() - serviceDates.start.getTime());
      const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (dias === 2) setTipoServico("48H");
      else if (dias >= 3) setTipoServico("72H");
    } else if (serviceDates.start) {
      if (tipoServico !== '1QTU' && tipoServico !== '2QTU') {
        setTipoServico("24H");
      }
    }
  }, [serviceDates.start, serviceDates.end, tipoServico]);

  // --- PROGRESSO DINÂMICO ---
  const getProgress = () => {
    let completed = 0;
    let total = 5;

    if (pmSubstituido.nome) completed++;
    if (pmSubstituto.nome) completed++;
    if (serviceDates.start) completed++;
    if (noPagamento || paymentDates.start) completed++;
    if (comandante) completed++;

    return Math.round((completed / total) * 100);
  };

  // --- FUNÇÕES ADMIN ---
  const addMilitarLocal = async (nome: string, id: string) => {
    const maxOrdem = militares.reduce((max, m) => typeof m.ordem === 'number' ? Math.max(max, m.ordem) : max, -1);
    const newMilitar = { nome, idMilitar: id, ordem: maxOrdem + 1 };
    
    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        await addDoc(collection(db, 'militares_lista'), newMilitar);
      } catch (err) {
        console.error("Erro ao adicionar no banco:", err);
      }
    } else {
      const newLocal = { ...newMilitar, idDoc: Date.now().toString() };
      setMilitares([...militares, newLocal]);
    }
  };

  const deleteMilitarLocal = async (idDoc: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este militar?")) return;
    setMilitares(current => current.filter(m => m.idDoc !== idDoc));
    
    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        await deleteDoc(doc(db, 'militares_lista', idDoc));
      } catch (err) {
        console.error("Erro ao excluir no banco:", err);
      }
    }
  };

  const startEdit = (m: Militar) => {
    setEditingId(m.idDoc);
    setEditName(m.nome);
    setEditIdMilitar(m.idMilitar);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const idToUpdate = editingId;
    const dataToUpdate = { nome: editName, idMilitar: editIdMilitar };
    
    const optimisticList = militares.map(m => m.idDoc === editingId ? { ...m, ...dataToUpdate } : m);
    setMilitares(optimisticList);
    setEditingId(null);

    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        await updateDoc(doc(db, 'militares_lista', idToUpdate), dataToUpdate);
      } catch (err) {
        console.error("Erro ao atualizar no banco:", err);
        setFormAlert({ title: "Aviso", message: "Erro ao salvar edição no banco." });
      }
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const current = militares[index];
    const prev = militares[index - 1];
    
    const currentOrdem = typeof current.ordem === 'number' ? current.ordem : index;
    const prevOrdem = typeof prev.ordem === 'number' ? prev.ordem : index - 1;

    const newList = [...militares];
    newList[index] = { ...prev, ordem: currentOrdem };
    newList[index - 1] = { ...current, ordem: prevOrdem };
    setMilitares(newList);

    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        await updateDoc(doc(db, 'militares_lista', current.idDoc), { ordem: prevOrdem });
        await updateDoc(doc(db, 'militares_lista', prev.idDoc), { ordem: currentOrdem });
      } catch (err) {
        console.error("Erro ao reordenar:", err);
      }
    }
  };

  const moveDown = async (index: number) => {
    if (index === militares.length - 1) return;
    const current = militares[index];
    const next = militares[index + 1];
    
    const currentOrdem = typeof current.ordem === 'number' ? current.ordem : index;
    const nextOrdem = typeof next.ordem === 'number' ? next.ordem : index + 1;

    const newList = [...militares];
    newList[index] = { ...next, ordem: currentOrdem };
    newList[index + 1] = { ...current, ordem: nextOrdem };
    setMilitares(newList);

    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        await updateDoc(doc(db, 'militares_lista', current.idDoc), { ordem: nextOrdem });
        await updateDoc(doc(db, 'militares_lista', next.idDoc), { ordem: currentOrdem });
      } catch (err) {
        console.error("Erro ao reordenar:", err);
      }
    }
  };

  const formatarDataRange = (startDate: Date | null, endDate: Date | null) => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const dates: Date[] = [];
    let curr = new Date(start);
    while (curr <= end) { 
      dates.push(new Date(curr)); 
      curr.setDate(curr.getDate() + 1); 
    }
    
    if (dates.length === 1) {
      return `${String(dates[0].getDate()).padStart(2, '0')}/${String(dates[0].getMonth() + 1).padStart(2, '0')}/${dates[0].getFullYear()}`;
    }
    
    let result = '';
    let currentMonth = dates[0].getMonth();
    let currentYear = dates[0].getFullYear();
    let daysInGroup: string[] = [];

    for (let i = 0; i < dates.length; i++) {
      const d = dates[i];
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        daysInGroup.push(String(d.getDate()).padStart(2, '0'));
      } else {
        result += `${daysInGroup.join(', ')}/${String(currentMonth + 1).padStart(2, '0')}, `;
        currentMonth = d.getMonth();
        currentYear = d.getFullYear();
        daysInGroup = [String(d.getDate()).padStart(2, '0')];
      }
    }
    result += `${daysInGroup.join(' - ')}/${String(currentMonth + 1).padStart(2, '0')}/${currentYear}`;
    return result;
  };

  // --- IMPRESSÃO COMPATÍVEL COM NAVEGADOR ---
  const handlePrint = () => {
    if (!pmSubstituido.nome || !pmSubstituto.nome || !serviceDates.start) {
      setFormAlert({ 
        title: "Campos Incompletos", 
        message: "Por favor, selecione ambos os militares (Substituído e Substituto) e escolha a data do serviço no calendário antes de concluir." 
      });
      return;
    }

    window.print();
  };

  const renderCalendar = (state: DateState, setState: React.Dispatch<React.SetStateAction<DateState>>) => {
    const month = state.currentMonth.getMonth();
    const year = state.currentMonth.getFullYear();
    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();
    const today = new Date(); 
    today.setHours(0,0,0,0);
    const days = [];

    for (let i = 0; i < first; i++) {
      days.push(<div key={'e' + i} className="aspect-square" />);
    }

    for (let i = 1; i <= last; i++) {
      const d = new Date(year, month, i);
      const isPast = d < today;
      const isSel = (state.start && d.getTime() === state.start.getTime()) || 
                    (state.end && d.getTime() === state.end.getTime());
      const inR = state.start && state.end && d > state.start && d < state.end;

      days.push(
        <div 
          key={i} 
          onClick={() => {
            if (isPast) return;
            let s = state.start;
            let e = state.end;
            if (!s || (s && e)) { 
              s = d; 
              e = null; 
            } else { 
              e = d; 
              if (e < s) [s, e] = [e, s]; 
              const diffTime = Math.abs(e.getTime() - s.getTime());
              const daysDiff = Math.ceil(diffTime / 86400000);
              if (daysDiff > 2) { 
                setFormAlert({
                  title: "Limite de Datas", 
                  message: "O período máximo permitido para permuta é de até 3 dias consecutivos."
                }); 
                s = d; 
                e = null; 
              } 
            }
            setState({ ...state, start: s, end: e });
          }} 
          className={`calendar-day-btn text-xs sm:text-sm font-semibold transition-all duration-150 ${
            isPast 
              ? 'text-slate-600 bg-slate-900/10 cursor-not-allowed opacity-30' 
              : 'text-slate-300 hover:bg-slate-700 hover:text-white active:scale-90'
          } ${
            isSel 
              ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 border border-blue-400' 
              : ''
          } ${
            inR 
              ? 'bg-blue-950/60 text-blue-300 font-medium border-y border-blue-900/50' 
              : ''
          }`}
        >
          {i}
        </div>
      );
    }
    return days;
  };

  // Variáveis calculadas para a visualização de impressão
  const servicoTexto = formatarDataRange(serviceDates.start, serviceDates.end);
  const pagamentoTexto = !noPagamento ? formatarDataRange(paymentDates.start, paymentDates.end) : 'SA';

  const localizacaoSede = localizacao === 'SEDE' ? 'X' : ' ';
  const localizacaoTurilandia = localizacao === 'TURILÂNDIA' ? 'X' : ' ';
  const localizacaoTuriacu = localizacao === 'TURIAÇU' ? 'X' : ' ';

  const tipo1QTU = tipoServico === '1QTU' ? 'X' : ' ';
  const tipo2QTU = tipoServico === '2QTU' ? 'X' : ' ';
  const tipo24 = tipoServico === '24H' ? 'X' : ' ';
  const tipo48 = tipoServico === '48H' ? 'X' : ' ';
  const tipo72 = tipoServico === '72H' ? 'X' : ' ';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0f172a] text-slate-200">
      
      {/* 1. SEÇÃO DE IMPRESSÃO REAL (Oculta na tela, visível apenas no comando print) */}
      <div className="hidden print:block w-[100%] max-w-[800px] text-black bg-white font-serif mx-auto p-4 leading-relaxed text-[12pt]">
        <div className="text-center flex flex-col items-center">
          <img 
            src="https://i.ibb.co/WvgB63VR/bras-o-pm.png" 
            alt="Brasão PMMA" 
            className="w-[90px] h-[110px] object-contain mb-3"
            referrerPolicy="no-referrer"
          />
          <p className="font-bold uppercase text-[12pt] m-0 tracking-wide">Estado do Maranhão</p>
          <p className="text-[11pt] uppercase m-0 font-medium text-gray-700">Secretaria de Segurança Pública</p>
          <p className="text-[11pt] uppercase m-0 font-medium text-gray-700">CPA/I-5 – 10º BPM</p>
          <p className="text-[11pt] uppercase m-0 font-medium text-gray-700">10º Batalhão da Polícia Militar do Maranhão</p>
          <p className="text-[11pt] uppercase m-0 font-medium text-gray-700">2ª Companhia do 10° Batalhão de Polícia Militar</p>
          <p className="text-[9pt] italic m-0 text-gray-500">Rua Dr. Paulo Ramos, s/nº, Centro, Santa Helena - MA, Telefax: (98) 99243-6850 - Email: 2cia10bpm@gmail.com</p>
          <p className="font-bold text-[12pt] mt-8 mb-6 uppercase tracking-tight border-b-2 border-black pb-2 w-full">
            Formulário de Autorização para Permuta de Serviço
          </p>
        </div>

        <div className="my-6 text-[12pt] font-semibold">
          <p className="flex justify-between w-full max-w-2xl">
            <span>SEDE: ( {localizacaoSede} )</span>
            <span>DPM TURILÂNDIA: ( {localizacaoTurilandia} )</span>
            <span>DPM TURIAÇU: ( {localizacaoTuriacu} )</span>
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="border border-black p-4 rounded-sm">
            <p className="font-bold uppercase m-0 text-[11pt]">PM Substituído:</p>
            <p className="text-[12pt] mt-1 font-semibold">{pmSubstituido.nome.toUpperCase()} - ID/Matrícula: {pmSubstituido.id || 'N/A'}</p>
            <div className="mt-12 flex justify-between items-end">
              <span className="text-[10pt]">Data: ____/____/______</span>
              <div className="text-center w-1/2">
                <div className="border-t border-black w-full" />
                <p className="text-[10pt] uppercase font-bold mt-1">Assinatura do PM Substituído</p>
              </div>
            </div>
          </div>

          <div className="border border-black p-4 rounded-sm">
            <p className="font-bold uppercase m-0 text-[11pt]">PM Substituto:</p>
            <p className="text-[12pt] mt-1 font-semibold">{pmSubstituto.nome.toUpperCase()} - ID/Matrícula: {pmSubstituto.id || 'N/A'}</p>
            <div className="mt-12 flex justify-between items-end">
              <span className="text-[10pt]">Data: ____/____/______</span>
              <div className="text-center w-1/2">
                <div className="border-t border-black w-full" />
                <p className="text-[10pt] uppercase font-bold mt-1">Assinatura do PM Substituto</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border border-black p-4 rounded-sm space-y-3">
          <p className="text-[12pt]"><span className="font-bold">Data do serviço permutado:</span> {servicoTexto || '____/____/______'}</p>
          <p className="text-[12pt]"><span className="font-bold">Data do pagamento do serviço:</span> {pagamentoTexto || 'SA'}</p>
        </div>

        <div className="mt-6 flex flex-wrap justify-between text-[11pt] font-semibold border border-black p-3 bg-gray-50/50">
          <span>( {tipo1QTU} ) 1º QTU</span>
          <span>( {tipo2QTU} ) 2º QTU</span>
          <span>( {tipo24} ) 24 Horas</span>
          <span>( {tipo48} ) 48 Horas</span>
          <span>( {tipo72} ) 72 Horas</span>
        </div>

        <div className="mt-10 border-2 border-dashed border-black p-6 rounded-sm text-center">
          <p className="font-bold text-[12pt]">AUTORIZO A PERMUTA ENTRE OS POLICIAIS MILITARES ACIMA RELACIONADOS:</p>
          <p className="font-bold text-[13pt] mt-2 flex justify-center gap-12">
            <span>( &nbsp; ) SIM</span>
            <span>( &nbsp; ) NÃO</span>
          </p>
          
          <div className="mt-16 flex flex-col items-center">
            <div className="border-t border-black w-3/4 max-w-md" />
            <p className="font-bold text-[12pt] uppercase mt-2 mb-0 tracking-wide text-center">{comandante.toUpperCase()}</p>
            <p className="text-[10pt] uppercase font-bold text-gray-600 m-0 text-center">Comandante da 2ª CP/10º BPM</p>
          </div>
        </div>
      </div>

      {/* 2. LAYOUT PRINCIPAL INTERATIVO (Oculto na impressão) */}
      <div className="flex-1 flex flex-col lg:flex-row no-print">
        
        {/* SIDEBAR DA ESQUERDA - BENTO ESTILO */}
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-slate-800/80 flex flex-col p-6 shrink-0 bg-slate-950/40">
          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/35">
              PM
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">PermutaPro</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">2ª CP / 10º BPM MA</p>
            </div>
          </div>

          <nav className="space-y-2.5 flex-1">
            <div className="p-3.5 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400 font-bold flex items-center gap-3 text-sm">
              <LayoutGrid size={18} />
              Portal de Permuta
            </div>
            
            <button 
              onClick={() => setShowAdminLogin(true)}
              className="w-full p-3.5 hover:bg-slate-800/60 rounded-2xl text-slate-400 hover:text-slate-200 transition-all flex items-center gap-3 text-sm font-semibold"
            >
              <Settings size={18} />
              Gerenciar Escala
            </button>

            <button 
              onClick={() => window.open('https://sso.acesso.gov.br/login', '_blank')}
              className="w-full p-3.5 hover:bg-slate-800/60 rounded-2xl text-slate-400 hover:text-slate-200 transition-all flex items-center gap-3 text-sm font-semibold text-left"
            >
              <ExternalLink size={18} />
              Acessar GOV.BR
            </button>

            <button 
              onClick={() => window.open('https://projetobo.github.io/portal-2CIA/home.html', '_blank')}
              className="w-full p-3.5 hover:bg-slate-800/60 rounded-2xl text-slate-400 hover:text-slate-200 transition-all flex items-center gap-3 text-sm font-semibold text-left"
            >
              <HomeIcon size={18} />
              Voltar ao Início
            </button>
          </nav>

          {/* INDICADOR DE PROGRESSO DENTRO DO BENTO */}
          <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl my-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Preenchimento</span>
              <span className="text-xs font-bold text-blue-400">{getProgress()}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full"
                initial={{ width: 0 }}
                animate={{ width: `${getProgress()}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Complete todos os campos para habilitar a visualização de impressão oficial.
            </p>
          </div>

          {/* STATUS DE CONEXÃO FIREBASE */}
          <div className="mt-auto p-4 bg-slate-900/30 border border-slate-800/60 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOfflineMode ? (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              )}
              <span className="text-xs font-bold text-slate-300">
                {isOfflineMode ? 'Modo Local (Offline)' : 'Servidor Online'}
              </span>
            </div>
            <div>
              {isOfflineMode ? (
                <WifiOff size={16} className="text-amber-500" />
              ) : (
                <Database size={16} className="text-emerald-500" />
              )}
            </div>
          </div>
        </aside>

        {/* WORKSPACE PRINCIPAL - BENTO GRID DESIGN */}
        <main className="flex-1 p-4 sm:p-8 flex flex-col gap-6 overflow-y-auto max-h-screen custom-scrollbar">
          
          {/* HEADER PRINCIPAL */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/30 border border-slate-800/40 p-6 rounded-[2rem]">
            <div>
              <h2 className="text-2xl font-black text-white font-display">Olá, Policial Militar</h2>
              <p className="text-slate-400 text-sm mt-0.5">Formulário Oficial de Permuta de Escala — Unidade Santa Helena.</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative shrink-0">
                <select 
                  value={localizacao} 
                  onChange={e => setLocalizacao(e.target.value)} 
                  className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs outline-none cursor-pointer transition-all pr-8 appearance-none"
                >
                  <option value="TURIAÇU">DPM TURIAÇU</option>
                  <option value="SEDE">SEDE DA COMPANHIA</option>
                  <option value="TURILÂNDIA">DPM TURILÂNDIA</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight size={14} className="rotate-90" />
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 p-2.5 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-400" />
                10º BPM MA
              </div>
            </div>
          </header>

          {/* BENTO GRID WORKSPACE */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* CARD 1: PM SUBSTITUÍDO */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[2rem] p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-red-500/10 text-red-400 text-[9px] font-black px-2.5 py-1 rounded-full border border-red-500/20 uppercase tracking-wider">
                    Sai do Serviço
                  </span>
                  <UserCheck size={18} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">1. PM Substituído</h3>
                <p className="text-slate-400 text-xs mb-6">Selecione o militar que está solicitando a saída da escala.</p>
                
                <div className="relative mb-4">
                  <select 
                    className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer text-sm" 
                    value={pmSubstituido.nome} 
                    onChange={e => { 
                      const m = militares.find(x => x.nome === e.target.value); 
                      setPmSubstituido({ nome: e.target.value, id: m ? m.idMilitar : "" }); 
                    }}
                  >
                    <option value="">Selecione o militar...</option>
                    {militares.map(m => (
                      <option key={m.idDoc} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronRight className="rotate-90" size={16} />
                  </div>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase">
                  ID/Matrícula:
                </span>
                <input 
                  className="w-full p-3 pl-24 bg-slate-950/50 border border-slate-800/80 rounded-xl font-bold text-slate-400 shadow-inner text-sm focus:outline-none" 
                  value={pmSubstituido.id} 
                  onChange={(e) => setPmSubstituido({ ...pmSubstituido, id: e.target.value })} 
                  placeholder="---" 
                />
              </div>
            </div>

            {/* CARD 2: PM SUBSTITUTO */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[2rem] p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2.5 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                    Entra no Serviço
                  </span>
                  <UserCheck size={18} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">2. PM Substituto</h3>
                <p className="text-slate-400 text-xs mb-6">Selecione o militar que assumirá a escala correspondente.</p>
                
                <div className="relative mb-4">
                  <select 
                    className="w-full p-3.5 bg-slate-800 border border-slate-700 rounded-xl font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer text-sm" 
                    value={pmSubstituto.nome} 
                    onChange={e => { 
                      const m = militares.find(x => x.nome === e.target.value); 
                      setPmSubstituto({ nome: e.target.value, id: m ? m.idMilitar : "" }); 
                    }}
                  >
                    <option value="">Selecione o militar...</option>
                    {militares.map(m => (
                      <option key={m.idDoc} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronRight className="rotate-90" size={16} />
                  </div>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500 uppercase">
                  ID/Matrícula:
                </span>
                <input 
                  className="w-full p-3 pl-24 bg-slate-950/50 border border-slate-800/80 rounded-xl font-bold text-slate-400 shadow-inner text-sm focus:outline-none" 
                  value={pmSubstituto.id} 
                  onChange={(e) => setPmSubstituto({ ...pmSubstituto, id: e.target.value })} 
                  placeholder="---" 
                />
              </div>
            </div>

            {/* CARD 3: ESCALA E DURAÇÃO */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[2rem] p-6 flex flex-col justify-between md:col-span-2 lg:col-span-1">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2.5 py-1 rounded-full border border-blue-500/20 uppercase tracking-wider">
                    Duração
                  </span>
                  <Clock size={18} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Carga Horária</h3>
                <p className="text-slate-400 text-xs mb-6">Selecione o turno ou a carga horária de serviço.</p>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { id: '1QTU', label: '1º QTU - Serviço Diurno' },
                    { id: '2QTU', label: '2º QTU - Serviço Noturno' },
                    { id: '24H', label: 'Escala 24 Horas' },
                    { id: '48H', label: 'Escala 48 Horas' },
                    { id: '72H', label: 'Escala 72 Horas' }
                  ].map(op => (
                    <label 
                      key={op.id} 
                      className={`cursor-pointer p-3 rounded-xl text-xs font-bold transition-all border-2 flex items-center justify-between select-none ${
                        tipoServico === op.id 
                          ? 'border-blue-500 bg-blue-950/50 text-blue-400' 
                          : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="tipoServico" 
                        value={op.id} 
                        checked={tipoServico === op.id} 
                        onChange={e => setTipoServico(e.target.value)} 
                        className="hidden" 
                      />
                      <span>{op.label}</span>
                      {tipoServico === op.id && <Check size={14} className="stroke-3 text-blue-400" />}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* CARD 4: CALENDÁRIO 1 (SERVIÇO PERMUTADO) */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[2rem] p-6 lg:col-span-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays size={16} className="text-blue-400" />
                  Data de Saída (Serviço)
                </h3>
              </div>
              <div className="p-1 bg-slate-950/30 border border-slate-800/50 rounded-2xl">
                <div className="flex justify-between items-center mb-4 p-2">
                  <button 
                    onClick={() => setServiceDates({ 
                      ...serviceDates, 
                      currentMonth: new Date(serviceDates.currentMonth.setMonth(serviceDates.currentMonth.getMonth() - 1)) 
                    })}
                    className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">
                    {serviceDates.currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={() => setServiceDates({ 
                      ...serviceDates, 
                      currentMonth: new Date(serviceDates.currentMonth.setMonth(serviceDates.currentMonth.getMonth() + 1)) 
                    })}
                    className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-black text-slate-500 mb-2 uppercase">
                  {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => (
                    <div key={i}>{d}</div>
                  ))}
                </div>
                
                <div className="calendar-grid gap-1">
                  {renderCalendar(serviceDates, setServiceDates)}
                </div>
              </div>
            </div>

            {/* CARD 5: CALENDÁRIO 2 (PAGAMENTO / DEVOLUÇÃO) */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[2rem] p-6 lg:col-span-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CalendarDays size={16} className="text-blue-400" />
                  Devolução (Pagamento)
                </h3>
                <label className="flex items-center gap-1.5 text-[8px] font-black cursor-pointer text-slate-500 hover:text-slate-300 uppercase tracking-wide select-none">
                  <input 
                    type="checkbox" 
                    checked={noPagamento} 
                    onChange={e => setNoPagamento(e.target.checked)} 
                    className="rounded text-blue-600 border-slate-700 bg-slate-950 focus:ring-0 cursor-pointer h-3 w-3" 
                  />
                  Sem devolução
                </label>
              </div>

              {!noPagamento ? (
                <div className="p-1 bg-slate-950/30 border border-slate-800/50 rounded-2xl">
                  <div className="flex justify-between items-center mb-4 p-2">
                    <button 
                      onClick={() => setPaymentDates({ 
                        ...paymentDates, 
                        currentMonth: new Date(paymentDates.currentMonth.setMonth(paymentDates.currentMonth.getMonth() - 1)) 
                      })}
                      className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="font-extrabold text-[9px] uppercase tracking-wider text-slate-300">
                      {paymentDates.currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      onClick={() => setPaymentDates({ 
                        ...paymentDates, 
                        currentMonth: new Date(paymentDates.currentMonth.setMonth(paymentDates.currentMonth.getMonth() + 1)) 
                      })}
                      className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-black text-slate-500 mb-2 uppercase">
                    {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => (
                      <div key={i}>{d}</div>
                    ))}
                  </div>
                  
                  <div className="calendar-grid gap-1">
                    {renderCalendar(paymentDates, setPaymentDates)}
                  </div>
                </div>
              ) : (
                <div className="h-[214px] flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 bg-slate-950/20 text-center px-4 gap-2">
                  <FileText size={28} className="text-slate-600 stroke-1" />
                  <p className="text-xs font-semibold">Permuta Simples</p>
                  <p className="text-[10px] text-slate-600 leading-normal">Sem data prevista para devolução da escala na folha atual.</p>
                </div>
              )}
            </div>

            {/* CARD 6: COMANDANTE AUTORIZADOR */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-[2rem] p-6 lg:col-span-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2.5 py-1 rounded-full border border-blue-500/20 uppercase tracking-wider">
                    Autoridade
                  </span>
                  <FileSignature size={18} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">4. Comandante</h3>
                <p className="text-slate-400 text-xs mb-6">Nome e posto do comandante que ratifica a permuta.</p>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Pencil size={14} />
                  </span>
                  <input 
                    className="w-full p-3 pl-10 bg-slate-800 border border-slate-700 rounded-xl font-bold text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-xs" 
                    value={comandante} 
                    onChange={e => setComandante(e.target.value)} 
                    placeholder="Nome do Comandante de Companhia"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-4 leading-normal">
                Este campo é editável. O nome digitado será o impresso na linha de assinatura final da autorização.
              </p>
            </div>

            {/* CARD 7: PAINEL DE CONCLUSÃO & PRINT (FULL WIDTH DA GRID) */}
            <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-blue-900/40 to-slate-900/50 border border-blue-800/40 rounded-[2.5rem] p-6 sm:p-8 flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="space-y-2 text-center lg:text-left">
                <h3 className="text-xl font-black text-white font-display">Tudo pronto para imprimir?</h3>
                <p className="text-slate-300 text-sm max-w-2xl">
                  Ao concluir, um formulário oficial formatado nas normas da PMMA será gerado. Certifique-se de recolher as assinaturas dos militares após a impressão física do arquivo.
                </p>
                
                {/* Resumo visual do formulário */}
                {pmSubstituido.nome && pmSubstituto.nome && serviceDates.start && (
                  <div className="mt-4 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/60 inline-flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                    <div><span className="font-bold text-slate-500">Permuta:</span> {pmSubstituido.nome} ➔ {pmSubstituto.nome}</div>
                    <div><span className="font-bold text-slate-500">Data:</span> {servicoTexto}</div>
                    <div><span className="font-bold text-slate-500">Devolução:</span> {pagamentoTexto}</div>
                    <div><span className="font-bold text-slate-500">Escala:</span> {tipoServico}</div>
                  </div>
                )}
              </div>

              <div className="shrink-0 w-full lg:w-auto flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={handlePrint}
                  className="w-full sm:w-auto px-8 py-4.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm cursor-pointer"
                >
                  <Printer size={18} />
                  Concluir e Imprimir
                </button>
              </div>
            </div>

          </div>

          {/* RODAPÉ DO WORKSPACE */}
          <footer className="text-center py-6 text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] border-t border-slate-800/30 mt-6">
            Portal 2ª Companhia / 10º Batalhão PMMA
          </footer>
        </main>
      </div>

      {/* --- MODAL DE AUTENTICAÇÃO DO ADMIN (MODO EDIT DE MILITARES) --- */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 p-8 rounded-[2.2rem] shadow-2xl max-w-sm w-full"
            >
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-white">
                <Lock className="text-blue-500" /> Acesso de Segurança
              </h3>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                Insira a chave de segurança padrão para gerenciar a lista e ordenação dos policiais militares da unidade.
              </p>
              <input 
                type="password" 
                placeholder="Chave de Segurança" 
                className="w-full p-3.5 border border-slate-800 bg-slate-950 text-white rounded-xl mb-6 outline-none focus:ring-2 focus:ring-blue-500 font-bold tracking-widest text-center" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} 
                onKeyDown={e => {
                  if (e.key === 'Enter' && loginPassword === ADMIN_PASSWORD) {
                    setIsAdminMode(true);
                    setShowAdminLogin(false);
                    setLoginPassword("");
                  }
                }}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAdminLogin(false)} 
                  className="flex-1 py-3 border border-slate-800 rounded-xl font-bold text-slate-400 text-xs hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => { 
                    if (loginPassword === ADMIN_PASSWORD) { 
                      setIsAdminMode(true); 
                      setShowAdminLogin(false); 
                      setLoginPassword(""); 
                    } else { 
                      setFormAlert({ title: "Senha Incorreta", message: "A chave de segurança inserida não confere com o padrão." }); 
                    } 
                  }} 
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-500/25"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE GERENCIAMENTO DOS MILITARES (ADMIN) --- */}
      <AnimatePresence>
        {isAdminMode && (
          <div className="fixed inset-0 bg-black/70 z-[160] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  <Settings className="text-blue-500 animate-spin-slow" /> Configuração de Militares
                </h2>
                <button 
                  onClick={() => setIsAdminMode(false)} 
                  className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                {isOfflineMode && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-2xl mb-2 flex items-start gap-2.5">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <strong>Modo Local Offline Ativado:</strong> Suas alterações ficarão salvas no seu navegador (localStorage) e persistirão nas próximas visitas.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/40 rounded-2xl border border-slate-800 shadow-inner">
                  <input 
                    id="nM" 
                    placeholder="Nome do PM (ex: Sd PM Sales)" 
                    className="p-3 border border-slate-800 bg-slate-900 rounded-xl text-xs font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  />
                  <input 
                    id="iM" 
                    placeholder="Matrícula/ID" 
                    className="p-3 border border-slate-800 bg-slate-900 rounded-xl text-xs font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  />
                  <button 
                    onClick={() => {
                      const nInput = document.getElementById('nM') as HTMLInputElement;
                      const iInput = document.getElementById('iM') as HTMLInputElement;
                      const n = nInput?.value; 
                      const i = iInput?.value;
                      if (n && i) { 
                        addMilitarLocal(n, i); 
                        nInput.value = ''; 
                        iInput.value = ''; 
                      } else {
                        setFormAlert({ title: "Campos Incompletos", message: "Insira o nome e a matrícula do novo militar para cadastrá-lo." });
                      }
                    }} 
                    className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold py-2.5 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/15 text-xs"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                </div>

                <div className="space-y-1.5 mt-4">
                  {militares.map((m, index) => (
                    <div 
                      key={m.idDoc} 
                      className="flex justify-between items-center p-3.5 border border-slate-800/60 bg-slate-900/30 rounded-xl hover:bg-slate-900/60 transition-colors"
                    >
                      {editingId === m.idDoc ? (
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 mr-2">
                          <input 
                            value={editName} 
                            onChange={(e) => setEditName(e.target.value)} 
                            className="p-2 border border-slate-700 bg-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                          />
                          <input 
                            value={editIdMilitar} 
                            onChange={(e) => setEditIdMilitar(e.target.value)} 
                            className="p-2 border border-slate-700 bg-slate-800 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500" 
                          />
                        </div>
                      ) : (
                        <div className="flex-1">
                          <p className="font-bold text-slate-200 text-xs leading-tight">{m.nome}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Matrícula/ID: {m.idMilitar}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        {editingId === m.idDoc ? (
                          <button 
                            onClick={saveEdit} 
                            className="text-emerald-400 p-2 hover:bg-emerald-500/10 rounded-lg transition-colors" 
                            title="Salvar"
                          >
                            <Save size={16} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => startEdit(m)} 
                            className="text-blue-400 p-2 hover:bg-blue-500/10 rounded-lg transition-colors" 
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        
                        <div className="flex flex-col">
                          <button 
                            onClick={() => moveUp(index)} 
                            disabled={index === 0} 
                            className={`p-0.5 rounded ${
                              index === 0 
                                ? 'text-slate-700 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800 active:scale-90 transition-all'
                            }`}
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button 
                            onClick={() => moveDown(index)} 
                            disabled={index === militares.length - 1} 
                            className={`p-0.5 rounded ${
                              index === militares.length - 1 
                                ? 'text-slate-700 cursor-not-allowed' 
                                : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800 active:scale-90 transition-all'
                            }`}
                          >
                            <ArrowDown size={12} />
                          </button>
                        </div>

                        <button 
                          onClick={() => deleteMilitarLocal(m.idDoc)} 
                          className="text-red-400 p-2 hover:bg-red-500/10 rounded-lg ml-1 transition-colors" 
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE ALERTAS GERAIS --- */}
      <AnimatePresence>
        {formAlert && (
          <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-slate-900 p-7 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-slate-800"
            >
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-500/10 text-blue-400 mb-4 border border-blue-500/20">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-black text-white mb-2">{formAlert.title}</h3>
              <p className="text-slate-400 mb-6 text-xs leading-relaxed">{formAlert.message}</p>
              <button 
                onClick={() => setFormAlert(null)} 
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-lg shadow-blue-500/25"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
