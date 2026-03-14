import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  // SEGURANÇA: Só você (gfxdjo@gmail.com) pode acessar essa rota
  if (session?.user?.email !== 'gfxdjo@gmail.com') {
    return NextResponse.json({ error: 'Acesso negado. Apenas o desenvolvedor master pode criar empresas.' }, { status: 403 });
  }

  const { nomeEmpresa, emailDono } = await req.json();

  try {
    // 1. Criar a empresa e pegar o ID gerado
    const novaEmpresa = await sql`
      INSERT INTO empresas (nome_empresa, plano) 
      VALUES (${nomeEmpresa}, 'pro') 
      RETURNING id
    `;
    
    const empresaId = novaEmpresa.rows[0].id;

    // 2. Vincular o e-mail do dono a essa nova empresa como ADMIN
    await sql`
      INSERT INTO perfis_usuarios (email, empresa_id, role)
      VALUES (${emailDono.toLowerCase()}, ${empresaId}, 'admin')
    `;

    return NextResponse.json({ success: true, empresaId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}