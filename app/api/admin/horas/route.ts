import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "../../auth/[...nextauth]/route";

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
  
  try {
    const { data, hora_inicio, hora_fim, rota, numero_van, km_inicial, km_final } = await req.json();
    
    // Forçamos a gravação do email da sessão
    await sql`
      INSERT INTO horas_extras (data, hora_inicio, hora_fim, rota, user_email, numero_van, km_inicial, km_final) 
      VALUES (${data}, ${hora_inicio}, ${hora_fim}, ${rota}, ${session.user.email}, ${numero_van}, ${km_inicial}, ${km_final})
    `;
    
    return NextResponse.json({ message: 'Salvo com sucesso' });
  } catch (error: any) { 
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID ausente' }, { status: 400 });

    // Deleta apenas se o ID bater E o email for do dono (segurança)
    const result = await sql`
      DELETE FROM horas_extras 
      WHERE id = ${parseInt(id)} 
      AND user_email = ${session.user?.email}
      RETURNING *;
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Registro não encontrado ou sem permissão' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Excluído com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}