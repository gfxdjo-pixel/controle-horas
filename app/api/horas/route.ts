import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route'; // Puxa as regras de login

export const dynamic = 'force-dynamic'; // MATA O CACHE: Obriga o Next.js a sempre ir no banco novo

export async function GET(request: Request) {
  // Passa o authOptions para garantir que ele ache o usuário
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const userEmail = session.user.email;

  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');

  try {
    let result;
    if (inicio && fim) {
      result = await sql`
        SELECT * FROM horas_extras 
        WHERE user_email = ${userEmail} AND data >= ${inicio} AND data <= ${fim} 
        ORDER BY data DESC;
      `;
    } else {
      result = await sql`
        SELECT * FROM horas_extras 
        WHERE user_email = ${userEmail} 
        ORDER BY data DESC LIMIT 100;
      `;
    }
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar dados' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const { data, hora_inicio, hora_fim, rota } = await request.json();
    await sql`
      INSERT INTO horas_extras (data, hora_inicio, hora_fim, rota, user_email)
      VALUES (${data}, ${hora_inicio}, ${hora_fim}, ${rota}, ${userEmail});
    `;
    return NextResponse.json({ message: 'Registro adicionado!' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar no banco' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const { id, data, hora_inicio, hora_fim, rota } = await request.json();
    await sql`
      UPDATE horas_extras 
      SET data = ${data}, hora_inicio = ${hora_inicio}, hora_fim = ${hora_fim}, rota = ${rota}
      WHERE id = ${id} AND user_email = ${userEmail};
    `;
    return NextResponse.json({ message: 'Registro atualizado!' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar no banco' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const userEmail = session.user.email;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  try {
    await sql`DELETE FROM horas_extras WHERE id = ${id} AND user_email = ${userEmail};`;
    return NextResponse.json({ message: 'Deletado com sucesso' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao deletar' }, { status: 500 });
  }
}