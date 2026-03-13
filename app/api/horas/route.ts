import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "./../auth/[...nextauth]/route";

// ... (mantenha os blocos GET, POST e DELETE que já temos)

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await req.json();
    const { id, data, hora_inicio, hora_fim, rota, numero_van, km_inicial, km_final } = body;

    if (!id) return NextResponse.json({ error: 'ID ausente para edição' }, { status: 400 });

    await sql`
      UPDATE horas_extras 
      SET data = ${data}, 
          hora_inicio = ${hora_inicio}, 
          hora_fim = ${hora_fim}, 
          rota = ${rota}, 
          numero_van = ${numero_van}, 
          km_inicial = ${km_inicial}, 
          km_final = ${km_final}
      WHERE id = ${parseInt(id)} 
      AND user_email = ${session.user?.email}
    `;

    return NextResponse.json({ message: 'Atualizado com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Re-insira os outros métodos aqui para garantir que o arquivo esteja completo