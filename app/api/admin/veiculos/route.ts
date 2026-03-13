import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const result = await sql`SELECT * FROM veiculos ORDER BY numero_van ASC`;
    return NextResponse.json(result.rows);
  } catch (error: any) { return NextResponse.json([], { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { id, numero_van, placa, nome, media } = await req.json();

    if (id) {
      // SE TEM ID, É UMA EDIÇÃO
      await sql`
        UPDATE veiculos 
        SET numero_van = ${numero_van}, 
            placa = ${placa}, 
            nome_identificacao = ${nome}, 
            media_consumo = ${media}
        WHERE id = ${id}
      `;
    } else {
      // SE NÃO TEM ID, É UM CADASTRO NOVO
      await sql`
        INSERT INTO veiculos (numero_van, placa, nome_identificacao, media_consumo)
        VALUES (${numero_van}, ${placa}, ${nome}, ${media})
        ON CONFLICT (numero_van) DO NOTHING
      `;
    }
    return NextResponse.json({ message: 'Salvo' });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  try {
    await sql`DELETE FROM veiculos WHERE id = ${id}`;
    return NextResponse.json({ message: 'Removido' });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}