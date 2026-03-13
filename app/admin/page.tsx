'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Users, ArrowLeft, Truck, Mail, FileDown, Calendar as CalendarIcon, Gauge } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const { data: session } = useSession();
  
  // Estados com tipagem correta para evitar erros de "never"
  const [todosRegistros, setTodosRegistros] = useState<any[]>([]);
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
        const listaSegura = Array.isArray(data) ? data : [];
        setTodosRegistros(listaSegura);
        
        // PEGA OS MOTORISTAS: Extrai os e-mails únicos de quem adicionou informações
        const emailsUnicos = [...new Set(listaSegura.map((reg: any) => reg.user_email))].filter(Boolean) as string[];
        setUsuarios(emailsUnicos.sort());

        // PEGA AS VANS: Extrai os números de van únicos
        const listaVans = [...new Set(listaSegura.map((reg: any) => reg.numero_van))].filter(Boolean) as string[];
        setVans(listaVans.sort());
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

  // Lógica de filtragem combinada (Motorista + Van + Período)
  const registrosFiltrados = todosRegistros.filter((reg: any) => {
    // Filtra pelo e-mail do usuário que adicionou a info
    const matchUsuario = usuarioSelecionado ? reg.user_email === usuarioSelecionado : true;
    const matchVan = vanSelecionada ? String(reg.numero_van) === String(vanSelecionada) : true;
    
    let matchData = true;
    if (dataInicio && dataFim && reg.data) {
      const dataReg = reg.data.substring(0, 10);
      matchData = dataReg >= dataInicio && dataReg <= dataFim;
    }

    return matchUsuario && matchVan && matchData;
  });

  const exportarPDFMaster = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text('Relatório Consolidado de Frota e Horas', 14, 15);
      
      const colunas = ["Data", "Motorista", "Van", "Início", "Fim", "Rota", "KM Inicial", "KM Final", "Total KM"];
      const linhas = registrosFiltrados.map((reg: any) => [
        reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
        reg.user_email ? reg.user_email.split('@')[0] : 'S/I',
        reg.numero_van || '-',
        reg.hora_inicio || '-',
        reg.hora_fim || '-',
        reg.rota || '-',
        reg.km_inicial || '-',
        reg.km_final || '-',
        (reg.km_final && reg.km_inicial) ? (Number(reg.km_final) - Number(reg.km_inicial)) : '-'
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
    } catch (e) {
      alert("Erro ao gerar PDF.");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-mono">Carregando Master...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="text-blue-400" size={28} /> Gestão Master
            </h1>
          </div>
          <button onClick={exportarPDFMaster} className="bg-emerald-600 hover:bg-emerald-700 p-2 px-6 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition-all">
            <FileDown size={18} /> Exportar Relatório Geral
          </button>
        </header>

        {/* Filtros */}
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-6 shadow-xl">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Mail size={12}/> Motorista (E-mail)</label>
            <select 
              value={usuarioSelecionado} 
              onChange={e => setUsuarioSelecionado(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos os Motoristas</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Truck size={12}/> Van</label>
            <select 
              value={vanSelecionada} 
              onChange={e => setVanSelecionada(e.target.value)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-300 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas as Vans</option>
              {vans.map(v => <option key={v} value={v}>Van {v}</option>)}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><CalendarIcon size={12}/> Período de Data</label>
            <div className="flex items-center gap-2">
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm w-full text-slate-300 outline-none" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm w-full text-slate-300 outline-none" />
            </div>
          </div>
        </div>

        {/* Tabela Master */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Motorista</th>
                  <th className="p-4">Van</th>
                  <th className="p-4">Início/Fim</th>
                  <th className="p-4">Rota/Obs</th>
                  <th className="p-4 text-center">KM Ini</th>
                  <th className="p-4 text-center">KM Fim</th>
                  <th className="p-4 text-center font-bold text-emerald-500">Total KM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {registrosFiltrados.length === 0 ? (
                  <tr><td colSpan={9} className="p-20 text-center text-slate-600 italic">Nenhum dado encontrado para os filtros selecionados.</td></tr>
                ) : (
                  registrosFiltrados.map((reg: any) => (
                    <tr key={reg.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4 whitespace-nowrap">{reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                      <td className="p-4 font-bold text-slate-200">{reg.user_email ? reg.user_email.split('@')[0] : 'S/I'}</td>
                      <td className="p-4"><span className="bg-blue-900/40 text-blue-400 border border-blue-900 px-2 py-0.5 rounded text-[10px] font-bold">V-{reg.numero_van || '-'}</span></td>
                      <td className="p-4 font-mono text-slate-300">{reg.hora_inicio || '--:--'} — {reg.hora_fim || '--:--'}</td>
                      <td className="p-4 max-w-[150px] truncate text-slate-400" title={reg.rota}>{reg.rota || '-'}</td>
                      <td className="p-4 text-center text-slate-500">{reg.km_inicial || '-'}</td>
                      <td className="p-4 text-center text-slate-500">{reg.km_final || '-'}</td>
                      <td className="p-4 text-center font-bold text-emerald-500">
                        { (reg.km_final && reg.km_inicial) ? (Number(reg.km_final) - Number(reg.km_inicial)) : '-' }
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