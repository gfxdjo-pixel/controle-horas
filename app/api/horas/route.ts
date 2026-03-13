import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "./../auth/[...nextauth]/route";

// LISTAR REGISTROS (GET)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const result = await sql`SELECT * FROM horas_extras WHERE user_email = ${session.user?.email} ORDER BY data DESC`;
    return NextResponse.json(result.rows);
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

// CRIAR NOVO REGISTRO (POST)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
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

// EDITAR REGISTRO EXISTENTE (PUT)
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const { id, data, hora_inicio, hora_fim, rota, numero_van, km_inicial, km_final } = await req.json();
    await sql`
      UPDATE horas_extras 
      SET data = ${data}, 
          hora_inicio = ${hora_inicio}, 
          hora_fim = ${hora_fim}, 
          rota = ${rota}, 
          numero_van = ${numero_van}, 
          km_inicial = ${km_inicial}, 
          km_final = ${km_final}
      WHERE id = ${Number(id)} AND user_email = ${session.user?.email}
    `;
    return NextResponse.json({ message: 'Atualizado com sucesso' });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

// DELETAR REGISTRO (DELETE)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
    await sql`DELETE FROM horas_extras WHERE id = ${Number(id)} AND user_email = ${session.user?.email}`;
    return NextResponse.json({ message: 'Excluído!' });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}