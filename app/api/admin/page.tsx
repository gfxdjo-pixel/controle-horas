'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Users, ArrowLeft, Truck, Search, Mail, Filter, FileDown, Calendar as CalendarIcon, Gauge } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const { data: session } = useSession();
  const [todosRegistros, setTodosRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [vans, setVans] = useState<string[]>([]);
  
  // Estados dos Filtros
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [vanSelecionada, setVanSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [loading, setLoading] = useState(true);

  const carregarDadosAdmin = async () => {
    try {
      const res = await fetch('/api/admin/horas');
      if (res.ok) {
        const data = await res.json();
        setTodosRegistros(data);
        
        // Extrai motoristas únicos
        const emailsUnicos = [...new Set(data.map((reg: any) => reg.user_email))];
        setUsuarios(emailsUnicos as string[]);

        // Extrai vans únicas e remove valores vazios
        const listaVans = [...new Set(data.map((reg: any) => reg.numero_van))].filter(Boolean);
        setVans(listaVans as string[]);
      }
    } catch (err) {
      console.error("Erro ao carregar dados admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosAdmin();
  }, []);

  // Lógica de filtragem (Van + Usuário + Data)
  const registrosFiltrados = todosRegistros.filter((reg: any) => {
    const matchUsuario = usuarioSelecionado ? reg.user_email === usuarioSelecionado : true;
    const matchVan = vanSelecionada ? String(reg.numero_van) === String(vanSelecionada) : true;
    
    let matchData = true;
    if (dataInicio && dataFim) {
      const dataReg = reg.data.substring(0, 10);
      matchData = dataReg >= dataInicio && dataReg <= dataFim;
    }

    return matchUsuario && matchVan && matchData;
  });

  const formatarMinutos = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const calcularTotalHoras = (lista: any[]) => {
    return lista.reduce((acc, reg) => {
      const [h1, m1] = reg.hora_inicio.split(':').map(Number);
      const [h2, m2] = reg.hora_fim.split(':').map(Number);
      let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (mins < 0) mins += 24 * 60;
      return acc + mins;
    }, 0);
  };

  const exportarPDFMaster = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text('Relatório Consolidado de Frota', 14, 15);
    
    const colunas = ["Data", "Motorista", "Van", "KM Inicial", "KM Final", "Total KM", "Horário", "Rota"];
    const linhas = registrosFiltrados.map((reg: any) => [
      new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
      reg.user_email.split('@')[0],
      reg.numero_van || '-',
      reg.km_inicial || '-',
      reg.km_final || '-',
      (reg.km_final && reg.km_inicial) ? reg.km_final - reg.km_inicial : '-',
      `${reg.hora_inicio} - ${reg.hora_fim}`,
      reg.rota
    ]);

    autoTable(doc, {
      startY: 25,
      head: [colunas],
      body: linhas,
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 }
    });

    doc.save(`Relatorio_Frota_Master.pdf`);
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-mono">Carregando Master...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="text-blue-400" /> Painel de Controle de Frota
            </h1>
          </div>
          <button onClick={exportarPDFMaster} className="bg-emerald-600 hover:bg-emerald-700 p-2 px-4 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition-all">
            <FileDown size={18} /> Exportar PDF
          </button>
        </header>

        {/* Barra de Filtros Completa */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-6 shadow-xl">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Mail size={12}/> Motorista</label>
            <select value={usuarioSelecionado} onChange={e => setUsuarioSelecionado(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os Motoristas</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Truck size={12}/> Número da Van</label>
            <select value={vanSelecionada} onChange={e => setVanSelecionada(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas as Vans</option>
              {vans.map(v => <option key={v} value={v}>Van {v}</option>)}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><CalendarIcon size={12}/> Período de Data</label>
            <div className="flex items-center gap-2">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm w-full text-slate-300" />
              <span className="text-slate-600">até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm w-full text-slate-300" />
            </div>
          </div>
        </div>

        {/* Resumo Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total de Horas (Filtrado)</p>
            <h3 className="text-3xl font-black text-blue-400">{formatarMinutos(calcularTotalHoras(registrosFiltrados))}</h3>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
            <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total de Registros</p>
            <h3 className="text-3xl font-black text-white">{registrosFiltrados.length}</h3>
          </div>
        </div>

        {/* Tabela Master com todas as informações preenchidas */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-slate-400 font-mono text-[10px] uppercase">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Motorista</th>
                  <th className="p-4">Van</th>
                  <th className="p-4 text-center">KM Inicial</th>
                  <th className="p-4 text-center">KM Final</th>
                  <th className="p-4 text-center">Total KM</th>
                  <th className="p-4 text-right">Início/Fim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {registrosFiltrados.length === 0 ? (
                  <tr><td colSpan={7} className="p-20 text-center text-slate-600">Nenhum dado encontrado para os filtros selecionados.</td></tr>
                ) : (
                  registrosFiltrados.map((reg: any) => (
                    <tr key={reg.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 text-slate-400 font-medium">{new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                      <td className="p-4 font-bold text-slate-100">{reg.user_email.split('@')[0]}</td>
                      <td className="p-4"><span className="bg-blue-900/40 text-blue-400 border border-blue-900 px-2 py-0.5 rounded text-[10px] font-bold">VAN {reg.numero_van}</span></td>
                      <td className="p-4 text-center text-slate-500">{reg.km_inicial || '-'}</td>
                      <td className="p-4 text-center text-slate-500">{reg.km_final || '-'}</td>
                      <td className="p-4 text-center font-black text-emerald-500">
                        { (reg.km_final && reg.km_inicial) ? `${reg.km_final - reg.km_inicial} km` : '-' }
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-mono text-blue-400 text-xs">{reg.hora_inicio} — {reg.hora_fim}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px] ml-auto">{reg.rota}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}