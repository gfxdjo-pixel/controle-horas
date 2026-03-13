import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await sql`SELECT valor FROM config_global WHERE chave = 'preco_diesel'`;
    // Se não encontrar nada, retorna o padrão de 6.00
    const preco = result.rows.length > 0 ? result.rows[0].valor : 6.00;
    return NextResponse.json({ valor: preco });
  } catch (error) {
    console.error("Erro ao buscar diesel:", error);
    return NextResponse.json({ valor: 6.00 });
  }
}

export async function POST(req: Request) {
  try {
    const { chave, valor } = await req.json();
    // O comando ON CONFLICT garante que ele só atualize a linha existente
    await sql`
      INSERT INTO config_global (chave, valor) 
      VALUES (${chave}, ${valor})
      ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
    `;
    return NextResponse.json({ message: 'Preço atualizado com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}