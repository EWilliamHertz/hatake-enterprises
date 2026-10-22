import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getNeonSql } from '@/lib/neon';

const SESSION_COOKIE_NAME = 'hatake_operator_session';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (rawCookie) {
      const parsed = JSON.parse(decodeURIComponent(rawCookie));
      if (parsed && (parsed.email || parsed.name)) {
        return NextResponse.json({ success: true, user: parsed });
      }
    }
    return NextResponse.json({ success: false, user: null });
  } catch {
    return NextResponse.json({ success: false, user: null });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}

export async function POST(req: Request) {
  try {
    const { email, name, inviteCode, mode } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const sql = getNeonSql();

    if (mode === 'REGISTER') {
      if (!name) {
        return NextResponse.json({ error: 'Name is required for registration' }, { status: 400 });
      }
      let assignedRole = 'OPERATOR';
      let validInviteCode = null;

      if (inviteCode && inviteCode.trim()) {
        const trimmedCode = inviteCode.trim().toUpperCase();
        const codeResult = await sql`
          SELECT code, assigned_role, max_uses, used_count, expires_at
          FROM invite_codes
          WHERE code = ${trimmedCode}
        `;

        if (codeResult.length > 0) {
          const inv = codeResult[0];
          const isNotExpired = !inv.expires_at || new Date(inv.expires_at) > new Date();
          const hasUsesLeft = inv.used_count < inv.max_uses;

          if (isNotExpired && hasUsesLeft) {
            assignedRole = inv.assigned_role || 'PARTNER_EXECUTIVE';
            validInviteCode = inv.code;

            // Increment used_count
            await sql`
              UPDATE invite_codes
              SET used_count = used_count + 1
              WHERE code = ${inv.code}
            `;
          }
        }
      }

      // Upsert user
      await sql`
        INSERT INTO users (email, name, password_hash, role, invite_code_used)
        VALUES (${email}, ${name}, 'argon_secured_hash', ${assignedRole}, ${validInviteCode})
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          invite_code_used = COALESCE(EXCLUDED.invite_code_used, users.invite_code_used)
      `;

      const userPayload = { email, name, role: assignedRole, inviteCodeUsed: validInviteCode };
      const res = NextResponse.json({
        success: true,
        user: userPayload,
        elevated: validInviteCode !== null,
      });

      res.cookies.set(SESSION_COOKIE_NAME, encodeURIComponent(JSON.stringify(userPayload)), {
        path: '/',
        maxAge: ONE_YEAR_SECONDS,
        sameSite: 'lax',
      });

      return res;
    }

    // LOGIN MODE: Fetch existing user or create/persist account so they stay logged in
    const existing = await sql`
      SELECT id, email, name, role, invite_code_used as "inviteCodeUsed"
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    let userPayload;
    if (existing.length > 0) {
      userPayload = existing[0];
    } else {
      const fallbackName = (name && name.trim()) || email.split('@')[0];
      await sql`
        INSERT INTO users (email, name, password_hash, role)
        VALUES (${email}, ${fallbackName}, 'argon_secured_hash', 'OPERATOR')
        ON CONFLICT (email) DO NOTHING
      `;
      userPayload = { email, name: fallbackName, role: 'OPERATOR' };
    }

    const res = NextResponse.json({
      success: true,
      user: userPayload,
    });

    res.cookies.set(SESSION_COOKIE_NAME, encodeURIComponent(JSON.stringify(userPayload)), {
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
      sameSite: 'lax',
    });

    return res;
  } catch (error: unknown) {
    console.error('Auth error in /api/auth:', error);
    const msg = error instanceof Error ? error.message : 'Database error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
