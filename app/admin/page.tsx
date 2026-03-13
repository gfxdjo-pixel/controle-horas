'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Users, ArrowLeft, Truck, Mail, FileDown, Calendar as CalendarIcon, Clock, Gauge } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const { data: session } = useSession();
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
          setUsuarios([...new Set(lista.map((r: any) => r.user_email))].filter(Boolean) as string[]);
          setVans([...new Set(lista.map((r: any) => r.numero_van))].filter(Boolean) as string[]);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    carregarDadosAdmin();
  }, []);

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

  const somarMinutos = () => {
    let total = 0;
    registrosFiltrados.forEach(reg => {
      if (reg.hora_inicio && reg.hora_fim) {
        const [h1, m1] = reg.hora_inicio.split(':').map(Number);
        const [h2, m2] = reg.hora_fim.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 1440;
        total += diff;
      }
    });
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const totalKM = registrosFiltrados.reduce((acc, reg) => {
    if (reg.km_inicial && reg.km_final) return acc + (Number(reg.km_final) - Number(reg.km_inicial));
    return acc;
  }, 0);

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text('Relatório Master - Controle de Frota', 14, 15);
    doc.setFontSize(10);
    doc.text(`Resumo: ${totalKM} KM rodados | Total Horas: ${somarMinutos()}`, 14, 22);

    const cols = ["Data", "Motorista", "Van", "Início", "Fim", "KM Inicial", "KM Final", "Total KM", "Rota"];
    const rows = registrosFiltrados.map((reg: any) => [
      reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
      reg.user_email ? reg.user_email.split('@')[0].toUpperCase() : 'S/I',
      reg.numero_van || '-',
      reg.hora_inicio || '-',
      reg.hora_fim || '-',
      reg.km_inicial || '-',
      reg.km_final || '-',
      (reg.km_final && reg.km_inicial) ? (Number(reg.km_final) - Number(reg.km_inicial)) : '-',
      reg.rota || '-'
    ]);

    autoTable(doc, { startY: 28, head: [cols], body: rows, theme: 'grid', styles: { fontSize: 7 } });
    doc.save('Relatorio_Admin_Completo.pdf');
  };

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Carregando Master...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg"><ArrowLeft size={20} /></Link>
            <h1 className="text-xl font-bold flex items-center gap-2"><Truck className="text-blue-400" /> Painel Master</h1>
          </div>
          <button onClick={exportarPDF} className="bg-emerald-600 p-2 px-4 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg">
            <FileDown size={18} /> Exportar PDF
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Total de Horas</p>
              <h2 className="text-2xl font-bold text-blue-400">{somarMinutos()}</h2>
            </div>
            <Clock className="text-blue-400" size={30} />
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Kilometragem Total</p>
              <h2 className="text-2xl font-bold text-emerald-400">{totalKM} KM</h2>
            </div>
            <Gauge className="text-emerald-400" size={30} />
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
          <select value={usuarioSelecionado} onChange={e => setUsuarioSelecionado(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-sm">
            <option value="">Todos os Motoristas</option>
            {usuarios.map(u => <option key={u} value={u}>{u.split('@')[0].toUpperCase()}</option>)}
          </select>
          <select value={vanSelecionada} onChange={e => setVanSelecionada(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-sm">
            <option value="">Todas as Vans</option>
            {vans.map(v => <option key={v} value={v}>Van {v}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs w-full" />
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs w-full" />
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px]">
                <tr>
                  <th className="p-4">Data</th>
                  <th className="p-4">Motorista</th>
                  <th className="p-4">Van</th>
                  <th className="p-4">Horário</th>
                  <th className="p-4">Rota</th>
                  <th className="p-4 text-center">KM Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {registrosFiltrados.map((reg: any) => (
                  <tr key={reg.id}>
                    <td className="p-4">{reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                    <td className="p-4 font-bold">{reg.user_email ? reg.user_email.split('@')[0].toUpperCase() : 'S/I'}</td>
                    <td className="p-4">V-{reg.numero_van || '-'}</td>
                    <td className="p-4">{reg.hora_inicio} — {reg.hora_fim}</td>
                    <td className="p-4 text-slate-400">{reg.rota || '-'}</td>
                    <td className="p-4 text-center font-bold text-emerald-400">
                      {(reg.km_final && reg.km_inicial) ? (Number(reg.km_final) - Number(reg.km_inicial)) : '-'}
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