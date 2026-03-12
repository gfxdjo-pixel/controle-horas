'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Users, ArrowLeft, BarChart3, Search, Mail, Calendar as CalendarIcon, Filter, FileDown } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const { data: session } = useSession();
  const [todosRegistros, setTodosRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [loading, setLoading] = useState(true);
  
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

  const registrosFiltrados = todosRegistros.filter((reg: any) => {
    const pertenceAoUsuario = reg.user_email === usuarioSelecionado;
    if (!usuarioSelecionado || !pertenceAoUsuario) return false;

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

  const exportarPDFAdmin = () => {
    const doc = new jsPDF();
    const totalMins = calcularTotal(registrosFiltrados);
    
    doc.setFontSize(18);
    doc.text('Relatório Administrativo de Horas', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Colaborador: ${usuarioSelecionado}`, 14, 30);
    doc.text(`Período: ${dataInicio || 'Início'} até ${dataFim || 'Fim'}`, 14, 36);
    doc.text(`Total Acumulado: ${formatarMinutos(totalMins)}`, 14, 42);

    const colunas = ["Data", "Rota", "Início", "Fim", "Duração"];
    const linhas = registrosFiltrados.map((reg: any) => [
      new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
      reg.rota,
      reg.hora_inicio,
      reg.hora_fim,
      formatarMinutos(calcularTotal([reg]))
    ]);

    autoTable(doc, {
      startY: 50,
      head: [colunas],
      body: linhas,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }, // Cor slate-800 para combinar com o admin
    });

    doc.save(`Relatorio_Admin_${usuarioSelecionado}.pdf`);
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando Master...</div>;

  if (session?.user?.email !== 'gfxdjo@gmail.com') {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Acesso negado.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="text-blue-400" /> Gestão Master
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
              <h2 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-widest">Colaboradores</h2>
              <div className="space-y-2">
                {usuarios.map(email => (
                  <button
                    key={email}
                    onClick={() => setUsuarioSelecionado(email)}
                    className={`w-full text-left p-3 rounded-xl text-sm border ${
                      usuarioSelecionado === email ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400'
                    }`}
                  >
                    {email}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3 space-y-6">
            {usuarioSelecionado && (
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-wrap items-center gap-4">
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
                <span className="text-slate-600">até</span>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
                
                <button 
                  onClick={exportarPDFAdmin}
                  className="ml-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                >
                  <FileDown size={18} /> Exportar PDF do Usuário
                </button>
              </div>
            )}

            {usuarioSelecionado ? (
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/50 text-slate-400">
                    <tr>
                      <th className="p-4 uppercase text-[10px]">Data</th>
                      <th className="p-4 uppercase text-[10px]">Rota</th>
                      <th className="p-4 text-right uppercase text-[10px]">Horários</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {registrosFiltrados.map((reg: any) => (
                      <tr key={reg.id} className="hover:bg-slate-700/20">
                        <td className="p-4 text-slate-400">{new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                        <td className="p-4 font-medium text-slate-200">{reg.rota}</td>
                        <td className="p-4 text-right">
                          <span className="bg-slate-900 text-blue-400 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-900/30">
                            {reg.hora_inicio} — {reg.hora_fim}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-600">
                Selecione um colaborador para gerenciar.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}