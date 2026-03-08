import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');

  try {
    let result;
    if (inicio && fim) {
      result = await sql`
        SELECT * FROM horas_extras 
        WHERE data >= ${inicio} AND data <= ${fim} 
        ORDER BY data DESC;
      `;
    } else {
      result = await sql`SELECT * FROM horas_extras ORDER BY data DESC LIMIT 100;`;
    }
    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar dados' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { data, hora_inicio, hora_fim, rota } = await request.json();
    await sql`
      INSERT INTO horas_extras (data, hora_inicio, hora_fim, rota)
      VALUES (${data}, ${hora_inicio}, ${hora_fim}, ${rota});
    `;
    return NextResponse.json({ message: 'Registro adicionado!' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar no banco' }, { status: 500 });
  }
}

// NOVA FUNÇÃO: Atualizar registro existente
export async function PUT(request: Request) {
  try {
    const { id, data, hora_inicio, hora_fim, rota } = await request.json();
    await sql`
      UPDATE horas_extras 
      SET data = ${data}, hora_inicio = ${hora_inicio}, hora_fim = ${hora_fim}, rota = ${rota}
      WHERE id = ${id};
    `;
    return NextResponse.json({ message: 'Registro atualizado!' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar no banco' }, { status: 500 });
  }
}

// NOVA FUNÇÃO: Deletar registro
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  try {
    await sql`DELETE FROM horas_extras WHERE id = ${id};`;
    return NextResponse.json({ message: 'Deletado com sucesso' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao deletar' }, { status: 500 });
  }
}