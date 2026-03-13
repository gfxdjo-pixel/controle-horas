import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Esta é a forma mais segura de importar quando o caminho relativo falha
// Ele sobe 3 níveis para chegar na raiz e entrar na pasta auth
import { authOptions } from "../auth/[...nextauth]/route";

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

    const body = await req.json();
    
    // Tratando os números para o banco de dados
    const km_ini = body.km_inicial ? parseInt(body.km_inicial) : null;
    const km_fim = body.km_final ? parseInt(body.km_final) : null;

    await sql`
      INSERT INTO horas_extras (data, hora_inicio, hora_fim, rota, user_email, numero_van, km_inicial, km_final)
      VALUES (
        ${body.data}, 
        ${body.hora_inicio}, 
        ${body.hora_fim}, 
        ${body.rota}, 
        ${session.user?.email}, 
        ${body.numero_van}, 
        ${km_ini}, 
        ${km_fim}
      )
    `;
    
    return NextResponse.json({ message: 'Salvo com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}