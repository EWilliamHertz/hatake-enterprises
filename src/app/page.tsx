"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Sparkles,
  Globe,
  TrendingUp,
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  CreditCard,
  Plus,
  Minus,
  Pencil,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  CheckCircle2,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Flame,
  Landmark,
  User,
  Trash2,
  ImagePlus,
  X,
  Package,
  Boxes,
  LogOut,
  UserPlus,
  Share2,
  KeyRound,
  Users,
  Download,
  Upload,
} from "lucide-react";
import { generateNext12MonthsPayoutSchedule } from "@/lib/neon";
import ArgonLandingGate, { AuthenticatedOperator } from "@/components/ArgonLandingGate";

// Retain module factories in Turbopack HMR chunk graph to prevent stale client chunk factory errors
const _TURBOPACK_HMR_ICONS = [CalendarClock, ShieldCheck, AlertTriangle, UserCheck];
void _TURBOPACK_HMR_ICONS;

// ==========================================
// TYPES & PERMANENT PERSONAL ENTITY
// ==========================================

export interface EnterpriseEntity {
  id: string;
  name: string;
  subtitle: string;
  category: "PERSONAL" | "COMPANY" | "PROJECT" | "WEB_PLATFORM";
  url?: string;
  logoUrl?: string;
  argonGradient: string;
  badgeColor: string;
  isLocked?: boolean; // True only for Personal
}

export type TransactionType =
  | "INCOME"
  | "EXPENSE"
  | "PAYOUT"
  | "DEBT_PAYOFF"
  | "LOAN_DRAWDOWN";

export type TransactionFrequency = "SINGULAR" | "RECURRING_19TH";

export interface DebtItem {
  id: string;
  entityId: string;
  title: string;
  lender: string;
  originalPrincipal: number;
  currentBalance: number;
  interestRate: number;
  lastActivityType?: "PAYOFF" | "DRAWDOWN";
}

export interface AssetItem {
  id: string;
  entityId: string;
  name: string;
  category: "CASH" | "INVENTORY" | "IP" | "DOMAIN_PLATFORM" | "EQUIPMENT";
  quantity: number;
  unitValue: number;
  valuation: number;
  notes: string;
}

export interface TransactionItem {
  id: string;
  entityId: string;
  title: string;
  amount: number;
  type: TransactionType;
  frequency: TransactionFrequency;
  date: string;
  linkedDebtId?: string;
}

export interface InviteCodeItem {
  code: string;
  role: string;
  badge?: string;
  clearance?: string;
  entityScope: string;
  maxUses: number;
  usedCount: number;
  createdBy?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface ReferredUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  inviteCodeUsed: string;
  createdAt: string;
}

const GRADIENT_PRESETS = [
  {
    label: "Argon Indigo → Cyan",
    gradient: "from-[#5e72e4] to-[#11cdef]",
    badge: "bg-[#11cdef]/20 text-[#11cdef] border-[#11cdef]/40",
  },
  {
    label: "Emerald → Teal",
    gradient: "from-[#2dce89] to-[#11cdef]",
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  {
    label: "Electric Violet → Crimson",
    gradient: "from-[#825ee4] to-[#f5365c]",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
  {
    label: "Solar Amber → Rose",
    gradient: "from-[#fb6340] to-[#f5365c]",
    badge: "bg-rose-500/20 text-rose-500/40",
  },
];

function formatSEK(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ==========================================
// MAIN DASHBOARD COMPONENT
// ==========================================

export default function HatakeEnterprisesArgonDashboard() {
  // Onboarding Gate & Operator Session Persistence
  const [showLandingGate, setShowLandingGate] = useState(true);
  const [operator, setOperator] = useState<AuthenticatedOperator | null>(null);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  // Entities State: 100% user-created, zero preprogrammed entities
  const [entities, setEntities] = useState<EnterpriseEntity[]>([]);

  // Active Entity Tab
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");

  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "DEBTS" | "ASSETS" | "ENTERPRISES" | "REFERRALS"
  >("OVERVIEW");

  // Referral Codes & Member Network State
  const [inviteCodes, setInviteCodes] = useState<InviteCodeItem[]>([]);
  const [referredUsers, setReferredUsers] = useState<ReferredUserItem[]>([]);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [newRefCode, setNewRefCode] = useState("");
  const [newRefRole, setNewRefRole] = useState("Partner Executive");
  const [newRefScope, setNewRefScope] = useState("ALL_ENTITIES");
  const [newRefMaxUses, setNewRefMaxUses] = useState("10");
  const [newRefExpiresAt, setNewRefExpiresAt] = useState("");
  const [isCreatingRef, setIsCreatingRef] = useState(false);
  const [refModalError, setRefModalError] = useState("");
  const [copiedRefKey, setCopiedRefKey] = useState<string | null>(null);
  const [copiedLinkKey, setCopiedLinkKey] = useState<string | null>(null);

  const generateRandomReferralCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "INV-";
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += "-";
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewRefCode(code);
    setRefModalError("");
  };

  // Zero-Placeholder Financial State
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  // Enterprise Creation Modal State
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [entName, setEntName] = useState("");
  const [entSubtitle, setEntSubtitle] = useState("");
  const [entCategory, setEntCategory] = useState<"PERSONAL" | "COMPANY" | "PROJECT" | "WEB_PLATFORM">("COMPANY");
  const [entUrl, setEntUrl] = useState("");
  const [entLogoUrl, setEntLogoUrl] = useState("");
  const [entGradientIdx, setEntGradientIdx] = useState(0);

  // Transaction & Debt Creation Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txTitle, setTxTitle] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txEntityId, setTxEntityId] = useState<string>("");
  const [txType, setTxType] = useState<TransactionType>("INCOME");
  const [txFrequency, setTxFrequency] = useState<TransactionFrequency>("SINGULAR");
  const [txDate, setTxDate] = useState("");
  const [txLinkedDebtId, setTxLinkedDebtId] = useState<string>("NEW_LOAN_FACILITY");
  const [newLoanTitle, setNewLoanTitle] = useState("");
  const [newLoanLender, setNewLoanLender] = useState("");
  const [newLoanRate, setNewLoanRate] = useState("");

  // Edit Transaction Modal State
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [editTxTitle, setEditTxTitle] = useState("");
  const [editTxAmount, setEditTxAmount] = useState("");
  const [editTxEntityId, setEditTxEntityId] = useState("");
  const [editTxType, setEditTxType] = useState<TransactionType>("EXPENSE");
  const [editTxFrequency, setEditTxFrequency] = useState<TransactionFrequency>("SINGULAR");
  const [editTxDate, setEditTxDate] = useState("");
  const [editTxLinkedDebtId, setEditTxLinkedDebtId] = useState<string>("");

  // Standalone Debt Creation Modal State
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtTitle, setDebtTitle] = useState("");
  const [debtLender, setDebtLender] = useState("");
  const [debtPrincipal, setDebtPrincipal] = useState("");
  const [debtBalance, setDebtBalance] = useState("");
  const [debtRate, setDebtRate] = useState("");

  // Asset / Inventory Form State
  const [newAssetEntityId, setNewAssetEntityId] = useState<string>("");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetCategory, setNewAssetCategory] = useState<AssetItem["category"]>("INVENTORY");
  const [newAssetQuantity, setNewAssetQuantity] = useState("1");
  const [newAssetUnitValue, setNewAssetUnitValue] = useState("");
  const [newAssetValuation, setNewAssetValuation] = useState("");
  const [newAssetNotes, setNewAssetNotes] = useState("");

  // Edit Asset / Product Modal State
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null);
  const [editAssetEntityId, setEditAssetEntityId] = useState("");
  const [editAssetName, setEditAssetName] = useState("");
  const [editAssetCategory, setEditAssetCategory] = useState<AssetItem["category"]>("INVENTORY");
  const [editAssetQuantity, setEditAssetQuantity] = useState("1");
  const [editAssetUnitValue, setEditAssetUnitValue] = useState("");
  const [editAssetValuation, setEditAssetValuation] = useState("");
  const [editAssetNotes, setEditAssetNotes] = useState("");

  // NeonDB Connection State
  const [neonUrl, setNeonUrl] = useState("");

  // Hydrate persisted user data from localStorage & sync from NeonDB on mount
  useEffect(() => {
    const today = new Date();
    setTxDate(today.toISOString().split("T")[0]);

    try {
      // Purge any legacy localStorage keys that may hold preprogrammed entities or sample data
      localStorage.removeItem("hatake_custom_entities");
      localStorage.removeItem("hatake_custom_entities_v2");
      localStorage.removeItem("hatake_debts");
      localStorage.removeItem("hatake_debts_v2");
      localStorage.removeItem("hatake_assets");
      localStorage.removeItem("hatake_assets_v2");
      localStorage.removeItem("hatake_transactions");
      localStorage.removeItem("hatake_transactions_v2");

      let restoredFromLocal = false;
      const savedSession = localStorage.getItem("hatake_operator_session");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && (parsed.email || parsed.name)) {
          setOperator(parsed);
          setShowLandingGate(false);
          restoredFromLocal = true;

          // Sync the logged-in user's account name from database if email is present
          if (parsed.email) {
            fetch("/api/auth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: parsed.email, name: parsed.name, mode: "LOGIN" }),
            })
              .then((r) => r.json())
              .then((res) => {
                if (res.success && res.user?.name) {
                  const syncedOp: AuthenticatedOperator = {
                    name: res.user.name,
                    email: res.user.email || parsed.email,
                    role: res.user.role || "",
                  };
                  setOperator(syncedOp);
                  localStorage.setItem("hatake_operator_session", JSON.stringify(syncedOp));
                }
              })
              .catch(() => {});
          }
        }
      }

      if (!restoredFromLocal) {
        fetch("/api/auth")
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.user && (res.user.email || res.user.name)) {
              const syncedOp: AuthenticatedOperator = {
                name: res.user.name || res.user.email.split("@")[0],
                email: res.user.email || "",
                role: res.user.role || "OPERATOR",
              };
              setOperator(syncedOp);
              setShowLandingGate(false);
              try {
                localStorage.setItem("hatake_operator_session", JSON.stringify(syncedOp));
              } catch {}
            }
          })
          .catch(() => {})
          .finally(() => {
            setIsSessionChecked(true);
          });
      } else {
        setIsSessionChecked(true);
      }

      const savedEnts = localStorage.getItem("hatake_entities_v3");
      if (savedEnts) {
        const parsedEnts = JSON.parse(savedEnts);
        if (Array.isArray(parsedEnts)) {
          setEntities(parsedEnts.filter((e): e is EnterpriseEntity => Boolean(e && typeof e === "object" && e.id)));
        }
      }

      const savedDebts = localStorage.getItem("hatake_debts_v3");
      if (savedDebts) setDebts(JSON.parse(savedDebts));

      const savedAssets = localStorage.getItem("hatake_assets_v3");
      if (savedAssets) setAssets(JSON.parse(savedAssets));

      const savedTxs = localStorage.getItem("hatake_transactions_v3");
      if (savedTxs) setTransactions(JSON.parse(savedTxs));

      const savedNeon = localStorage.getItem("hatake_neon_url");
      if (savedNeon) setNeonUrl(savedNeon);
    } catch (e) {
      console.error("Failed to load local state", e);
      setIsSessionChecked(true);
    }

    // Attempt to load from server database if available
    fetch("/api/data")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (Array.isArray(json.data.entities)) {
            setEntities(
              json.data.entities.filter((e: unknown): e is EnterpriseEntity =>
                Boolean(e && typeof e === "object" && "id" in e)
              )
            );
          }
          if (Array.isArray(json.data.debts)) {
            setDebts(json.data.debts);
          }
          if (Array.isArray(json.data.assets)) {
            setAssets(json.data.assets);
          }
          if (Array.isArray(json.data.transactions)) {
            setTransactions(json.data.transactions);
          }
        }
      })
      .catch((err) => {
        console.warn("NeonDB sync check:", err);
      });

    // Load referral invite codes and network members
    fetch("/api/invite-codes")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          if (Array.isArray(json.codes)) setInviteCodes(json.codes);
          if (Array.isArray(json.referredUsers)) setReferredUsers(json.referredUsers);
        }
      })
      .catch((err) => {
        console.warn("Invite codes load failed:", err);
      });
  }, []);

  // Persist changes to localStorage
  useEffect(() => {
    localStorage.setItem("hatake_entities_v3", JSON.stringify(entities));
  }, [entities]);

  useEffect(() => {
    localStorage.setItem("hatake_debts_v3", JSON.stringify(debts));
  }, [debts]);

  useEffect(() => {
    localStorage.setItem("hatake_assets_v3", JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem("hatake_transactions_v3", JSON.stringify(transactions));
  }, [transactions]);

  // Keep selectedEntityId synchronized with available entities
  useEffect(() => {
    if (entities.length === 0) {
      setSelectedEntityId("");
    } else if (!selectedEntityId || !entities.some((e) => e.id === selectedEntityId)) {
      setSelectedEntityId(entities[0]?.id || "");
    }
  }, [entities, selectedEntityId]);

  const currentEntity: EnterpriseEntity | null = useMemo(
    () => entities.find((e) => e && e.id === selectedEntityId) || entities[0] || null,
    [entities, selectedEntityId]
  );

  // Sync modal default entity with current active workspace
  useEffect(() => {
    const activeId = currentEntity?.id || "";
    setTxEntityId(activeId);
    setNewAssetEntityId(activeId);
  }, [currentEntity]);

  // Scoped Data for the Currently Selected Entity Tab
  const scopedDebts = useMemo(
    () => (currentEntity?.id ? debts.filter((d) => d.entityId === currentEntity.id) : []),
    [debts, currentEntity]
  );

  const scopedAssets = useMemo(
    () => (currentEntity?.id ? assets.filter((a) => a.entityId === currentEntity.id) : assets),
    [assets, currentEntity]
  );

  const scopedTransactions = useMemo(
    () => (currentEntity?.id ? transactions.filter((t) => t.entityId === currentEntity.id) : []),
    [transactions, currentEntity]
  );

  const metrics = useMemo(() => {
    const totalAssetsVal = scopedAssets.reduce((sum, a) => sum + (Number(a.valuation) || 0), 0);
    const totalDebtRemaining = scopedDebts.reduce((sum, d) => sum + (Number(d.currentBalance) || 0), 0);
    const totalDebtOriginal = scopedDebts.reduce((sum, d) => sum + (Number(d.originalPrincipal) || 0), 0);

    const totalInflows = scopedTransactions
      .filter((t) => t.type === "INCOME" || t.type === "LOAN_DRAWDOWN" || t.type === "PAYOUT")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalOutflows = scopedTransactions
      .filter((t) => t.type === "EXPENSE" || t.type === "DEBT_PAYOFF")
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const netCashFlow = totalInflows - totalOutflows;
    const netWorth = totalAssetsVal - totalDebtRemaining;
    const debtPaydownPercentage =
      totalDebtOriginal > 0
        ? Math.max(0, Math.min(100, ((totalDebtOriginal - totalDebtRemaining) / totalDebtOriginal) * 100))
        : 0;

    return {
      totalAssetsVal,
      totalDebtRemaining,
      totalDebtOriginal,
      totalInflows,
      totalOutflows,
      netCashFlow,
      netWorth,
      debtPaydownPercentage,
    };
  }, [scopedAssets, scopedDebts, scopedTransactions]);

  // ==========================================
  // HANDLERS: ENTERPRISE ADD / LOGO UPLOAD / DELETE
  // ==========================================

  const handleLogoFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        onResult(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entName.trim()) return;

    const preset = GRADIENT_PRESETS[entGradientIdx] || GRADIENT_PRESETS[0];
    const newEnt: EnterpriseEntity = {
      id: `ENT_${Date.now()}`,
      name: entName.trim(),
      subtitle: entSubtitle.trim() || "",
      category: entCategory,
      url: entUrl.trim() || undefined,
      logoUrl: entLogoUrl.trim() || undefined,
      argonGradient: preset.gradient,
      badgeColor: preset.badge,
      isLocked: false,
    };

    setEntities((prev) => [...prev, newEnt]);
    setSelectedEntityId(newEnt.id);
    setEntName("");
    setEntSubtitle("");
    setEntUrl("");
    setEntLogoUrl("");
    setIsEnterpriseModalOpen(false);

    // Sync with NeonDB
    try {
      await fetch("/api/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEnt),
      });
    } catch (err) {
      console.warn("Could not sync new entity to NeonDB:", err);
    }
  };

  const handleUpdateEnterpriseLogo = async (entityId: string, newLogoDataUrl: string) => {
    setEntities((prev) =>
      prev.map((ent) => (ent.id === entityId ? { ...ent, logoUrl: newLogoDataUrl } : ent))
    );

    const targetEnt = entities.find((e) => e.id === entityId);
    if (targetEnt) {
      try {
        await fetch("/api/entities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...targetEnt, logoUrl: newLogoDataUrl }),
        });
      } catch (err) {
        console.warn("Could not sync logo update to NeonDB:", err);
      }
    }
  };

  const handleDeleteEnterprise = async (entityId: string) => {
    setEntities((prev) => prev.filter((ent) => ent.id !== entityId));
    setDebts((prev) => prev.filter((d) => d.entityId !== entityId));
    setAssets((prev) => prev.filter((a) => a.entityId !== entityId));
    setTransactions((prev) => prev.filter((t) => t.entityId !== entityId));

    // Delete in NeonDB with cascade
    try {
      await fetch("/api/entities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entityId }),
      });
    } catch (err) {
      console.warn("Could not sync entity deletion to NeonDB:", err);
    }
  };

  // ==========================================
  // HANDLERS: ASSETS & INVENTORY (Cross-Company)
  // ==========================================

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEntId = newAssetEntityId || currentEntity?.id;
    const qty = Math.max(1, Math.round(parseFloat(newAssetQuantity) || 1));
    const parsedUnit = parseFloat(newAssetUnitValue);
    const parsedTotal = parseFloat(newAssetValuation);

    const finalValuation =
      !isNaN(parsedTotal) && parsedTotal >= 0
        ? parsedTotal
        : !isNaN(parsedUnit) && parsedUnit >= 0
        ? qty * parsedUnit
        : NaN;

    if (!targetEntId || !newAssetName.trim() || isNaN(finalValuation)) return;

    const finalUnitValue =
      !isNaN(parsedUnit) && parsedUnit >= 0
        ? parsedUnit
        : qty > 0
        ? finalValuation / qty
        : finalValuation;

    const item: AssetItem = {
      id: `asset-${Date.now()}`,
      entityId: targetEntId,
      name: newAssetName.trim(),
      category: newAssetCategory,
      quantity: qty,
      unitValue: finalUnitValue,
      valuation: finalValuation,
      notes: newAssetNotes.trim(),
    };

    setAssets((prev) => [item, ...prev]);
    setNewAssetName("");
    setNewAssetQuantity("1");
    setNewAssetUnitValue("");
    setNewAssetValuation("");
    setNewAssetNotes("");

    // Sync with NeonDB
    try {
      await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          entityId: item.entityId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unitValue: item.unitValue,
          valuation: item.valuation,
          notes: item.notes,
        }),
      });
    } catch (err) {
      console.warn("Could not sync asset to NeonDB:", err);
    }
  };

  const handleOpenEditAsset = (asset: AssetItem) => {
    const qty = Math.max(1, Math.round(Number(asset.quantity) || 1));
    const totalVal = Number(asset.valuation) || 0;
    const unitVal =
      asset.unitValue !== undefined && Number(asset.unitValue) > 0
        ? Number(asset.unitValue)
        : qty > 0
        ? totalVal / qty
        : totalVal;

    setEditingAsset(asset);
    setEditAssetEntityId(asset.entityId);
    setEditAssetName(asset.name);
    setEditAssetCategory(asset.category);
    setEditAssetQuantity(String(qty));
    setEditAssetUnitValue(String(Math.round(unitVal * 100) / 100));
    setEditAssetValuation(String(Math.round(totalVal * 100) / 100));
    setEditAssetNotes(asset.notes || "");
  };

  const handleUpdateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    const targetEntId = editAssetEntityId || editingAsset.entityId;
    const qty = Math.max(1, Math.round(parseFloat(editAssetQuantity) || 1));
    const parsedUnit = parseFloat(editAssetUnitValue);
    const parsedTotal = parseFloat(editAssetValuation);

    const finalValuation =
      !isNaN(parsedTotal) && parsedTotal >= 0
        ? parsedTotal
        : !isNaN(parsedUnit) && parsedUnit >= 0
        ? qty * parsedUnit
        : 0;

    if (!editAssetName.trim()) return;

    const finalUnitValue =
      !isNaN(parsedUnit) && parsedUnit >= 0
        ? parsedUnit
        : qty > 0
        ? finalValuation / qty
        : finalValuation;

    const updatedItem: AssetItem = {
      ...editingAsset,
      entityId: targetEntId,
      name: editAssetName.trim(),
      category: editAssetCategory,
      quantity: qty,
      unitValue: finalUnitValue,
      valuation: finalValuation,
      notes: editAssetNotes.trim(),
    };

    setAssets((prev) => prev.map((a) => (a.id === updatedItem.id ? updatedItem : a)));
    setEditingAsset(null);

    try {
      await fetch("/api/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem),
      });
    } catch (err) {
      console.warn("Could not sync asset update to NeonDB:", err);
    }
  };

  const handleAdjustAssetQuantity = async (asset: AssetItem, nextQtyRaw: number) => {
    const currentQty = Math.max(1, Math.round(Number(asset.quantity) || 1));
    const nextQty = Math.max(1, Math.round(nextQtyRaw));
    if (nextQty === currentQty) return;

    const currentVal = Number(asset.valuation) || 0;
    const inferredUnitVal =
      asset.unitValue !== undefined && Number(asset.unitValue) > 0
        ? Number(asset.unitValue)
        : currentQty > 0
        ? currentVal / currentQty
        : currentVal;

    const nextValuation = Math.round(nextQty * inferredUnitVal * 100) / 100;

    const updatedItem: AssetItem = {
      ...asset,
      quantity: nextQty,
      unitValue: inferredUnitVal,
      valuation: nextValuation,
    };

    setAssets((prev) => prev.map((a) => (a.id === asset.id ? updatedItem : a)));

    try {
      await fetch("/api/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedItem),
      });
    } catch (err) {
      console.warn("Could not sync asset quantity adjustment to NeonDB:", err);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    if (editingAsset?.id === assetId) {
      setEditingAsset(null);
    }

    try {
      await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assetId }),
      });
    } catch (err) {
      console.warn("Could not sync asset deletion to NeonDB:", err);
    }
  };

  // ==========================================
  // HANDLERS: DEBTS & TRANSACTIONS
  // ==========================================

  const handleCreateStandaloneDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEntId = currentEntity?.id;
    const orig = parseFloat(debtPrincipal);
    const bal = debtBalance ? parseFloat(debtBalance) : orig;
    if (!targetEntId || !debtTitle.trim() || isNaN(orig) || orig <= 0) return;

    const item: DebtItem = {
      id: `debt-${Date.now()}`,
      entityId: targetEntId,
      title: debtTitle.trim(),
      lender: debtLender.trim(),
      originalPrincipal: orig,
      currentBalance: isNaN(bal) ? orig : bal,
      interestRate: parseFloat(debtRate) || 0,
    };

    setDebts((prev) => [item, ...prev]);
    setDebtTitle("");
    setDebtLender("");
    setDebtPrincipal("");
    setDebtBalance("");
    setDebtRate("");
    setIsDebtModalOpen(false);

    try {
      await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
    } catch (err) {
      console.warn("Could not sync debt to NeonDB:", err);
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== debtId));
    try {
      await fetch("/api/debts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: debtId }),
      });
    } catch (err) {
      console.warn("Could not sync debt deletion to NeonDB:", err);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEntId = txEntityId || currentEntity?.id;
    const numericAmount = parseFloat(txAmount);
    if (!targetEntId || !txTitle.trim() || isNaN(numericAmount) || numericAmount <= 0) return;

    let finalLinkedDebtId: string | undefined = undefined;
    let createdDebtId: string | undefined = undefined;

    if (txType === "DEBT_PAYOFF" && txLinkedDebtId && txLinkedDebtId !== "NEW_LOAN_FACILITY") {
      finalLinkedDebtId = txLinkedDebtId;
      setDebts((prev) =>
        prev.map((d) => {
          if (d.id !== txLinkedDebtId) return d;
          return {
            ...d,
            currentBalance: Math.max(0, d.currentBalance - numericAmount),
            lastActivityType: "PAYOFF",
          };
        })
      );
    }

    if (txType === "LOAN_DRAWDOWN") {
      if (txLinkedDebtId === "NEW_LOAN_FACILITY" || !txLinkedDebtId) {
        createdDebtId = `debt-${Date.now()}`;
        finalLinkedDebtId = createdDebtId;
        const newDebt: DebtItem = {
          id: createdDebtId,
          entityId: targetEntId,
          title: newLoanTitle.trim() || txTitle.trim(),
          lender: newLoanLender.trim(),
          originalPrincipal: numericAmount,
          currentBalance: numericAmount,
          interestRate: parseFloat(newLoanRate) || 0,
          lastActivityType: "DRAWDOWN",
        };
        setDebts((prev) => [newDebt, ...prev]);
      } else {
        finalLinkedDebtId = txLinkedDebtId;
        setDebts((prev) =>
          prev.map((d) => {
            if (d.id !== txLinkedDebtId) return d;
            const updatedBal = d.currentBalance + numericAmount;
            return {
              ...d,
              originalPrincipal: Math.max(d.originalPrincipal, updatedBal),
              currentBalance: updatedBal,
              lastActivityType: "DRAWDOWN",
            };
          })
        );
      }
    }

    let finalDate = txDate || new Date().toISOString().split("T")[0];
    if (txFrequency === "RECURRING_19TH") {
      const parsed = new Date(finalDate);
      const y = isNaN(parsed.getFullYear()) ? new Date().getFullYear() : parsed.getFullYear();
      const m = isNaN(parsed.getMonth()) ? new Date().getMonth() : parsed.getMonth();
      const shifted = generateNext12MonthsPayoutSchedule(new Date(y, m, 1))[0];
      finalDate = shifted.effectiveDateStr;
    }

    const newTx: TransactionItem = {
      id: `tx-${Date.now()}`,
      entityId: targetEntId,
      title: txTitle.trim(),
      amount: numericAmount,
      type: txType,
      frequency: txFrequency,
      date: finalDate,
      linkedDebtId: finalLinkedDebtId,
    };

    setTransactions((prev) => [newTx, ...prev]);
    setTxTitle("");
    setTxAmount("");
    setNewLoanTitle("");
    setNewLoanLender("");
    setNewLoanRate("");
    setIsTxModalOpen(false);

    // Sync with NeonDB
    try {
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: newTx.entityId,
          title: newTx.title,
          amount: newTx.amount,
          type: newTx.type,
          frequency: newTx.frequency,
          date: newTx.date,
          linkedDebtId: finalLinkedDebtId || null,
          createdDebtId,
          newLoanTitle,
          newLoanLender,
          newLoanRate,
        }),
      });
    } catch (err) {
      console.warn("Could not sync transaction to NeonDB:", err);
    }
  };

  const handleOpenEditTransaction = (tx: TransactionItem) => {
    setEditingTransaction(tx);
    setEditTxTitle(tx.title);
    setEditTxAmount(String(tx.amount));
    setEditTxEntityId(tx.entityId);
    setEditTxType(tx.type);
    setEditTxFrequency(tx.frequency);
    setEditTxDate(tx.date);
    setEditTxLinkedDebtId(tx.linkedDebtId || "");
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const numericAmount = parseFloat(editTxAmount);
    if (!editTxTitle.trim() || isNaN(numericAmount) || numericAmount <= 0) return;

    const targetEntId = editTxEntityId || editingTransaction.entityId;
    let finalDate = editTxDate || editingTransaction.date;
    if (editTxFrequency === "RECURRING_19TH") {
      const parsed = new Date(finalDate);
      const y = isNaN(parsed.getFullYear()) ? new Date().getFullYear() : parsed.getFullYear();
      const m = isNaN(parsed.getMonth()) ? new Date().getMonth() : parsed.getMonth();
      const shifted = generateNext12MonthsPayoutSchedule(new Date(y, m, 1))[0];
      finalDate = shifted.effectiveDateStr;
    }

    const updatedTx: TransactionItem = {
      ...editingTransaction,
      entityId: targetEntId,
      title: editTxTitle.trim(),
      amount: numericAmount,
      type: editTxType,
      frequency: editTxFrequency,
      date: finalDate,
      linkedDebtId: editTxLinkedDebtId && editTxLinkedDebtId !== "NEW_LOAN_FACILITY" ? editTxLinkedDebtId : undefined,
    };

    setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)));
    setEditingTransaction(null);

    try {
      await fetch("/api/transactions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: updatedTx.id,
          entityId: updatedTx.entityId,
          title: updatedTx.title,
          amount: updatedTx.amount,
          type: updatedTx.type,
          frequency: updatedTx.frequency,
          date: updatedTx.date,
          linkedDebtId: updatedTx.linkedDebtId || null,
        }),
      });
    } catch (err) {
      console.warn("Could not sync transaction update to NeonDB:", err);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm("Are you sure you want to delete this transaction entry?")) return;
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    if (editingTransaction?.id === txId) {
      setEditingTransaction(null);
    }
    try {
      await fetch(`/api/transactions?id=${txId}`, { method: "DELETE" });
    } catch (err) {
      console.warn("Could not sync transaction deletion to NeonDB:", err);
    }
  };

  const handleExportTransactionsCSV = () => {
    const list = scopedTransactions.length > 0 ? scopedTransactions : transactions;
    if (list.length === 0) {
      alert("No transactions available to export.");
      return;
    }
    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };
    const header = ["id", "date", "type", "amount", "title", "entityId", "frequency"].join(",");
    const rows = list.map((t) =>
      [
        escapeCsv(t.id),
        escapeCsv(t.date),
        escapeCsv(t.type),
        escapeCsv(t.amount),
        escapeCsv(t.title),
        escapeCsv(t.entityId),
        escapeCsv(t.frequency),
      ].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(currentEntity?.name || "transactions").toLowerCase().replace(/[^a-z0-9_-]/g, "_")}-transactions.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportTransactionsCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentEntity) return;

    try {
      setIsImportingCsv(true);
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        alert("The selected CSV file appears to be empty.");
        return;
      }

      const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            result.push(cur.trim());
            cur = "";
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
      const dateIdx = header.indexOf("date");
      const typeIdx = header.indexOf("type");
      const amountIdx = header.indexOf("amount");
      const titleIdx = header.indexOf("title");
      const descIdx = header.indexOf("description");
      const partyIdx = header.indexOf("party");

      const newTxs: TransactionItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length < 2) continue;

        const date = dateIdx !== -1 && cols[dateIdx] ? cols[dateIdx] : new Date().toISOString().split("T")[0];
        const rawType = (typeIdx !== -1 ? cols[typeIdx] : "EXPENSE").toUpperCase();
        const type: TransactionType = rawType.includes("INC") || rawType === "PAYOUT" ? "INCOME" : "EXPENSE";
        const cleanAmount = amountIdx !== -1 ? parseFloat(cols[amountIdx].replace(/[^0-9.-]+/g, "")) : 0;
        const amount = isNaN(cleanAmount) ? 0 : Math.abs(cleanAmount);

        let title = "";
        if (titleIdx !== -1 && cols[titleIdx]) {
          title = cols[titleIdx];
        } else {
          const p = partyIdx !== -1 ? cols[partyIdx] : "";
          const d = descIdx !== -1 ? cols[descIdx] : "";
          title = p ? (d ? `${p} — ${d}` : p) : (d || "Imported Entry");
        }

        if (amount > 0 && title.trim()) {
          newTxs.push({
            id: `tx-imp-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            entityId: currentEntity.id,
            title: title.trim(),
            amount,
            type,
            frequency: "SINGULAR",
            date,
          });
        }
      }

      if (newTxs.length > 0) {
        setTransactions((prev) => [...newTxs, ...prev]);
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: newTxs }),
        });
      }
    } catch (err) {
      console.error("Error importing CSV:", err);
      alert("Failed to parse or import CSV transactions.");
    } finally {
      setIsImportingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleQuickDebtAction = (debt: DebtItem, mode: "PAYOFF" | "DRAWDOWN") => {
    setTxEntityId(debt.entityId);
    setTxType(mode === "PAYOFF" ? "DEBT_PAYOFF" : "LOAN_DRAWDOWN");
    setTxLinkedDebtId(debt.id);
    setTxTitle(
      mode === "PAYOFF"
        ? `Payoff — ${debt.title}`
        : `Loan Drawdown — ${debt.title}`
    );
    setTxAmount("");
    setIsTxModalOpen(true);
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem("hatake_operator_session");
      document.cookie = "hatake_operator_session=; path=/; max-age=0; SameSite=Lax";
    } catch (e) {
      console.error("Failed to clear session", e);
    }
    fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    setOperator(null);
    setShowLandingGate(true);
  };

  // ==========================================
  // HANDLERS: REFERRAL NETWORK & INVITE CODES
  // ==========================================

  const handleCreateReferralCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefCode.trim()) {
      setRefModalError("Please enter or generate a referral code.");
      return;
    }
    const cleanCode = newRefCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (cleanCode.length < 3) {
      setRefModalError("Referral code must have at least 3 characters.");
      return;
    }

    setIsCreatingRef(true);
    setRefModalError("");

    try {
      const res = await fetch("/api/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: cleanCode,
          assignedRole: newRefRole,
          entityScope: newRefScope,
          maxUses: parseInt(newRefMaxUses, 10) || 10,
          expiresAt: newRefExpiresAt || null,
          createdBy: operator?.email || operator?.name || "Verified Operator",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setRefModalError(data.error || "Failed to create referral code.");
        setIsCreatingRef(false);
        return;
      }

      setInviteCodes((prev) => [data.code, ...prev]);
      setIsReferralModalOpen(false);
      setNewRefCode("");
      setActiveTab("REFERRALS");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      setRefModalError(`Error creating referral code: ${msg}`);
    } finally {
      setIsCreatingRef(false);
    }
  };

  const handleDeleteReferralCode = async (code: string) => {
    setInviteCodes((prev) => prev.filter((c) => c.code !== code));
    try {
      await fetch("/api/invite-codes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch (err) {
      console.warn("Could not delete invite code from database:", err);
    }
  };

  const handleCopyCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedRefKey(code);
      setTimeout(() => setCopiedRefKey(null), 2500);
    }
  };

  const handleCopyReferralLink = (code: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      const origin = window.location.origin;
      const url = `${origin}/?ref=${encodeURIComponent(code)}`;
      navigator.clipboard.writeText(url);
      setCopiedLinkKey(code);
      setTimeout(() => setCopiedLinkKey(null), 2500);
    }
  };

  // ==========================================
  // RENDER LANDING GATE IF NOT UNLOCKED
  // ==========================================

  if (!isSessionChecked) {
    return (
      <div className="min-h-screen bg-[#070a12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#5e72e4] to-[#11cdef] animate-pulse flex items-center justify-center shadow-lg shadow-[#5e72e4]/30">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Loading Workspace...</span>
        </div>
      </div>
    );
  }

  if (showLandingGate) {
    return (
      <ArgonLandingGate
        activeOperator={operator}
        onReturnToDashboard={operator ? () => setShowLandingGate(false) : undefined}
        onUnlockDashboard={(op, customNeonUrl) => {
          setOperator(op);
          if (customNeonUrl) {
            setNeonUrl(customNeonUrl);
            try {
              localStorage.setItem("hatake_neon_url", customNeonUrl);
            } catch (e) {
              console.warn("Could not persist custom Neon URL", e);
            }
          }
          try {
            const serialized = JSON.stringify(op);
            localStorage.setItem("hatake_operator_session", serialized);
            document.cookie = `hatake_operator_session=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
          } catch (e) {
            console.error("Failed to persist operator session", e);
          }
          setShowLandingGate(false);
        }}
      />
    );
  }

  const activeGradient =
    currentEntity?.argonGradient || "from-[#5e72e4] via-[#825ee4] to-[#11cdef]";
  const activeEntityLabel = currentEntity?.name || "No Entity Selected";

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-[#5e72e4] selection:text-white relative overflow-x-hidden">
      {/* ARGON HERO GRADIENT */}
      <div
        className={`absolute top-0 left-0 right-0 h-[360px] bg-gradient-to-r ${activeGradient} opacity-90 transition-all duration-700 pointer-events-none`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0b0f19] to-transparent" />
      </div>

      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20">
        {/* TOP ARGON HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-white/15">
          <div className="flex items-center gap-4">
            {/* ENTITY LOGO OR ICON */}
            <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/25 overflow-hidden shrink-0">
              {currentEntity?.logoUrl ? (
                <img
                  src={currentEntity.logoUrl}
                  alt={currentEntity?.name || "Entity"}
                  className="h-full w-full object-cover"
                />
              ) : currentEntity?.category === "PERSONAL" ? (
                <User className="w-7 h-7 text-white" />
              ) : (
                <Landmark className="w-7 h-7 text-white" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-white/80">
                  {currentEntity?.category || "HATAKE ENTERPRISES"}
                </span>
                {operator && (
                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {operator.name || operator.email}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {currentEntity?.name || "Create Your First Entity"}
              </h1>
              <p className="text-xs sm:text-sm text-white/80">
                {currentEntity
                  ? currentEntity.subtitle
                  : "Click 'Add Entity' to create a personal or corporate ledger."}
              </p>
            </div>
          </div>

          {/* RIGHT ACTION CONTROLS */}
          <div className="flex flex-wrap items-center gap-2.5">
            {operator && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 text-white text-xs font-bold border border-white/15 backdrop-blur-md">
                <User className="w-3.5 h-3.5 text-[#11cdef]" />
                <span>{operator.name || operator.email}</span>
              </div>
            )}

            {currentEntity?.url && (
              <a
                href={currentEntity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition"
              >
                <Globe className="w-3.5 h-3.5" />
                Launch Site
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            )}

            <button
              onClick={() => {
                generateRandomReferralCode();
                setIsReferralModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#5e72e4]/30 to-[#11cdef]/30 hover:from-[#5e72e4]/45 hover:to-[#11cdef]/45 text-[#11cdef] text-xs font-bold border border-[#11cdef]/40 backdrop-blur-md transition shadow-md shadow-[#11cdef]/10"
              title="Create invite code or share referral link"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#11cdef]" />
              Refer Operator
            </button>

            <button
              onClick={() => setIsEnterpriseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Entity
            </button>

            <button
              onClick={() => {
                if (!currentEntity?.id) {
                  setIsEnterpriseModalOpen(true);
                  return;
                }
                const matchingDebts = debts.filter((d) => d.entityId === currentEntity.id);
                setTxLinkedDebtId(matchingDebts[0]?.id || "NEW_LOAN_FACILITY");
                setIsTxModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#172b4d] hover:bg-slate-100 text-xs sm:text-sm font-bold shadow-xl shadow-black/25 transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              New Transaction
            </button>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold border border-rose-500/30 transition shadow-sm"
              title="Sign out and lock workspace"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* ======================================================= */}
        {/* WORKSPACE ENTITY BAR                                    */}
        {/* ======================================================= */}
        <div className="mt-5 flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {entities.map((ent) => {
            const active = ent.id === currentEntity?.id;
            return (
              <div
                key={ent.id}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? "bg-white text-[#172b4d] shadow-lg shadow-black/30 scale-[1.02]"
                    : "bg-white/10 text-white/85 hover:bg-white/20 border border-white/15"
                }`}
                onClick={() => setSelectedEntityId(ent.id)}
              >
                {/* Miniature Logo or Icon */}
                {ent.logoUrl ? (
                  <img
                    src={ent.logoUrl}
                    alt={ent.name}
                    className="w-5 h-5 rounded-md object-cover shrink-0"
                  />
                ) : ent.category === "PERSONAL" ? (
                  <User className="w-4 h-4 shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 shrink-0" />
                )}

                <span>{ent.name}</span>

                <button
                  type="button"
                  title={`Delete ${ent.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEnterprise(ent.id);
                  }}
                  className={`ml-1 p-0.5 rounded hover:bg-rose-500/20 hover:text-rose-400 transition ${
                    active ? "text-slate-500" : "text-white/50"
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setIsEnterpriseModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-[#161c2d]/80 hover:bg-[#161c2d] text-[#11cdef] border border-dashed border-[#11cdef]/40 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New Entity / Logo
          </button>
        </div>

        {/* KPI STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
          <div className="bg-[#161c2d]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {activeEntityLabel} Net Worth
              </span>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#5e72e4] to-[#825ee4] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-white">
              {formatSEK(metrics.netWorth)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Assets − Active Debts
            </div>
          </div>

          <div className="bg-[#161c2d]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Active Debt Balance
              </span>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#f5365c] to-[#fb6340] flex items-center justify-center">
                <Flame className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-white">
              {formatSEK(metrics.totalDebtRemaining)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
              <span>Paid: {metrics.debtPaydownPercentage.toFixed(1)}%</span>
              <span>Orig: {formatSEK(metrics.totalDebtOriginal)}</span>
            </div>
          </div>

          <div className="bg-[#161c2d]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {currentEntity?.name ? `${currentEntity.name} Assets` : "Registered Assets"}
              </span>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#11cdef] to-[#5e72e4] flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-white">
              {formatSEK(metrics.totalAssetsVal)}
            </div>
            <div className="mt-2 text-xs text-[#11cdef] font-semibold">
              {scopedAssets.length} Asset Entries ({scopedAssets.filter(a => a.category === "INVENTORY").length} Inventory)
            </div>
          </div>

          <div className="bg-[#161c2d]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Net Cash Flow
              </span>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2dce89] to-[#11cdef] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-extrabold text-white">
              {formatSEK(metrics.netCashFlow)}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {scopedTransactions.length} Logged Transactions
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: "OVERVIEW", label: "Overview & Ledger", icon: TrendingUp },
            { id: "DEBTS", label: "Visual Debt Reactor", icon: CreditCard },
            { id: "ASSETS", label: "Assets & Inventory", icon: Boxes },
            { id: "ENTERPRISES", label: "Manage Entities & Logos", icon: Building2 },
            { id: "REFERRALS", label: "Referral Network", icon: UserPlus },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#5e72e4] to-[#825ee4] text-white shadow-lg shadow-[#5e72e4]/25"
                    : "bg-[#161c2d] text-slate-400 hover:text-white hover:bg-[#1e263d] border border-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB VIEWS */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {/* 1. OVERVIEW & DEBTS */}
            {(activeTab === "OVERVIEW" || activeTab === "DEBTS") && (
              <motion.div
                key="overview-debts"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-8"
              >
                {!currentEntity ? (
                  <section className="bg-[#161c2d] border border-white/10 rounded-3xl p-10 text-center shadow-2xl">
                    <Building2 className="w-12 h-12 text-[#11cdef] mx-auto mb-3" />
                    <h2 className="text-xl font-extrabold text-white">
                      No Entities Created Yet
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2">
                      Start with a clean slate by creating your first entity (Personal, Company, Project, or Web Platform).
                    </p>
                    <button
                      onClick={() => setIsEnterpriseModalOpen(true)}
                      className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-white text-xs sm:text-sm font-bold shadow-lg"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Entity
                    </button>
                  </section>
                ) : (
                  <>
                    {/* DEBT REACTOR */}
                    <section className="bg-[#161c2d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                            {currentEntity?.name} — Visual Debt Reactor
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-400 mt-1">
                            Track loans and liabilities for {currentEntity?.name}. Associate any transaction directly to paying off debt or drawing down new loan principal.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2.5">
                          <button
                            onClick={() => setIsDebtModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f5365c] to-[#fb6340] text-white text-xs font-bold shadow-lg"
                          >
                            <Plus className="w-4 h-4" />
                            Add Debt / Loan Facility
                          </button>
                        </div>
                      </div>

                      {scopedDebts.length === 0 ? (
                        <div className="py-12 text-center">
                          <CreditCard className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                          <h3 className="text-base font-bold text-white">
                            No Active Debts Recorded for {currentEntity?.name}
                          </h3>
                          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                            Click &ldquo;Add Debt / Loan Facility&rdquo; above or record a Loan Drawdown transaction to begin tracking debt payoff velocity.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                          {scopedDebts.map((debt) => {
                            const paidAmount = Math.max(0, debt.originalPrincipal - debt.currentBalance);
                            const paidPct =
                              debt.originalPrincipal > 0
                                ? Math.min(100, Math.max(0, (paidAmount / debt.originalPrincipal) * 100))
                                : 0;
                            const linkedTxs = transactions.filter((t) => t.linkedDebtId === debt.id);

                            return (
                              <motion.div
                                key={debt.id}
                                layout
                                className="bg-[#0f1422] border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group"
                              >
                                <div
                                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                                    debt.currentBalance === 0
                                      ? "bg-[#2dce89]"
                                      : "bg-gradient-to-r from-[#5e72e4] to-[#2dce89]"
                                  }`}
                                />

                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[#11cdef]">
                                      {debt.lender || "Loan Facility"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-400">
                                        {debt.interestRate}% APR
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDebt(debt.id)}
                                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition"
                                        title="Delete debt"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <h3 className="text-lg font-bold text-white mt-2">{debt.title}</h3>

                                  <div className="mt-4 p-4 rounded-2xl bg-[#161c2d] border border-white/5">
                                    <div className="flex items-baseline justify-between">
                                      <div>
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                                          Remaining Balance
                                        </span>
                                        <span className="text-2xl font-extrabold text-white">
                                          {formatSEK(debt.currentBalance)}
                                        </span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                                          Paid Off
                                        </span>
                                        <span className="text-lg font-extrabold text-[#2dce89]">
                                          {paidPct.toFixed(1)}%
                                        </span>
                                      </div>
                                    </div>

                                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mt-3 p-0.5">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${paidPct}%` }}
                                        transition={{ type: "spring", stiffness: 80, damping: 18 }}
                                        className="h-full rounded-full bg-gradient-to-r from-[#5e72e4] via-[#11cdef] to-[#2dce89]"
                                      />
                                    </div>

                                    <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                                      <span>Paid: {formatSEK(paidAmount)}</span>
                                      <span>Original: {formatSEK(debt.originalPrincipal)}</span>
                                    </div>
                                  </div>

                                  {linkedTxs.length > 0 && (
                                    <div className="mt-4 space-y-1.5 max-h-28 overflow-y-auto">
                                      {linkedTxs.map((lt) => (
                                        <div
                                          key={lt.id}
                                          className="flex justify-between text-xs px-2.5 py-1.5 rounded-lg bg-[#161c2d]"
                                        >
                                          <span className="truncate max-w-[160px] text-slate-300">
                                            {lt.title}
                                          </span>
                                          <span
                                            className={`font-bold ${
                                              lt.type === "DEBT_PAYOFF"
                                                ? "text-[#2dce89]"
                                                : "text-[#fb6340]"
                                            }`}
                                          >
                                            {lt.type === "DEBT_PAYOFF" ? "-" : "+"}
                                            {formatSEK(lt.amount)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2.5 mt-6 pt-4 border-t border-slate-800">
                                  <button
                                    onClick={() => handleQuickDebtAction(debt, "PAYOFF")}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#2dce89]/15 hover:bg-[#2dce89]/25 text-[#2dce89] border border-[#2dce89]/30 text-xs font-bold transition"
                                  >
                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                    Pay Off
                                  </button>
                                  <button
                                    onClick={() => handleQuickDebtAction(debt, "DRAWDOWN")}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#fb6340]/15 hover:bg-[#fb6340]/25 text-[#fb6340] border border-[#fb6340]/30 text-xs font-bold transition"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    Increase Loan
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* TRANSACTIONS TABLE */}
                    <section className="bg-[#161c2d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <h3 className="text-lg sm:text-xl font-extrabold text-white">
                            {currentEntity?.name} — Transactions
                          </h3>
                          <p className="text-xs text-slate-400">
                            Singular and monthly recurring transactions ({scopedTransactions.length} recorded).
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept=".csv"
                            onChange={handleImportTransactionsCSV}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImportingCsv}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition"
                          >
                            <Upload className="w-3.5 h-3.5 text-[#11cdef]" />
                            {isImportingCsv ? "Importing..." : "Import CSV"}
                          </button>
                          <button
                            type="button"
                            onClick={handleExportTransactionsCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition"
                          >
                            <Download className="w-3.5 h-3.5 text-[#2dce89]" />
                            Export CSV
                          </button>
                          <button
                            onClick={() => setIsTxModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5e72e4] hover:bg-[#4b60d6] text-white text-xs font-bold transition shadow-lg shadow-[#5e72e4]/20"
                          >
                            <Plus className="w-4 h-4" />
                            Log Transaction
                          </button>
                        </div>
                      </div>

                      {scopedTransactions.length === 0 ? (
                        <div className="py-10 text-center text-xs text-slate-400">
                          No transactions logged for {currentEntity?.name} yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                <th className="py-3 px-4">Title & Associated Debt</th>
                                <th className="py-3 px-4">Cadence</th>
                                <th className="py-3 px-4">Effective Date</th>
                                <th className="py-3 px-4 text-right">Amount</th>
                                <th className="py-3 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-sm">
                              {scopedTransactions.map((tx) => {
                                const linkedDebt = debts.find((d) => d.id === tx.linkedDebtId);
                                const isPositive =
                                  tx.type === "INCOME" || tx.type === "LOAN_DRAWDOWN" || tx.type === "PAYOUT";

                                return (
                                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-white">{tx.title}</span>
                                        <span
                                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${
                                            tx.type === "PAYOUT"
                                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                              : tx.type === "INCOME"
                                              ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                              : tx.type === "LOAN_DRAWDOWN"
                                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                              : tx.type === "DEBT_PAYOFF"
                                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                          }`}
                                        >
                                          {tx.type === "PAYOUT"
                                            ? "Payout (+)"
                                            : tx.type === "INCOME"
                                            ? "Income (+)"
                                            : tx.type === "LOAN_DRAWDOWN"
                                            ? "Loan Drawdown (+)"
                                            : tx.type === "DEBT_PAYOFF"
                                            ? "Debt Payoff"
                                            : "Expense (-)"}
                                        </span>
                                      </div>
                                      {linkedDebt && (
                                        <div className="text-[11px] text-[#11cdef] mt-0.5">
                                          Linked Debt: {linkedDebt.title}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      {tx.frequency === "RECURRING_19TH" ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#5e72e4]/20 text-[#899bf4] text-xs font-bold">
                                          <RefreshCw className="w-3 h-3" />
                                          Monthly Recurring
                                        </span>
                                      ) : (
                                        <span className="text-xs text-slate-400">Singular</span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                                      {tx.date}
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-extrabold">
                                      <span
                                        className={
                                          tx.type === "DEBT_PAYOFF"
                                            ? "text-[#11cdef]"
                                            : isPositive
                                            ? "text-[#2dce89]"
                                            : "text-[#f5365c]"
                                        }
                                      >
                                        {isPositive ? "+" : "-"}
                                        {formatSEK(tx.amount)}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-3 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditTransaction(tx)}
                                          title="Edit transaction"
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#11cdef] hover:bg-[#11cdef]/10 transition"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTransaction(tx.id)}
                                          title="Delete transaction"
                                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </motion.div>
            )}

            {/* 2. ASSETS & INVENTORY TAB */}
            {activeTab === "ASSETS" && (
              <motion.div
                key="assets-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                {/* TOP FILTER & CONTROLS */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-[#161c2d] border border-white/10">
                  <div>
                    <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                      <Boxes className="w-5 h-5 text-[#11cdef]" />
                      Assets & Inventory Command
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Add, edit, adjust quantities, or delete products, inventory stock, capital assets, and equipment across entities.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* ADD ASSET / INVENTORY FORM */}
                  <div className="bg-[#161c2d] border border-white/10 rounded-3xl p-6 shadow-2xl h-fit">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                      <Package className="w-5 h-5 text-[#2dce89]" />
                      <h3 className="text-base sm:text-lg font-extrabold text-white">
                        Register Product or Asset
                      </h3>
                    </div>

                    {entities.length === 0 ? (
                      <div className="mt-4 space-y-3 text-center py-6">
                        <p className="text-xs text-slate-400">
                          Create an entity first before registering products or assets.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsEnterpriseModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-white text-xs font-bold"
                        >
                          + Create Entity
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleAddAsset} className="mt-4 space-y-4">
                        {/* ENTITY SELECTOR */}
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Assign to Entity
                          </label>
                          <select
                            value={newAssetEntityId}
                            onChange={(e) => setNewAssetEntityId(e.target.value)}
                            className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-xs sm:text-sm text-white font-semibold"
                          >
                            {entities.map((ent) => (
                              <option key={ent.id} value={ent.id}>
                                {ent.name} ({ent.category})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Product / Asset Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 480 slots top-loader binders"
                            value={newAssetName}
                            onChange={(e) => setNewAssetName(e.target.value)}
                            className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Category
                            </label>
                            <select
                              value={newAssetCategory}
                              onChange={(e) =>
                                setNewAssetCategory(e.target.value as AssetItem["category"])
                              }
                              className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white font-semibold"
                            >
                              <option value="INVENTORY">📦 Inventory Stock</option>
                              <option value="CASH">💰 Cash Reserve</option>
                              <option value="IP">⚡ Intellectual Property</option>
                              <option value="DOMAIN_PLATFORM">🌐 Web Platform / Domain</option>
                              <option value="EQUIPMENT">🛠 Equipment & Machinery</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Quantity (Units)
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              placeholder="1"
                              value={newAssetQuantity}
                              onChange={(e) => {
                                const qStr = e.target.value;
                                setNewAssetQuantity(qStr);
                                const qNum = Math.max(1, parseFloat(qStr) || 1);
                                const uNum = parseFloat(newAssetUnitValue);
                                if (!isNaN(uNum) && uNum >= 0) {
                                  setNewAssetValuation(String(Math.round(qNum * uNum * 100) / 100));
                                }
                              }}
                              className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white font-bold"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Unit Value (SEK)
                            </label>
                            <input
                              type="number"
                              step="any"
                              placeholder="0"
                              value={newAssetUnitValue}
                              onChange={(e) => {
                                const uStr = e.target.value;
                                setNewAssetUnitValue(uStr);
                                const uNum = parseFloat(uStr);
                                const qNum = Math.max(1, parseFloat(newAssetQuantity) || 1);
                                if (!isNaN(uNum) && uNum >= 0) {
                                  setNewAssetValuation(String(Math.round(qNum * uNum * 100) / 100));
                                } else if (uStr === "") {
                                  setNewAssetValuation("");
                                }
                              }}
                              className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Total Valuation (SEK)
                            </label>
                            <input
                              type="number"
                              step="any"
                              required
                              placeholder="0"
                              value={newAssetValuation}
                              onChange={(e) => {
                                const vStr = e.target.value;
                                setNewAssetValuation(vStr);
                                const vNum = parseFloat(vStr);
                                const qNum = Math.max(1, parseFloat(newAssetQuantity) || 1);
                                if (!isNaN(vNum) && vNum >= 0) {
                                  setNewAssetUnitValue(String(Math.round((vNum / qNum) * 100) / 100));
                                } else if (vStr === "") {
                                  setNewAssetUnitValue("");
                                }
                              }}
                              className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Notes (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Optional SKU, location, or details"
                            value={newAssetNotes}
                            onChange={(e) => setNewAssetNotes(e.target.value)}
                            className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-white font-bold text-sm shadow-lg shadow-[#5e72e4]/30 hover:opacity-95 transition"
                        >
                          Save Product / Asset to{" "}
                          {entities.find((e) => e.id === newAssetEntityId)?.name || activeEntityLabel}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* ASSETS / INVENTORY LIST */}
                  <div className="lg:col-span-2 space-y-4">
                    {scopedAssets.length === 0 ? (
                      <div className="bg-[#161c2d] border border-white/10 rounded-3xl p-12 text-center text-xs text-slate-400">
                        <Boxes className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                        <h4 className="text-base font-bold text-white">
                          No Products or Assets Listed
                        </h4>
                        <p className="mt-1 max-w-sm mx-auto text-slate-400">
                          Use the form on the left to register inventory items (with quantity & unit value) or capital assets.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {scopedAssets.map((asset) => {
                          const parentEntity = entities.find((e) => e.id === asset.entityId);
                          const isInventory = asset.category === "INVENTORY";
                          const qty = Math.max(1, Math.round(Number(asset.quantity) || 1));
                          const totalVal = Number(asset.valuation) || 0;
                          const unitVal =
                            asset.unitValue !== undefined && Number(asset.unitValue) > 0
                              ? Number(asset.unitValue)
                              : qty > 0
                              ? totalVal / qty
                              : totalVal;

                          return (
                            <motion.div
                              key={asset.id}
                              layout
                              className="bg-[#161c2d] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-white/25 transition relative"
                            >
                              <div>
                                {/* Header Row: Category Badge + Edit & Delete Buttons */}
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                                      isInventory
                                        ? "bg-amber-400/15 text-amber-300 border-amber-400/30"
                                        : asset.category === "CASH"
                                        ? "bg-emerald-400/15 text-emerald-300 border-emerald-400/30"
                                        : asset.category === "IP"
                                        ? "bg-purple-400/15 text-purple-300 border-purple-400/30"
                                        : "bg-[#11cdef]/15 text-[#11cdef] border-[#11cdef]/30"
                                    }`}
                                  >
                                    {asset.category.replace("_", " ")}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      title="Edit product / asset"
                                      onClick={() => handleOpenEditAsset(asset)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#5e72e4]/25 text-slate-300 hover:text-white border border-white/10 text-[11px] font-bold transition"
                                    >
                                      <Pencil className="w-3 h-3 text-[#11cdef]" />
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      title="Delete product / asset"
                                      onClick={() => handleDeleteAsset(asset.id)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/25 text-[11px] font-bold transition"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                {/* Product / Asset Title with Quantity Prefix */}
                                <h4 className="text-base font-bold text-white mt-3 flex items-baseline gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md bg-[#11cdef]/15 text-[#11cdef] border border-[#11cdef]/30 font-mono text-xs font-extrabold">
                                    {qty}x
                                  </span>
                                  <span>{asset.name}</span>
                                </h4>

                                {parentEntity && (
                                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400">
                                    <Building2 className="w-3 h-3 text-[#11cdef]" />
                                    <span>{parentEntity.name}</span>
                                  </div>
                                )}

                                {/* Interactive Quantity Stepper & Direct Input */}
                                <div className="mt-3.5 p-2.5 rounded-xl bg-[#0f1422] border border-white/10 flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Quantity
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustAssetQuantity(asset, qty - 1)}
                                      disabled={qty <= 1}
                                      className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 text-white flex items-center justify-center border border-white/10 transition"
                                      title="Decrease quantity by 1"
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={qty}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val >= 1) {
                                          handleAdjustAssetQuantity(asset, val);
                                        }
                                      }}
                                      className="w-16 text-center rounded-lg bg-[#161c2d] border border-white/15 py-1 text-xs font-mono font-extrabold text-white"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAdjustAssetQuantity(asset, qty + 1)}
                                      className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/15 text-white flex items-center justify-center border border-white/10 transition"
                                      title="Increase quantity by 1"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {asset.notes && (
                                  <p className="text-xs text-slate-300/80 mt-2.5 bg-[#0f1422] p-2.5 rounded-xl border border-white/5">
                                    {asset.notes}
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-800 space-y-1">
                                <div className="flex justify-between items-center text-[11px] text-slate-400">
                                  <span>Unit Value</span>
                                  <span className="font-mono font-semibold text-slate-300">
                                    {formatSEK(unitVal)} / unit
                                  </span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                  <span className="text-xs text-slate-400 font-semibold">
                                    Total Valuation ({qty}x)
                                  </span>
                                  <span className="text-lg font-extrabold text-[#2dce89]">
                                    {formatSEK(asset.valuation)}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. MANAGE ENTITIES & LOGOS TAB */}
            {activeTab === "ENTERPRISES" && (
              <motion.div
                key="enterprises-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-white">
                      Entities Directory
                    </h2>
                    <p className="text-xs text-slate-400">
                      Add new personal or enterprise entities, upload custom logos, or remove entities below.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEnterpriseModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-white text-xs font-bold shadow-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Entity
                  </button>
                </div>

                {entities.length === 0 ? (
                  <div className="bg-[#161c2d] border border-white/10 rounded-3xl p-12 text-center">
                    <Building2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white">No Entities Registered</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Click &ldquo;Create New Entity&rdquo; above to add your first entity.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {entities.map((ent) => (
                      <div
                        key={ent.id}
                        className="bg-[#161c2d] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
                      >
                        <div>
                          <div
                            className={`h-24 bg-gradient-to-r ${ent.argonGradient} p-5 flex items-center justify-between`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-2xl bg-black/30 backdrop-blur-md border border-white/25 flex items-center justify-center overflow-hidden shrink-0">
                                {ent.logoUrl ? (
                                  <img
                                    src={ent.logoUrl}
                                    alt={ent.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : ent.category === "PERSONAL" ? (
                                  <User className="w-6 h-6 text-white" />
                                ) : (
                                  <Building2 className="w-6 h-6 text-white" />
                                )}
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 block">
                                  {ent.category}
                                </span>
                                <h3 className="text-lg font-extrabold text-white">{ent.name}</h3>
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteEnterprise(ent.id)}
                              className="p-2 rounded-xl bg-black/30 hover:bg-rose-600 text-white transition"
                              title={`Delete ${ent.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="p-6 space-y-4">
                            {ent.subtitle && <p className="text-xs text-slate-400">{ent.subtitle}</p>}

                            <div className="p-3 rounded-xl bg-[#0f1422] border border-white/10">
                              <label className="flex items-center gap-2 text-xs font-bold text-[#11cdef] cursor-pointer">
                                <ImagePlus className="w-4 h-4" />
                                <span>{ent.logoUrl ? "Change Entity Logo" : "Upload Entity Logo"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) =>
                                    handleLogoFileUpload(e, (dataUrl) =>
                                      handleUpdateEnterpriseLogo(ent.id, dataUrl)
                                    )
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="px-6 pb-6">
                          <button
                            onClick={() => {
                              setSelectedEntityId(ent.id);
                              setActiveTab("OVERVIEW");
                            }}
                            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                          >
                            Switch to {ent.name} →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* 5. REFERRAL NETWORK & INVITE MATRIX */}
            {activeTab === "REFERRALS" && (
              <motion.div
                key="referrals-tab"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-8"
              >
                {/* TOP HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#161c2d] border border-white/10 shadow-2xl">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#5e72e4]/20 to-[#11cdef]/20 border border-[#11cdef]/30 text-[#11cdef] text-xs font-bold mb-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      Executive Referral Protocol
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                      Referral Network & Invite Code Matrix
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                      Generate unique invite codes with tailored clearance roles, share direct onboarding links, and track referred operators across the Hatake Enterprises ecosystem.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        generateRandomReferralCode();
                        setIsReferralModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#5e72e4] via-[#825ee4] to-[#11cdef] text-white text-xs sm:text-sm font-bold shadow-xl shadow-[#5e72e4]/30 hover:opacity-95 transition active:scale-[0.99]"
                    >
                      <UserPlus className="w-4 h-4" />
                      Generate New Referral Code
                    </button>
                  </div>
                </div>

                {/* KPI METRICS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-[#161c2d]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Active Referral Codes
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#5e72e4] to-[#11cdef] flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-extrabold text-white">
                      {inviteCodes.length}
                    </div>
                    <div className="mt-2 text-xs text-[#11cdef]">
                      Ready for distribution
                    </div>
                  </div>

                  <div className="bg-[#161c2d]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Referred Operators Joined
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2dce89] to-[#11cdef] flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-extrabold text-white">
                      {referredUsers.length}
                    </div>
                    <div className="mt-2 text-xs text-[#2dce89]">
                      Verified active cluster accounts
                    </div>
                  </div>

                  <div className="bg-[#161c2d]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Your Generated Codes
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#825ee4] to-[#f5365c] flex items-center justify-center">
                        <Share2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-extrabold text-white">
                      {inviteCodes.filter((c) => c.createdBy && c.createdBy === operator?.email).length}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Operator: {operator?.name || operator?.email || "Current User"}
                    </div>
                  </div>

                  <div className="bg-[#161c2d]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Total Code Redemptions
                      </span>
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#fb6340] to-[#f5365c] flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="mt-3 text-2xl font-extrabold text-white">
                      {inviteCodes.reduce((sum, c) => sum + (Number(c.usedCount) || 0), 0)}
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                      Cumulative invite usages
                    </div>
                  </div>
                </div>

                {/* PRIMARY REFERRAL LINK HIGHLIGHT */}
                {inviteCodes.length > 0 && (
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-[#161c2d] via-[#1a233a] to-[#161c2d] border border-[#11cdef]/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-[#11cdef]">
                          Quick Share — Primary Referral Link
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#11cdef]/20 text-[#11cdef]">
                          Code: {inviteCodes[0].code}
                        </span>
                      </div>
                      <p className="text-sm font-mono text-slate-200 truncate max-w-xl">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/?ref=${inviteCodes[0].code}`
                          : `/?ref=${inviteCodes[0].code}`}
                      </p>
                      <p className="text-xs text-slate-400">
                        Anyone opening this link will have code <span className="font-mono font-bold text-white">{inviteCodes[0].code}</span> pre-loaded and provisioned with <span className="font-bold text-[#11cdef]">{inviteCodes[0].role}</span>.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleCopyReferralLink(inviteCodes[0].code)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#11cdef] hover:bg-[#0fb8d6] text-[#0b0f19] text-xs font-extrabold transition shadow-lg shadow-[#11cdef]/20"
                      >
                        {copiedLinkKey === inviteCodes[0].code ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            Link Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy Invite Link
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyCode(inviteCodes[0].code)}
                        className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition"
                      >
                        {copiedRefKey === inviteCodes[0].code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#2dce89]" />
                            Code Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Code
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* INVITE CODES LEDGER */}
                <div className="bg-[#161c2d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                      <h3 className="text-xl font-extrabold text-white">
                        Active Referral Codes & Clearances
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Manage all issued invite codes, usage caps, assigned clearances, and direct referral URLs.
                      </p>
                    </div>
                  </div>

                  {inviteCodes.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      <KeyRound className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                      <h4 className="text-base font-bold text-white">No Invite Codes Found</h4>
                      <p className="mt-1">Click &ldquo;Generate New Referral Code&rdquo; above to create your first referral code.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto mt-6">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-3 px-4">Referral Code</th>
                            <th className="py-3 px-4">Assigned Role & Clearance</th>
                            <th className="py-3 px-4">Usage / Redemptions</th>
                            <th className="py-3 px-4">Author</th>
                            <th className="py-3 px-4 text-right">Quick Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm">
                          {inviteCodes.map((item) => {
                            const isExhausted = item.usedCount >= item.maxUses;
                            const usagePct =
                              item.maxUses > 0
                                ? Math.min(100, (item.usedCount / item.maxUses) * 100)
                                : 0;
                            const isMine = item.createdBy === operator?.email;

                            return (
                              <tr key={item.code} className="hover:bg-white/[0.02]">
                                <td className="py-4 px-4 font-mono font-bold text-white">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[#11cdef]">{item.code}</span>
                                    {item.badge && (
                                      <span className="px-2 py-0.5 text-[9px] font-mono font-extrabold rounded bg-[#5e72e4]/20 text-[#899bf4] border border-[#5e72e4]/30">
                                        {item.badge}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="font-semibold text-slate-100">{item.role}</div>
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    {item.clearance || item.entityScope}
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                                    <span>
                                      {item.usedCount} / {item.maxUses}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${isExhausted ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                                      {isExhausted ? "Depleted" : "Active"}
                                    </span>
                                  </div>
                                  <div className="w-28 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        isExhausted ? "bg-rose-500" : "bg-gradient-to-r from-[#5e72e4] to-[#11cdef]"
                                      }`}
                                      style={{ width: `${usagePct}%` }}
                                    />
                                  </div>
                                </td>

                                <td className="py-4 px-4 text-xs text-slate-400">
                                  {isMine ? (
                                    <span className="text-emerald-400 font-bold">You</span>
                                  ) : item.createdBy ? (
                                    <span className="truncate max-w-[140px] block">{item.createdBy}</span>
                                  ) : (
                                    <span className="text-slate-500">Root Governance</span>
                                  )}
                                </td>

                                <td className="py-4 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyReferralLink(item.code)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#11cdef]/15 hover:bg-[#11cdef]/25 text-[#11cdef] text-xs font-bold transition"
                                      title="Copy shareable referral URL"
                                    >
                                      {copiedLinkKey === item.code ? (
                                        <>
                                          <Check className="w-3.5 h-3.5" />
                                          Copied
                                        </>
                                      ) : (
                                        <>
                                          <Share2 className="w-3.5 h-3.5" />
                                          Copy Link
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCopyCode(item.code)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
                                      title="Copy code only"
                                    >
                                      {copiedRefKey === item.code ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-[#2dce89]" />
                                          Copied
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          Code
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteReferralCode(item.code)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition"
                                      title="Revoke and delete code"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* REFERRED MEMBERS NETWORK (ACTIVITY LEDGER) */}
                <div className="bg-[#161c2d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                      <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#2dce89]" />
                        Referred Operator Roster
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Active operators who verified their registration using an authorized Hatake invite code.
                      </p>
                    </div>
                  </div>

                  {referredUsers.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400">
                      No referred operators registered yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto mt-6">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-3 px-4">Operator Name</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Invite Code Used</th>
                            <th className="py-3 px-4">Provisioned Role</th>
                            <th className="py-3 px-4 text-right">Onboarded At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-sm">
                          {referredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-white/[0.02]">
                              <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#5e72e4] to-[#11cdef] flex items-center justify-center text-xs font-black text-white">
                                  {user.name ? user.name[0].toUpperCase() : "U"}
                                </div>
                                <span>{user.name}</span>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-mono text-slate-300">
                                {user.email}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs">
                                <span className="px-2.5 py-1 rounded-md bg-[#5e72e4]/20 text-[#899bf4] border border-[#5e72e4]/30 font-bold">
                                  {user.inviteCodeUsed}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-semibold text-emerald-400">
                                {user.role}
                              </td>
                              <td className="py-3.5 px-4 text-right text-xs font-mono text-slate-400">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL 1: ADD NEW ENTITY + LOGO             */}
      {/* ========================================== */}
      <AnimatePresence>
        {isEnterpriseModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161c2d] border border-white/15 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-xl font-extrabold text-white">
                  Create Entity & Attach Logo
                </h3>
                <button
                  onClick={() => setIsEnterpriseModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-white/5"
                >
                  ESC
                </button>
              </div>

              <form onSubmit={handleCreateEnterprise} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Entity Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter entity name"
                    value={entName}
                    onChange={(e) => setEntName(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={entCategory}
                      onChange={(e) =>
                        setEntCategory(
                          e.target.value as "PERSONAL" | "COMPANY" | "PROJECT" | "WEB_PLATFORM"
                        )
                      }
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                    >
                      <option value="PERSONAL">Personal</option>
                      <option value="COMPANY">Company</option>
                      <option value="PROJECT">Project / IP</option>
                      <option value="WEB_PLATFORM">Web Platform / Domain</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Argon Theme Accent
                    </label>
                    <select
                      value={entGradientIdx}
                      onChange={(e) => setEntGradientIdx(Number(e.target.value))}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                    >
                      {GRADIENT_PRESETS.map((g, idx) => (
                        <option key={g.label} value={idx}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Subtitle / Description
                  </label>
                  <input
                    type="text"
                    placeholder="Optional description"
                    value={entSubtitle}
                    onChange={(e) => setEntSubtitle(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Website URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={entUrl}
                    onChange={(e) => setEntUrl(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                {/* LOGO UPLOADER OR URL */}
                <div className="p-4 rounded-2xl bg-[#0f1422] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#11cdef]">
                      Entity Logo (Upload Image or Paste URL)
                    </span>
                    {entLogoUrl && (
                      <img
                        src={entLogoUrl}
                        alt="Preview"
                        className="h-9 w-9 rounded-lg object-cover border border-white/20"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer shrink-0">
                      Upload Logo File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoFileUpload(e, (url) => setEntLogoUrl(url))}
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Or paste image URL..."
                      value={entLogoUrl}
                      onChange={(e) => setEntLogoUrl(e.target.value)}
                      className="w-full rounded-xl bg-[#161c2d] border border-white/15 px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEnterpriseModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-white text-xs sm:text-sm font-extrabold"
                  >
                    Create Entity
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL 2: STANDALONE DEBT FACILITY          */}
      {/* ========================================== */}
      <AnimatePresence>
        {isDebtModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#161c2d] border border-white/15 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl"
            >
              <h3 className="text-xl font-extrabold text-white">
                Add Debt / Loan to {activeEntityLabel}
              </h3>
              <form onSubmit={handleCreateStandaloneDebt} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Debt / Loan Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter debt title"
                    value={debtTitle}
                    onChange={(e) => setDebtTitle(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Lender / Institution
                  </label>
                  <input
                    type="text"
                    placeholder="Enter lender name"
                    value={debtLender}
                    onChange={(e) => setDebtLender(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Original Principal (SEK)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={debtPrincipal}
                      onChange={(e) => setDebtPrincipal(e.target.value)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Current Balance (SEK)
                    </label>
                    <input
                      type="number"
                      placeholder="Defaults to principal"
                      value={debtBalance}
                      onChange={(e) => setDebtBalance(e.target.value)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Interest Rate (% APR)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={debtRate}
                    onChange={(e) => setDebtRate(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDebtModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#f5365c] to-[#fb6340] text-white text-xs font-extrabold"
                  >
                    Save Debt
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL 3: LOG TRANSACTION & LINK DEBT       */}
      {/* ========================================== */}
      <AnimatePresence>
        {isTxModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#161c2d] border border-white/15 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-xl font-extrabold text-white">
                  Log Transaction & Debt Association
                </h3>
                <button
                  onClick={() => setIsTxModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-white/5"
                >
                  ESC
                </button>
              </div>

              <form onSubmit={handleCreateTransaction} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Target Entity
                    </label>
                    <select
                      value={txEntityId}
                      onChange={(e) => setTxEntityId(e.target.value)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                    >
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Transaction Mode
                    </label>
                    <select
                      value={txType}
                      onChange={(e) => setTxType(e.target.value as TransactionType)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                    >
                      <option value="INCOME">Income / Inflow (+)</option>
                      <option value="EXPENSE">Expense (-)</option>
                      <option value="PAYOUT">Payout (+)</option>
                      <option value="DEBT_PAYOFF">Debt Payoff (Reduces Debt)</option>
                      <option value="LOAN_DRAWDOWN">Loan Drawdown (Builds Debt +)</option>
                    </select>
                  </div>
                </div>

                {(txType === "DEBT_PAYOFF" || txType === "LOAN_DRAWDOWN") && (
                  <div className="p-4 rounded-2xl bg-[#0f1422] border border-[#5e72e4]/40 space-y-3">
                    <label className="block text-xs font-bold text-[#899bf4]">
                      {txType === "DEBT_PAYOFF"
                        ? "Select Debt to Pay Off:"
                        : "Select Debt to Increase (or Originate New Loan):"}
                    </label>
                    <select
                      value={txLinkedDebtId}
                      onChange={(e) => setTxLinkedDebtId(e.target.value)}
                      className="w-full rounded-xl bg-[#161c2d] border border-white/15 px-3 py-2 text-xs sm:text-sm text-white"
                    >
                      {debts
                        .filter((d) => d.entityId === txEntityId)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title} ({formatSEK(d.currentBalance)} remaining)
                          </option>
                        ))}
                      {txType === "LOAN_DRAWDOWN" && (
                        <option value="NEW_LOAN_FACILITY">+ Create New Loan / Debt Facility</option>
                      )}
                    </select>

                    {txType === "LOAN_DRAWDOWN" && txLinkedDebtId === "NEW_LOAN_FACILITY" && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <input
                          type="text"
                          placeholder="Loan Title"
                          value={newLoanTitle}
                          onChange={(e) => setNewLoanTitle(e.target.value)}
                          className="rounded-lg bg-[#161c2d] border border-white/15 px-3 py-2 text-xs text-white"
                        />
                        <input
                          type="text"
                          placeholder="Lender Name"
                          value={newLoanLender}
                          onChange={(e) => setNewLoanLender(e.target.value)}
                          className="rounded-lg bg-[#161c2d] border border-white/15 px-3 py-2 text-xs text-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Title / Reference
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter transaction description"
                    value={txTitle}
                    onChange={(e) => setTxTitle(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Amount (SEK)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="0"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Schedule Cadence
                    </label>
                    <select
                      value={txFrequency}
                      onChange={(e) => setTxFrequency(e.target.value as TransactionFrequency)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                    >
                      <option value="SINGULAR">Singular (One-Off)</option>
                      <option value="RECURRING_19TH">Monthly Recurring</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTxModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#2dce89] text-white text-xs sm:text-sm font-extrabold"
                  >
                    Save Transaction
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL 4: CREATE REFERRAL INVITE CODE       */}
      {/* ========================================== */}
      <AnimatePresence>
        {isReferralModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#161c2d] border border-white/15 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#5e72e4] to-[#11cdef] flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    Create Referral Invite Code
                  </h3>
                </div>
                <button
                  onClick={() => setIsReferralModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-white/5"
                >
                  ESC
                </button>
              </div>

              {refModalError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <Flame className="w-4 h-4 shrink-0" />
                  <span>{refModalError}</span>
                </div>
              )}

              <form onSubmit={handleCreateReferralCode} className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Referral Code
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomReferralCode}
                      className="text-[11px] text-[#11cdef] hover:underline font-bold"
                    >
                      Randomize Code
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Enter referral code"
                    value={newRefCode}
                    onChange={(e) => setNewRefCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm font-mono tracking-wider font-bold text-[#11cdef]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This code can be shared directly or as an auto-fill URL (`?ref=CODE`).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Assigned Role / Title
                    </label>
                    <select
                      value={newRefRole}
                      onChange={(e) => setNewRefRole(e.target.value)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                    >
                      <option value="Partner Executive">Partner Executive</option>
                      <option value="Treasury Operator">Treasury Operator</option>
                      <option value="Financial Auditor">Financial Auditor</option>
                      <option value="Strategic Investor">Strategic Investor</option>
                      <option value="Operations Analyst">Operations Analyst</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={newRefMaxUses}
                      onChange={(e) => setNewRefMaxUses(e.target.value)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-xs sm:text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Entity Scope Clearance
                  </label>
                  <select
                    value={newRefScope}
                    onChange={(e) => setNewRefScope(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                  >
                    <option value="ALL_ENTITIES">All Entities</option>
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name} ({ent.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newRefExpiresAt}
                    onChange={(e) => setNewRefExpiresAt(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-xs sm:text-sm text-white"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsReferralModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingRef}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#5e72e4]/30 hover:opacity-95 disabled:opacity-50 transition"
                  >
                    {isCreatingRef ? "Activating Code..." : "Create & Activate Code"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL 5: EDIT PRODUCT / ASSET              */}
      {/* ========================================== */}
      <AnimatePresence>
        {editingAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#161c2d] border border-white/15 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#11cdef] to-[#2dce89] flex items-center justify-center">
                    <Pencil className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-xl font-extrabold text-white">
                    Edit Product / Asset
                  </h3>
                </div>
                <button
                  onClick={() => setEditingAsset(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-white/5"
                >
                  ESC
                </button>
              </div>

              <form onSubmit={handleUpdateAsset} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Assigned Entity
                  </label>
                  <select
                    value={editAssetEntityId}
                    onChange={(e) => setEditAssetEntityId(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-xs sm:text-sm text-white font-semibold"
                  >
                    {entities.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.name} ({ent.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Product / Asset Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editAssetName}
                    onChange={(e) => setEditAssetName(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={editAssetCategory}
                      onChange={(e) =>
                        setEditAssetCategory(e.target.value as AssetItem["category"])
                      }
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white font-semibold"
                    >
                      <option value="INVENTORY">📦 Inventory Stock</option>
                      <option value="CASH">💰 Cash Reserve</option>
                      <option value="IP">⚡ Intellectual Property</option>
                      <option value="DOMAIN_PLATFORM">🌐 Web Platform / Domain</option>
                      <option value="EQUIPMENT">🛠 Equipment & Machinery</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Quantity (Units)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={editAssetQuantity}
                      onChange={(e) => {
                        const qStr = e.target.value;
                        setEditAssetQuantity(qStr);
                        const qNum = Math.max(1, parseFloat(qStr) || 1);
                        const uNum = parseFloat(editAssetUnitValue);
                        if (!isNaN(uNum) && uNum >= 0) {
                          setEditAssetValuation(String(Math.round(qNum * uNum * 100) / 100));
                        }
                      }}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Unit Value (SEK)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={editAssetUnitValue}
                      onChange={(e) => {
                        const uStr = e.target.value;
                        setEditAssetUnitValue(uStr);
                        const uNum = parseFloat(uStr);
                        const qNum = Math.max(1, parseFloat(editAssetQuantity) || 1);
                        if (!isNaN(uNum) && uNum >= 0) {
                          setEditAssetValuation(String(Math.round(qNum * uNum * 100) / 100));
                        } else if (uStr === "") {
                          setEditAssetValuation("");
                        }
                      }}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Total Valuation (SEK)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={editAssetValuation}
                      onChange={(e) => {
                        const vStr = e.target.value;
                        setEditAssetValuation(vStr);
                        const vNum = parseFloat(vStr);
                        const qNum = Math.max(1, parseFloat(editAssetQuantity) || 1);
                        if (!isNaN(vNum) && vNum >= 0) {
                          setEditAssetUnitValue(String(Math.round((vNum / qNum) * 100) / 100));
                        } else if (vStr === "") {
                          setEditAssetUnitValue("");
                        }
                      }}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Optional SKU, location, or details"
                    value={editAssetNotes}
                    onChange={(e) => setEditAssetNotes(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleDeleteAsset(editingAsset.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Product
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingAsset(null)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#5e72e4]/30 hover:opacity-95 transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL 6: EDIT TRANSACTION                  */}
      {/* ========================================== */}
      <AnimatePresence>
        {editingTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#161c2d] border border-white/15 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Pencil className="w-5 h-5 text-[#11cdef]" />
                  <h3 className="text-xl font-extrabold text-white">
                    Edit Transaction
                  </h3>
                </div>
                <button
                  onClick={() => setEditingTransaction(null)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-white/5"
                >
                  ESC
                </button>
              </div>

              <form onSubmit={handleUpdateTransaction} className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Entity Assignment
                    </label>
                    <select
                      value={editTxEntityId}
                      onChange={(e) => setEditTxEntityId(e.target.value)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                    >
                      {entities.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Transaction Mode
                    </label>
                    <select
                      value={editTxType}
                      onChange={(e) => setEditTxType(e.target.value as TransactionType)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                    >
                      <option value="INCOME">Income / Inflow (+)</option>
                      <option value="EXPENSE">Expense (-)</option>
                      <option value="PAYOUT">Payout (+)</option>
                      <option value="DEBT_PAYOFF">Debt Payoff (Reduces Debt)</option>
                      <option value="LOAN_DRAWDOWN">Loan Drawdown (Builds Debt +)</option>
                    </select>
                  </div>
                </div>

                {(editTxType === "DEBT_PAYOFF" || editTxType === "LOAN_DRAWDOWN") && (
                  <div className="p-4 rounded-2xl bg-[#0f1422] border border-[#5e72e4]/40 space-y-2">
                    <label className="block text-xs font-bold text-[#899bf4]">
                      {editTxType === "DEBT_PAYOFF"
                        ? "Select Debt Being Paid Off:"
                        : "Select Debt Being Increased:"}
                    </label>
                    <select
                      value={editTxLinkedDebtId}
                      onChange={(e) => setEditTxLinkedDebtId(e.target.value)}
                      className="w-full rounded-xl bg-[#161c2d] border border-white/15 px-3 py-2 text-xs sm:text-sm text-white"
                    >
                      <option value="">-- None / Unlinked --</option>
                      {debts
                        .filter((d) => d.entityId === editTxEntityId)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title} ({formatSEK(d.currentBalance)} remaining)
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Title / Reference
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter transaction description"
                    value={editTxTitle}
                    onChange={(e) => setEditTxTitle(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Amount (SEK)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0"
                      value={editTxAmount}
                      onChange={(e) => setEditTxAmount(e.target.value)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Schedule Cadence
                    </label>
                    <select
                      value={editTxFrequency}
                      onChange={(e) => setEditTxFrequency(e.target.value as TransactionFrequency)}
                      className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3 py-2.5 text-xs sm:text-sm text-white"
                    >
                      <option value="SINGULAR">Singular (One-Off)</option>
                      <option value="RECURRING_19TH">Monthly Recurring</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editTxDate}
                    onChange={(e) => setEditTxDate(e.target.value)}
                    className="w-full rounded-xl bg-[#0f1422] border border-white/15 px-3.5 py-2.5 text-sm text-white"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleDeleteTransaction(editingTransaction.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingTransaction(null)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5e72e4] to-[#11cdef] text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-[#5e72e4]/30 hover:opacity-95 transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
