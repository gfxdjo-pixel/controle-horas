'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { 
  Clock, 
  Calendar, 
  BarChart3, 
  Pencil, 
  Trash2, 
  X, 
  LogOut, 
  FileDown, 
  Users, 
  Truck, 
  Gauge, 
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';

export default function Home() {
  const { data: session, status }: any = useSession(); 
  
  const [registros, setRegistros] = useState<any[]>([]);
  const [form, setForm] = useState({ 
    data: '', 
    hora_inicio: '', 
    hora_fim: '', 
    rota: '',
    numero_van: '',
    km_inicial: '',
    km_final: ''
  });
  const [filtro, setFiltro] = useState({ inicio: '', fim: '' });
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  
  const dataAtual = new Date();
  const mesAtual = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;
  const [mesResumo, setMesResumo] = useState(mesAtual);

  // Lógica de Permissão para exibir o botão de Gestão
  const isSuperAdmin = session?.user?.email === 'gfxdjo@gmail.com';
  const isAdmin = session?.user?.role === 'admin';
  const podeAcessarGestao = isSuperAdmin || isAdmin;

  const carregarDados = useCallback(async () => {
    let url = '/api/horas';
    if (filtro.inicio && filtro.fim) {
      url += `?inicio=${filtro.inicio}&fim=${filtro.fim}`;
    }
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRegistros(data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  }, [filtro]);

  useEffect(() => { 
    if (session) {
      carregarDados(); 
    }
  }, [carregarDados, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const metodo = editandoId ? 'PUT' : 'POST';
      const corpoDaRequisicao = editandoId ? { id: editandoId, ...form } : form;

      const res = await fetch('/api/horas', {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpoDaRequisicao),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Erro ao salvar: ${errorData.error}`);
      } else {
        cancelarEdicao();
        carregarDados();
      }
    } catch (err) {
      alert("Erro de conexão ao tentar salvar.");
    }
    setLoading(false);
  };

  const iniciarEdicao = (reg: any) => {
    const dataFormatada = reg.data ? reg.data.substring(0, 10) : '';
    setForm({ 
      data: dataFormatada, 
      hora_inicio: reg.hora_inicio, 
      hora_fim: reg.hora_fim, 
      rota: reg.rota,
      numero_van: reg.numero_van || '',
      km_inicial: reg.km_inicial || '',
      km_final: reg.km_final || ''
    });
    setEditandoId(reg.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setForm({ data: '', hora_inicio: '', hora_fim: '', rota: '', numero_van: '', km_inicial: '', km_final: '' });
    setEditandoId(null);
  };

  const deletarRegistro = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta rota permanentemente?')) {
      try {
        const res = await fetch(`/api/horas?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          carregarDados();
        } else {
          alert("Erro ao excluir do servidor.");
        }
      } catch (err) {
        alert("Erro de conexão ao excluir.");
      }
    }
  };

  const obterMinutos = (inicio: string, fim: string) => {
    if (!inicio || !fim) return 0;
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fim.split(':').map(Number);
    let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins < 0) mins += 24 * 60; 
    return mins;
  };

  const calcularDuracao = (inicio: string, fim: string) => {
    const mins = obterMinutos(inicio, fim);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const formatarData = (dataIso: string) => {
    if (!dataIso) return '';
    const partes = dataIso.substring(0, 10).split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const formatarMinutosParaHoras = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const registrosDoMes = registros.filter((reg: any) => reg.data && reg.data.startsWith(mesResumo));
  const resumoPorDia = registrosDoMes.reduce((acc: any, reg: any) => {
    const mins = obterMinutos(reg.hora_inicio, reg.hora_fim);
    const dataChave = reg.data.substring(0, 10);
    if (!acc[dataChave]) acc[dataChave] = 0;
    acc[dataChave] += mins;
    return acc;
  }, {});

  const diasOrdenados = Object.entries(resumoPorDia).sort((a: any, b: any) => a[0].localeCompare(b[0]));
  const totalMinutosMes = diasOrdenados.reduce((total, [, mins]: any) => total + mins, 0);

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(18);
    doc.text('Relatório de Horas e KM', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Colaborador: ${session?.user?.name}`, 14, 30);
    doc.text(`Mês de Referência: ${mesResumo}`, 14, 36);
    doc.text(`Total de Horas: ${formatarMinutosParaHoras(totalMinutosMes)}`, 14, 42);

    const colunas = ["Data", "Van", "Início", "Fim", "Duração", "KM Inicial", "KM Final", "Rota"];
    const linhas = registrosDoMes.map((reg: any) => [
      formatarData(reg.data),
      reg.numero_van || '-',
      reg.hora_inicio,
      reg.hora_fim,
      calcularDuracao(reg.hora_inicio, reg.hora_fim),
      reg.km_inicial || '-',
      reg.km_final || '-',
      reg.rota
    ]);

    autoTable(doc, {
      startY: 50,
      head: [colunas],
      body: linhas,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 },
    });

    doc.save(`Relatorio_${session?.user?.name}_${mesResumo}.pdf`);
  };

  if (status === "loading") return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium italic">Sincronizando Master Frota...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700 shadow-2xl text-center max-w-md w-full space-y-6">
          <div className="bg-blue-600/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto border border-blue-500/30">
            <Truck className="text-blue-400" size={40} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest">Master Frota</h1>
          <p className="text-slate-400 text-sm">Acesse sua conta para registrar suas rotas e gerenciar sua jornada.</p>
          <button onClick={() => signIn('google')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95">Entrar com Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="text-blue-600" size={28} />
            <h1 className="text-2xl font-bold tracking-tight">Registro de Rotas</h1>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {podeAcessarGestao && (
              <Link href="/admin" className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wider hover:shadow-lg hover:scale-105 transition-all shadow-blue-500/20">
                <ShieldCheck size={18} /> Painel de Gestão
              </Link>
            )}
            
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Motorista:</span>
                <span className="text-sm font-bold text-slate-800">{session?.user?.name?.split(' ')[0]}</span>
            </div>

            <button onClick={() => signOut()} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all" title="Sair do Sistema">
              <LogOut size={22} />
            </button>
          </div>
        </header>

        {/* FORMULÁRIO */}
        <section className={`p-6 rounded-2xl shadow-sm border transition-all ${editandoId ? 'bg-amber-50 border-amber-200 ring-2 ring-amber-500/20' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-lg font-black uppercase tracking-tight ${editandoId ? 'text-amber-800' : 'text-slate-700'}`}>
                {editandoId ? 'Editando Registro' : 'Lançar Nova Rota'}
            </h2>
            {editandoId && (
              <button type="button" onClick={cancelarEdicao} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-xs font-bold bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                <X size={14} /> Cancelar edição
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data do Serviço</label>
              <input type="date" required value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="mt-1 w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" />
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Número da Van</label>
              <div className="relative mt-1">
                <Truck className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input type="text" required value={form.numero_van} onChange={e => setForm({...form, numero_van: e.target.value})} className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" placeholder="Ex: 05" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saída</label>
                <input type="time" required value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} className="mt-1 w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Retorno</label>
                <input type="time" required value={form.hora_fim} onChange={e => setForm({...form, hora_fim: e.target.value})} className="mt-1 w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição da Rota</label>
              <input type="text" required value={form.rota} onChange={e => setForm({...form, rota: e.target.value})} className="mt-1 w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50" placeholder="Ex: Rota Joinville Sul" />
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">KM Inicial</label>
                <div className="relative mt-1">
                  <Gauge className="absolute left-3 top-3.5 text-blue-400" size={18} />
                  <input type="number" value={form.km_inicial} onChange={e => setForm({...form, km_inicial: e.target.value})} className="w-full pl-10 p-3 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">KM Final</label>
                <div className="relative mt-1">
                  <Gauge className="absolute left-3 top-3.5 text-emerald-400" size={18} />
                  <input type="number" value={form.km_final} onChange={e => setForm({...form, km_final: e.target.value})} className="w-full pl-10 p-3 border border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/30" />
                </div>
              </div>
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button disabled={loading} className={`font-black uppercase tracking-widest py-4 px-10 rounded-xl text-white shadow-xl transition-all active:scale-95 ${editandoId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {loading ? 'Sincronizando...' : editandoId ? 'Confirmar Alteração' : 'Registrar Rota'}
              </button>
            </div>
          </form>
        </section>

        {/* FECHAMENTO MENSAL */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2"><BarChart3 className="text-emerald-500" size={24} /> Resumo Mensal</h2>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input type="month" value={mesResumo} onChange={e => setMesResumo(e.target.value)} className="p-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={exportarPDF} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 shadow-emerald-500/20">
                <FileDown size={18} /> PDF
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-8 rounded-3xl border border-slate-200 flex flex-col justify-center items-center text-center shadow-inner">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Acumulado</span>
              <span className="text-5xl font-black text-emerald-600 tracking-tighter">{formatarMinutosParaHoras(totalMinutosMes)}</span>
            </div>
            
            <div className="max-h-56 overflow-y-auto pr-3 space-y-2 custom-scrollbar">
              {diasOrdenados.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12 italic">Nenhum registro neste mês.</p>
              ) : (
                diasOrdenados.map(([data, mins]: any) => (
                  <div key={data} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-blue-200 transition-colors">
                    <span className="font-bold text-slate-600">{formatarData(data)}</span>
                    <span className="font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl text-xs">{formatarMinutosParaHoras(mins)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* HISTÓRICO */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-700 mb-8">Histórico de Atividades</h2>
          <div className="space-y-4">
            {registros.length === 0 ? (
              <p className="text-center text-slate-400 py-12 italic border-2 border-dashed border-slate-100 rounded-3xl">Clique em "Registrar Rota" para começar.</p>
            ) : (
              registros.map((reg: any) => (
                <div key={reg.id} className="flex flex-col sm:flex-row justify-between items-center p-5 hover:bg-slate-50 border border-slate-100 rounded-2xl gap-4 transition-all hover:shadow-md group">
                  <div className="flex items-center gap-5 w-full">
                    <div className="bg-blue-600 text-white p-4 rounded-2xl flex flex-col items-center justify-center min-w-[110px] shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                      <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">Van {reg.numero_van}</span>
                      <span className="font-black text-xl tracking-tighter">{calcularDuracao(reg.hora_inicio, reg.hora_fim)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                         <p className="font-black text-slate-800 uppercase tracking-tight">{reg.rota}</p>
                         {reg.km_final && reg.km_inicial && (
                           <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-widest shadow-sm">
                             {Number(reg.km_final) - Number(reg.km_inicial)} KM
                           </span>
                         )}
                      </div>
                      <p className="text-xs font-bold text-slate-400 tracking-wide uppercase">{formatarData(reg.data)} • <span className="text-blue-500">{reg.hora_inicio} ➞ {reg.hora_fim}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => iniciarEdicao(reg)} className="p-3 bg-slate-100 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all shadow-sm"><Pencil size={20} /></button>
                    <button onClick={() => deletarRegistro(reg.id)} className="p-3 bg-slate-100 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm"><Trash2 size={20} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </div>
  );
}