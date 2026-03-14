import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // @ts-ignore
    const empresaId = session.user?.empresa_id;
    
    // Se o usuário for Super Admin testando sem empresa vinculada, retorna um padrão
    if (!empresaId) return NextResponse.json({ valor: 6.00 });

    // AUTO-FIX: Garante que a tabela de empresas tenha a coluna de preço do diesel
    await sql`ALTER TABLE empresas ADD COLUMN IF NOT EXISTS preco_diesel NUMERIC(10,2) DEFAULT 6.00`;

    // Busca o preço específico APENAS da empresa logada
    const result = await sql`SELECT preco_diesel FROM empresas WHERE id = ${empresaId}`;
    
    if (result.rows.length > 0 && result.rows[0].preco_diesel !== null) {
      return NextResponse.json({ valor: result.rows[0].preco_diesel });
    }
    
    return NextResponse.json({ valor: 6.00 });
  } catch (error: any) {
    console.error("Erro GET config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // @ts-ignore
    const empresaId = session.user?.empresa_id;
    
    if (!empresaId) {
        return NextResponse.json({ error: 'Sua conta não está vinculada a uma empresa para salvar configurações específicas.' }, { status: 400 });
    }

    const { valor } = await req.json();

    // AUTO-FIX: Garante que a coluna existe antes de atualizar
    await sql`ALTER TABLE empresas ADD COLUMN IF NOT EXISTS preco_diesel NUMERIC(10,2) DEFAULT 6.00`;

    // Atualiza o preço EXCLUSIVAMENTE para a empresa atual
    await sql`UPDATE empresas SET preco_diesel = ${valor} WHERE id = ${empresaId}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro POST config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}