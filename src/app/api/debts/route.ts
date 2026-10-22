import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, entityId, title, lender, originalPrincipal, currentBalance, interestRate } = body;

    const orig = parseFloat(originalPrincipal);
    const bal = currentBalance !== undefined ? parseFloat(currentBalance) : orig;
    const rate = parseFloat(interestRate) || 0;

    if (!entityId || !title || isNaN(orig) || orig <= 0) {
      return NextResponse.json({ error: 'Invalid debt fields' }, { status: 400 });
    }

    const sql = getNeonSql();
    const debtId = id || `debt-${Date.now()}`;

    await sql`
      INSERT INTO debts (id, entity_id, title, lender, original_principal, current_balance, interest_rate, due_day, last_activity_type)
      VALUES (${debtId}, ${entityId}, ${title.trim()}, ${lender?.trim() || ''}, ${orig}, ${isNaN(bal) ? orig : bal}, ${rate}, 19, 'PAYOFF')
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        lender = EXCLUDED.lender,
        original_principal = EXCLUDED.original_principal,
        current_balance = EXCLUDED.current_balance,
        interest_rate = EXCLUDED.interest_rate,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true, debtId });
  } catch (error: unknown) {
    console.error('Error adding debt to NeonDB:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Debt ID is required' }, { status: 400 });
    }

    const sql = getNeonSql();
    await sql`DELETE FROM debts WHERE id = ${id}`;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    console.error('Error deleting debt:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
