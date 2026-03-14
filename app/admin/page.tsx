'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { 
  Users, ArrowLeft, Truck, Mail, FileDown, 
  Calendar as CalendarIcon, Clock, Gauge, 
  Plus, Trash2, Pencil, Save, Settings, XCircle 
} from 'lucide-react'; 
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const { data: session } = useSession();
  const [abaAtiva, setAbaAtiva] = useState('relatorios');
  
  const [todosRegistros, setTodosRegistros] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [precoDiesel, setPrecoDiesel] = useState(6.00);
  const [loading, setLoading] = useState(true);

  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [vanSelecionada, setVanSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [formVeiculo, setFormVeiculo] = useState({ id: null as number | null, numero_van: '', placa: '', nome: '', media: '10' });

  const carregarDadosAdmin = useCallback(async () => {
    try {
      setLoading(true);
      const [resHoras, resVeiculos, resConfig] = await Promise.all([
        fetch('/api/admin/horas'),
        fetch('/api/admin/veiculos'),
        fetch('/api/admin/config-global') 
      ]);

      if (resHoras.ok) {
        const data = await resHoras.json();
        setTodosRegistros(Array.isArray(data) ? data : []);
      }
      if (resVeiculos.ok) {
        const data = await resVeiculos.json();
        setVeiculos(Array.isArray(data) ? data : []);
      }
      if (resConfig.ok) {
        const data = await resConfig.json();
        if (data && data.valor) setPrecoDiesel(Number(data.valor));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregarDadosAdmin(); }, [carregarDadosAdmin]);

  const salvarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/veiculos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formVeiculo)
    });
    if (res.ok) {
      setFormVeiculo({ id: null, numero_van: '', placa: '', nome: '', media: '10' });
      carregarDadosAdmin();
      alert("Veículo atualizado!");
    }
  };

  const prepararEdicao = (v: any) => {
    setFormVeiculo({
      id: v.id,
      numero_van: v.numero_van,
      placa: v.placa || '',
      nome: v.nome_identificacao || '',
      media: String(v.media_consumo)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const atualizarPrecoDiesel = async () => {
    const res = await fetch('/api/admin/config-global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'preco_diesel', valor: precoDiesel })
    });
    if (res.ok) alert("Preço do Diesel salvo!");
  };

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

  const { kmTotal, custoTotal } = registrosFiltrados.reduce((acc, reg) => {
    if (reg.km_inicial && reg.km_final) {
      const km = Number(reg.km_final) - Number(reg.km_inicial);
      const vInfo = veiculos.find(v => String(v.numero_van) === String(reg.numero_van));
      const media = vInfo ? Number(vInfo.media_consumo) : 10;
      acc.kmTotal += km;
      acc.custoTotal += (km / media) * precoDiesel;
    }
    return acc;
  }, { kmTotal: 0, custoTotal: 0 });

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text('Relatório Master - Controle de Frota', 14, 15);
    const cols = ["Data", "Motorista", "Van", "Horário", "KM", "Custo Est.", "Rota"];
    const rows = registrosFiltrados.map((reg: any) => {
        const vInfo = veiculos.find(v => String(v.numero_van) === String(reg.numero_van));
        const media = vInfo ? Number(vInfo.media_consumo) : 10;
        const km = (Number(reg.km_final) - Number(reg.km_inicial)) || 0;
        return [
            reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
            reg.user_email?.split('@')[0].toUpperCase(),
            reg.numero_van,
            `${reg.hora_inicio} - ${reg.hora_fim}`,
            km,
            `R$ ${(km / media * precoDiesel).toFixed(2)}`,
            reg.rota || '-'
        ]
    });
    autoTable(doc, { startY: 25, head: [cols], body: rows });
    doc.save('Relatorio_Master.pdf');
  };

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-mono uppercase">Sincronizando...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 text-xs">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors"><ArrowLeft size={20} /></Link>
            <h1 className="text-xl font-bold flex items-center gap-2"><Truck className="text-blue-400" /> Master Frota</h1>
          </div>
          
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setAbaAtiva('relatorios')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${abaAtiva === 'relatorios' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Relatórios</button>
            <button onClick={() => setAbaAtiva('frota')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${abaAtiva === 'frota' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Frota</button>
            <button onClick={() => setAbaAtiva('config')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${abaAtiva === 'config' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Diesel</button>
          </div>

          <button onClick={exportarPDF} className="bg-emerald-600 p-2 px-6 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg">
            <FileDown size={18} /> PDF
          </button>
        </header>

        {abaAtiva === 'relatorios' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-lg">
                <div><p className="text-[10px] uppercase font-bold text-slate-500">Horas Totais</p><h2 className="text-2xl font-bold text-blue-400">{somarMinutos()}</h2></div>
                <Clock className="text-blue-400" size={30} />
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-lg">
                <div><p className="text-[10px] uppercase font-bold text-slate-500">KM Total</p><h2 className="text-2xl font-bold text-emerald-400">{kmTotal} KM</h2></div>
                <Gauge className="text-emerald-400" size={30} />
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-amber-900/30 flex justify-between items-center shadow-lg">
                <div><p className="text-[10px] uppercase font-bold text-amber-500">Gasto Diesel</p><h2 className="text-2xl font-bold text-amber-500">R$ {custoTotal.toFixed(2)}</h2></div>
                <div className="bg-amber-500/10 p-2 rounded text-amber-500 font-bold text-xs">R$</div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-500 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Motorista</th>
                    <th className="p-4">Van</th>
                    <th className="p-4">Horário</th> {/* COLUNA RECOLOCADA */}
                    <th className="p-4 text-center">KM</th>
                    <th className="p-4 text-center text-amber-500">Custo Est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {registrosFiltrados.map((reg: any) => {
                      const vInfo = veiculos.find(v => String(v.numero_van) === String(reg.numero_van));
                      const media = vInfo ? Number(vInfo.media_consumo) : 10;
                      const km = (Number(reg.km_final) - Number(reg.km_inicial)) || 0;
                      return (
                        <tr key={reg.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="p-4">{reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                          <td className="p-4 font-bold text-slate-300">{reg.user_email?.split('@')[0].toUpperCase()}</td>
                          <td className="p-4 text-blue-400 font-bold">V-{reg.numero_van}</td>
                          <td className="p-4 text-slate-400 font-mono">{reg.hora_inicio} - {reg.hora_fim}</td> {/* DADO RECOLOCADO */}
                          <td className="p-4 text-center text-slate-400">{km}</td>
                          <td className="p-4 text-center text-amber-500 font-mono font-bold">R$ {(km / media * precoDiesel).toFixed(2)}</td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ... manter abas de Frota e Diesel conforme arquivos anteriores ... */}
        {abaAtiva === 'frota' && (
          <div className="p-10 text-center text-slate-500">Use o formulário para gerenciar seus veículos.</div>
        )}
      </div>
    </div>
  );
}