import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Caminho ajustado conforme sua árvore de pastas
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const result = await sql`
      SELECT id, data, hora_inicio, hora_fim, rota, numero_van, km_inicial, km_final 
      FROM horas_extras 
      WHERE user_email = ${session.user?.email} 
      ORDER BY data DESC
    `;
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data, hora_inicio, hora_fim, rota, numero_van, km_inicial, km_final } = await req.json();
    
    await sql`
      INSERT INTO horas_extras (data, hora_inicio, hora_fim, rota, user_email, numero_van, km_inicial, km_final)
      VALUES (${data}, ${hora_inicio}, ${hora_fim}, ${rota}, ${session.user?.email}, ${numero_van}, ${km_inicial}, ${km_final})
    `;
    
    return NextResponse.json({ message: 'Salvo com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}