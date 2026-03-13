'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { Clock, Route, Calendar, BarChart3, Pencil, Trash2, X, LogOut, FileDown, Users, Truck, Gauge } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Link from 'next/link';

export default function Home() {
  const { data: session, status } = useSession(); 
  
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

  const carregarDados = async () => {
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
  };

  useEffect(() => { 
    if (session) {
      carregarDados(); 
    }
  }, [filtro, session]);

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

  // FUNÇÃO DE EXCLUSÃO CORRIGIDA
  const deletarRegistro = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta rota permanentemente?')) {
      try {
        const res = await fetch(`/api/horas?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
          carregarDados(); // Recarrega a lista após deletar
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

  if (status === "loading") return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">Carregando painel...</div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md w-full">
          <Clock className="text-blue-600 mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h1>
          <p className="text-slate-500 mb-8">Faça login com seu e-mail para registrar as rotas.</p>
          <button onClick={() => signIn('google')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors">Entrar com Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="text-blue-600" size={28} />
            <h1 className="text-2xl font-bold tracking-tight">Registro de Horas Extras</h1>
          </div>
          <div className="flex items-center gap-4">
            {session?.user?.email === 'gfxdjo@gmail.com' && (
              <Link href="/admin" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-all shadow-md">
                <Users size={16} /> Painel Master
              </Link>
            )}
            <span className="text-sm font-medium text-slate-600 hidden sm:block">Olá, {session?.user?.name?.split(' ')[0]}</span>
            <button onClick={() => signOut()} className="text-slate-500 hover:text-red-600 flex items-center gap-2 text-sm bg-slate-50 px-4 py-2 rounded-lg transition-colors border border-slate-100">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>

        {/* FORMULÁRIO */}
        <section className={`p-6 rounded-2xl shadow-sm border transition-colors ${editandoId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${editandoId ? 'text-amber-800' : 'text-slate-700'}`}>{editandoId ? 'Editar Registro' : 'Lançar Nova Rota'}</h2>
            {editandoId && (
              <button type="button" onClick={cancelarEdicao} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                <X size={14} /> Cancelar edição
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
              <input type="date" required value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="mt-1 w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Van</label>
              <div className="relative mt-1">
                <Truck className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="text" required value={form.numero_van} onChange={e => setForm({...form, numero_van: e.target.value})} className="w-full pl-10 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Ex: 05" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Início</label>
                <input type="time" required value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} className="mt-1 w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Fim</label>
                <input type="time" required value={form.hora_fim} onChange={e => setForm({...form, hora_fim: e.target.value})} className="mt-1 w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Rota / Obs</label>
              <input type="text" required value={form.rota} onChange={e => setForm({...form, rota: e.target.value})} className="mt-1 w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Ex: Rota Sul" />
            </div>
            <div className="md:col-span-2 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase text-blue-600">KM Inicial</label>
                <div className="relative mt-1">
                  <Gauge className="absolute left-3 top-2.5 text-blue-400" size={18} />
                  <input type="number" value={form.km_inicial} onChange={e => setForm({...form, km_inicial: e.target.value})} className="w-full pl-10 p-2 border border-blue-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase text-emerald-600">KM Final</label>
                <div className="relative mt-1">
                  <Gauge className="absolute left-3 top-2.5 text-emerald-400" size={18} />
                  <input type="number" value={form.km_final} onChange={e => setForm({...form, km_final: e.target.value})} className="w-full pl-10 p-2 border border-emerald-100 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>
            </div>
            <div className="md:col-span-4 flex justify-end mt-2">
              <button disabled={loading} className={`font-bold py-2 px-8 rounded-lg text-white shadow-md ${editandoId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {loading ? 'Salvando...' : editandoId ? 'Atualizar Registro' : 'Registrar Rota'}
              </button>
            </div>
          </form>
        </section>

        {/* FECHAMENTO MENSAL */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><BarChart3 className="text-emerald-500" size={24} /> Fechamento Mensal</h2>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input type="month" value={mesResumo} onChange={e => setMesResumo(e.target.value)} className="p-2 border rounded-lg text-sm bg-white" />
              <button onClick={exportarPDF} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                <FileDown size={18} /> Exportar PDF
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center items-center text-center">
              <span className="text-sm font-medium text-slate-500">Total de Horas no Mês</span>
              <span className="text-4xl font-bold text-emerald-600">{formatarMinutosParaHoras(totalMinutosMes)}</span>
            </div>
            <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
              {diasOrdenados.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhuma hora registrada.</p>
              ) : (
                diasOrdenados.map(([data, mins]: any) => (
                  <div key={data} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg text-sm">
                    <span className="font-medium text-slate-600">{formatarData(data)}</span>
                    <span className="font-semibold text-slate-800 bg-slate-100 px-3 py-1 rounded-md">{formatarMinutosParaHoras(mins)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* HISTÓRICO */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-700 mb-6">Histórico Recente</h2>
          <div className="space-y-3">
            {registros.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nenhum registro encontrado.</p>
            ) : (
              registros.map((reg: any) => (
                <div key={reg.id} className="flex flex-col sm:flex-row justify-between items-center p-4 hover:bg-slate-50 border border-slate-100 rounded-xl gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="bg-blue-50 text-blue-700 p-3 rounded-lg flex flex-col items-center justify-center min-w-[100px]">
                      <span className="text-[10px] font-bold text-blue-500 uppercase">Van {reg.numero_van}</span>
                      <span className="font-bold text-lg">{calcularDuracao(reg.hora_inicio, reg.hora_fim)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                         <p className="font-bold text-slate-800">{reg.rota}</p>
                         {reg.km_final && reg.km_inicial && (
                           <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                             {Number(reg.km_final) - Number(reg.km_inicial)} KM
                           </span>
                         )}
                      </div>
                      <p className="text-xs text-slate-500">{formatarData(reg.data)} • {reg.hora_inicio} às {reg.hora_fim}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => iniciarEdicao(reg)} className="p-2 text-slate-400 hover:text-amber-600"><Pencil size={18} /></button>
                    <button onClick={() => deletarRegistro(reg.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
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