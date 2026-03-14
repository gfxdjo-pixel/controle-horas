'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from "next-auth/react";
import { 
  Users, ArrowLeft, Truck, Mail, FileDown, 
  Calendar as CalendarIcon, Clock, Gauge, 
  Plus, Trash2, Pencil, Save, Settings, XCircle, UserPlus, Shield
} from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminPanel() {
  const { data: session } = useSession();
  const [abaAtiva, setAbaAtiva] = useState('relatorios');
  const [todosRegistros, setTodosRegistros] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [usuariosEquipe, setUsuariosEquipe] = useState<any[]>([]);
  const [precoDiesel, setPrecoDiesel] = useState(6.00);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [vanSelecionada, setVanSelecionada] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [formVeiculo, setFormVeiculo] = useState({ id: null as number | null, numero_van: '', placa: '', nome: '', media: '10' });

  const carregarDadosAdmin = useCallback(async () => {
    try {
      setLoading(true);
      const [resHoras, resVeiculos, resConfig, resEquipe] = await Promise.all([
        fetch('/api/admin/horas'),
        fetch('/api/admin/veiculos'),
        fetch('/api/admin/config-global'),
        fetch('/api/admin/usuarios') // Nova API de equipe
      ]);
      
      if (resHoras.ok) setTodosRegistros(await resHoras.json());
      if (resVeiculos.ok) setVeiculos(await resVeiculos.json());
      if (resEquipe.ok) setUsuariosEquipe(await resEquipe.json());
      if (resConfig.ok) {
        const data = await resConfig.json();
        if (data?.valor) setPrecoDiesel(Number(data.valor));
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
      alert("Sucesso!");
    }
  };

  const atualizarPrecoDiesel = async () => {
    const res = await fetch('/api/admin/config-global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chave: 'preco_diesel', valor: precoDiesel })
    });
    if (res.ok) alert("Preço do Diesel atualizado!");
  };

  const deletarUsuario = async (id: number) => {
    if (!confirm('Remover este usuário da equipe? Ele perderá acesso ao sistema.')) return;
    const res = await fetch(`/api/admin/usuarios?id=${id}`, { method: 'DELETE' });
    if (res.ok) carregarDadosAdmin();
  };

  const registrosFiltrados = todosRegistros
    .filter((reg: any) => {
      const mUsuario = usuarioSelecionado ? reg.user_email === usuarioSelecionado : true;
      const mVan = vanSelecionada ? String(reg.numero_van) === String(vanSelecionada) : true;
      let mData = true;
      if (dataInicio && dataFim && reg.data) {
        const dReg = reg.data.substring(0, 10);
        mData = dReg >= dataInicio && dReg <= dataFim;
      }
      return mUsuario && mVan && mData;
    })
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime() || b.hora_inicio.localeCompare(a.hora_inicio));

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

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white font-mono tracking-widest uppercase">Sincronizando Sistema...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8 text-xs">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 p-2 rounded-lg hover:bg-slate-700 transition-colors"><ArrowLeft size={20} /></Link>
            <h1 className="text-xl font-bold flex items-center gap-2"><Truck className="text-blue-400" /> Master Frota</h1>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {[
              { id: 'relatorios', label: 'Relatórios' },
              { id: 'frota', label: 'Frota' },
              { id: 'equipe', label: 'Equipe' }, // Nova Aba
              { id: 'config', label: 'Diesel' }
            ].map((aba) => (
              <button key={aba.id} onClick={() => setAbaAtiva(aba.id)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${abaAtiva === aba.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500'}`}>
                {aba.label}
              </button>
            ))}
          </div>
        </header>

        {abaAtiva === 'relatorios' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <p className="text-[10px] uppercase font-bold text-slate-500">Horas Totais</p>
                <h2 className="text-2xl font-bold text-blue-400">{somarMinutos()}</h2>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                <p className="text-[10px] uppercase font-bold text-slate-500">KM Total</p>
                <h2 className="text-2xl font-bold text-emerald-400">{kmTotal} KM</h2>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl border border-amber-900/30">
                <p className="text-[10px] uppercase font-bold text-amber-500">Gasto Diesel</p>
                <h2 className="text-2xl font-bold text-amber-500">R$ {custoTotal.toFixed(2)}</h2>
              </div>
            </div>

            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4">
               <select value={usuarioSelecionado} onChange={e => setUsuarioSelecionado(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 outline-none">
                <option value="">Todos Motoristas</option>
                {[...new Set(todosRegistros.map(r => r.user_email))].filter(Boolean).map(u => <option key={u} value={u}>{u?.split('@')[0].toUpperCase()}</option>)}
              </select>
              <select value={vanSelecionada} onChange={e => setVanSelecionada(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-300 outline-none">
                <option value="">Todas as Vans</option>
                {veiculos.map(v => <option key={v.numero_van} value={v.numero_van}>Van {v.numero_van}</option>)}
              </select>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-300" />
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 text-slate-300" />
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-500 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">Motorista</th>
                    <th className="p-4">Van</th>
                    <th className="p-4">Horário</th>
                    <th className="p-4">Rota/Obs</th>
                    <th className="p-4 text-center">KM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {registrosFiltrados.map((reg: any) => (
                    <tr key={reg.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="p-4 whitespace-nowrap">{reg.data ? new Date(reg.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</td>
                      <td className="p-4 font-bold text-slate-300">{reg.user_email?.split('@')[0].toUpperCase()}</td>
                      <td className="p-4 text-blue-400 font-bold">V-{reg.numero_van}</td>
                      <td className="p-4 text-slate-400 font-mono">{reg.hora_inicio} - {reg.hora_fim}</td>
                      <td className="p-4 text-slate-400 truncate max-w-[120px]" title={reg.rota}>{reg.rota || '-'}</td>
                      <td className="p-4 text-center text-slate-400">{(Number(reg.km_final) - Number(reg.km_inicial)) || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {abaAtiva === 'frota' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
            <form onSubmit={salvarVeiculo} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 items-end shadow-xl">
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Nº Van</label><input required value={formVeiculo.numero_van} onChange={e => setFormVeiculo({...formVeiculo, numero_van: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700 mt-1 outline-none focus:border-blue-500" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Placa</label><input value={formVeiculo.placa} onChange={e => setFormVeiculo({...formVeiculo, placa: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700 mt-1 outline-none focus:border-blue-500" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Média km/L</label><input required type="number" step="0.1" value={formVeiculo.media} onChange={e => setFormVeiculo({...formVeiculo, media: e.target.value})} className="w-full bg-slate-900 p-2 rounded border border-slate-700 mt-1 outline-none focus:border-blue-500" /></div>
              <button type="submit" className="bg-blue-600 p-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg">
                {formVeiculo.id ? <Save size={18} /> : <Plus size={18} />} {formVeiculo.id ? 'Atualizar' : 'Adicionar'}
              </button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {veiculos.map(v => (
                <div key={v.id} className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 flex justify-between items-center group shadow-md hover:border-blue-500/30 transition-all">
                  <div>
                    <h3 className="font-bold text-blue-400 text-lg">Van {v.numero_van}</h3>
                    <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{v.placa || 'SEM PLACA'}</p>
                    <div className="mt-2 inline-block bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/20">{v.media_consumo} km/L</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setFormVeiculo({id: v.id, numero_van: v.numero_van, placa: v.placa, nome: v.nome_identificacao, media: String(v.media_consumo)}); window.scrollTo({top:0, behavior:'smooth'}) }} className="p-2 text-slate-500 hover:text-amber-500 transition-colors bg-slate-900/50 rounded-lg"><Pencil size={18} /></button>
                    <button onClick={() => { if(confirm('Excluir?')) fetch(`/api/admin/veiculos?id=${v.id}`, {method:'DELETE'}).then(()=>carregarDadosAdmin()) }} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-slate-900/50 rounded-lg"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {abaAtiva === 'equipe' && (
          <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-6">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus size={18} className="text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Autorizar Acesso</h3>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const res = await fetch('/api/admin/usuarios', {
                  method: 'POST',
                  body: JSON.stringify({
                    email: formData.get('email'),
                    role: formData.get('role'),
                  })
                });
                if (res.ok) {
                  alert('Usuário autorizado com sucesso!');
                  carregarDadosAdmin();
                  (e.target as HTMLFormElement).reset();
                }
              }} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">E-mail do Google</label>
                  <input name="email" type="email" required className="w-full bg-slate-900 p-2 rounded border border-slate-700 mt-1 outline-none focus:border-blue-500" placeholder="exemplo@gmail.com" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Função / Nível</label>
                  <select name="role" className="w-full bg-slate-900 p-2 rounded border border-slate-700 mt-1 outline-none focus:border-blue-500">
                    <option value="user">Motorista (Lançamentos)</option>
                    <option value="admin">Administrador (Gestão Master)</option>
                  </select>
                </div>
                <button type="submit" className="bg-blue-600 p-2 rounded-lg font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg">Autorizar Membro</button>
              </form>
            </div>

            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <div className="p-4 bg-slate-900/50 border-b border-slate-700">
                <h4 className="text-[10px] font-bold uppercase text-slate-500 tracking-tighter flex items-center gap-2">
                  <Shield size={14} /> Membros da Empresa Atuais
                </h4>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-500 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-4">Identificação (E-mail)</th>
                    <th className="p-4">Nível de Acesso</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {usuariosEquipe.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="p-4 font-mono text-slate-300">{user.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                          {user.role === 'admin' ? 'GESTOR MASTER' : 'MOTORISTA'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {user.email !== session?.user?.email && (
                          <button onClick={() => deletarUsuario(user.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-slate-900/50 rounded-lg">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {abaAtiva === 'config' && (
          <div className="animate-in zoom-in-95 duration-500 bg-slate-800/50 p-10 rounded-3xl border border-slate-700 max-w-lg mx-auto text-center space-y-6 shadow-2xl">
            <div className="bg-amber-500/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto border border-amber-500/20 shadow-inner">
                <Settings className="text-amber-500" size={40} />
            </div>
            <h2 className="font-bold text-xl">Gestão de Custos</h2>
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor do Litro (Diesel)</label>
                <div className="flex items-center gap-4 justify-center">
                  <span className="text-3xl font-bold text-slate-600">R$</span>
                  <input type="number" step="0.01" value={precoDiesel} onChange={e => setPrecoDiesel(Number(e.target.value))} className="bg-slate-900 text-4xl font-black text-amber-500 w-40 text-center p-3 rounded-2xl border border-slate-700 outline-none focus:ring-2 focus:ring-amber-500/50 shadow-inner" />
                </div>
                <button onClick={atualizarPrecoDiesel} className="w-full bg-amber-600 hover:bg-amber-700 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 mt-4">
                  <Save size={20} /> Gravar Preço no Banco
                </button>
                <p className="text-[10px] text-slate-500 italic mt-2">Este valor altera o cálculo de custo de todas as rotas da empresa.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}