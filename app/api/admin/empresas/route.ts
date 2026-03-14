import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificação de segurança (Garanta que este é seu e-mail de login)
    const emailAdmin = session?.user?.email?.toLowerCase();
    
    if (emailAdmin !== 'gfxdjo@gmail.com') {
      return NextResponse.json({ error: `Acesso negado para: ${emailAdmin}` }, { status: 403 });
    }

    const { nomeEmpresa, emailDono } = await req.json();

    // 1. Criar empresa
    const resultEmpresa = await sql`
      INSERT INTO empresas (nome_empresa) 
      VALUES (${nomeEmpresa}) 
      RETURNING id
    `;
    
    const novaEmpresaId = resultEmpresa.rows[0].id;

    // 2. Criar perfil do dono
    await sql`
      INSERT INTO perfis_usuarios (email, empresa_id, role)
      VALUES (${emailDono.toLowerCase()}, ${novaEmpresaId}, 'admin')
      ON CONFLICT (email) DO UPDATE SET empresa_id = ${novaEmpresaId}, role = 'admin'
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}