import { NextResponse } from 'next/server';
import { getNeonSql, HATAKE_NEON_SCHEMA_SQL } from '@/lib/neon';

export async function POST(req: Request) {
  try {
    const { connectionString, runSchema } = await req.json().catch(() => ({}));
    const sql = getNeonSql(connectionString);

    const versionResult = await sql`SELECT version()`;
    const version = versionResult[0]?.version || 'Connected to Neon PostgreSQL';

    if (runSchema) {
      // Execute the schema statements
      await (sql as any).unsafe(HATAKE_NEON_SCHEMA_SQL);
    }

    const counts = await Promise.all([
      sql`SELECT count(*) as count FROM entities`,
      sql`SELECT count(*) as count FROM debts`,
      sql`SELECT count(*) as count FROM assets`,
      sql`SELECT count(*) as count FROM transactions`,
    ]);

    return NextResponse.json({
      success: true,
      version,
      stats: {
        entities: counts[0][0]?.count || 0,
        debts: counts[1][0]?.count || 0,
        assets: counts[2][0]?.count || 0,
        transactions: counts[3][0]?.count || 0,
      },
    });
  } catch (error: unknown) {
    console.error('Error verifying NeonDB:', error);
    const msg = error instanceof Error ? error.message : 'Failed to reach Neon PostgreSQL';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
