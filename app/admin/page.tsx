'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Users, ArrowLeft, BarChart3, Search, Mail, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';

export default function AdminPanel() {
  const { data: session } = useSession();
  const [todosRegistros, setTodosRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDadosAdmin = async () => {
      try {
        const res = await fetch('/api/admin/horas');
        if (res.ok) {
          const data = await res.json();
          setTodosRegistros(data);
          const emailsUnicos = [...new Set(data.map((reg: any) => reg.user_email))];
          setUsuarios(emailsUnicos as string[]);
        } else {
          console.error("Erro na resposta da API Admin");
        }
      } catch (err) {
        console.error("Erro ao carregar dados admin:", err);
      } finally {
        setLoading(false);
      }
    };
    carregarDadosAdmin();
  }, []);

  const registrosFiltrados = usuarioSelecionado 
    ? todosRegistros.filter((r: any) => r.user_email === usuarioSelecionado)
    : [];

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

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando Master...</div>;

  // Proteção visual caso alguém force a URL sem ser admin
  if (session?.user?.email !== 'gfxdjo@gmail.com') {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Acesso negado.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="text-blue-400" size={28} /> Gestão de Equipe
              </h1>
              <p className="text-slate-400 text-sm">Monitoramento de rotas e horas extras</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-4">
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                <Mail size={14} /> Colaboradores Ativos
              </h2>
              <div className="space-y-2">
                {usuarios.length === 0 ? <p className="text-xs text-slate-600">Nenhum registro encontrado.</p> : usuarios.map(email => (
                  <button
                    key={email}
                    onClick={() => setUsuarioSelecionado(email)}
                    className={`w-full text-left p-3 rounded-xl text-sm transition-all border ${
                      usuarioSelecionado === email 
                      ? 'bg-blue-600 border-blue-400 text-white' 
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {email.split('@')[0]}
                    <span className="block text-[10px] opacity-60">{email}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            {!usuarioSelecionado ? (
              <div className="bg-slate-800/30 border-2 border-dashed border-slate-800 rounded-3xl p-20 text-center">
                <Search size={48} className="mx-auto text-slate-700 mb-4" />
                <h3 className="text-slate-500 font-medium">Selecione um colaborador à esquerda</h3>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl shadow-lg">
                    <p className="text-blue-100 text-xs font-bold uppercase mb-1">Total Geral do Período</p>
                    <h3 className="text-4xl font-black">{formatarMinutos(calcularTotal(registrosFiltrados))}</h3>
                  </div>
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase mb-1">Registros Totais</p>
                      <h3 className="text-3xl font-bold">{registrosFiltrados.length}</h3>
                    </div>
                    <CalendarIcon size={32} className="text-slate-700" />
                  </div>
                </div>

                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-700/50 text-slate-300">
                      <tr>
                        <th className="p-4">Data</th>
                        <th className="p-4">Rota / Observação</th>
                        <th className="p-4 text-right">Horário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {registrosFiltrados.map((reg: any) => (
                        <tr key={reg.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="p-4 text-slate-400">{new Date(reg.data).toLocaleDateString('pt-BR')}</td>
                          <td className="p-4 font-medium">{reg.rota}</td>
                          <td className="p-4 text-right">
                            <span className="bg-slate-900 text-blue-400 px-2 py-1 rounded font-mono border border-slate-700">
                              {reg.hora_inicio} - {reg.hora_fim}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}