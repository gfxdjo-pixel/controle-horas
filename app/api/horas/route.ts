import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "./../auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const result = await sql`SELECT * FROM horas_extras WHERE user_email = ${session.user?.email} ORDER BY data DESC`;
    return NextResponse.json(result.rows);
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const { data, hora_inicio, hora_fim, rota, numero_van, km_inicial, km_final } = await req.json();
    // AQUI GRAVAMOS O EMAIL - ESSENCIAL PARA O ADMIN VER
    await sql`INSERT INTO horas_extras (data, hora_inicio, hora_fim, rota, user_email, numero_van, km_inicial, km_final) VALUES (${data}, ${hora_inicio}, ${hora_fim}, ${rota}, ${session.user?.email}, ${numero_van}, ${km_inicial}, ${km_final})`;
    return NextResponse.json({ message: 'Salvo com sucesso' });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
    // Deleta apenas se o ID bater (sem travar por email para teste)
    await sql`DELETE FROM horas_extras WHERE id = ${Number(id)}`;
    return NextResponse.json({ message: 'Excluído!' });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}