import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificação de segurança: Só você pode criar empresas
    // Verifique se seu e-mail de login é exatamente este:
    if (session?.user?.email !== 'gfxdjo@gmail.com') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { nomeEmpresa, emailDono } = await req.json();

    if (!nomeEmpresa || !emailDono) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // 1. Cria a empresa e retorna o ID gerado automaticamente
    const resultEmpresa = await sql`
      INSERT INTO empresas (nome_empresa, plano) 
      VALUES (${nomeEmpresa}, 'pro') 
      RETURNING id
    `;
    
    const novaEmpresaId = resultEmpresa.rows[0].id;

    // 2. Vincular o e-mail do dono a essa nova empresa como ADMIN
    await sql`
      INSERT INTO perfis_usuarios (email, empresa_id, role)
      VALUES (${emailDono.toLowerCase()}, ${novaEmpresaId}, 'admin')
      ON CONFLICT (email) DO UPDATE SET empresa_id = ${novaEmpresaId}, role = 'admin'
    `;

    return NextResponse.json({ success: true, id: novaEmpresaId });
  } catch (error: any) {
    console.error("Erro na API de Empresas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}