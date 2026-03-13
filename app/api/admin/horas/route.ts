import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { data, hora_inicio, hora_fim, rota, numero_van, km_inicial, km_final } = await req.json();
    
    await sql`
      INSERT INTO horas_extras (data, hora_inicio, hora_fim, rota, user_email, numero_van, km_inicial, km_final)
      VALUES (${data}, ${hora_inicio}, ${hora_fim}, ${rota}, ${session.user?.email}, ${numero_van}, ${km_inicial}, ${km_final})
    `;
    
    return NextResponse.json({ message: 'Salvo com sucesso' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');

  try {
    let result;
    if (inicio && fim) {
      result = await sql`
        SELECT * FROM horas_extras 
        WHERE user_email = ${session.user?.email} 
        AND data BETWEEN ${inicio} AND ${fim}
        ORDER BY data DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM horas_extras 
        WHERE user_email = ${session.user?.email} 
        ORDER BY data DESC
      `;
    }
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Adicione também a função DELETE e PUT conforme você já tinha, 
// apenas garantindo que o PUT também receba os novos campos.