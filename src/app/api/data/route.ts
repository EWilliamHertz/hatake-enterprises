import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getNeonSql();

    const [entities, debts, assets, transactions, users] = await Promise.all([
      sql`SELECT id, name, subtitle, category, url, logo_url as "logoUrl", argon_gradient as "argonGradient", badge_color as "badgeColor", is_locked as "isLocked", created_at as "createdAt" FROM entities ORDER BY CASE category WHEN 'PERSONAL' THEN 1 WHEN 'COMPANY' THEN 2 WHEN 'PROJECT' THEN 3 ELSE 4 END, name ASC`,
      sql`SELECT id, entity_id as "entityId", title, lender, original_principal::float as "originalPrincipal", current_balance::float as "currentBalance", interest_rate::float as "interestRate", due_day as "dueDay", last_activity_type as "lastActivityType", updated_at as "updatedAt" FROM debts ORDER BY updated_at DESC`,
      sql`SELECT id, entity_id as "entityId", name, category, COALESCE(quantity, 1)::int as quantity, COALESCE(unit_value, valuation)::float as "unitValue", valuation::float as valuation, notes, updated_at as "updatedAt" FROM assets ORDER BY valuation DESC`,
      sql`SELECT id, entity_id as "entityId", title, amount::float as amount, type, frequency, execution_date::text as date, linked_debt_id as "linkedDebtId", created_at as "createdAt" FROM transactions ORDER BY execution_date DESC, created_at DESC`,
      sql`SELECT id, email, name, role FROM users LIMIT 1`,
    ]);

    return NextResponse.json({
      success: true,
      source: 'NEON_POSTGRESQL',
      data: {
        entities,
        debts,
        assets,
        transactions,
        user: users[0] || null,
      },
    });
  } catch (error: unknown) {
    console.error('Error querying NeonDB in /api/data:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
