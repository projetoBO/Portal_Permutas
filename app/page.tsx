'use strict';

"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Check, 
  Pencil, 
  Plus,  
  Trash2, 
  X, 
  Lock, 
  ShieldCheck,
  LayoutGrid,
  ExternalLink,
  Smartphone,
  Printer,
  Calendar,
  Clock,
  User,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { getFirebase } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc,
  writeBatch
} from 'firebase/firestore';

interface Militar {
  id: string;
  nome: string;
  idMilitar: string;
  idDoc?: string;
}

const LISTA_INICIAL: Militar[] = [
  { id: "1", nome: "Sgt PM 626/14 Coriolano", idMilitar: "" },
  { id: "2", nome: "Cb PM 1042/14 Mário Neto", idMilitar: "1042/14" },
  { id: "3", nome: "Sd PM 2055/18 Silva", idMilitar: "2055/18" },
  { id: "4", nome: "Sgt PM 1022/12 Santos", idMilitar: "" },
  { id: "5", nome: "Sd PM 3088/20 Oliveira", idMilitar: "3088/20" },
  { id: "6", nome: "Cb PM 4044/15 Costa", idMilitar: "" }
];

export default function Home() {
  // --- ESTADO LOCAL ---
  const [militares, setMilitares] = useState<Militar[]>(LISTA_INICIAL);
  const [isOfflineMode, setIsOfflineMode] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [formAlert, setFormAlert] = useState<{ title: string; message: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // --- CONTROLES DE FORMULÁRIO DE MILITAR (ADMIN) ---
  const [newMilitarNome, setNewMilitarNome] = useState("");
  const [newMilitarId, setNewMilitarId] = useState("");
  const [editingMilitarId, setEditingMilitarId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIdMilitar, setEditIdMilitar] = useState("");

  // --- DADOS DA PERMUTA ---
  const [pmSubstituido, setPmSubstituido] = useState({ nome: "", id: "", servicoData: "", servicoHorario: "" });
  const [pmSubstituto, setPmSubstituto] = useState({ nome: "", id: "", servicoData: "", servicoHorario: "" });
  const [localizacao, setLocalizacao] = useState("Santa Helena - MA");

  // --- ESTADO DE INSTALAÇÃO MÓVEL E ASSOCIAÇÃO DE ID ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // --- CARREGAR DADOS E SINCRONIZAR COM O FIREBASE ---
  const syncLocalToFirebase = async (firestoreInstance: any, listToSync: Militar[]) => {
    try {
      const batch = writeBatch(firestoreInstance);
      listToSync.forEach((m) => {
        const docRef = doc(collection(firestoreInstance, 'militares_lista'), m.id);
        batch.set(docRef, {
          id: m.id,
          nome: m.nome,
          idMilitar: m.idMilitar
        });
      });
      await batch.commit();
    } catch (err) {
      console.error("Erro ao sincronizar lista inicial com o Firebase:", err);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portal_militares_lista');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMilitares(parsed);
          }
        } catch (e) {
          console.warn("Falha ao recuperar militares do localStorage:", e);
        }
      }
    }

    const { db } = getFirebase();
    if (!db) {
      setIsOfflineMode(true);
      return;
    }

    try {
      const q = query(collection(db, 'militares_lista'), orderBy('nome', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Militar[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({ 
            id: docSnap.id,
            nome: data.nome || "", 
            idMilitar: data.idMilitar || "" 
          });
        });
        
        if (list.length > 0) {
          setMilitares(list);
          localStorage.setItem('portal_militares_lista', JSON.stringify(list));
          setIsOfflineMode(false);
        } else {
          setIsOfflineMode(false);
          syncLocalToFirebase(db, LISTA_INICIAL);
        }
      }, (error) => {
        console.warn("Erro ao ouvir Firestore (possivelmente sem regras de permissão configuradas):", error);
        setIsOfflineMode(true);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Falha ao configurar listener do Firebase:", e);
      setIsOfflineMode(true);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn("Prompt de instalação falhou:", err);
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  // Verificações para salvar ID/Matrícula quando estiver em branco
  const militarOriginalSubstituido = militares.find(m => m.nome === pmSubstituido.nome);
  const isOriginalSubstituidoBlank = militarOriginalSubstituido && 
    (!militarOriginalSubstituido.idMilitar || militarOriginalSubstituido.idMilitar === "N/A" || militarOriginalSubstituido.idMilitar.trim() === "");
  const canSaveSubstituidoId = isOriginalSubstituidoBlank && 
    pmSubstituido.id && pmSubstituido.id.trim() !== "" && pmSubstituido.id !== "N/A";

  const militarOriginalSubstituto = militares.find(m => m.nome === pmSubstituto.nome);
  const isOriginalSubstitutoBlank = militarOriginalSubstituto && 
    (!militarOriginalSubstituto.idMilitar || militarOriginalSubstituto.idMilitar === "N/A" || militarOriginalSubstituto.idMilitar.trim() === "");
  const canSaveSubstitutoId = isOriginalSubstitutoBlank && 
    pmSubstituto.id && pmSubstituto.id.trim() !== "" && pmSubstituto.id !== "N/A";

  const saveMilitarId = async (militarNome: string, novoId: string) => {
    const targetMilitar = militares.find(m => m.nome === militarNome);
    if (!targetMilitar) return;

    const dataToUpdate = { idMilitar: novoId };
    
    // Atualiza o estado local primeiro (atualização otimista)
    const updatedList = militares.map(m => m.nome === militarNome ? { ...m, ...dataToUpdate } : m);
    setMilitares(updatedList);
    localStorage.setItem('portal_militares_lista', JSON.stringify(updatedList));

    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        await updateDoc(doc(db, 'militares_lista', targetMilitar.id), dataToUpdate);
        setFormAlert({
          title: "Sincronizado Online",
          message: `O ID/Matrícula do militar ${militarNome} foi salvo e sincronizado no Firebase.`
        });
      } catch (err) {
        console.error("Erro ao salvar ID no Firebase:", err);
        setFormAlert({
          title: "ID Salvo Localmente",
          message: `O ID/Matrícula de ${militarNome} foi salvo localmente como ${novoId}, mas falhou ao sincronizar online.`
        });
      }
    } else {
      setFormAlert({
        title: "ID Salvo com Sucesso",
        message: `O ID/Matrícula de ${militarNome} foi salvo localmente como ${novoId}.`
      });
    }
  };

  // Quando o militar substituído é alterado no select, atualiza o ID correspondente
  const handleSubstituidoChange = (nome: string) => {
    const militar = militares.find(m => m.nome === nome);
    setPmSubstituido({
      ...pmSubstituido,
      nome,
      id: militar?.idMilitar || ""
    });
  };

  // Quando o militar substituto é alterado no select, atualiza o ID correspondente
  const handleSubstitutoChange = (nome: string) => {
    const militar = militares.find(m => m.nome === nome);
    setPmSubstituto({
      ...pmSubstituto,
      nome,
      id: militar?.idMilitar || ""
    });
  };

  // Gerenciamento de Admin
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "10BPM2CIA") {
      setIsAdminMode(true);
      setShowAdminLogin(false);
      setAdminPassword("");
      setAdminError("");
    } else {
      setAdminError("Senha administrativa incorreta!");
    }
  };

  const handleAddMilitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilitarNome.trim()) return;

    const idUnico = Date.now().toString();
    const novo: Militar = {
      id: idUnico,
      nome: newMilitarNome.trim(),
      idMilitar: newMilitarId.trim()
    };

    const atualizada = [...militares, novo];
    setMilitares(atualizada);
    localStorage.setItem('portal_militares_lista', JSON.stringify(atualizada));
    setNewMilitarNome("");
    setNewMilitarId("");

    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        await setDoc(doc(db, 'militares_lista', idUnico), {
          id: idUnico,
          nome: novo.nome,
          idMilitar: novo.idMilitar
        });
      } catch (err) {
        console.error("Erro ao adicionar militar no Firebase:", err);
      }
    }
    
    setFormAlert({
      title: "Militar Adicionado",
      message: `${novo.nome} foi inserido com sucesso na escala.`
    });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    const atualizada = militares.map(m => {
      if (m.id === id) {
        return { ...m, nome: editName.trim(), idMilitar: editIdMilitar.trim() };
      }
      return m;
    });
    setMilitares(atualizada);
    localStorage.setItem('portal_militares_lista', JSON.stringify(atualizada));
    setEditingMilitarId(null);

    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        await updateDoc(doc(db, 'militares_lista', id), {
          nome: editName.trim(),
          idMilitar: editIdMilitar.trim()
        });
      } catch (err) {
        console.error("Erro ao atualizar militar no Firebase:", err);
      }
    }
  };

  const handleDeleteMilitar = async (id: string) => {
    const atualizada = militares.filter(m => m.id !== id);
    setMilitares(atualizada);
    localStorage.setItem('portal_militares_lista', JSON.stringify(atualizada));

    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        await deleteDoc(doc(db, 'militares_lista', id));
      } catch (err) {
        console.error("Erro ao excluir militar no Firebase:", err);
      }
    }
  };

  const handleResetList = () => {
    setShowResetConfirm(true);
  };

  const confirmResetList = async () => {
    setShowResetConfirm(false);
    setMilitares(LISTA_INICIAL);
    localStorage.setItem('portal_militares_lista', JSON.stringify(LISTA_INICIAL));

    const { db } = getFirebase();
    if (db && !isOfflineMode) {
      try {
        const batch = writeBatch(db);
        militares.forEach((m) => {
          batch.delete(doc(db, 'militares_lista', m.id));
        });
        LISTA_INICIAL.forEach((m) => {
          batch.set(doc(db, 'militares_lista', m.id), {
            id: m.id,
            nome: m.nome,
            idMilitar: m.idMilitar
          });
        });
        await batch.commit();
      } catch (err) {
        console.error("Erro ao resetar lista no Firebase:", err);
      }
    }
  };

  // Simulação de geração de PDF / Impressão física formatada
  const handlePrint = () => {
    if (!pmSubstituido.nome || !pmSubstituto.nome) {
      setFormAlert({
        title: "Campos Incompletos",
        message: "Por favor, selecione ambos os militares para gerar o formulário."
      });
      return;
    }
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white pb-12">
      {/* HEADER DE IMPRESSÃO - OCULTO NA TELA */}
      <div className="hidden print:block p-8 bg-white text-black font-sans leading-relaxed text-sm">
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-lg font-bold uppercase">Estado do Maranhão</h1>
          <h2 className="text-md font-bold uppercase">Polícia Militar do Maranhão</h2>
          <h3 className="text-sm font-semibold uppercase">10º Batalhão de Polícia Militar - Pinheiro/MA</h3>
          <h4 className="text-xs uppercase">2ª Companhia - {localizacao}</h4>
          <h5 className="text-lg font-bold mt-4 uppercase tracking-wider">Formulário Oficial de Permuta de Escala</h5>
        </div>

        <p className="mb-4">
          Eu, <strong className="border-b border-black px-1">{pmSubstituido.nome}</strong>, ID/Matrícula nº <strong className="border-b border-black px-1">{pmSubstituido.id || "________"}</strong>, solicito permuta de serviço regulamentar do dia <strong>{pmSubstituido.servicoData ? new Date(pmSubstituido.servicoData).toLocaleDateString('pt-BR') : "____/____/______"}</strong>, no horário de <strong>{pmSubstituido.servicoHorario || "______"}</strong>.
        </p>

        <p className="mb-6">
          Para tanto, indico como meu substituto voluntário o militar <strong className="border-b border-black px-1">{pmSubstituto.nome}</strong>, ID/Matrícula nº <strong className="border-b border-black px-1">{pmSubstituto.id || "________"}</strong>, que assumirá o respectivo serviço no dia <strong>{pmSubstituto.servicoData ? new Date(pmSubstituto.servicoData).toLocaleDateString('pt-BR') : "____/____/______"}</strong>, no horário de <strong>{pmSubstituto.servicoHorario || "______"}</strong>.
        </p>

        <div className="mt-16 grid grid-cols-2 gap-12 text-center">
          <div>
            <div className="border-t border-black pt-2 mx-4"></div>
            <p className="text-xs font-bold uppercase">{pmSubstituido.nome || "Militar Substituído"}</p>
            <p className="text-[10px] text-gray-600">Substituído (Assinatura)</p>
          </div>
          <div>
            <div className="border-t border-black pt-2 mx-4"></div>
            <p className="text-xs font-bold uppercase">{pmSubstituto.nome || "Militar Substituto"}</p>
            <p className="text-[10px] text-gray-600">Substituto (Assinatura)</p>
          </div>
        </div>

        <div className="mt-20 border-t border-gray-400 pt-4">
          <p className="text-xs font-bold uppercase text-center mb-12">Despacho do Comando da Companhia / Seção de Pessoal</p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="border border-black p-4 h-24">
              [ &nbsp; ] DEFERIDO &nbsp; &nbsp; &nbsp; [ &nbsp; ] INDEFERIDO
            </div>
            <div className="border border-black p-4 flex flex-col justify-end text-center">
              <div className="border-t border-black pt-1 mx-8"></div>
              <p className="font-bold">Comandante da 2ª Cia / Seção de Pessoal</p>
            </div>
          </div>
        </div>
      </div>

      {/* INTERFACE DO USUÁRIO */}
      <div className="flex flex-col lg:flex-row min-h-screen print:hidden">
        {/* SIDEBAR */}
        <aside className="w-full lg:w-80 bg-slate-900/40 lg:border-r border-slate-800/60 p-6 flex flex-col shrink-0">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-md shadow-lg shadow-indigo-500/20">
              PM
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white leading-tight">Portal de Permutas</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">2ª CP / 10º BPM MA</p>
            </div>
          </div>

          <nav className="space-y-1.5 flex-1">
            <div className="w-full p-3.5 bg-slate-800/40 rounded-2xl text-slate-200 flex items-center gap-3 text-sm font-semibold border border-slate-800">
              <LayoutGrid size={18} className="text-indigo-400" />
              Portal de Permuta
            </div>

            {/* INSTALAR EM DISPOSITIVOS MÓVEIS */}
            <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl mt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-600/20 border border-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 shrink-0">
                  <Smartphone size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white leading-normal">Instalar no Celular</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Use como um aplicativo no seu aparelho móvel.</p>
                  <button 
                    onClick={handleInstallApp}
                    className="mt-3.5 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                  >
                    Instalar Agora
                  </button>
                </div>
              </div>
            </div>
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-800/40">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/40">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modo Offline Ativo</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                As alterações realizadas nesta escala serão salvas no seu navegador para uso contínuo.
              </p>
            </div>
          </div>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 p-6 lg:p-10 max-w-5xl mx-auto w-full">
          {/* CABEÇALHO */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/30 border border-slate-800/40 p-6 rounded-[2rem] mb-8">
            <div>
              <h2 className="text-2xl font-black text-white font-display">Olá, Policial Militar</h2>
              <p className="text-slate-400 text-sm mt-0.5">Formulário Oficial de Permuta de Escala</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="relative shrink-0">
                <select 
                  value={localizacao} 
                  onChange={(e) => setLocalizacao(e.target.value)}
                  className="bg-slate-800/80 border border-slate-700/80 p-2.5 pr-8 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="Santa Helena - MA">Santa Helena - MA</option>
                  <option value="Pinheiro - MA">Pinheiro - MA</option>
                  <option value="Turiaçu - MA">Turiaçu - MA</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/80 p-2.5 rounded-xl text-xs font-semibold text-slate-300 flex items-center gap-1.5 animate-pulse">
                <ShieldCheck size={14} className="text-blue-400" />
                10º BPM MA
              </div>

              <button 
                onClick={() => setShowAdminLogin(true)}
                className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-400 hover:text-white p-2.5 rounded-xl text-xs cursor-pointer transition-all flex items-center justify-center shrink-0 hover:border-blue-500/50"
                title="Gerenciar Escala"
              >
                <Settings size={18} className="hover:rotate-45 transition-transform" />
              </button>
            </div>
          </header>

          {/* DADOS DA PERMUTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* MILITAR SUBSTITUÍDO */}
            <div className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-[50px] rounded-full"></div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-500/10 border border-red-500/10 rounded-2xl flex items-center justify-center text-red-400">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Militar Substituído</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Quem vai sair de folga</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Nome:
                  </span>
                  <select 
                    value={pmSubstituido.nome} 
                    onChange={(e) => handleSubstituidoChange(e.target.value)}
                    className="w-full p-3 pl-16 bg-slate-950/50 border border-slate-800/80 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                  >
                    <option value="">Selecione o militar...</option>
                    {militares.map((m, idx) => (
                      <option key={`substituido-${m.id || idx}-${idx}`} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    ID/Matrícula:
                  </span>
                  <input 
                    className={`w-full p-3 pl-24 bg-slate-950/50 border border-slate-800/80 rounded-xl font-bold text-slate-400 shadow-inner text-sm focus:outline-none ${canSaveSubstituidoId ? 'pr-24' : ''}`} 
                    value={pmSubstituido.id} 
                    onChange={(e) => setPmSubstituido({ ...pmSubstituido, id: e.target.value })} 
                    placeholder="---" 
                  />
                  {canSaveSubstituidoId && (
                    <button
                      onClick={() => saveMilitarId(pmSubstituido.nome, pmSubstituido.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                      title="Salvar ID para este militar permanentemente"
                    >
                      Salvar ID
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Data:</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="date" 
                        value={pmSubstituido.servicoData} 
                        onChange={(e) => setPmSubstituido({ ...pmSubstituido, servicoData: e.target.value })}
                        className="w-full p-2.5 pl-9 bg-slate-950/50 border border-slate-800/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Horário:</label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Ex: 08:00 às 18:00" 
                        value={pmSubstituido.servicoHorario} 
                        onChange={(e) => setPmSubstituido({ ...pmSubstituido, servicoHorario: e.target.value })}
                        className="w-full p-2.5 pl-9 bg-slate-950/50 border border-slate-800/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MILITAR SUBSTITUTO */}
            <div className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-[50px] rounded-full"></div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Militar Substituto</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Quem assume a escala</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    Nome:
                  </span>
                  <select 
                    value={pmSubstituto.nome} 
                    onChange={(e) => handleSubstitutoChange(e.target.value)}
                    className="w-full p-3 pl-16 bg-slate-950/50 border border-slate-800/80 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                  >
                    <option value="">Selecione o militar...</option>
                    {militares.map((m, idx) => (
                      <option key={`substituto-${m.id || idx}-${idx}`} value={m.nome}>{m.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    ID/Matrícula:
                  </span>
                  <input 
                    className={`w-full p-3 pl-24 bg-slate-950/50 border border-slate-800/80 rounded-xl font-bold text-slate-400 shadow-inner text-sm focus:outline-none ${canSaveSubstitutoId ? 'pr-24' : ''}`} 
                    value={pmSubstituto.id} 
                    onChange={(e) => setPmSubstituto({ ...pmSubstituto, id: e.target.value })} 
                    placeholder="---" 
                  />
                  {canSaveSubstitutoId && (
                    <button
                      onClick={() => saveMilitarId(pmSubstituto.nome, pmSubstituto.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[9px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                      title="Salvar ID para este militar permanentemente"
                    >
                      Salvar ID
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Data:</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="date" 
                        value={pmSubstituto.servicoData} 
                        onChange={(e) => setPmSubstituto({ ...pmSubstituto, servicoData: e.target.value })}
                        className="w-full p-2.5 pl-9 bg-slate-950/50 border border-slate-800/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Horário:</label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Ex: 08:00 às 18:00" 
                        value={pmSubstituto.servicoHorario} 
                        onChange={(e) => setPmSubstituto({ ...pmSubstituto, servicoHorario: e.target.value })}
                        className="w-full p-2.5 pl-9 bg-slate-950/50 border border-slate-800/80 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SESSÃO DE VISUALIZAÇÃO E CONCLUSÃO */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-slate-800/60 p-8 rounded-[2.5rem] shadow-xl mb-8 relative overflow-hidden">
            <div className="absolute -right-24 -bottom-24 w-60 h-60 bg-indigo-500/10 blur-[80px] rounded-full"></div>
            
            <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
              <div className="space-y-2 text-center lg:text-left">
                <h3 className="text-xl font-black text-white font-display">Tudo pronto para imprimir?</h3>
                <p className="text-slate-300 text-sm max-w-2xl">
                  Ao concluir, um formulário em PDF será gerado. Certifique-se de recolher as assinaturas dos militares.
                </p>
                
                {/* Resumo visual do formulário */}
                <div className="mt-4 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl max-w-lg inline-block text-left text-xs text-slate-400 space-y-1">
                  <div>• <strong className="text-slate-200">Localização:</strong> {localizacao}</div>
                  <div>• <strong className="text-slate-200">Militar Substituído:</strong> {pmSubstituido.nome || "Não selecionado"}</div>
                  <div>• <strong className="text-slate-200">Militar Substituto:</strong> {pmSubstituto.nome || "Não selecionado"}</div>
                </div>
              </div>

              <button 
                onClick={handlePrint}
                className="w-full lg:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 text-sm shrink-0 cursor-pointer"
              >
                <Printer size={18} />
                Gerar PDF / Imprimir
              </button>
            </div>
          </div>

          {/* SEÇÃO ADMIN: GERENCIAR MILITARES (ESCALA) */}
          {isAdminMode && (
            <div className="bg-slate-900/30 border border-slate-800/50 p-8 rounded-[2.5rem] shadow-xl mb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Gerenciamento de Militares</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Gerencie os policias cadastrados</p>
                </div>
                <button 
                  onClick={() => setIsAdminMode(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Sair do Painel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Adicionar Militar */}
                <form onSubmit={handleAddMilitar} className="bg-slate-950/60 p-6 rounded-[1.8rem] border border-slate-800/80 space-y-4">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest border-b border-slate-800/60 pb-2">Novo Policial</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nome completo:</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Sgt PM Coriolano" 
                      value={newMilitarNome}
                      onChange={(e) => setNewMilitarNome(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">ID/Matrícula (Opcional):</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 626/14" 
                      value={newMilitarId}
                      onChange={(e) => setNewMilitarId(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                  >
                    Adicionar Militar
                  </button>
                </form>

                {/* Lista e Edição */}
                <div className="md:col-span-2 bg-slate-950/60 p-6 rounded-[1.8rem] border border-slate-800/80 flex flex-col h-[300px]">
                  <div className="flex justify-between items-center border-b border-slate-800/60 pb-2 mb-3">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">Militares Cadastrados</h4>
                    <button 
                      onClick={handleResetList}
                      className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={10} /> Restaurar Padrão
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {militares.map((m, idx) => (
                      <div key={`cadastrado-${m.id || idx}-${idx}`} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
                        {editingMilitarId === m.id ? (
                          <div className="flex-1 flex gap-2">
                            <input 
                              type="text" 
                              value={editName} 
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 p-1 bg-slate-950 border border-slate-800 rounded text-slate-200" 
                            />
                            <input 
                              type="text" 
                              value={editIdMilitar} 
                              onChange={(e) => setEditIdMilitar(e.target.value)}
                              className="w-24 p-1 bg-slate-950 border border-slate-800 rounded text-slate-200 placeholder-slate-600" 
                              placeholder="ID"
                            />
                            <button 
                              onClick={() => handleSaveEdit(m.id)} 
                              className="p-1 bg-emerald-600 rounded text-white hover:bg-emerald-500 cursor-pointer"
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingMilitarId(null)} 
                              className="p-1 bg-slate-800 rounded text-slate-300 hover:bg-slate-700 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-200 truncate">{m.nome}</p>
                              <p className="text-[10px] text-slate-500">
                                ID/Matrícula: {m.idMilitar || <span className="text-red-500/70 italic font-bold">N/A</span>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => {
                                  setEditingMilitarId(m.id);
                                  setEditName(m.nome);
                                  setEditIdMilitar(m.idMilitar);
                                }}
                                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                                title="Editar Policial"
                              >
                                <Pencil size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteMilitar(m.id)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                title="Excluir Policial"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RODAPÉ DO WORKSPACE */}
          <footer className="py-6 border-t border-slate-800/30 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-600 text-[10px] font-black uppercase tracking-wider">
            <span>Portal 2ª Companhia / 10º Batalhão PMMA</span>
            <button 
              onClick={() => window.open('https://sso.acesso.gov.br/login', '_blank')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900/50 hover:bg-slate-800/60 border border-slate-800 rounded-xl text-slate-400 hover:text-blue-400 font-bold transition-all text-[9px] tracking-widest cursor-pointer uppercase normal-case"
            >
              <ExternalLink size={12} className="text-blue-400" />
              Acessar GOV.BR
            </button>
          </footer>
        </main>
      </div>

      {/* --- MODAL DE AUTENTICAÇÃO ADMINISTRATIVA --- */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2.2rem] shadow-2xl max-w-sm w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                  <Lock size={16} className="text-indigo-400" /> Painel de Escala
                </h3>
                <button 
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminPassword("");
                    setAdminError("");
                  }}
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Insira a senha de administrador do 10º BPM para habilitar a gestão de militares na escala.
                </p>
                <div>
                  <input 
                    type="password" 
                    placeholder="Senha Administrativa" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                  />
                  {adminError && (
                    <p className="text-[10px] text-red-400 font-bold mt-1.5 flex items-center gap-1">
                      <AlertTriangle size={10} /> {adminError}
                    </p>
                  )}
                </div>
                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
                >
                  Acessar Painel
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE GUIA DE INSTALAÇÃO MÓVEL --- */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2.2rem] shadow-2xl max-w-sm w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                  <Smartphone className="text-indigo-400" /> Como Instalar o App
                </h3>
                <button 
                  onClick={() => setShowInstallGuide(false)}
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <div>
                  <p className="font-bold text-white mb-1">📱 No iPhone / iPad (Safari):</p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                    <li>Toque no ícone de <strong className="text-indigo-400">Compartilhar</strong> (quadrado com seta para cima).</li>
                    <li>Role para baixo e selecione <strong className="text-white">Adicionar à Tela de Início</strong>.</li>
                    <li>Confirme tocando em <strong className="text-indigo-400">Adicionar</strong> no canto superior direito.</li>
                  </ol>
                </div>
                
                <div className="border-t border-slate-800 pt-3">
                  <p className="font-bold text-white mb-1">🤖 No Android (Chrome / Firefox):</p>
                  <ol className="list-decimal pl-4 space-y-1 text-slate-400">
                    <li>Toque no menu de <strong className="text-indigo-400">três pontos</strong> no canto superior direito.</li>
                    <li>Selecione <strong className="text-white">Adicionar à Tela inicial</strong> ou <strong className="text-white">Instalar aplicativo</strong>.</li>
                    <li>Confirme a instalação na tela.</li>
                  </ol>
                </div>
              </div>

              <button 
                onClick={() => setShowInstallGuide(false)}
                className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
              >
                Entendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE ALERTAS GERAIS --- */}
      <AnimatePresence>
        {formAlert && (
          <div className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2.2rem] shadow-2xl max-w-sm w-full"
            >
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="text-indigo-400" size={20} />
                <h3 className="text-sm font-bold text-white">{formAlert.title}</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {formAlert.message}
              </p>
              <button 
                onClick={() => setFormAlert(null)}
                className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
              >
                Ok
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL DE CONFIRMAÇÃO DE RESET --- */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/75 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-[2.2rem] shadow-2xl max-w-sm w-full"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="text-red-400" size={20} />
                <h3 className="text-sm font-bold text-white">Restaurar Lista Padrão?</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Esta ação irá restaurar os policiais para a lista original de militares do batalhão e remover os adicionados recentemente. Deseja continuar?
              </p>
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-700 active:scale-95 transition-all cursor-pointer border border-slate-700"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmResetList}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-500 active:scale-95 transition-all cursor-pointer"
                >
                  Restaurar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
