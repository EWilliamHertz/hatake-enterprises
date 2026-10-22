import { NextResponse } from 'next/server';
import { getNeonSql } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const createdBy = searchParams.get('createdBy');

    const sql = getNeonSql();

    let codes;
    if (createdBy && createdBy.trim()) {
      codes = await sql`
        SELECT 
          code,
          assigned_role as role,
          badge,
          clearance,
          entity_scope as "entityScope",
          max_uses as "maxUses",
          used_count as "usedCount",
          created_by as "createdBy",
          expires_at as "expiresAt",
          created_at as "createdAt"
        FROM invite_codes
        WHERE created_by = ${createdBy.trim()}
        ORDER BY created_at DESC
      `;
    } else {
      codes = await sql`
        SELECT 
          code,
          assigned_role as role,
          badge,
          clearance,
          entity_scope as "entityScope",
          max_uses as "maxUses",
          used_count as "usedCount",
          created_by as "createdBy",
          expires_at as "expiresAt",
          created_at as "createdAt"
        FROM invite_codes
        ORDER BY created_at DESC
      `;
    }

    // Fetch all users who registered with any invite code
    const referredUsers = await sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.invite_code_used as "inviteCodeUsed",
        u.created_at as "createdAt"
      FROM users u
      WHERE u.invite_code_used IS NOT NULL
      ORDER BY u.created_at DESC
    `;

    return NextResponse.json({ success: true, codes, referredUsers });
  } catch (error: unknown) {
    console.error('Error fetching invite codes:', error);
    const msg = error instanceof Error ? error.message : 'Database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      code,
      assignedRole,
      entityScope,
      maxUses,
      expiresAt,
      createdBy,
      badge,
      clearance,
    } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Referral invite code is required' }, { status: 400 });
    }

    const trimmedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!trimmedCode || trimmedCode.length < 3) {
      return NextResponse.json(
        { error: 'Referral code must be at least 3 alphanumeric characters (letters, numbers, hyphens).' },
        { status: 400 }
      );
    }

    const sql = getNeonSql();

    // Check if code already exists
    const existing = await sql`
      SELECT code FROM invite_codes WHERE code = ${trimmedCode} LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Invite code "${trimmedCode}" already exists. Please choose a unique code.` },
        { status: 409 }
      );
    }

    const role = assignedRole?.trim() || 'PARTNER_EXECUTIVE';
    const scope = entityScope?.trim() || 'HATAKE_ENTERPRISES';
    const uses = parseInt(maxUses, 10) || 10;
    const expiry = expiresAt && expiresAt.trim() ? new Date(expiresAt).toISOString() : null;
    const author = createdBy?.trim() || null;
    const tagBadge = badge?.trim() || 'REFERRAL';
    const tagClearance = clearance?.trim() || (author ? `Invited by ${author}` : 'Executive Referral Tier');

    await sql`
      INSERT INTO invite_codes (
        code,
        assigned_role,
        entity_scope,
        max_uses,
        used_count,
        created_by,
        expires_at,
        badge,
        clearance
      ) VALUES (
        ${trimmedCode},
        ${role},
        ${scope},
        ${uses},
        0,
        ${author},
        ${expiry},
        ${tagBadge},
        ${tagClearance}
      )
    `;

    return NextResponse.json({
      success: true,
      code: {
        code: trimmedCode,
        role,
        entityScope: scope,
        maxUses: uses,
        usedCount: 0,
        createdBy: author,
        expiresAt: expiry,
        badge: tagBadge,
        clearance: tagClearance,
      },
    });
  } catch (error: unknown) {
    console.error('Error creating referral invite code:', error);
    const msg = error instanceof Error ? error.message : 'Database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const sql = getNeonSql();
    await sql`
      DELETE FROM invite_codes WHERE code = ${code.trim().toUpperCase()}
    `;

    return NextResponse.json({ success: true, code: code.trim().toUpperCase() });
  } catch (error: unknown) {
    console.error('Error deleting invite code:', error);
    const msg = error instanceof Error ? error.message : 'Database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
