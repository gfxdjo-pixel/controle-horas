'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Users, ArrowLeft, BarChart3, Search, Mail, Calendar as CalendarIcon, Filter } from 'lucide-react';
import Link from 'next/link';

export default function AdminPanel() {
  const { data: session } = useSession();
  const [todosRegistros, setTodosRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Filtros de data para o Admin
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const carregarDadosAdmin = async () => {
      try {
        const res = await fetch('/api/admin/horas');
        if (res.ok) {
          const data = await res.json();
          setTodosRegistros(data);
          const emailsUnicos = [...new Set(data.map((reg: any) => reg.user_email))];
          setUsuarios(emailsUnicos as string[]);
        }
      } catch (err) {
        console.error("Erro ao carregar dados admin:", err);
      } finally {
        setLoading(false);
      }
    };
    carregarDadosAdmin();
  }, []);

  // Lógica de filtragem: por usuário E por data
  const registrosFiltrados = todosRegistros.filter((reg: any) => {
    const pertenceAoUsuario = reg.user_email === usuarioSelecionado;
    
    if (!usuarioSelecionado) return false;
    if (!pertenceAoUsuario) return false;

    // Se as datas estiverem preenchidas, filtra pelo período
    if (dataInicio && dataFim) {
      const dataReg = reg.data.substring(0, 10);
      return dataReg >= dataInicio && dataReg <= dataFim;
    }

    return true;
  });

  const formatarMinutos = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const calcularTotal = (lista: any[]) => {
    return lista.reduce((acc, reg) => {
      const [h1, m1] = reg.hora_inicio.split(':').map(Number);
      const [h2, m2] = reg.hora_fim.split(':').map(Number);
      let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (mins < 0) mins += 24 * 60;
      return acc + mins;
    }, 0);
  };

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-mono">Carregando Master...</div>;

  if (session?.user?.email !== 'gfxdjo@gmail.com') {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Acesso negado.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="text-blue-400" size={28} /> Gestão Master
              </h1>
              <p className="text-slate-400 text-sm">Monitoramento de equipe em tempo real</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Coluna da Esquerda: Usuários */}
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-xl">
              <h2 className="text-xs font-black text-slate-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                <Mail size={14} /> Colaboradores
              </h2>
              <div className="space-y-2">
                {usuarios.map(email => (
                  <button
                    key={email}
                    onClick={() => setUsuarioSelecionado(email)}
                    className={`w-full text-left p-3 rounded-xl text-sm transition-all border ${
                      usuarioSelecionado === email 
                      ? 'bg-blue-600 border-blue-400 text-white shadow-lg' 
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {email.split('@')[0]}
                    <span className="block text-[10px] opacity-50">{email}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Coluna da Direita: Dados e Filtro de Data */}
          <main className="lg:col-span-3 space-y-6">
            {!usuarioSelecionado ? (
              <div className="bg-slate-800/30 border-2 border-dashed border-slate-800 rounded-3xl p-20 text-center">
                <Search size={48} className="mx-auto text-slate-700 mb-4" />
                <h3 className="text-slate-500 font-medium italic">Selecione um colaborador para gerenciar os dados</h3>
              </div>
            ) : (
              <>
                {/* Barra de Filtro de Data */}
                <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-300 text-sm font-bold">
                    <Filter size={16} className="text-blue-400" /> Filtrar Período:
                  </div>
                  <input 
                    type="date" 
                    value={dataInicio} 
                    onChange={e => setDataInicio(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-600">até</span>
                  <input 
                    type="date" 
                    value={dataFim} 
                    onChange={e => setDataFim(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {(dataInicio || dataFim) && (
                    <button 
                      onClick={limparFiltros}
                      className="text-xs text-red-400 hover:underline ml-auto"
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl shadow-xl border border-blue-500/20">
                    <p className="text-blue-100 text-xs font-bold uppercase mb-1">Horas no Período</p>
                    <h3 className="text-4xl font-black">{formatarMinutos(calcularTotal(registrosFiltrados))}</h3>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total de Rotas</p>
                      <h3 className="text-3xl font-bold">{registrosFiltrados.length}</h3>
                    </div>
                    <BarChart3 size={40} className="text-slate-700" />
                  </div>
                </div>

                {/* Tabela de Registros */}
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                  <div className="p-4 border-b border-slate-700 bg-slate-700/20 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-300">Detalhamento de Rotas</h4>
                    <span className="text-[10px] bg-slate-900 px-2 py-1 rounded text-slate-500">{usuarioSelecionado}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-900/50 text-slate-400">
                        <tr>
                          <th className="p-4 font-semibold uppercase text-[10px]">Data</th>
                          <th className="p-4 font-semibold uppercase text-[10px]">Descrição da Rota</th>
                          <th className="p-4 text-right font-semibold uppercase text-[10px]">Horários</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {registrosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-10 text-center text-slate-500 italic">Nenhum registro encontrado para este período.</td>
                          </tr>
                        ) : (
                          registrosFiltrados.map((reg: any) => (
                            <tr key={reg.id} className="hover:bg-slate-700/20 transition-colors">
                              <td className="p-4 text-slate-400 font-medium">
                                {new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                              </td>
                              <td className="p-4 font-medium text-slate-200">{reg.rota}</td>
                              <td className="p-4 text-right">
                                <span className="bg-slate-900 text-blue-400 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-900/30">
                                  {reg.hora_inicio} — {reg.hora_fim}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}