import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
// Subimos dois níveis: de 'horas' para 'api', e de 'api' para 'app'
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    // Busca todos os campos, incluindo os novos que você criou
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
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { data, hora_inicio, hora_fim, rota, numero_van, km_inicial, km_final } = await req.json();
    
    // Converte KMs para número ou null para evitar erro no banco de dados
    const kmIni = km_inicial ? parseInt(km_inicial) : null;
    const kmFim = km_final ? parseInt(km_final) : null;

    await sql`
      INSERT INTO horas_extras (data, hora_inicio, hora_fim, rota, user_email, numero_van, km_inicial, km_final)
      VALUES (${data}, ${hora_inicio}, ${hora_fim}, ${rota}, ${session.user?.email}, ${numero_van}, ${kmIni}, ${kmFim})
    `;
    
    return NextResponse.json({ message: 'Salvo com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}