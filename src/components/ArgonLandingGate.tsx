// src/components/ArgonLandingGate.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Landmark,
  KeyRound,
  ArrowRight,
  Flame,
  Layers,
  CheckCircle2,
  Cpu,
  UserPlus,
  LogIn,
  Database,
  Building2,
  ImagePlus,
  User,
  Sparkles,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Workflow,
  RefreshCw,
} from "lucide-react";

export interface AuthenticatedOperator {
  name: string;
  email: string;
  role: string;
  inviteCode?: string;
}

interface ArgonLandingGateProps {
  onUnlockDashboard: (operator: AuthenticatedOperator, neonConnectionUrl?: string) => void;
  activeOperator?: AuthenticatedOperator | null;
  onReturnToDashboard?: () => void;
}

const CORE_PILLARS = [
  {
    badge: "01 / WORKSPACE TOPOLOGY",
    title: "Custom Personal & Enterprise Nodes",
    description:
      "Create and organize unlimited personal vaults, companies, IP projects, or web ecosystems—each equipped with custom uploaded logos, isolated KPIs, and one-click cascading deletion with zero preprogrammed bloat.",
    icon: Building2,
    accent: "from-[#5e72e4] to-[#11cdef]",
    bullets: [
      "Create custom Personal, Company, Project, or Web Platform nodes from scratch",
      "Upload PNG, SVG, or WebP logos directly to each enterprise node",
      "Instant context switching between isolated entity books",
    ],
  },
  {
    badge: "02 / VISUAL DEBT REACTOR",
    title: "Bi-Directional Debt-to-Transaction Association",
    description:
      "Never track loans in a static spreadsheet again. Every transaction can be directly wired to a specific debt facility—either paying down principal with spring-animated progress bars or drawing down new loan capital.",
    icon: Flame,
    accent: "from-[#f5365c] to-[#fb6340]",
    bullets: [
      "Direct Payoff mode subtracts transaction value from remaining debt balance",
      "Loan Drawdown mode originates new debt facilities or expands existing credit lines",
      "Real-time liquidation percentage telemetry and per-debt audit trails",
    ],
  },
  {
    badge: "03 / ASSET & INVENTORY COMMAND",
    title: "Cross-Entity Capital & Inventory Ledger",
    description:
      "Track cash reserves, physical inventory stock, intellectual property valuations, and domain assets across every personal and corporate entity in real time.",
    icon: Layers,
    accent: "from-[#11cdef] to-[#2dce89]",
    bullets: [
      "Categorize assets across Cash, Inventory, IP, Web Platforms, and Equipment",
      "Real-time net worth calculation combining assets, net cash flow, and active liabilities",
      "Scoped per-entity asset books with instant valuation rollups",
    ],
  },
  {
    badge: "04 / CLOUD & LOCAL PERSISTENCE",
    title: "Dual-Engine Storage with Neon Serverless PostgreSQL",
    description:
      "Operate with zero-latency state persistence backed by Neon Serverless PostgreSQL to keep your multi-entity ledger, invite codes, and transactions synchronized.",
    icon: Database,
    accent: "from-[#825ee4] to-[#5e72e4]",
    bullets: [
      "Automatic cloud database synchronization for entities, debts, assets, and transactions",
      "Isolated multi-entity ledger architecture with cascading cleanup",
      "Role-aware Invite Code onboarding gate for partners and operators",
    ],
  },
];

const WORKFLOW_STEPS = [
  {
    step: "STEP 01",
    title: "Authenticate & Enter Invite Code",
    detail:
      "Register your operator profile at the Argon Gate or sign in to your existing account.",
    icon: Lock,
  },
  {
    step: "STEP 02",
    title: "Create Your Entities & Upload Logos",
    detail:
      "Start with a clean slate—create your own personal or corporate entities with uploaded brand logos and dedicated URLs.",
    icon: ImagePlus,
  },
  {
    step: "STEP 03",
    title: "Register Assets & Originate Debts",
    detail:
      "Log cash reserves, inventory, intellectual property, or domain equity in the Assets tab and initialize active credit facilities.",
    icon: Layers,
  },
  {
    step: "STEP 04",
    title: "Execute & Link Transactions",
    detail:
      "Record one-off or recurring cash flows and link them directly to liquidate or expand your tracked debts.",
    icon: RefreshCw,
  },
];

export default function ArgonLandingGate({
  onUnlockDashboard,
  activeOperator,
  onReturnToDashboard,
}: ArgonLandingGateProps) {
  const [mode, setMode] = useState<"REGISTER" | "LOGIN">("REGISTER");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [detectedReferralCode, setDetectedReferralCode] = useState<string | null>(null);
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authGateRef = useRef<HTMLDivElement>(null);
  const featuresSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get("ref") || params.get("invite") || params.get("code");
        if (ref && ref.trim()) {
          const clean = ref.trim().toUpperCase();
          setInviteCode(clean);
          setDetectedReferralCode(clean);
          setMode("REGISTER");
        }
      } catch (e) {
        console.warn("Could not parse referral parameters", e);
      }
    }
  }, []);

  const scrollToAuthGate = () => {
    authGateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const scrollToFeatures = () => {
    featuresSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setAuthError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: fullName.trim() || email.split("@")[0],
          inviteCode:
            mode === "REGISTER" && inviteCode.trim() ? inviteCode.trim().toUpperCase() : undefined,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || "Authentication failed. Please verify your details.");
        setIsSubmitting(false);
        return;
      }

      const operator: AuthenticatedOperator = {
        name: data.user.name || fullName.trim() || email.split("@")[0],
        email: data.user.email || email.trim(),
        role: data.user.role || "OPERATOR",
        inviteCode:
          data.user.inviteCodeUsed ||
          (mode === "REGISTER" && inviteCode.trim() ? inviteCode.trim().toUpperCase() : undefined),
      };

      onUnlockDashboard(operator);
    } catch (err) {
      console.warn("Backend auth offline fallback:", err);
      const operator: AuthenticatedOperator = {
        name: fullName.trim() || email.split("@")[0],
        email: email.trim(),
        role: "OPERATOR",
        inviteCode: mode === "REGISTER" && inviteCode.trim() ? inviteCode.trim().toUpperCase() : undefined,
      };
      onUnlockDashboard(operator);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 relative overflow-x-hidden overflow-y-auto selection:bg-[#5e72e4] selection:text-white scroll-smooth">
      {/* ========================================== */}
      {/* HOLOGRAPHIC ARGON AMBIENT MESH & GRID      */}
      {/* ========================================== */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(94,114,228,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(94,114,228,0.05)_1px,transparent_1px)] bg-[size:52px_52px] pointer-events-none" />
      <div className="fixed -top-40 -left-40 w-[560px] h-[560px] rounded-full bg-gradient-to-br from-[#5e72e4]/25 via-[#825ee4]/15 to-transparent blur-[140px] pointer-events-none" />
      <div className="fixed top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-gradient-to-bl from-[#11cdef]/20 via-[#2dce89]/10 to-transparent blur-[140px] pointer-events-none" />

      {/* ========================================== */}
      {/* STICKY TOP NAVIGATION BAR                  */}
      {/* ========================================== */}
      <header className="sticky top-0 z-40 bg-[#070a12]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#5e72e4] via-[#825ee4] to-[#11cdef] p-0.5 shadow-lg shadow-[#5e72e4]/30">
              <div className="h-full w-full bg-[#0b0f19] rounded-[14px] flex items-center justify-center">
                <Landmark className="w-5 h-5 text-[#11cdef]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-lg text-white">
                  HATAKE ENTERPRISES
                </span>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-[#5e72e4]/20 text-[#899bf4] border border-[#5e72e4]/40">
                  Argon Financial OS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-Entity Treasury, Visual Debt Reactor & Asset Command
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={scrollToFeatures}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 transition"
            >
              Explore Platform Architecture
              <ChevronDown className="w-3.5 h-3.5 text-[#11cdef]" />
            </button>
            {activeOperator && onReturnToDashboard ? (
              <button
                type="button"
                onClick={onReturnToDashboard}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-white text-xs font-extrabold shadow-lg shadow-[#5e72e4]/25 hover:opacity-95 transition"
              >
                <span>{activeOperator.name || activeOperator.email}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode("REGISTER");
                  scrollToAuthGate();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-xs font-extrabold text-white shadow-lg shadow-[#5e72e4]/25 hover:opacity-95 transition"
              >
                Register / Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================== */}
      {/* SECTION 1: HERO & REGISTRATION GATE        */}
      {/* ========================================== */}
      <section className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 pt-12 pb-20 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* LEFT 7 COLUMNS: HERO VALUE PROPOSITION & OVERVIEW HIGHLIGHTS */}
        <div className="lg:col-span-7 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#5e72e4]/20 to-[#11cdef]/20 border border-[#11cdef]/30 text-[#11cdef] text-xs font-bold mb-5">
              <Cpu className="w-3.5 h-3.5" />
              Next-Generation Multi-Entity Financial Command Center
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.08]">
              Your Custom Vaults &{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#11cdef] via-[#5e72e4] to-[#2dce89]">
                Enterprise Nodes
              </span>{" "}
              in One Engine.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Built with the Argon Design System for <strong>Hatake Enterprises</strong>. Create custom personal or corporate entities from a clean slate with uploaded logos, bi-directional debt payoff tracking, and isolated asset ledgers.
            </p>
          </motion.div>

          {/* 3 HIGH-LEVEL TELEMETRY PILLARS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div className="p-5 rounded-2xl bg-[#111726]/85 border border-white/10 backdrop-blur-xl hover:border-[#5e72e4]/50 transition">
              <div className="h-10 w-10 rounded-xl bg-[#5e72e4]/20 border border-[#5e72e4]/40 flex items-center justify-center mb-3">
                <User className="w-5 h-5 text-[#899bf4]" />
              </div>
              <h3 className="text-sm font-extrabold text-white">
                Custom Entities & Logos
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Zero preprogrammed bloat—add or remove your own personal and enterprise nodes with custom brand logos.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111726]/85 border border-white/10 backdrop-blur-xl hover:border-[#f5365c]/50 transition">
              <div className="h-10 w-10 rounded-xl bg-[#f5365c]/20 border border-[#f5365c]/40 flex items-center justify-center mb-3">
                <Flame className="w-5 h-5 text-[#f5365c]" />
              </div>
              <h3 className="text-sm font-extrabold text-white">
                Visual Debt Liquidation
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Directly link transactions to pay down debt principal or log new loan drawdowns in real time.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111726]/85 border border-white/10 backdrop-blur-xl hover:border-[#2dce89]/50 transition">
              <div className="h-10 w-10 rounded-xl bg-[#2dce89]/20 border border-[#2dce89]/40 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5 text-[#2dce89]" />
              </div>
              <h3 className="text-sm font-extrabold text-white">
                Asset & Inventory Vaults
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Track cash reserves, inventory stock, IP, and domain platforms across isolated entity ledgers.
              </p>
            </div>
          </motion.div>

          {/* SCROLL PROMPT BUTTON */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-2"
          >
            <button
              type="button"
              onClick={scrollToFeatures}
              className="group inline-flex items-center gap-3 text-xs sm:text-sm font-bold text-[#11cdef] hover:text-white transition"
            >
              <span className="h-9 w-9 rounded-full bg-[#11cdef]/15 border border-[#11cdef]/40 flex items-center justify-center group-hover:translate-y-1 transition-transform">
                <ChevronDown className="w-4 h-4" />
              </span>
              <span>Scroll down to explore the full architecture & functions</span>
            </button>
          </motion.div>
        </div>

        {/* RIGHT 5 COLUMNS: REGISTRATION & INVITE CODE GATE */}
        <motion.div
          ref={authGateRef}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-5 bg-[#121829]/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative"
        >
          <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-[#5e72e4] via-[#11cdef] to-[#2dce89] rounded-b-full" />

          <div className="flex items-center justify-between pb-5 border-b border-slate-800">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#11cdef]">
                Argon Security Gate
              </span>
              <h2 className="text-xl font-extrabold text-white mt-0.5">
                {mode === "REGISTER" ? "Create Operator Account" : "Operator Sign-In"}
              </h2>
            </div>

            <div className="flex bg-[#090d16] p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setMode("REGISTER")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  mode === "REGISTER"
                    ? "bg-[#5e72e4] text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </button>
              <button
                type="button"
                onClick={() => setMode("LOGIN")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  mode === "LOGIN"
                    ? "bg-[#5e72e4] text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Login
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {detectedReferralCode && mode === "REGISTER" && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#5e72e4]/20 via-[#11cdef]/20 to-[#2dce89]/20 border border-[#11cdef]/40 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#11cdef] shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs text-white">
                  <div className="font-bold text-[#11cdef] flex items-center gap-1.5">
                    Referral Link Activated
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#11cdef]/25 text-white border border-[#11cdef]/50">
                      {detectedReferralCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    An existing operator referred you. Completing registration will automatically provision elevated executive clearance.
                  </p>
                </div>
              </div>
            )}

            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-medium">{authError}</span>
              </div>
            )}

            {mode === "REGISTER" && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Full Name / Handle
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl bg-[#090d16] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#11cdef]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-[#090d16] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#11cdef]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Passkey / Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-[#090d16] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#11cdef]"
              />
            </div>

            {/* INVITE CODE INPUT (REGISTER ONLY) */}
            {mode === "REGISTER" && (
              <div className="p-4 rounded-2xl bg-[#090d16] border border-[#5e72e4]/40 space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#899bf4]">
                  <KeyRound className="w-3.5 h-3.5 text-[#11cdef]" />
                  Invite Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Enter invite code if you have one"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full rounded-xl bg-[#121829] border border-white/15 px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-white focus:outline-none focus:border-[#2dce89]"
                />
                {inviteCode.trim().length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#2dce89] pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Invite code attached to your session profile.</span>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#5e72e4] via-[#825ee4] to-[#11cdef] hover:opacity-95 disabled:opacity-50 text-white font-extrabold text-sm shadow-xl shadow-[#5e72e4]/30 flex items-center justify-center gap-2 transition transform active:scale-[0.99]"
            >
              <span>
                {isSubmitting
                  ? "Authenticating Security Profile..."
                  : mode === "REGISTER"
                  ? "Register & Enter Financial Workspace"
                  : "Sign In to Workspace"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 2: SCROLL-TRIGGERED ARCHITECTURAL DEEP DIVES      */}
      {/* ========================================================= */}
      <section
        ref={featuresSectionRef}
        className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 py-24 border-t border-white/10"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="px-3.5 py-1.5 rounded-full bg-[#5e72e4]/15 border border-[#5e72e4]/30 text-[#899bf4] text-xs font-extrabold uppercase tracking-widest">
            Engine Capabilities & Architecture
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-4 tracking-tight">
            Built for Total Financial Clarity Across Every Venture
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-3 leading-relaxed">
            As your portfolio expands, Hatake Enterprises keeps your personal wealth and every individual company or project strictly organized with real-time visual telemetry.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {CORE_PILLARS.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 36 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: idx * 0.08 }}
                className="group bg-[#111726]/90 backdrop-blur-2xl border border-white/10 hover:border-white/25 rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden transition-all"
              >
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${pillar.accent}`}
                />

                <div className="flex items-center justify-between gap-4 mb-6">
                  <span className="text-xs font-mono font-bold tracking-widest text-[#11cdef]">
                    {pillar.badge}
                  </span>
                  <div
                    className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${pillar.accent} flex items-center justify-center shadow-lg`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  {pillar.title}
                </h3>
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                  {pillar.description}
                </p>

                <ul className="mt-6 pt-6 border-t border-slate-800/80 space-y-2.5">
                  {pillar.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#2dce89] shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 3: SCROLL-TRIGGERED BI-DIRECTIONAL DEBT REACTOR   */}
      {/* ========================================================= */}
      <section className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 py-24 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-6 space-y-6"
          >
            <span className="px-3.5 py-1.5 rounded-full bg-[#2dce89]/15 border border-[#2dce89]/30 text-[#2dce89] text-xs font-extrabold uppercase tracking-widest">
              Direct Transaction Association
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Every Transaction Knows Its Exact Impact on Your Balance Sheet.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Whether you are logging a one-off invoice, a recurring payout, a loan drawdown, or a principal reduction payment, the ledger updates both cash flow and debt telemetry in a single atomic action.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-[#111726] border border-[#2dce89]/30">
                <div className="flex items-center gap-2 text-[#2dce89] font-extrabold text-sm">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Debt Payoff Mode</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Select an existing debt facility when logging a payment to immediately reduce its remaining balance and advance the visual liquidation bar.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#111726] border border-[#fb6340]/30">
                <div className="flex items-center gap-2 text-[#fb6340] font-extrabold text-sm">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Loan Drawdown Mode</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Receiving capital from a credit line? Originate a new debt facility on the fly or increase an existing loan balance automatically.
                </p>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: ANIMATED MULTI-ENTITY ISOLATION DIAGRAM CARD */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-6 bg-[#111726]/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#11cdef]" />
                <span className="text-sm font-extrabold text-white">
                  Multi-Entity Financial Isolation
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Real-Time Telemetry
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[#090d16] border border-[#2dce89]/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2dce89]">
                    Layer 01: Entity Vaults
                  </span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Personal, Company, Project & Web Nodes
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#2dce89]/15 text-[#2dce89] text-xs font-extrabold">
                  Isolated Ledgers
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#090d16] border border-amber-400/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Layer 02: Debt Reactor
                  </span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Principal Liquidation & Credit Drawdowns
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-amber-400/15 text-amber-300 text-xs font-extrabold">
                  Live Payoff Velocity
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#090d16] border border-[#11cdef]/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#11cdef]">
                    Layer 03: Asset & Inventory Command
                  </span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    Cash, Inventory, IP & Equipment Valuation
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl bg-[#11cdef]/15 text-[#11cdef] text-xs font-extrabold">
                  Net Worth Rollup
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 4: 4-STEP OPERATOR WORKFLOW TIMELINE              */}
      {/* ========================================================= */}
      <section className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 py-24 border-t border-white/10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="px-3.5 py-1.5 rounded-full bg-[#11cdef]/15 border border-[#11cdef]/30 text-[#11cdef] text-xs font-extrabold uppercase tracking-widest">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-4 tracking-tight">
            From Onboarding to Multi-Enterprise Command in 4 Steps
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WORKFLOW_STEPS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#111726]/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-[#11cdef]/40 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-extrabold text-[#11cdef]">
                      {item.step}
                    </span>
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-white">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
                    {item.detail}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Argon OS Module</span>
                  <Workflow className="w-3.5 h-3.5 text-[#5e72e4]" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* SECTION 5: BOTTOM CALL TO ACTION BANNER                   */}
      {/* ========================================================= */}
      <section className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-gradient-to-r from-[#5e72e4] via-[#825ee4] to-[#11cdef] p-8 sm:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8"
        >
          <div className="max-w-2xl text-center lg:text-left">
            <span className="text-xs font-extrabold uppercase tracking-widest text-white/80">
              Ready to Launch
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2">
              Initialize Your Hatake Enterprises Workspace Today
            </h2>
            <p className="text-sm sm:text-base text-white/85 mt-2">
              Register above with or without an invite code, and take full control of your personal and enterprise finances.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setMode("REGISTER");
              scrollToAuthGate();
            }}
            className="px-7 py-4 rounded-2xl bg-[#070a12] hover:bg-[#111726] text-white font-extrabold text-sm shadow-2xl flex items-center gap-2.5 shrink-0 transition transform active:scale-95"
          >
            <span>Scroll to Registration & Invite Gate</span>
            <ArrowRight className="w-4 h-4 text-[#11cdef]" />
          </button>
        </motion.div>
      </section>
    </div>
  );
}
