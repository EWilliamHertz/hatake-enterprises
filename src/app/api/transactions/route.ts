import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entityId');
    const format = searchParams.get('format');

    const sql = getNeonSql();

    let rows;
    if (entityId) {
      rows = await sql`
        SELECT id, entity_id as "entityId", title, amount::float as amount, type, frequency, execution_date::text as date, linked_debt_id as "linkedDebtId", created_at as "createdAt"
        FROM transactions
        WHERE entity_id = ${entityId}
        ORDER BY execution_date DESC, created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT id, entity_id as "entityId", title, amount::float as amount, type, frequency, execution_date::text as date, linked_debt_id as "linkedDebtId", created_at as "createdAt"
        FROM transactions
        ORDER BY execution_date DESC, created_at DESC
      `;
    }

    if (format === 'csv') {
      const escapeCsv = (val: unknown) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const header = ['id', 'date', 'type', 'amount', 'title', 'entity_id', 'frequency'].join(',');
      const csvRows = rows.map((r: Record<string, unknown>) => [
        escapeCsv(r.id),
        escapeCsv(r.date),
        escapeCsv(r.type),
        escapeCsv(r.amount),
        escapeCsv(r.title),
        escapeCsv(r.entityId),
        escapeCsv(r.frequency),
      ].join(','));

      const csvContent = [header, ...csvRows].join('\n');
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="hatake-transactions.csv"',
        },
      });
    }

    return NextResponse.json({ success: true, transactions: rows });
  } catch (error: unknown) {
    console.error('Error fetching transactions:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sql = getNeonSql();

    // Support bulk import of transactions
    if (Array.isArray(body.transactions)) {
      const results = [];
      for (const item of body.transactions) {
        const itemAmount = parseFloat(item.amount);
        if (!item.title || isNaN(itemAmount)) continue;
        const txId = item.id || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const date = item.date || new Date().toISOString().split('T')[0];
        const type = (item.type || 'EXPENSE').toUpperCase();
        const frequency = item.frequency || 'SINGULAR';
        const entityId = item.entityId;

        await sql`
          INSERT INTO transactions (id, entity_id, title, amount, type, frequency, execution_date, linked_debt_id, created_at)
          VALUES (${txId}, ${entityId}, ${item.title.trim()}, ${itemAmount}, ${type}, ${frequency}, ${date}, NULL, NOW())
          ON CONFLICT (id) DO UPDATE SET
            entity_id = EXCLUDED.entity_id,
            title = EXCLUDED.title,
            amount = EXCLUDED.amount,
            type = EXCLUDED.type,
            frequency = EXCLUDED.frequency,
            execution_date = EXCLUDED.execution_date
        `;
        results.push(txId);
      }
      return NextResponse.json({ success: true, importedCount: results.length });
    }

    const {
      entityId,
      title,
      amount,
      type,
      frequency,
      date,
      linkedDebtId,
      newLoanTitle,
      newLoanLender,
      newLoanRate,
    } = body;

    const numericAmount = parseFloat(amount);
    if (!title || isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid title or amount' }, { status: 400 });
    }

    const txId = body.id || `tx-${Date.now()}`;
    let finalLinkedDebtId: string | null = null;

    // 1. Debt Payoff: reduce debt balance in NeonDB
    if (type === 'DEBT_PAYOFF' && linkedDebtId && linkedDebtId !== 'NEW_LOAN_FACILITY') {
      const debtExists = await sql`SELECT id FROM debts WHERE id = ${linkedDebtId} LIMIT 1`;
      if (debtExists.length > 0) {
        finalLinkedDebtId = linkedDebtId;
        await sql`
          UPDATE debts
          SET current_balance = GREATEST(0, current_balance - ${numericAmount}),
              last_activity_type = 'PAYOFF',
              updated_at = NOW()
          WHERE id = ${linkedDebtId}
        `;
      }
    }

    // 2. Loan Drawdown: increase debt balance OR originate new debt facility
    if (type === 'LOAN_DRAWDOWN') {
      if (linkedDebtId === 'NEW_LOAN_FACILITY' || !linkedDebtId) {
        const createdDebtId = body.createdDebtId || `debt-${Date.now()}`;
        finalLinkedDebtId = createdDebtId;
        const loanTitle = newLoanTitle?.trim() || title.trim();
        const loanLender = newLoanLender?.trim() || '';
        const rate = parseFloat(newLoanRate) || 0;

        await sql`
          INSERT INTO debts (id, entity_id, title, lender, original_principal, current_balance, interest_rate, due_day, last_activity_type)
          VALUES (${createdDebtId}, ${entityId}, ${loanTitle}, ${loanLender}, ${numericAmount}, ${numericAmount}, ${rate}, 19, 'DRAWDOWN')
        `;
      } else {
        const debtExists = await sql`SELECT id FROM debts WHERE id = ${linkedDebtId} LIMIT 1`;
        if (debtExists.length > 0) {
          finalLinkedDebtId = linkedDebtId;
          await sql`
            UPDATE debts
            SET current_balance = current_balance + ${numericAmount},
                original_principal = GREATEST(original_principal, current_balance + ${numericAmount}),
                last_activity_type = 'DRAWDOWN',
                updated_at = NOW()
            WHERE id = ${linkedDebtId}
          `;
        }
      }
    }

    // Extra safeguard: NEVER allow dummy facility string as foreign key
    if (finalLinkedDebtId === 'NEW_LOAN_FACILITY') {
      finalLinkedDebtId = null;
    }

    // Insert Transaction
    await sql`
      INSERT INTO transactions (id, entity_id, title, amount, type, frequency, execution_date, linked_debt_id)
      VALUES (${txId}, ${entityId}, ${title.trim()}, ${numericAmount}, ${type}, ${frequency}, ${date}, ${finalLinkedDebtId})
    `;

    return NextResponse.json({ success: true, transactionId: txId, linkedDebtId: finalLinkedDebtId });
  } catch (error: unknown) {
    console.error('Error creating transaction in NeonDB:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, entityId, title, amount, type, frequency, date, linkedDebtId } = body;
    const numericAmount = parseFloat(amount);
    if (!id || !title || isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid id, title, or amount' }, { status: 400 });
    }

    const sql = getNeonSql();
    let finalLinkedDebtId = (linkedDebtId && linkedDebtId !== 'NEW_LOAN_FACILITY') ? linkedDebtId : null;

    if (finalLinkedDebtId) {
      const debtExists = await sql`SELECT id FROM debts WHERE id = ${finalLinkedDebtId} LIMIT 1`;
      if (debtExists.length === 0) {
        finalLinkedDebtId = null;
      }
    }

    await sql`
      UPDATE transactions
      SET entity_id = ${entityId},
          title = ${title.trim()},
          amount = ${numericAmount},
          type = ${type},
          frequency = ${frequency},
          execution_date = ${date},
          linked_debt_id = ${finalLinkedDebtId}
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true, updatedId: id });
  } catch (error: unknown) {
    console.error('Error updating transaction in NeonDB:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
    }

    const sql = getNeonSql();
    await sql`DELETE FROM transactions WHERE id = ${id}`;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    console.error('Error deleting transaction in NeonDB:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
