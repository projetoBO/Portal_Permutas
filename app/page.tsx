'use client';

import React, { useState, useEffect, Component, ReactNode } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// --- SISTEMA DE PROTEÇÃO CONTRA TELA AZUL ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Erro capturado pelo sistema:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#483D8B] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-xl w-full text-center">
            <h1 className="text-red-600 font-bold text-2xl mb-4">⚠️ Erro de Carregamento</h1>
            <p className="text-gray-700 mb-4">Houve uma falha interna. Mas não se preocupe, o site não travou por completo.</p>
            <div className="bg-gray-100 p-4 rounded-lg overflow-auto text-xs text-red-800 font-mono mb-6 text-left">
              {this.state.error && this.state.error.toString()}
            </div>
            <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">Recarregar Página</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- LISTA FIXA DE MILITARES (BACKUP) ---
interface Militar {
  nome: string;
  idMilitar: string;
  ordem?: number;
  idDoc?: string;
}

const LISTA_INICIAL: Militar[] = [
  { nome: "Cb PM 562/14 Edmilson", idMilitar: "N/A" },
  { nome: "Cb PM 626/14 Coriolano", idMilitar: "N/A" },
  { nome: "Cb PM 636/14 Massole", idMilitar: "N/A" },
  { nome: "Cb PM 915/14 Froes", idMilitar: "N/A" },
  { nome: "Cb PM 1042/14 Mário Neto", idMilitar: "N/A" },
  { nome: "Cb PM 274/15 J. Froes", idMilitar: "N/A" },
  { nome: "Cb PM 372/15 Cruz", idMilitar: "N/A" },
  { nome: "Cb PM 196/16 Vasconcelos", idMilitar: "N/A" },
  { nome: "Cb PM 473/16 André", idMilitar: "849351" },
  { nome: "Sd PM 604/17 Élson", idMilitar: "N/A" },
  { nome: "Sd PM 868/17 P. Souza", idMilitar: "N/A" },
  { nome: "Sd PM 408/18 Ribeiro", idMilitar: "N/A" },
  { nome: "Sd PM 424/18 Rodrigues", idMilitar: "N/A" },
  { nome: "Sd PM 885/18 Albert", idMilitar: "871512" },
  { nome: "Sd PM 1034/18 Francinilson", idMilitar: "N/A" },
  { nome: "Sd PM 1083/18 Moise", idMilitar: "N/A" },
  { nome: "Sd PM 10/20 Garcez", idMilitar: "N/A" },
  { nome: "Sd PM 72/20 S. Filho", idMilitar: "N/A" },
  { nome: "Sd PM 003/21 Maycon", idMilitar: "N/A" },
  { nome: "Sd PM 006/21 Carvalho", idMilitar: "N/A" },
  { nome: "Sd PM 171/22 Fonteles", idMilitar: "N/A" },
  { nome: "Sd PM 380/22 Soares", idMilitar: "N/A" },
  { nome: "Sd PM 429/22 Castro", idMilitar: "N/A" },
  { nome: "Sd PM 502/22 Sales", idMilitar: "869293" },
  { nome: "Sd PM 572/22 Theodósio", idMilitar: "871896" },
  { nome: "Sd PM 246/24 Lobato", idMilitar: "N/A" },
  { nome: "Sd PM 457/24 Eduardo Silva", idMilitar: "869987" }
].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""))).map((m, i) => ({ ...m, ordem: i }));

const ADMIN_PASSWORD = "32573515";

// --- COMPONENTES DE ÍCONES SVG ---
interface IconProps {
  name: string;
  size?: number;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, size = 20, className = "" }) => {
  const icons: Record<string, React.ReactNode> = {
    settings: (
      <g>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43-.25a2 2 0 0 1-1-1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </g>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    pen: (
      <g>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </g>
    ),
    home: (
      <g>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </g>
    ),
    plus: (
      <g>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </g>
    ),
    trash: (
      <g>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </g>
    ),
    x: (
      <g>
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </g>
    ),
    lock: (
      <g>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </g>
    ),
    chevronLeft: <polyline points="15 18 9 12 15 6" />,
    chevronRight: <polyline points="9 18 15 12 9 6" />,
    arrowUp: (
      <g>
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </g>
    ),
    arrowDown: (
      <g>
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </g>
    ),
    save: (
      <g>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </g>
    )
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icons[name]}
    </svg>
  );
};

interface CalendarState {
  start: Date | null;
  end: Date | null;
  currentMonth: Date;
}

function PortalForm() {
  const [mounted, setMounted] = useState(false);
  const [militares, setMilitares] = useState<Militar[]>([]);
  const [db, setDb] = useState<firebase.firestore.Firestore | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  
  const [localizacao, setLocalizacao] = useState("TURIAÇU");
  const [pmSubstituido, setPmSubstituido] = useState({ nome: "", id: "" });
  const [pmSubstituto, setPmSubstituto] = useState({ nome: "", id: "" });
  const [comandante, setComandante] = useState("JOSE RIBAMAR BRAGA JUNIOR - 1º TEN QOEM");
  const [noPagamento, setNoPagamento] = useState(false);
  
  const [tipoServico, setTipoServico] = useState("24H");

  const [serviceDates, setServiceDates] = useState<CalendarState>({ start: null, end: null, currentMonth: new Date() });
  const [paymentDates, setPaymentDates] = useState<CalendarState>({ start: null, end: null, currentMonth: new Date() });
  const [formAlert, setFormAlert] = useState<{ title: string; message: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIdMilitar, setEditIdMilitar] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(handle);
  }, []);

  // --- 4. INICIALIZAÇÃO SEGURA DO FIREBASE COMPAT ---
  useEffect(() => {
    if (!mounted) return;
    try {
      const config = {
        apiKey: "AIzaSyAK5pxlxoaA37EGs3TRw1Q8F-9ghFw-o9w",
        authDomain: "portaldepermutas.firebaseapp.com",
        projectId: "portaldepermutas",
        storageBucket: "portaldepermutas.firebasestorage.app",
        messagingSenderId: "496739921207",
        appId: "1:496739921207:web:04ceef2d6a4d8679937eb2",
        measurementId: "G-JBKLB3DDG1"
      };

      // Inicia o firebase globalmente
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      
      const firestoreDb = firebase.firestore();
      setTimeout(() => {
        setDb(firestoreDb);
      }, 0);

      firebase.auth().signInAnonymously()
        .then(() => {
          setTimeout(() => {
            setIsOfflineMode(false);
          }, 0);
        })
        .catch((error) => {
          console.error("Erro na autenticação anônima:", error);
          setTimeout(() => {
            setIsOfflineMode(true);
          }, 0);
        });
    } catch (e) {
      console.error("Entrando em Modo Offline devido a:", e);
      setTimeout(() => {
        setIsOfflineMode(true);
        setMilitares(LISTA_INICIAL.map((m, i) => ({ ...m, idDoc: `local-${i}` })));
      }, 0);
    }
  }, [mounted]);

  // --- ESCUTA DE DADOS DO FIRESTORE ---
  useEffect(() => {
    if (!db || isOfflineMode) return;
    
    try {
      const colRef = db.collection('militares_lista');
      
      const unsubscribe = colRef.onSnapshot((snapshot) => {
        const list = snapshot.docs.map(doc => {
          const data = doc.data() as Omit<Militar, 'idDoc'>;
          return { ...data, idDoc: doc.id };
        });
        
        if (list.length > 0) {
          const sorted = list.sort((a, b) => {
            const ordemA = typeof a.ordem === 'number' ? a.ordem : 9999;
            const ordemB = typeof b.ordem === 'number' ? b.ordem : 9999;
            if (ordemA !== ordemB) return ordemA - ordemB;
            const nomeA = String(a.nome || "");
            const nomeB = String(b.nome || "");
            return nomeA.localeCompare(nomeB);
          });
          setTimeout(() => {
            setMilitares(sorted);
          }, 0);
        } else if (!snapshot.metadata.fromCache) {
          // Se o banco estiver vazio, salva o backup inicial nele
          LISTA_INICIAL.forEach(m => {
            const { idDoc, ...rest } = m;
            colRef.add(rest);
          });
        }
      }, (error) => {
        console.warn("Aviso Firestore:", error);
        setTimeout(() => {
          setIsOfflineMode(true);
          setMilitares(LISTA_INICIAL.map((m, i) => ({ ...m, idDoc: `local-${i}` })));
        }, 0);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Erro no Listener do banco de dados:", e);
      setTimeout(() => {
        setIsOfflineMode(true);
        setMilitares(LISTA_INICIAL.map((m, i) => ({ ...m, idDoc: `local-${i}` })));
      }, 0);
    }
  }, [db, isOfflineMode]);

  // --- ATUALIZAÇÃO AUTOMÁTICA DE TIPO DE SERVIÇO ---
  useEffect(() => {
    if (serviceDates.start && serviceDates.end) {
      const diffTime = Math.abs(serviceDates.end.getTime() - serviceDates.start.getTime());
      const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (dias === 2) {
        setTimeout(() => {
          setTipoServico("48H");
        }, 0);
      } else if (dias >= 3) {
        setTimeout(() => {
          setTipoServico("72H");
        }, 0);
      }
    } else if (serviceDates.start) {
      if (tipoServico !== '1QTU' && tipoServico !== '2QTU') {
        setTimeout(() => {
          setTipoServico("24H");
        }, 0);
      }
    }
  }, [serviceDates.start, serviceDates.end, tipoServico]);

  // --- FUNÇÕES ADMIN ---
  const addMilitarLocal = (nome: string, id: string) => {
    const maxOrdem = militares.reduce((max, m) => typeof m.ordem === 'number' ? Math.max(max, m.ordem) : max, -1);
    const newMilitar = { nome: nome, idMilitar: id, ordem: maxOrdem + 1 };
    
    if (db && !isOfflineMode) {
      db.collection('militares_lista').add(newMilitar);
    } else {
      const newLocal = { ...newMilitar, idDoc: `local-${Date.now()}` };
      setMilitares([...militares, newLocal]);
    }
  };

  const deleteMilitarLocal = async (idDoc: string) => {
    if(!window.confirm("Tem certeza que deseja excluir este militar?")) return;
    
    setMilitares(current => current.filter(m => m.idDoc !== idDoc));
    if (db && !isOfflineMode && !idDoc.startsWith('local-')) {
      try {
        await db.collection('militares_lista').doc(idDoc).delete();
      } catch (err) { console.error("Erro excluir:", err); }
    }
  };

  const startEdit = (m: Militar) => {
    if (m.idDoc) {
      setEditingId(m.idDoc);
      setEditName(m.nome || "");
      setEditIdMilitar(m.idMilitar || "");
    }
  };

  const saveEdit = async () => {
    const idToUpdate = editingId;
    if (!idToUpdate) return;
    const dataToUpdate = { nome: editName, idMilitar: editIdMilitar };
    
    const optimisticList = militares.map(m => m.idDoc === editingId ? { ...m, ...dataToUpdate } : m);
    setMilitares(optimisticList);
    setEditingId(null);

    if (db && !isOfflineMode && !idToUpdate.startsWith('local-')) {
      try {
        await db.collection('militares_lista').doc(idToUpdate).update(dataToUpdate);
      } catch (err) { console.error("Erro atualizar:", err); }
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

    if (db && !isOfflineMode && current.idDoc && prev.idDoc && !current.idDoc.startsWith('local-') && !prev.idDoc.startsWith('local-')) {
      try {
        await db.collection('militares_lista').doc(current.idDoc).update({ ordem: prevOrdem });
        await db.collection('militares_lista').doc(prev.idDoc).update({ ordem: currentOrdem });
      } catch (err) { console.error("Erro reordenar:", err); }
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

    if (db && !isOfflineMode && current.idDoc && next.idDoc && !current.idDoc.startsWith('local-') && !next.idDoc.startsWith('local-')) {
      try {
        await db.collection('militares_lista').doc(current.idDoc).update({ ordem: nextOrdem });
        await db.collection('militares_lista').doc(next.idDoc).update({ ordem: currentOrdem });
      } catch (err) { console.error("Erro reordenar:", err); }
    }
  };

  const handlePrevMonthService = () => {
    const newDate = new Date(serviceDates.currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setServiceDates({ ...serviceDates, currentMonth: newDate });
  };
  const handleNextMonthService = () => {
    const newDate = new Date(serviceDates.currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setServiceDates({ ...serviceDates, currentMonth: newDate });
  };
  const handlePrevMonthPayment = () => {
    const newDate = new Date(paymentDates.currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setPaymentDates({ ...paymentDates, currentMonth: newDate });
  };
  const handleNextMonthPayment = () => {
    const newDate = new Date(paymentDates.currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setPaymentDates({ ...paymentDates, currentMonth: newDate });
  };

  const formatarDataRange = (startDate: Date | null, endDate: Date | null) => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    const dates: Date[] = [];
    let curr = new Date(start);
    while (curr <= end) { dates.push(new Date(curr)); curr.setDate(curr.getDate() + 1); }
    if (dates.length === 1) return `${String(dates[0].getDate()).padStart(2, '0')}/${String(dates[0].getMonth() + 1).padStart(2, '0')}/${dates[0].getFullYear()}`;
    
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

  // --- IMPRESSÃO ---
  const handlePrint = () => {
    if (!pmSubstituido.nome || !pmSubstituto.nome || !serviceDates.start) {
      setFormAlert({ title: "Campos Incompletos", message: "Preencha os nomes e selecione as datas no calendário." });
      return;
    }

    const servicoTexto = formatarDataRange(serviceDates.start, serviceDates.end);
    let pagamentoTexto = !noPagamento ? formatarDataRange(paymentDates.start, paymentDates.end) : '';
    
    if (!pagamentoTexto || pagamentoTexto.trim() === '') {
      pagamentoTexto = 'SA';
    }

    const localizacaoSede = localizacao === 'SEDE' ? 'X' : '&nbsp;';
    const localizacaoTurilandia = localizacao === 'TURILÂNDIA' ? 'X' : '&nbsp;';
    const localizacaoTuriacu = localizacao === 'TURIAÇU' ? 'X' : '&nbsp;';

    const tipo1QTU = tipoServico === '1QTU' ? 'X' : '&nbsp;';
    const tipo2QTU = tipoServico === '2QTU' ? 'X' : '&nbsp;';
    const tipo24 = tipoServico === '24H' ? 'X' : '&nbsp;';
    const tipo48 = tipoServico === '48H' ? 'X' : '&nbsp;';
    const tipo72 = tipoServico === '72H' ? 'X' : '&nbsp;';

    const brasaoUrlPrint = 'https://i.ibb.co/WvgB63VR/bras-o-pm.png';

    const win = window.open('', '_blank');
    if (!win) {
      setFormAlert({ title: "Bloqueador de Popups", message: "Por favor, permita popups para este site para que a impressão possa ser gerada." });
      return;
    }
    win.document.write(`
        <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Permuta Impressão</title>
        <style>
            body { font-family: 'Times New Roman', Times, serif; margin: 1.5cm; line-height: 1.15; font-size: 12pt; }
            .container { width: 100%; max-width: 800px; margin: 0 auto; } .text-center { text-align: center; }
            .font-bold { font-weight: bold; } p { margin: 4px 0; } .header p { margin: 2px 0; }
            .text-sm { font-size: 11pt; } .text-xs { font-size: 9pt; } .text-base { font-size: 12pt; }
        </style></head><body>
        <div class="container">
            <div class="text-center" style="line-height: 1.15; margin: 0;">
                <img src="${brasaoUrlPrint}" alt="Brasão" style="width: 90px; height: 110px; display: block; margin: 0 auto 4px;" id="brasao-print">
                <p class="font-bold" style="margin: 0;">ESTADO DO MARANHÃO</p>
                <p class="text-sm" style="margin: 0;">SECRETARIA DE SEGURANÇA PÚBLICA</p>
                <p class="text-sm" style="margin: 0;">CPA/I-5 – 10º BPM</p>
                <p class="text-sm" style="margin: 0;">10º BATALHÃO DA POLÍCIA MILITAR DO MARANHÃO</p>
                <p class="text-sm" style="margin: 0;">2ª COMPANHIA DO 10° BATALHÃO DE POLÍCIA MILITAR</p>
                <p class="text-xs" style="margin: 0;">Rua Dr. Paulo Ramos, s/nº, Centro, Santa Helena - MA, Telefax: (98) 99243-6850 - Email: 2cia10bpm@gmail.com</p>
                <p class="font-bold" style="margin-top: 2rem; margin-bottom: 0;">FORMULÁRIO DE AUTORIZAÇÃO PARA PERMUTA DE SERVIÇO</p>
            </div>
            <div class="mt-4 mb-4" style="margin-top: 1.5rem; margin-bottom: 1.5rem;">
                <p class="text-base">SEDE: ( ${localizacaoSede} )&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;DPM TURILÂNDIA: ( ${localizacaoTurilandia} )&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;DPM TURIAÇU: ( ${localizacaoTuriacu} )</p>
            </div>
            <div style="margin-bottom: 0.25rem;">
                <p class="text-base">PM SUBSTITUÍDO: ${pmSubstituido.nome.toUpperCase()} - ${pmSubstituido.id}</p>
                <p style="margin-top: 4rem;">Assinatura:________________________________________</p>
            </div>
            <div style="margin-bottom: 0.25rem; margin-top: 1.5rem;">
                <p class="text-base">PM SUBSTITUTO: ${pmSubstituto.nome.toUpperCase()} - ${pmSubstituto.id}</p>
                <p style="margin-top: 4rem;">Assinatura:________________________________________</p>
            </div>
            <div class="mb-2" style="margin-top: 1.5rem;">
                <p class="text-base">Data do serviço permutado: ${servicoTexto}</p>
                <p class="text-base">Data do pagamento do serviço: ${pagamentoTexto}</p>
            </div>
            <div class="mb-4" style="text-align: left; margin-left: 20px; margin-top: 1rem;">
                <p class="text-base">( ${tipo1QTU} ) 1º QTU - ( ${tipo2QTU} ) 2º QTU - ( ${tipo24} ) 24 Horas - ( ${tipo48} ) 48 Horas - ( ${tipo72} ) 72 Horas</p>
            </div>
            <div class="text-center" style="margin-top: 2rem;">
                <p class="text-base" style="margin: 0;">AUTORIZO A PERMUTA ENTRE OS POLICIAIS MILITARES ACIMA RELACIONADOS: ( &nbsp; ) Sim &nbsp; ( &nbsp; ) Não</p>
                <p class="text-base" style="margin-top: 3rem; margin-bottom: 0;">_____________________________________________________</p>
                <p class="text-base" style="margin-top: 0.2rem; margin-bottom: 0;">${comandante.toUpperCase()}</p>
                <p class="text-sm" style="margin-top: 0;">COMANDANTE DA 2°CP/10°BPM</p>
            </div>
            <script>
                window.onload = function() {
                    var img = document.getElementById('brasao-print');
                    if(img && img.complete) {
                        setTimeout(window.print, 200);
                    } else if(img) {
                        img.onload = function() { setTimeout(window.print, 200); };
                        img.onerror = function() { setTimeout(window.print, 200); }; 
                    } else {
                        setTimeout(window.print, 200);
                    }
                }
            </script>
        </div></body></html>
    `);
    win.document.close();
  };

  const renderCalendar = (state: CalendarState, setState: React.Dispatch<React.SetStateAction<CalendarState>>) => {
    const month = state.currentMonth.getMonth();
    const year = state.currentMonth.getFullYear();
    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);
    const days = [];
    for(let i=0; i<first; i++) days.push(<div key={'e'+i}/>);
    for(let i=1; i<=last; i++) {
      const d = new Date(year, month, i);
      const isPast = d < today;
      const isSel = !!((state.start && d.getTime() === state.start.getTime()) || (state.end && d.getTime() === state.end.getTime()));
      const inR = !!(state.start && state.end && d > state.start && d < state.end);
      days.push(
        <div key={i} onClick={() => {
          if(isPast) return;
          let s = state.start, e = state.end;
          if(!s || (s && e)) { s = d; e = null; } else { e = d; if(e < s) [s, e] = [e, s]; if(Math.ceil(Math.abs(e.getTime()-s.getTime())/86400000) > 2) { setFormAlert({title: "Limite", message: "Máximo 3 dias permitidos."}); s = d; e = null; }}
          setState({...state, start: s, end: e});
        }} className={`calendar-day-btn ${isPast ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-blue-100'} ${isSel ? 'bg-blue-600 text-white font-bold' : ''} ${inR ? 'bg-blue-100 text-blue-800' : ''}`}>{i}</div>
      );
    }
    return days;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#483D8B] flex items-center justify-center p-4">
        <div className="text-white text-lg font-bold animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-10 flex flex-col items-center">
      {formAlert && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
            <h3 className="text-xl font-bold mb-4">{formAlert.title}</h3>
            <p className="text-gray-600 mb-6">{formAlert.message}</p>
            <button onClick={() => setFormAlert(null)} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold">OK</button>
          </div>
        </div>
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Icon name="lock" /> Administração</h3>
            <input type="password" placeholder="Senha Padrão" className="w-full p-4 border rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-blue-500" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => setShowAdminLogin(false)} className="flex-1 py-3 border rounded-2xl font-bold text-gray-400 text-sm">Voltar</button>
              <button onClick={() => { if(loginPassword === ADMIN_PASSWORD) { setIsAdminMode(true); setShowAdminLogin(false); setLoginPassword(""); } else { setFormAlert({title:"Erro", message:"Senha incorreta."}); } }} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm">Entrar</button>
            </div>
          </div>
        </div>
      )}

      {isAdminMode && (
        <div className="fixed inset-0 bg-black/60 z-[160] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Icon name="settings" className="text-blue-600" /> Militares da Unidade
              </h2>
              <button onClick={() => setIsAdminMode(false)} className="p-2 hover:bg-gray-100 rounded-full"><Icon name="x" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
              {isOfflineMode && (
                <div className="p-4 bg-yellow-50 border border-yellow-100 text-yellow-800 text-xs rounded-xl mb-2">
                  <strong>Aviso:</strong> Conexão Firebase falhou. Mudanças visíveis apenas até recarregar a página.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <input id="nM" placeholder="Nome do PM" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800" />
                <input id="iM" placeholder="ID/Matrícula" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800" />
                <button onClick={() => {
                  const nMEl = document.getElementById('nM') as HTMLInputElement | null;
                  const iMEl = document.getElementById('iM') as HTMLInputElement | null;
                  const n = nMEl?.value || ''; 
                  const i = iMEl?.value || '';
                  if(n && i) { 
                    addMilitarLocal(n, i); 
                    if(nMEl) nMEl.value=''; 
                    if(iMEl) iMEl.value=''; 
                  }
                }} className="bg-blue-600 text-white rounded-xl font-bold py-2 hover:bg-blue-700 transition-colors flex justify-center items-center"><Icon name="plus" className="inline mr-1"/> Add</button>
              </div>
              <div className="space-y-2">
                {militares.map((m, index) => (
                  <div key={m.idDoc} className="flex justify-between items-center p-4 border rounded-2xl hover:bg-gray-50 transition-colors">
                    {editingId === m.idDoc ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 mr-2">
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="p-2 border rounded-lg text-sm bg-white text-gray-800" />
                        <input value={editIdMilitar} onChange={(e) => setEditIdMilitar(e.target.value)} className="p-2 border rounded-lg text-sm bg-white text-gray-800" />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm">{m.nome}</p>
                        <p className="text-xs text-gray-500">ID: {m.idMilitar}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      {editingId === m.idDoc ? (
                        <button onClick={saveEdit} className="text-green-600 p-2 hover:bg-green-100 rounded-lg" title="Salvar"><Icon name="save" size={18}/></button>
                      ) : (
                        <button onClick={() => startEdit(m)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg" title="Editar"><Icon name="pen" size={16}/></button>
                      )}
                      
                      <div className="flex flex-col">
                        <button onClick={() => moveUp(index)} disabled={index === 0} className={`p-1 ${index===0 ? 'text-gray-300' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'} rounded`}><Icon name="arrowUp" size={12}/></button>
                        <button onClick={() => moveDown(index)} disabled={index === militares.length - 1} className={`p-1 ${index===militares.length-1 ? 'text-gray-300' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'} rounded`}><Icon name="arrowDown" size={12}/></button>
                      </div>

                      {m.idDoc && (
                        <button onClick={() => deleteMilitarLocal(m.idDoc!)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg ml-1" title="Excluir"><Icon name="trash" size={18}/></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden">
        <header className="p-8 md:p-12 text-center border-b bg-gray-50 relative">
          <button onClick={() => setShowAdminLogin(true)} className="absolute top-6 right-6 text-gray-300 hover:text-blue-600 transition-colors"><Icon name="settings" /></button>
          <img src="https://i.ibb.co/990DrMgQ/imagem-2026-04-29-112907685-removebg-preview.png" className="h-20 mx-auto mb-6" alt="Logo" />
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">2ª COMPANHIA</h1>
          <p className="text-[10px] text-gray-500 font-bold mb-8 uppercase tracking-[0.2em]">DPM DE TURIAÇU</p>
          <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tighter text-center">Permuta de Serviço</h2>
          <div className="flex justify-center">
            <select value={localizacao} onChange={e => setLocalizacao(e.target.value)} className="w-full max-w-xs p-4 border-2 border-gray-100 rounded-2xl text-center font-bold text-lg outline-none focus:border-blue-500 bg-white text-gray-800 cursor-pointer shadow-sm">
              <option>TURIAÇU</option><option>SEDE</option><option>TURILÂNDIA</option>
            </select>
          </div>
        </header>

        <main className="p-6 md:p-12 space-y-12 text-gray-800">
          <div className="grid md:grid-cols-2 gap-10">
            <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="font-bold text-blue-800 text-[10px] uppercase tracking-widest mb-6 text-center">1. PM SUBSTITUÍDO</h3>
              <select className="w-full p-4 bg-white border border-gray-200 rounded-2xl mb-5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500" value={pmSubstituido.nome} onChange={e => { const m = militares.find(x => x.nome === e.target.value); setPmSubstituido({nome: e.target.value, id: m ? m.idMilitar : ""}); }}>
                <option value="">Selecione o militar...</option>
                {militares.map(m => <option key={m.idDoc} value={m.nome || "Militar sem nome"}>{m.nome || "Militar sem nome"}</option>)}
              </select>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 tracking-widest uppercase">ID:</span>
                <input className="w-full p-4 pl-12 bg-white border border-gray-100 rounded-2xl font-bold text-gray-500 shadow-inner outline-none" readOnly value={pmSubstituido.id} placeholder="---" />
              </div>
            </div>
            <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="font-bold text-blue-800 text-[10px] uppercase tracking-widest mb-6 text-center">2. PM SUBSTITUTO</h3>
              <select className="w-full p-4 bg-white border border-gray-200 rounded-2xl mb-5 font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500" value={pmSubstituto.nome} onChange={e => { const m = militares.find(x => x.nome === e.target.value); setPmSubstituto({nome: e.target.value, id: m ? m.idMilitar : ""}); }}>
                <option value="">Selecione o militar...</option>
                {militares.map(m => <option key={m.idDoc} value={m.nome || "Militar sem nome"}>{m.nome || "Militar sem nome"}</option>)}
              </select>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 tracking-widest uppercase">ID:</span>
                <input className="w-full p-4 pl-12 bg-white border border-gray-100 rounded-2xl font-bold text-gray-500 shadow-inner outline-none" readOnly value={pmSubstituto.id} placeholder="---" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
            <h3 className="font-bold text-blue-800 text-[10px] uppercase tracking-widest mb-8 text-center">3. DATAS DA PERMUTA</h3>
            <div className="grid lg:grid-cols-2 gap-12">
              <div>
                <label className="font-bold text-gray-700 text-xs block mb-3 ml-2">Serviço Permutado</label>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6 px-2 text-gray-800">
                    <button onClick={handlePrevMonthService}><Icon name="chevronLeft" size={18}/></button>
                    <span className="font-black text-[10px] uppercase tracking-widest">{serviceDates.currentMonth.toLocaleString('pt-BR', {month:'long', year:'numeric'})}</span>
                    <button onClick={handleNextMonthService}><Icon name="chevronRight" size={18}/></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-gray-300 mb-3 uppercase">
                    {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i) => <div key={i}>{d}</div>)}
                  </div>
                  <div className="calendar-grid gap-1">{renderCalendar(serviceDates, setServiceDates)}</div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-3 px-2">
                  <span className="font-bold text-gray-700 text-xs">Pagamento</span>
                  <label className="flex items-center gap-2 text-[9px] font-black cursor-pointer text-gray-400 uppercase tracking-tighter">
                    <input type="checkbox" checked={noPagamento} onChange={e => setNoPagamento(e.target.checked)} className="rounded-sm text-blue-600 border-gray-300 focus:ring-0" />
                    Não há pagamento
                  </label>
                </div>
                {!noPagamento ? (
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6 px-2 text-gray-800">
                      <button onClick={handlePrevMonthPayment}><Icon name="chevronLeft" size={18}/></button>
                      <span className="font-black text-[10px] uppercase tracking-widest">{paymentDates.currentMonth.toLocaleString('pt-BR', {month:'long', year:'numeric'})}</span>
                      <button onClick={handleNextMonthPayment}><Icon name="chevronRight" size={18}/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-gray-300 mb-3 uppercase">
                      {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i) => <div key={i}>{d}</div>)}
                    </div>
                    <div className="calendar-grid gap-1">{renderCalendar(paymentDates, setPaymentDates)}</div>
                  </div>
                ) : <div className="h-56 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-300 font-bold italic text-sm text-center px-6">Permuta simples (sem devolução imediata)</div>}
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="font-bold text-gray-700 text-xs block mb-1 ml-2">Duração do Serviço</label>
                  <p className="text-[10px] text-gray-400 ml-2">Selecione o turno ou a carga horária correspondente.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: '1QTU', label: '1º QTU (Dia)' },
                    { id: '2QTU', label: '2º QTU (Noite)' },
                    { id: '24H', label: '24 Horas' },
                    { id: '48H', label: '48 Horas' },
                    { id: '72H', label: '72 Horas' }
                  ].map(op => (
                    <label key={op.id} className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${tipoServico === op.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white text-gray-500 hover:border-blue-200'}`}>
                      <input type="radio" name="tipoServico" value={op.id} checked={tipoServico === op.id} onChange={e => setTipoServico(e.target.value)} className="hidden" />
                      {op.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-100 text-blue-700 text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest">Editável</div>
            <h3 className="font-bold text-blue-800 text-[10px] uppercase tracking-widest mb-4 text-center">4. COMANDANTE AUTORIZADOR</h3>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400">
                <Icon name="pen" size={18}/>
              </span>
              <input 
                className="w-full p-4 pl-12 bg-white border-2 border-blue-200 rounded-2xl font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all hover:border-blue-300" 
                value={comandante} 
                onChange={e => setComandante(e.target.value)} 
                placeholder="Digite o nome e posto do Comandante"
              />
            </div>
            <p className="text-center text-[10px] text-blue-500 mt-3 font-medium">Clique no campo acima para alterar o comandante que assinará a permuta.</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-10 border-t border-gray-100">
            <button onClick={handlePrint} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-blue-700 text-white px-12 py-5 rounded-[2.2rem] font-black shadow-xl hover:bg-blue-800 transform hover:-translate-y-1 transition-all active:scale-95"><Icon name="check" size={24}/> CONCLUIR E IMPRIMIR</button>
            <button onClick={() => window.open('https://sso.acesso.gov.br/login', '_blank')} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gray-100 text-gray-700 px-10 py-5 rounded-[2.2rem] font-bold hover:bg-gray-200 transform hover:-translate-y-1 transition-all active:scale-95"><Icon name="pen" size={20}/> IR AO GOV.BR</button>
            <a href="https://projetobo.github.io/portal-2CIA/home.html" className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white border-2 border-gray-100 text-gray-500 px-10 py-5 rounded-[2.2rem] font-bold hover:bg-gray-50 transform hover:-translate-y-1 transition-all active:scale-95"><Icon name="home" size={20}/> INÍCIO</a>
          </div>
        </main>
      </div>
      <footer className="text-center mt-12 text-white/30 text-[10px] font-black uppercase tracking-[0.4em] pb-10">Portal 2ª Companhia / 10º Batalhão PMMA</footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PortalForm />
    </ErrorBoundary>
  );
}
