import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, subtitle, category, url, logoUrl, argonGradient, badgeColor } = body;

    if (!id || !name || !category) {
      return NextResponse.json({ error: 'Missing required entity fields' }, { status: 400 });
    }

    const sql = getNeonSql();
    await sql`
      INSERT INTO entities (id, name, subtitle, category, url, logo_url, argon_gradient, badge_color, is_locked)
      VALUES (${id}, ${name}, ${subtitle || ''}, ${category}, ${url || null}, ${logoUrl || null}, ${argonGradient || 'from-[#5e72e4] to-[#11cdef]'}, ${badgeColor || 'bg-[#5e72e4]/20 text-[#899bf4] border-[#5e72e4]/40'}, false)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        subtitle = EXCLUDED.subtitle,
        category = EXCLUDED.category,
        url = EXCLUDED.url,
        logo_url = EXCLUDED.logo_url,
        argon_gradient = EXCLUDED.argon_gradient,
        badge_color = EXCLUDED.badge_color
    `;

    return NextResponse.json({ success: true, entityId: id });
  } catch (error: unknown) {
    console.error('Error in /api/entities POST:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 });
    }

    const sql = getNeonSql();
    // Cascade delete associated debts, assets, transactions
    await sql`DELETE FROM transactions WHERE entity_id = ${id}`;
    await sql`DELETE FROM assets WHERE entity_id = ${id}`;
    await sql`DELETE FROM debts WHERE entity_id = ${id}`;
    await sql`DELETE FROM entities WHERE id = ${id}`;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    console.error('Error in /api/entities DELETE:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
