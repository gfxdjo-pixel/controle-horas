'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Users, ArrowLeft, Truck, Mail, FileDown, Calendar as CalendarIcon, Clock, Gauge } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const { data: session } = useSession();
  
  // Estados com tipagem <any[]> para matar o erro de "never[]"
  const [todosRegistros, setTodosRegistros] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<string[]>([]);
  const [vans, setVans] = useState<string[]>([]);
  
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [vanSelecionada, setVanSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregarDadosAdmin = async () => {
      try {
        const res = await fetch('/api/admin/horas');
        if (res.ok) {
          const data = await res.json();
          const lista = Array.isArray(data) ? data : [];
          setTodosRegistros(lista);
          
          // Extrai motoristas e vans únicos
          const u = [...new Set(lista.map((r: any) => r.user_email))].filter(Boolean) as string[];
          const v = [...new Set(lista.map((r: any) => r.numero_van))].filter(Boolean) as string[];
          setUsuarios(u.sort());
          setVans(v.sort());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    carregarDadosAdmin();
  }, []);

  // Lógica de Filtro
  const registrosFiltrados = todosRegistros.filter((reg: any) => {
    const mUsuario = usuarioSelecionado ? reg.user_email === usuarioSelecionado : true;
    const mVan = vanSelecionada ? String(reg.numero_van) === String(vanSelecionada) : true;
    let mData = true;
    if (dataInicio && dataFim && reg.data) {
      const dReg = reg.data.substring(0, 10);
      mData = dReg >= dataInicio && dReg <= dataFim;
    }
    return mUsuario && mVan && mData;
  });

  // FUNÇÃO DE SOMA DE HORAS (Calcula minutos totais e converte)
  const somaHoras = () => {
    let totalMinutos = 0;
    registrosFiltrados.forEach(reg => {
      if (reg.hora_inicio && reg.hora_fim) {
        const [h1, m1] = reg.hora_inicio.split(':').map(Number);
        const [h2, m2] = reg.hora_fim.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 1440; // Se passou da meia-noite
        totalMinutos += diff;
      }
    });
    const h = Math.floor(totalMinutos / 60);
    const m = totalMinutos % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const totalKM = registrosFiltrados.reduce((acc, reg) => {
    if (reg.km_inicial && reg.km_final) return acc + (Number(reg.km_final) - Number(reg.km_inicial));
    return acc;
  }, 0);

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text('Relatorio Master de Frota', 14, 15);
    
    // Resumo no PDF
    const resumo = `Resumo: ${totalKM}km rodados | Total de Horas: ${somaHoras()}`;
    doc.setFontSize(10);
    doc.text(resumo, 14, 22);

    const cols = ["Data", "Motorista", "Van", "Horas", "Rota", "KM Total"];
    const rows = registrosFiltrados.map((reg: any) => [
      reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
      reg.user_email ? reg.user_email.split('@')[0].toUpperCase() : 'S/I',
      reg.numero_van || '-',
      `${reg.hora_inicio} - ${reg.hora_fim}`,
      reg.rota || '-',
      (reg.km_final && reg.km_inicial) ? (Number(reg.km_final) - Number(reg.km_inicial)) : '-'
    ]);

    autoTable(doc, { startY: 25, head: [cols], body: rows, theme: 'grid', styles: { fontSize: 7 } });
    doc.save('relatorio_admin.pdf');
  };

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg"><ArrowLeft size={20} /></Link>
            <h1 className="text-xl font-bold">Gestão Master</h1>
          </div>
          <button onClick={exportarPDF} className="bg-emerald-600 p-2 px-4 rounded-lg flex items-center gap-2 text-sm font-bold">
            <FileDown size={18} /> PDF
          </button>
        </header>

        {/* CARDS DE RESUMO */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total Horas</p>
            <p className="text-xl font-bold text-blue-400">{somaHoras()}</p>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <p className="text-[10px] text-slate-500 uppercase font-bold">Total KM</p>
            <p className="text-xl font-bold text-emerald-400">{totalKM}km</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={usuarioSelecionado} onChange={e => setUsuarioSelecionado(e.target.value)} className="bg-slate-900 p-2 rounded border border-slate-700 text-sm">
            <option value="">Todos os Motoristas</option>
            {usuarios.map(u => <option key={u} value={u}>{u.split('@')[0]}</option>)}
          </select>
          <select value={vanSelecionada} onChange={e => setVanSelecionada(e.target.value)} className="bg-slate-900 p-2 rounded border border-slate-700 text-sm">
            <option value="">Todas as Vans</option>
            {vans.map(v => <option key={v} value={v}>Van {v}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-900 p-2 rounded border border-slate-700 text-sm w-full" />
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-900 p-2 rounded border border-slate-700 text-sm w-full" />
          </div>
        </div>

        {/* TABELA */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Motorista</th>
                <th className="p-4">Van</th>
                <th className="p-4">Horas</th>
                <th className="p-4 text-center">KM Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {registrosFiltrados.map((reg: any) => (
                <tr key={reg.id}>
                  <td className="p-4">{reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                  <td className="p-4 font-bold">{reg.user_email ? reg.user_email.split('@')[0] : 'S/I'}</td>
                  <td className="p-4">V-{reg.numero_van || '-'}</td>
                  <td className="p-4">{reg.hora_inicio} - {reg.hora_fim}</td>
                  <td className="p-4 text-center font-bold text-emerald-500">
                    {(reg.km_final && reg.km_inicial) ? (Number(reg.km_final) - Number(reg.km_inicial)) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}