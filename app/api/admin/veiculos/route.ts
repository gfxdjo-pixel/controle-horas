import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET() {
  const session = await getServerSession(authOptions);
  // No futuro, pegaremos o empresa_id da session. Por enquanto, usamos o 1 (sua empresa atual).
  const empresaId = 1; 

  try {
    const result = await sql`
      SELECT * FROM veiculos 
      WHERE empresa_id = ${empresaId} 
      ORDER BY numero_van ASC
    `;
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const { id, numero_van, placa, nome, media } = await req.json();
  const empresaId = 1; // Padrão para o teste

  try {
    if (id) {
      // UPDATE: Agora verificamos se o veículo pertence à empresa antes de editar
      await sql`
        UPDATE veiculos 
        SET numero_van = ${numero_van}, placa = ${placa}, nome_identificacao = ${nome}, media_consumo = ${media}
        WHERE id = ${id} AND empresa_id = ${empresaId}
      `;
    } else {
      // INSERT: Vinculamos o novo veículo à empresa
      await sql`
        INSERT INTO veiculos (numero_van, placa, nome_identificacao, media_consumo, empresa_id)
        VALUES (${numero_van}, ${placa}, ${nome}, ${media}, ${empresaId})
      `;
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const empresaId = 1;

  try {
    await sql`DELETE FROM veiculos WHERE id = ${id} AND empresa_id = ${empresaId}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}