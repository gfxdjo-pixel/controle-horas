'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { 
  Users, ArrowLeft, Truck, Mail, FileDown, 
  Calendar as CalendarIcon, Clock, Gauge, 
  Plus, Trash2, Pencil, Save, Settings 
} from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const { data: session } = useSession();
  const [abaAtiva, setAbaAtiva] = useState('relatorios');
  
  const [todosRegistros, setTodosRegistros] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [precoDiesel, setPrecoDiesel] = useState(6.00); // Valor padrão inicial
  const [loading, setLoading] = useState(true);

  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [vanSelecionada, setVanSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [formVeiculo, setFormVeiculo] = useState({ numero_van: '', placa: '', nome: '', media: '10' });

  // FUNÇÃO PARA CARREGAR TUDO DO BANCO (Incluindo o Preço Salvo)
  const carregarDadosAdmin = useCallback(async () => {
    try {
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
      
      // AQUI ESTÁ O SEGREDO: Carrega o preço que está no banco
      if (resConfig.ok) {
        const data = await resConfig.json();
        if (data && data.valor) {
          setPrecoDiesel(Number(data.valor));
        }
      }
    } catch (err) { 
      console.error("Erro ao sincronizar:", err); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { 
    carregarDadosAdmin(); 
  }, [carregarDadosAdmin]);

  const salvarVeiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/veiculos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formVeiculo)
    });
    if (res.ok) {
      setFormVeiculo({ numero_van: '', placa: '', nome: '', media: '10' });
      carregarDadosAdmin();
    }
  };

  const prepararEdicao = (v: any) => {
    setFormVeiculo({
      numero_van: v.numero_van,
      placa: v.placa || '',
      nome: v.nome_identificacao || '',
      media: String(v.media_consumo)
    });
    setAbaAtiva('frota');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletarVeiculo = async (id: number) => {
    if (!confirm('Excluir veículo?')) return;
    await fetch(`/api/admin/veiculos?id=${id}`, { method: 'DELETE' });
    carregarDadosAdmin();
  };

  // FUNÇÃO PARA SALVAR O PREÇO NO BANCO DEFINITIVAMENTE
  const atualizarPrecoDiesel = async () => {
    try {
      const res = await fetch('/api/admin/config-global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: 'preco_diesel', valor: precoDiesel })
      });
      if (res.ok) {
        alert("Preço salvo no banco de dados!");
        carregarDadosAdmin(); // Recarrega para confirmar
      }
    } catch (err) {
      alert("Erro ao salvar preço.");
    }
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
    return `${Math.floor(total / 60)}h ${(total % 60).toString().padStart(2, '0')}m`;
  };

  const calcularResumoFinanceiro = () => {
    let kmTotal = 0;
    let custoTotal = 0;
    registrosFiltrados.forEach(reg => {
      if (reg.km_inicial && reg.km_final) {
        const kmRodado = Number(reg.km_final) - Number(reg.km_inicial);
        kmTotal += kmRodado;
        const vInfo = veiculos.find(v => String(v.numero_van) === String(reg.numero_van));
        const media = vInfo ? Number(vInfo.media_consumo) : 10;
        custoTotal += (kmRodado / media) * precoDiesel;
      }
    });
    return { kmTotal, custoTotal };
  };

  const { kmTotal, custoTotal } = calcularResumoFinanceiro();

  const exportarPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text('Relatório Master - Controle de Frota', 14, 15);
    doc.setFontSize(10);
    doc.text(`Resumo: ${kmTotal} KM | Horas: ${somarMinutos()} | Diesel Base: R$ ${precoDiesel.toFixed(2)} | Custo Total: R$ ${custoTotal.toFixed(2)}`, 14, 22);

    const cols = ["Data", "Motorista", "Van", "Início", "Fim", "KM", "Custo Est.", "Rota"];
    const rows = registrosFiltrados.map((reg: any) => {
        const vInfo = veiculos.find(v => String(v.numero_van) === String(reg.numero_van));
        const media = vInfo ? Number(vInfo.media_consumo) : 10;
        const km = (Number(reg.km_final) - Number(reg.km_inicial)) || 0;
        return [
            reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
            reg.user_email?.split('@')[0].toUpperCase() || 'S/I',
            reg.numero_van || '-',
            reg.hora_inicio,
            reg.hora_fim,
            km,
            `R$ ${(km / media * precoDiesel).toFixed(2)}`,
            reg.rota || '-'
        ]
    });

    autoTable(doc, { startY: 28, head: [cols], body: rows, theme: 'grid', styles: { fontSize: 7 } });
    doc.save('Relatorio_Frota_Master.pdf');
  };

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-mono">SINCRONIZANDO DADOS...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors"><ArrowLeft size={20} /></Link>
            <h1 className="text-xl font-bold flex items-center gap-2"><Truck className="text-blue-400" /> Painel Master</h1>
          </div>
          
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button onClick={() => setAbaAtiva('relatorios')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${abaAtiva === 'relatorios' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Relatórios</button>
            <button onClick={() => setAbaAtiva('frota')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${abaAtiva === 'frota' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Frota</button>
            <button onClick={() => setAbaAtiva('config')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${abaAtiva === 'config' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Diesel</button>
          </div>

          <button onClick={exportarPDF} className="bg-emerald-600 hover:bg-emerald-700 p-2 px-6 rounded-lg flex items-center gap-2 text-sm font-bold shadow-lg transition-all active:scale-95">
            <FileDown size={18} /> PDF
          </button>
        </header>

        {abaAtiva === 'relatorios' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                <div><p className="text-[10px] uppercase font-bold text-slate-500">Horas Totais</p><h2 className="text-2xl font-bold text-blue-400">{somarMinutos()}</h2></div>
                <Clock className="text-blue-400" size={30} />
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                <div><p className="text-[10px] uppercase font-bold text-slate-500">KM Total</p><h2 className="text-2xl font-bold text-emerald-400">{kmTotal} KM</h2></div>
                <Gauge className="text-emerald-400" size={30} />
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-amber-900/30 flex justify-between items-center">
                <div><p className="text-[10px] uppercase font-bold text-amber-500">Gasto Combustível</p><h2 className="text-2xl font-bold text-amber-500">R$ {custoTotal.toFixed(2)}</h2></div>
                <div className="bg-amber-500/10 p-2 rounded text-amber-500 font-bold">R$</div>
              </div>
            </div>

            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 shadow-sm">
               <select value={usuarioSelecionado} onChange={e => setUsuarioSelecionado(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300">
                <option value="">Todos Motoristas</option>
                {[...new Set(todosRegistros.map(r => r.user_email))].filter(Boolean).map(u => <option key={u} value={u}>{u?.split('@')[0].toUpperCase()}</option>)}
              </select>
              <select value={vanSelecionada} onChange={e => setVanSelecionada(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-300">
                <option value="">Todas as Vans</option>
                {veiculos.map(v => <option key={v.numero_van} value={v.numero_van}>Van {v.numero_van}</option>)}
              </select>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300" />
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-500 uppercase font-mono text-[10px]">
                    <tr><th className="p-4">Data</th><th className="p-4">Motorista</th><th className="p-4">Van</th><th className="p-4 text-center">KM</th><th className="p-4 text-center text-amber-500">Custo Est.</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {registrosFiltrados.map((reg: any) => {
                        const vInfo = veiculos.find(v => String(v.numero_van) === String(reg.numero_van));
                        const media = vInfo ? Number(vInfo.media_consumo) : 10;
                        const km = (Number(reg.km_final) - Number(reg.km_inicial)) || 0;
                        return (
                          <tr key={reg.id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="p-4 whitespace-nowrap">{reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                            <td className="p-4 font-bold text-slate-300">{reg.user_email?.split('@')[0].toUpperCase()}</td>
                            <td className="p-4 text-blue-400 font-bold">V-{reg.numero_van}</td>
                            <td className="p-4 text-center text-slate-400">{km}</td>
                            <td className="p-4 text-center text-amber-500 font-mono font-bold">R$ {(km / media * precoDiesel).toFixed(2)}</td>
                          </tr>
                        );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'frota' && (
          <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-6">
            <form onSubmit={salvarVeiculo} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 grid grid-cols-1 md:grid-cols-5 gap-4 items-end shadow-xl">
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Nº Van</label><input required value={formVeiculo.numero_van} onChange={e => setFormVeiculo({...formVeiculo, numero_van: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700 mt-1" placeholder="Ex: 171" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Placa</label><input value={formVeiculo.placa} onChange={e => setFormVeiculo({...formVeiculo, placa: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700 mt-1" placeholder="ABC-1234" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Identificação</label><input value={formVeiculo.nome} onChange={e => setFormVeiculo({...formVeiculo, nome: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700 mt-1" placeholder="Van Matriz" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase text-emerald-500">Média (km/L)</label><input required type="number" step="0.1" value={formVeiculo.media} onChange={e => setFormVeiculo({...formVeiculo, media: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-emerald-900/30 mt-1" /></div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg font-bold flex items-center justify-center gap-2"><Save size={18} /> Salvar</button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {veiculos.map(v => (
                <div key={v.id} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700 flex justify-between items-center group">
                  <div>
                    <h3 className="font-bold text-blue-400 text-lg">Van {v.numero_van}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">{v.placa || 'Sem Placa'} • {v.nome_identificacao}</p>
                    <div className="mt-3 inline-block bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/20">{v.media_consumo} km/L</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => prepararEdicao(v)} className="p-2 text-slate-500 hover:text-amber-500 bg-slate-900 rounded-xl transition-all"><Pencil size={18} /></button>
                    <button onClick={() => deletarVeiculo(v.id)} className="p-2 text-slate-500 hover:text-red-500 bg-slate-900 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {abaAtiva === 'config' && (
          <div className="animate-in zoom-in-95 duration-500 bg-slate-800/50 p-10 rounded-3xl border border-slate-700 max-w-lg mx-auto text-center space-y-6 shadow-2xl">
            <div className="bg-amber-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-amber-500/20">
                <Settings className="text-amber-500" size={40} />
            </div>
            <h2 className="font-bold text-xl">Preço do Diesel</h2>
            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor do Litro (R$)</label>
                <div className="flex items-center gap-4 justify-center">
                  <span className="text-3xl font-bold text-slate-600">R$</span>
                  <input type="number" step="0.01" value={precoDiesel} onChange={e => setPrecoDiesel(Number(e.target.value))} className="bg-slate-900 text-4xl font-black text-amber-500 w-40 text-center p-3 rounded-2xl border border-slate-700 outline-none" />
                </div>
            </div>
            <button onClick={atualizarPrecoDiesel} className="w-full bg-amber-600 hover:bg-amber-700 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"><Save size={20} /> Salvar Preço</button>
          </div>
        )}
      </div>
    </div>
  );
}