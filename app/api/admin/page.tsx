'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Users, ArrowLeft, Truck, Mail, FileDown, Calendar as CalendarIcon, Gauge, MapPinned } from 'lucide-react';
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
        
        // Extrai motoristas e vans únicos para preencher os selects de filtro
        const emailsUnicos = [...new Set(data.map((reg: any) => reg.user_email))];
        const listaVans = [...new Set(data.map((reg: any) => reg.numero_van))].filter(Boolean);
        
        setUsuarios(emailsUnicos as string[]);
        setVans(listaVans.sort() as string[]);
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

  // Lógica de filtragem combinada
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

  const calcularKMTotal = (lista: any[]) => {
    return lista.reduce((acc, reg) => {
      if (reg.km_inicial && reg.km_final) {
        return acc + (Number(reg.km_final) - Number(reg.km_inicial));
      }
      return acc;
    }, 0);
  };

  const exportarPDFMaster = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Relatório Consolidado de Frota e Horas', 14, 15);
    
    const colunas = ["Data", "Motorista", "Van", "Início", "Fim", "Rota", "KM Inicial", "KM Final", "Total KM"];
    const linhas = registrosFiltrados.map((reg: any) => [
      new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
      reg.user_email.split('@')[0],
      reg.numero_van || '-',
      reg.hora_inicio,
      reg.hora_fim,
      reg.rota,
      reg.km_inicial || '-',
      reg.km_final || '-',
      (reg.km_final && reg.km_inicial) ? reg.km_final - reg.km_inicial : '-'
    ]);

    autoTable(doc, {
      startY: 25,
      head: [colunas],
      body: linhas,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 7 }
    });

    doc.save(`Relatorio_Master_Frota.pdf`);
  };

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Carregando Master...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="text-blue-400" /> Painel Master de Frota
            </h1>
          </div>
          <button onClick={exportarPDFMaster} className="bg-emerald-600 hover:bg-emerald-700 p-2 px-4 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg">
            <FileDown size={18} /> Exportar Relatório Geral
          </button>
        </header>

        {/* Barra de Filtros */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Mail size={12}/> Motorista</label>
            <select value={usuarioSelecionado} onChange={e => setUsuarioSelecionado(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 outline-none">
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Truck size={12}/> Van</label>
            <select value={vanSelecionada} onChange={e => setVanSelecionada(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-300 outline-none">
              <option value="">Todas</option>
              {vans.map(v => <option key={v} value={v}>Van {v}</option>)}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><CalendarIcon size={12}/> Período</label>
            <div className="flex items-center gap-2">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm w-full text-slate-300" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm w-full text-slate-300" />
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
            <span className="text-slate-400 text-sm">KM Total Rodado (Filtro)</span>
            <span className="text-2xl font-bold text-emerald-400">{calcularKMTotal(registrosFiltrados)} KM</span>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
            <span className="text-slate-400 text-sm">Total de Viagens</span>
            <span className="text-2xl font-bold text-white">{registrosFiltrados.length}</span>
          </div>
        </div>

        {/* Tabela com Todas as Colunas Pedidas */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Motorista</th>
                  <th className="p-4">Van</th>
                  <th className="p-4">Início</th>
                  <th className="p-4">Fim</th>
                  <th className="p-4">Rota/Obs</th>
                  <th className="p-4 text-center">KM Inicial</th>
                  <th className="p-4 text-center">KM Final</th>
                  <th className="p-4 text-center">KM Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {registrosFiltrados.map((reg: any) => (
                  <tr key={reg.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 whitespace-nowrap">{new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td className="p-4 font-bold text-slate-200">{reg.user_email.split('@')[0]}</td>
                    <td className="p-4"><span className="bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded border border-blue-800">V-{reg.numero_van}</span></td>
                    <td className="p-4 font-mono">{reg.hora_inicio}</td>
                    <td className="p-4 font-mono">{reg.hora_fim}</td>
                    <td className="p-4 max-w-[150px] truncate" title={reg.rota}>{reg.rota}</td>
                    <td className="p-4 text-center text-slate-400">{reg.km_inicial || '-'}</td>
                    <td className="p-4 text-center text-slate-400">{reg.km_final || '-'}</td>
                    <td className="p-4 text-center font-bold text-emerald-500">
                      { (reg.km_final && reg.km_inicial) ? (reg.km_final - reg.km_inicial) : '-' }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}