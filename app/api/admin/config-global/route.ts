import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await sql`SELECT valor FROM config_global WHERE chave = 'preco_diesel'`;
    return NextResponse.json(result.rows[0] || { valor: 6.00 });
  } catch (error) { return NextResponse.json({ valor: 6.00 }); }
}

export async function POST(req: Request) {
  try {
    const { chave, valor } = await req.json();
    await sql`
      INSERT INTO config_global (chave, valor) VALUES (${chave}, ${valor})
      ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
    `;
    return NextResponse.json({ message: 'Salvo' });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}