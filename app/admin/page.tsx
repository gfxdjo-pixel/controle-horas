'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Users, ArrowLeft, Truck, Mail, FileDown, Calendar as CalendarIcon, Clock, Gauge, Settings, Plus, Trash2, Save } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const { data: session } = useSession();
  const [abaAtiva, setAbaAtiva] = useState('relatorios'); // 'relatorios' | 'frota' | 'config'
  
  // Estados de Dados
  const [todosRegistros, setTodosRegistros] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [precoDiesel, setPrecoDiesel] = useState(6.00);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [vanSelecionada, setVanSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Form de Veículo
  const [formVeiculo, setFormVeiculo] = useState({ numero_van: '', placa: '', nome: '', media: '10' });

  const carregarDadosAdmin = async () => {
    try {
      setLoading(true);
      const [resHoras, resVeiculos] = await Promise.all([
        fetch('/api/admin/horas'),
        fetch('/api/admin/veiculos') // Vamos criar essa API
      ]);

      if (resHoras.ok) {
        const data = await resHoras.json();
        setTodosRegistros(Array.isArray(data) ? data : []);
      }
      if (resVeiculos.ok) {
        const data = await resVeiculos.json();
        setVeiculos(Array.isArray(data) ? data : []);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { carregarDadosAdmin(); }, []);

  // Lógica de Veículos
  const salvarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/veiculos', {
      method: 'POST',
      body: JSON.stringify(formVeiculo)
    });
    if (res.ok) {
      setFormVeiculo({ numero_van: '', placa: '', nome: '', media: '10' });
      carregarDadosAdmin();
    }
  };

  const deletarVeiculo = async (id: number) => {
    if (!confirm('Excluir veículo?')) return;
    await fetch(`/api/admin/veiculos?id=${id}`, { method: 'DELETE' });
    carregarDadosAdmin();
  };

  // CÁLCULOS
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
    return `${Math.floor(total / 60)}h ${(total % 60).toString().padStart(2, '0')}m`;
  };

  const calcularResumoFinanceiro = () => {
    let kmTotal = 0;
    let custoTotal = 0;

    registrosFiltrados.forEach(reg => {
      if (reg.km_inicial && reg.km_final) {
        const kmRodado = Number(reg.km_final) - Number(reg.km_inicial);
        kmTotal += kmRodado;
        
        // Busca a média da van específica
        const vInfo = veiculos.find(v => v.numero_van === String(reg.numero_van));
        const media = vInfo ? Number(vInfo.media_consumo) : 10;
        custoTotal += (kmRodado / media) * precoDiesel;
      }
    });

    return { kmTotal, custoTotal };
  };

  const { kmTotal, custoTotal } = calcularResumoFinanceiro();

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">Sincronizando Frota...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg"><ArrowLeft size={20} /></Link>
            <h1 className="text-xl font-bold flex items-center gap-2"><Truck className="text-blue-400" /> Painel Master</h1>
          </div>
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button onClick={() => setAbaAtiva('relatorios')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${abaAtiva === 'relatorios' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Relatórios</button>
            <button onClick={() => setAbaAtiva('frota')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${abaAtiva === 'frota' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Frota</button>
            <button onClick={() => setAbaAtiva('config')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${abaAtiva === 'config' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Diesel</button>
          </div>
        </header>

        {abaAtiva === 'relatorios' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                <div><p className="text-[10px] uppercase font-bold text-slate-500">Total Horas</p><h2 className="text-2xl font-bold text-blue-400">{somarMinutos()}</h2></div>
                <Clock className="text-blue-400" size={30} />
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                <div><p className="text-[10px] uppercase font-bold text-slate-500">KM Total</p><h2 className="text-2xl font-bold text-emerald-400">{kmTotal} KM</h2></div>
                <Gauge className="text-emerald-400" size={30} />
              </div>
              <div className="bg-slate-800 p-4 rounded-xl border border-amber-900/30 flex justify-between items-center">
                <div><p className="text-[10px] uppercase font-bold text-amber-500">Gasto Diesel</p><h2 className="text-2xl font-bold text-amber-500">R$ {custoTotal.toFixed(2)}</h2></div>
                <div className="text-amber-500 font-black">R$</div>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4">
               <select value={usuarioSelecionado} onChange={e => setUsuarioSelecionado(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-sm">
                <option value="">Todos Motoristas</option>
                {[...new Set(todosRegistros.map(r => r.user_email))].map(u => <option key={u} value={u}>{u?.split('@')[0].toUpperCase()}</option>)}
              </select>
              <select value={vanSelecionada} onChange={e => setVanSelecionada(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-sm">
                <option value="">Todas as Vans</option>
                {veiculos.map(v => <option key={v.numero_van} value={v.numero_van}>Van {v.numero_van} ({v.placa})</option>)}
              </select>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs" />
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                  <tr><th className="p-4">Data</th><th className="p-4">Motorista</th><th className="p-4">Van</th><th className="p-4">KM Total</th><th className="p-4">Custo Est.</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {registrosFiltrados.map((reg: any) => {
                    const custo = calcularCustoPorRegistro(reg, veiculos, precoDiesel);
                    return (
                      <tr key={reg.id}>
                        <td className="p-4">{reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                        <td className="p-4 font-bold">{reg.user_email?.split('@')[0].toUpperCase()}</td>
                        <td className="p-4">V-{reg.numero_van}</td>
                        <td className="p-4 text-center">{(Number(reg.km_final) - Number(reg.km_inicial)) || 0}</td>
                        <td className="p-4 text-amber-500 font-bold">R$ {custo.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {abaAtiva === 'frota' && (
          <div className="space-y-6">
            <form onSubmit={salvarVeiculo} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div><label className="text-xs text-slate-500">Nº Van</label><input required value={formVeiculo.numero_van} onChange={e => setFormVeiculo({...formVeiculo, numero_van: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700" placeholder="171" /></div>
              <div><label className="text-xs text-slate-500">Placa</label><input value={formVeiculo.placa} onChange={e => setFormVeiculo({...formVeiculo, placa: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700" placeholder="ABC-1234" /></div>
              <div><label className="text-xs text-slate-500">Identificação</label><input value={formVeiculo.nome} onChange={e => setFormVeiculo({...formVeiculo, nome: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700" placeholder="Van do João" /></div>
              <div><label className="text-xs text-slate-500">Média (km/L)</label><input required type="number" step="0.1" value={formVeiculo.media} onChange={e => setFormVeiculo({...formVeiculo, media: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700" /></div>
              <button type="submit" className="bg-blue-600 p-2 rounded-lg font-bold flex items-center justify-center gap-2"><Plus size={18} /> Adicionar</button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {veiculos.map(v => (
                <div key={v.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-blue-400">Van {v.numero_van}</h3>
                    <p className="text-[10px] text-slate-500">{v.placa} | {v.nome_identificacao}</p>
                    <p className="text-xs font-bold mt-1 text-emerald-500">{v.media_consumo} km/L</p>
                  </div>
                  <button onClick={() => deletarVeiculo(v.id)} className="text-slate-600 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {abaAtiva === 'config' && (
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-md mx-auto text-center space-y-4">
            <h2 className="font-bold text-lg">Preço do Diesel (Hoje)</h2>
            <div className="flex items-center gap-4 justify-center">
              <span className="text-2xl font-bold text-slate-500">R$</span>
              <input type="number" step="0.01" value={precoDiesel} onChange={e => setPrecoDiesel(Number(e.target.value))} className="bg-slate-900 text-3xl font-bold text-amber-500 w-32 text-center p-2 rounded-xl border border-slate-700" />
            </div>
            <p className="text-xs text-slate-500">Este valor será usado para todos os cálculos de custo do sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Função auxiliar fora do componente
function calcularCustoPorRegistro(reg: any, veiculos: any[], precoDiesel: number) {
  if (!reg.km_inicial || !reg.km_final) return 0;
  const kmRodado = Number(reg.km_final) - Number(reg.km_inicial);
  const vInfo = veiculos.find(v => v.numero_van === String(reg.numero_van));
  const media = vInfo ? Number(vInfo.media_consumo) : 10;
  return (kmRodado / media) * precoDiesel;
}