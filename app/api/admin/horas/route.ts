import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "./../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const email = session.user?.email;
    // @ts-ignore
    const empresaId = session.user?.empresa_id;
    // @ts-ignore
    const role = session.user?.role;

    // FORÇA A EXISTÊNCIA DA COLUNA CASO O SQL TENHA FALHADO
    await sql`ALTER TABLE horas_extras ADD COLUMN IF NOT EXISTS empresa_id INTEGER`;

    let rows;
    if (role === 'admin') {
      const result = await sql`SELECT * FROM horas_extras WHERE empresa_id = ${empresaId} ORDER BY data DESC, hora_inicio DESC`;
      rows = result.rows;
    } else {
      const result = await sql`SELECT * FROM horas_extras WHERE user_email = ${email} AND empresa_id = ${empresaId} ORDER BY data DESC, hora_inicio DESC`;
      rows = result.rows;
    }
    
    return NextResponse.json(rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data, hora_inicio, hora_fim, rota, numero_van, km_inicial, km_final } = await req.json();
    const email = session.user?.email;
    // @ts-ignore
    const empresaId = session.user?.empresa_id;

    // GARANTE QUE A COLUNA EXISTE ANTES DO INSERT
    await sql`ALTER TABLE horas_extras ADD COLUMN IF NOT EXISTS empresa_id INTEGER`;

    await sql`
      INSERT INTO horas_extras (
        data, hora_inicio, hora_fim, rota, user_email, 
        numero_van, km_inicial, km_final, empresa_id
      ) VALUES (
        ${data}, ${hora_inicio}, ${hora_fim}, ${rota}, ${email}, 
        ${numero_van}, ${km_inicial}, ${km_final}, ${empresaId}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro no POST horas:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await sql`DELETE FROM horas_extras WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}