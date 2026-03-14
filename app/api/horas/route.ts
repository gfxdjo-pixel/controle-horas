import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "./../auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    // Adicionado ORDER BY data DESC, hora_inicio DESC
    const result = await sql`
      SELECT * FROM horas_extras 
      WHERE user_email = ${session.user?.email} 
      ORDER BY data DESC, hora_inicio DESC
    `;
    return NextResponse.json(result.rows);
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

// ... manter as funções POST, PUT e DELETE que já temos