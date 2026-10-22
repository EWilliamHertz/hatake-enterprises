import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entityId, name, category, quantity, unitValue, valuation, notes } = body;

    const numQuantity = Math.max(0, parseInt(String(quantity ?? 1), 10) || 1);
    const numValuation = parseFloat(valuation);
    const numUnitValue =
      unitValue !== undefined && !isNaN(parseFloat(unitValue))
        ? parseFloat(unitValue)
        : numQuantity > 0
        ? numValuation / numQuantity
        : numValuation;

    if (!name || isNaN(numValuation) || numValuation < 0) {
      return NextResponse.json({ error: 'Invalid asset name or valuation' }, { status: 400 });
    }

    const sql = getNeonSql();
    const assetId = body.id || `asset-${Date.now()}`;

    await sql`
      INSERT INTO assets (id, entity_id, name, category, quantity, unit_value, valuation, notes)
      VALUES (${assetId}, ${entityId}, ${name.trim()}, ${category}, ${numQuantity}, ${numUnitValue}, ${numValuation}, ${notes?.trim() || ''})
      ON CONFLICT (id) DO UPDATE SET
        entity_id = EXCLUDED.entity_id,
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        quantity = EXCLUDED.quantity,
        unit_value = EXCLUDED.unit_value,
        valuation = EXCLUDED.valuation,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true, assetId });
  } catch (error: unknown) {
    console.error('Error adding asset to NeonDB:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, entityId, name, category, quantity, unitValue, valuation, notes } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'Asset ID and name are required' }, { status: 400 });
    }

    const numQuantity = Math.max(0, parseInt(String(quantity ?? 1), 10) || 0);
    const numValuation = parseFloat(valuation) || 0;
    const numUnitValue =
      unitValue !== undefined && !isNaN(parseFloat(unitValue))
        ? parseFloat(unitValue)
        : numQuantity > 0
        ? numValuation / numQuantity
        : numValuation;

    const sql = getNeonSql();
    await sql`
      UPDATE assets
      SET
        entity_id = ${entityId},
        name = ${name.trim()},
        category = ${category},
        quantity = ${numQuantity},
        unit_value = ${numUnitValue},
        valuation = ${numValuation},
        notes = ${notes?.trim() || ''},
        updated_at = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true, updatedId: id });
  } catch (error: unknown) {
    console.error('Error updating asset in NeonDB:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Asset ID is required' }, { status: 400 });
    }

    const sql = getNeonSql();
    await sql`DELETE FROM assets WHERE id = ${id}`;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: unknown) {
    console.error('Error deleting asset:', error);
    const msg = error instanceof Error ? error.message : 'Unknown database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
