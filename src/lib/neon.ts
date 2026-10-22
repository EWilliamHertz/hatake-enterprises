import { neon } from '@neondatabase/serverless';

export const DEFAULT_DATABASE_URL = process.env.DATABASE_URL || '';

export function getNeonSql(customUrl?: string) {
  const connStr = (customUrl && customUrl.trim()) || process.env.DATABASE_URL || '';
  if (!connStr) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(connStr);
}

export const HATAKE_NEON_SCHEMA_SQL = `
-- Hatake Enterprises - Argon Financial Command Center Schema (Neon PostgreSQL)

CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  assigned_role TEXT DEFAULT 'PARTNER_EXECUTIVE',
  entity_scope TEXT DEFAULT 'HATAKE_ENTERPRISES',
  max_uses INTEGER DEFAULT 10,
  used_count INTEGER DEFAULT 0,
  created_by TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  invite_code_used TEXT REFERENCES invite_codes(code) ON DELETE SET NULL,
  role TEXT DEFAULT 'OPERATOR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subtitle TEXT,
  category TEXT NOT NULL, -- 'PERSONAL' | 'COMPANY' | 'PROJECT' | 'WEB_PLATFORM'
  url TEXT,
  logo_url TEXT,
  argon_gradient TEXT NOT NULL DEFAULT 'from-[#5e72e4] to-[#11cdef]',
  badge_color TEXT NOT NULL DEFAULT 'bg-[#5e72e4]/20 text-[#899bf4] border-[#5e72e4]/40',
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debts (
  id TEXT PRIMARY KEY,
  entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  lender TEXT NOT NULL,
  original_principal NUMERIC(15, 2) NOT NULL,
  current_balance NUMERIC(15, 2) NOT NULL,
  interest_rate NUMERIC(5, 2) NOT NULL,
  due_day INTEGER DEFAULT 19,
  last_activity_type TEXT DEFAULT 'PAYOFF',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'CASH' | 'INVENTORY' | 'IP' | 'DOMAIN_PLATFORM' | 'EQUIPMENT'
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  valuation NUMERIC(15, 2) NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  type TEXT NOT NULL, -- 'INCOME' | 'EXPENSE' | 'PAYOUT' | 'DEBT_PAYOFF' | 'LOAN_DRAWDOWN'
  frequency TEXT NOT NULL, -- 'SINGULAR' | 'RECURRING_19TH'
  execution_date DATE NOT NULL,
  linked_debt_id TEXT REFERENCES debts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

/**
 * Deterministic 19th-of-the-Month Payout Calculator
 * Rule:
 * - Target date is the 19th of a given (year, monthIndex).
 * - If the 19th is Saturday (day === 6) -> shifts to Friday the 18th.
 * - If the 19th is Sunday (day === 0)   -> shifts to Monday the 20th.
 */
export interface PayoutScheduleItem {
  monthLabel: string;
  nominalDateStr: string;
  effectiveDateStr: string;
  effectiveDay: number;
  dayOfWeekName: string;
  shiftStatus: 'NONE' | 'SHIFTED_TO_FRIDAY_18' | 'SHIFTED_TO_MONDAY_20';
  shiftBadgeText: string;
}

export function getEffective19thPayoutDate(year: number, monthIndex: number): PayoutScheduleItem {
  const nominalDate = new Date(year, monthIndex, 19, 12, 0, 0);
  const dayOfWeek = nominalDate.getDay(); // 0 = Sun, 6 = Sat

  let effectiveDay = 19;
  let shiftStatus: PayoutScheduleItem['shiftStatus'] = 'NONE';
  let shiftBadgeText = 'Standard 19th Execution';

  if (dayOfWeek === 6) {
    effectiveDay = 18;
    shiftStatus = 'SHIFTED_TO_FRIDAY_18';
    shiftBadgeText = 'Sat 19th -> Shifted to Fri 18th';
  } else if (dayOfWeek === 0) {
    effectiveDay = 20;
    shiftStatus = 'SHIFTED_TO_MONDAY_20';
    shiftBadgeText = 'Sun 19th -> Shifted to Mon 20th';
  }

  const effectiveDate = new Date(year, monthIndex, effectiveDay, 12, 0, 0);

  const monthLabel = effectiveDate.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });

  const dayOfWeekName = effectiveDate.toLocaleDateString('en-US', {
    weekday: 'long',
  });

  const formatYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    monthLabel,
    nominalDateStr: formatYMD(nominalDate),
    effectiveDateStr: formatYMD(effectiveDate),
    effectiveDay,
    dayOfWeekName,
    shiftStatus,
    shiftBadgeText,
  };
}

export function generateNext12MonthsPayoutSchedule(startDate = new Date()): PayoutScheduleItem[] {
  const schedule: PayoutScheduleItem[] = [];
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();

  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(startYear, startMonth + i, 1);
    schedule.push(getEffective19thPayoutDate(targetDate.getFullYear(), targetDate.getMonth()));
  }
  return schedule;
}

export async function testAndInitNeonDatabase(connectionString: string) {
  const sql = neon(connectionString);
  const result = await sql`SELECT version()`;
  return result[0]?.version || 'Connected to Neon PostgreSQL';
}
