import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const emailAdmin = session?.user?.email?.toLowerCase();
    
    // Verificação de segurança
    if (emailAdmin !== 'gfxdjo@gmail.com') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { nomeEmpresa, emailDono } = await req.json();

    // GARANTIA: Tenta criar a tabela antes de inserir (evita o erro 'relation does not exist')
    await sql`
      CREATE TABLE IF NOT EXISTS empresas (
        id SERIAL PRIMARY KEY,
        nome_empresa TEXT NOT NULL,
        plano TEXT DEFAULT 'pro',
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS perfis_usuarios (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        empresa_id INTEGER REFERENCES empresas(id),
        role TEXT DEFAULT 'admin'
      );
    `;

    // 1. Inserir Empresa
    const resultEmpresa = await sql`
      INSERT INTO empresas (nome_empresa) 
      VALUES (${nomeEmpresa}) 
      RETURNING id
    `;
    
    const novaEmpresaId = resultEmpresa.rows[0].id;

    // 2. Inserir Dono
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