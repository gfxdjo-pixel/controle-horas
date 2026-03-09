return (
    <div className="bg-red-500 text-white p-10 text-center text-4xl">
        TESTE DE CARREGAMENTO (ESTOU FUNCIONANDO!)
    </div>
);
'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { Clock, Route, Calendar, BarChart3, Pencil, Trash2, X, LogOut } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession(); // Verifica quem está logado na hora
  
  const [registros, setRegistros] = useState([]);
  const [form, setForm] = useState({ data: '', hora_inicio: '', hora_fim: '', rota: '' });
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
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setRegistros(data || []);
    }
  };

  useEffect(() => { 
    if (session) {
      carregarDados(); 
    }
  }, [filtro, session]); // Só carrega os dados se a pessoa estiver logada

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
      rota: reg.rota 
    });
    setEditandoId(reg.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setForm({ data: '', hora_inicio: '', hora_fim: '', rota: '' });
    setEditandoId(null);
  };

  const deletarRegistro = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta rota permanentemente?')) {
      await fetch(`/api/horas?id=${id}`, { method: 'DELETE' });
      carregarDados();
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
    return `${h}h ${m}m`;
  };

  const registrosDoMes = registros.filter((reg: any) => reg.data && reg.data.startsWith(mesResumo));
  const resumoPorDia = registrosDoMes.reduce((acc: any, reg: any) => {
    const mins = obterMinutos(reg.hora_inicio, reg.hora_fim);
    if (!acc[reg.data]) acc[reg.data] = 0;
    acc[reg.data] += mins;
    return acc;
  }, {});

  const diasOrdenados = Object.entries(resumoPorDia).sort((a: any, b: any) => a[0].localeCompare(b[0]));
  const totalMinutosMes = diasOrdenados.reduce((total, [, mins]: any) => total + mins, 0);

  // --- BARREIRAS DE ACESSO --- //

  // 1. Tela de Carregamento
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
        Carregando painel...
      </div>
    );
  }

  // 2. Tela de Login (Se não estiver logado)
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md w-full">
          <Clock className="text-blue-600 mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acesso Restrito</h1>
          <p className="text-slate-500 mb-8">Faça login com seu e-mail para registrar as rotas.</p>
          <button 
            onClick={() => signIn('google')} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  // 3. Sistema Principal (Se passou pelo login)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="text-blue-600" size={28} />
            <h1 className="text-2xl font-bold tracking-tight">Registro de Horas Extras</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-600 hidden sm:block">
              Olá, {session?.user?.name?.split(' ')[0]}
            </span>
            <button onClick={() => signOut()} className="text-slate-500 hover:text-red-600 flex items-center gap-2 text-sm bg-slate-50 px-4 py-2 rounded-lg transition-colors border border-slate-100">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>

        <section className={`p-6 rounded-2xl shadow-sm border transition-colors ${editandoId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-semibold ${editandoId ? 'text-amber-800' : 'text-slate-700'}`}>
              {editandoId ? 'Editar Registro' : 'Lançar Nova Rota'}
            </h2>
            {editandoId && (
              <button type="button" onClick={cancelarEdicao} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                <X size={14} /> Cancelar edição
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="text-sm font-medium text-slate-500">Data</label>
              <input type="date" required value={form.data} onChange={e => setForm({...form, data: e.target.value})} className="mt-1 w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            
            <div className="md:col-span-1 grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-slate-500">Início</label>
                <input type="time" required value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} className="mt-1 w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Fim</label>
                <input type="time" required value={form.hora_fim} onChange={e => setForm({...form, hora_fim: e.target.value})} className="mt-1 w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-500">Rota / Observação</label>
              <div className="relative mt-1">
                <Route className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="text" required value={form.rota} onChange={e => setForm({...form, rota: e.target.value})} className="w-full pl-10 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Ex: Transporte Fretado - Rota Sul" />
              </div>
            </div>
            <div className="md:col-span-4 flex justify-end mt-2">
              <button disabled={loading} className={`font-medium py-2 px-6 rounded-lg transition-colors text-white ${editandoId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {loading ? 'Salvando...' : editandoId ? 'Atualizar Registro' : 'Registrar'}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2 text-slate-700">
              <BarChart3 className="text-emerald-500" size={24} />
              <h2 className="text-lg font-semibold">Fechamento Mensal</h2>
            </div>
            <input type="month" value={mesResumo} onChange={e => setMesResumo(e.target.value)} className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-center items-center text-center">
              <span className="text-sm font-medium text-slate-500 mb-1">Total de Horas no Mês</span>
              <span className="text-4xl font-bold text-emerald-600">{formatarMinutosParaHoras(totalMinutosMes)}</span>
            </div>
            
            <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
              {diasOrdenados.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhuma hora extra registrada neste mês.</p>
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

        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-lg font-semibold text-slate-700">Histórico Completo</h2>
            
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <Calendar size={16} className="text-slate-400" />
              <input type="date" value={filtro.inicio} onChange={e => setFiltro({...filtro, inicio: e.target.value})} className="text-sm bg-transparent outline-none" />
              <span className="text-slate-400 text-sm">até</span>
              <input type="date" value={filtro.fim} onChange={e => setFiltro({...filtro, fim: e.target.value})} className="text-sm bg-transparent outline-none" />
            </div>
          </div>

          <div className="space-y-3">
            {registros.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Nenhum registro encontrado.</p>
            ) : (
              registros.map((reg: any) => (
                <div key={reg.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="bg-blue-50 text-blue-700 p-2 rounded-lg flex flex-col items-center justify-center min-w-[90px]">
                      <span className="text-xs font-medium text-blue-500">{reg.hora_inicio} às {reg.hora_fim}</span>
                      <span className="font-bold">{calcularDuracao(reg.hora_inicio, reg.hora_fim)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{reg.rota}</p>
                      <p className="text-sm text-slate-500">{formatarData(reg.data)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button onClick={() => iniciarEdicao(reg)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => deletarRegistro(reg.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                      <Trash2 size={18} />
                    </button>
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
