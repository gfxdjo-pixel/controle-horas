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
    const { numero_van, placa, nome, media } = await req.json();
    
    // O comando ON CONFLICT permite que, se o numero_van já existir, 
    // o banco apenas atualize os outros dados (EDITAR)
    await sql`
      INSERT INTO veiculos (numero_van, placa, nome_identificacao, media_consumo)
      VALUES (${numero_van}, ${placa}, ${nome}, ${media})
      ON CONFLICT (numero_van) DO UPDATE 
      SET placa = EXCLUDED.placa, 
          nome_identificacao = EXCLUDED.nome_identificacao, 
          media_consumo = EXCLUDED.media_consumo
    `;
    return NextResponse.json({ message: 'Veículo salvo com sucesso!' });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  try {
    await sql`DELETE FROM veiculos WHERE id = ${id}`;
    return NextResponse.json({ message: 'Veículo removido' });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}