"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, AlertTriangle, Lightbulb, Target, DollarSign, Users, Image, Video, MessageCircle, MousePointerClick, Settings2, Eye, Play, Upload, Type } from "lucide-react";

interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  mockup: React.ReactNode;
  content: React.ReactNode;
}

/* ─── Reusable UI helpers ─── */

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl mt-4" style={{ backgroundColor: "rgba(212, 168, 67, 0.08)", border: "1px solid rgba(212, 168, 67, 0.2)" }}>
      <Lightbulb size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#D4A843" }} />
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</p>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl mt-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)" }}>
      <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{children}</p>
    </div>
  );
}

function NumberedStep({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start py-3">
      <span className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#D4A843" }}>
        {num}
      </span>
      <div className="text-sm text-[var(--text-primary)] leading-relaxed pt-0.5">{children}</div>
    </div>
  );
}

function ScreenLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3B82F6" }}>
      <Eye size={12} />
      {label}
    </span>
  );
}

function ButtonLabel({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "#1877F2" }}>
      {label}
    </span>
  );
}

function CodeBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-2.5 rounded-lg text-sm font-mono" style={{ backgroundColor: "#F1F5F9", color: "#334155", border: "1px solid #E2E8F0" }}>
      {children}
    </div>
  );
}

function MenuPath({ path }: { path: string }) {
  const parts = path.split(" > ");
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronLeft size={12} className="text-[var(--text-muted)]" />}
          <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F1F5F9", color: "#475569" }}>{part}</span>
        </span>
      ))}
    </span>
  );
}

/* ─── Animated Facebook Mockup Components ─── */

function MockupShell({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="rounded-xl overflow-hidden mb-5" style={{ border: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
      {/* Browser-like top bar */}
      <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: "#E2E8F0" }}>
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FDA4AF" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#FDE68A" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#86EFAC" }} />
        </div>
        <div className="flex-1 text-center text-[10px] font-medium" style={{ color: "#64748B" }}>{title}</div>
      </div>
      <div className="p-4" style={{ backgroundColor: "#FFFFFF" }}>
        {children}
      </div>
    </div>
  );
}

function PulsingCursor({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full"
      style={{
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.2)",
        animation: `pulse-cursor 2s ease-in-out infinite ${delay}s`,
      }}
    />
  );
}

function FbButton({ label, green, primary, small }: { label: string; green?: boolean; primary?: boolean; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md font-bold text-white ${small ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"}`}
      style={{ backgroundColor: green ? "#42B72A" : primary ? "#1877F2" : "#E4E6EB", color: green || primary ? "#fff" : "#050505" }}
    >
      {label}
    </span>
  );
}

function MockupAdsManager() {
  const [showMenu, setShowMenu] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowMenu(true), 1000); return () => clearTimeout(t); }, []);
  return (
    <MockupShell title="Meta Ads Manager — business.facebook.com">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded" style={{ backgroundColor: "#1877F2" }} />
          <span className="text-xs font-bold" style={{ color: "#1C1E21" }}>Ads Manager</span>
        </div>
        <div className="relative">
          <FbButton label="+ צור" green />
          {showMenu && (
            <div className="absolute top-full left-0 mt-1 rounded-lg shadow-lg p-1 z-10 animate-in" style={{ backgroundColor: "#fff", border: "1px solid #E2E8F0", minWidth: "120px" }}>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ backgroundColor: "rgba(24, 119, 242, 0.08)" }}>
                <PulsingCursor />
                <span className="text-xs font-bold" style={{ color: "#1877F2" }}>קמפיין</span>
              </div>
              <div className="px-3 py-2 text-xs" style={{ color: "#65676B" }}>אדסט</div>
              <div className="px-3 py-2 text-xs" style={{ color: "#65676B" }}>מודעה</div>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {["קמפיינים", "אדסטים", "מודעות", "דוחות"].map((t) => (
          <div key={t} className="text-center py-1.5 rounded text-[10px] font-medium" style={{ backgroundColor: "#F0F2F5", color: "#65676B" }}>{t}</div>
        ))}
      </div>
    </MockupShell>
  );
}

function MockupObjective() {
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setSelected("engagement"), 1500); return () => clearTimeout(t); }, []);
  const objectives = [
    { id: "awareness", label: "מודעות", icon: "👁️" },
    { id: "traffic", label: "תנועה", icon: "🔗" },
    { id: "engagement", label: "מעורבות", icon: "💬" },
    { id: "leads", label: "לידים", icon: "📋" },
    { id: "sales", label: "מכירות", icon: "🛒" },
    { id: "app", label: "אפליקציה", icon: "📱" },
  ];
  return (
    <MockupShell title="בחירת מטרת קמפיין">
      <p className="text-[10px] font-bold mb-2" style={{ color: "#1C1E21" }}>בחר מטרת קמפיין</p>
      <div className="grid grid-cols-3 gap-1.5">
        {objectives.map((o) => (
          <div
            key={o.id}
            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-center"
            style={{
              border: selected === o.id ? "2px solid #1877F2" : "1px solid #E2E8F0",
              backgroundColor: selected === o.id ? "rgba(24, 119, 242, 0.05)" : "#fff",
            }}
          >
            <span className="text-lg">{o.icon}</span>
            <span className="text-[9px] font-medium" style={{ color: selected === o.id ? "#1877F2" : "#65676B" }}>{o.label}</span>
            {selected === o.id && <PulsingCursor />}
          </div>
        ))}
      </div>
      {selected && (
        <div className="flex justify-end mt-3 animate-in">
          <FbButton label="המשך →" primary />
        </div>
      )}
    </MockupShell>
  );
}

function MockupCampaignName() {
  const [typed, setTyped] = useState("");
  const fullText = "דודי_מאמן_כושר_מעורבות_מרץ25";
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) { setTyped(fullText.slice(0, i)); i++; }
      else clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, []);
  return (
    <MockupShell title="הגדרת קמפיין חדש">
      <div className="mb-3">
        <p className="text-[10px] font-medium mb-1" style={{ color: "#65676B" }}>שם הקמפיין</p>
        <div className="flex items-center px-2.5 py-2 rounded-md" style={{ border: "1px solid #1877F2", backgroundColor: "#fff" }}>
          <span className="text-xs" style={{ color: "#1C1E21" }}>{typed}</span>
          <span className="w-0.5 h-4 mr-0.5" style={{ backgroundColor: "#1877F2", animation: "pulse-cursor 1s step-end infinite" }} />
        </div>
      </div>
      <div className="space-y-2">
        {[{ label: "Advantage Campaign Budget", val: "כבוי" }, { label: "A/B Test", val: "כבוי" }].map((r) => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: "#65676B" }}>{r.label}</span>
            <div className="w-8 h-4 rounded-full flex items-center px-0.5" style={{ backgroundColor: "#E4E6EB" }}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#BCC0C4" }} />
            </div>
          </div>
        ))}
      </div>
    </MockupShell>
  );
}

function MockupConversion() {
  const [step, setStep] = useState(0);
  useEffect(() => { const t1 = setTimeout(() => setStep(1), 1000); const t2 = setTimeout(() => setStep(2), 2500); return () => { clearTimeout(t1); clearTimeout(t2); }; }, []);
  return (
    <MockupShell title="הגדרת אדסט — יעד המרה">
      <div className="mb-3">
        <p className="text-[10px] font-medium mb-1" style={{ color: "#65676B" }}>Conversion Location</p>
        <div className="flex gap-1.5 flex-wrap">
          {["Website", "App", "Messaging Apps", "Calls"].map((o) => (
            <span key={o} className="px-2 py-1 rounded-md text-[10px] font-medium" style={{
              backgroundColor: step >= 1 && o === "Messaging Apps" ? "rgba(24, 119, 242, 0.1)" : "#F0F2F5",
              color: step >= 1 && o === "Messaging Apps" ? "#1877F2" : "#65676B",
              border: step >= 1 && o === "Messaging Apps" ? "1px solid #1877F2" : "1px solid transparent",
            }}>{o}</span>
          ))}
        </div>
      </div>
      {step >= 2 && (
        <div className="animate-in">
          <p className="text-[10px] font-medium mb-1.5" style={{ color: "#65676B" }}>Messaging Apps</p>
          <div className="space-y-1">
            {[{ name: "Messenger", checked: true, color: "#0084FF" }, { name: "WhatsApp", checked: false, color: "#25D366" }, { name: "Instagram", checked: false, color: "#E4405F" }].map((a) => (
              <div key={a.name} className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-sm flex items-center justify-center" style={{ backgroundColor: a.checked ? a.color : "#E4E6EB" }}>
                  {a.checked && <span className="text-white text-[8px]">✓</span>}
                </div>
                <span className="text-[10px]" style={{ color: "#1C1E21" }}>{a.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </MockupShell>
  );
}

function MockupBudget() {
  const [amount, setAmount] = useState(0);
  useEffect(() => {
    let v = 0;
    const t = setInterval(() => { if (v < 50) { v += 5; setAmount(v); } else clearInterval(t); }, 150);
    return () => clearInterval(t);
  }, []);
  return (
    <MockupShell title="תקציב ולוח זמנים">
      <div className="mb-3">
        <p className="text-[10px] font-medium mb-1" style={{ color: "#65676B" }}>Daily Budget (תקציב יומי)</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#E4E6EB" }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${amount}%`, backgroundColor: "#1877F2" }} />
          </div>
          <span className="text-xs font-bold min-w-[50px] text-left" style={{ color: "#1C1E21" }}>₪{amount}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 p-2 rounded-md" style={{ backgroundColor: "#F0F2F5" }}>
          <p className="text-[9px]" style={{ color: "#65676B" }}>התחלה</p>
          <p className="text-[10px] font-bold" style={{ color: "#1C1E21" }}>מיידי</p>
        </div>
        <div className="flex-1 p-2 rounded-md" style={{ backgroundColor: "#F0F2F5" }}>
          <p className="text-[9px]" style={{ color: "#65676B" }}>סיום</p>
          <p className="text-[10px] font-bold" style={{ color: "#1C1E21" }}>ללא הגבלה</p>
        </div>
      </div>
    </MockupShell>
  );
}

function MockupAudience() {
  const [progress, setProgress] = useState(0);
  useEffect(() => { const t = setInterval(() => setProgress((p) => p < 65 ? p + 3 : p), 100); return () => clearInterval(t); }, []);
  return (
    <MockupShell title="הגדרת קהל יעד">
      <div className="space-y-2">
        <div className="flex items-center justify-between p-1.5 rounded" style={{ backgroundColor: "#F0F2F5" }}>
          <span className="text-[10px]" style={{ color: "#65676B" }}>מיקום</span>
          <span className="text-[10px] font-bold" style={{ color: "#1C1E21" }}>ישראל 🇮🇱</span>
        </div>
        <div className="flex items-center justify-between p-1.5 rounded" style={{ backgroundColor: "#F0F2F5" }}>
          <span className="text-[10px]" style={{ color: "#65676B" }}>גיל</span>
          <span className="text-[10px] font-bold" style={{ color: "#1C1E21" }}>25 — 55</span>
        </div>
        <div className="flex items-center justify-between p-1.5 rounded" style={{ backgroundColor: "#F0F2F5" }}>
          <span className="text-[10px]" style={{ color: "#65676B" }}>מגדר</span>
          <span className="text-[10px] font-bold" style={{ color: "#1C1E21" }}>הכל</span>
        </div>
        <div className="flex items-center justify-between p-1.5 rounded" style={{ backgroundColor: "#F0F2F5" }}>
          <span className="text-[10px]" style={{ color: "#65676B" }}>Advantage+</span>
          <div className="w-7 h-3.5 rounded-full flex items-center justify-end px-0.5" style={{ backgroundColor: "#1877F2" }}>
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </div>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[9px] mb-1" style={{ color: "#65676B" }}>גודל קהל משוער</p>
        <div className="h-2 rounded-full" style={{ backgroundColor: "#E4E6EB" }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: progress > 30 && progress < 80 ? "#42B72A" : "#FFC107" }} />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[8px]" style={{ color: "#65676B" }}>מצומצם</span>
          <span className="text-[8px] font-bold" style={{ color: "#42B72A" }}>1.2M — 3.5M</span>
          <span className="text-[8px]" style={{ color: "#65676B" }}>רחב</span>
        </div>
      </div>
    </MockupShell>
  );
}

function MockupPlacements() {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), 1000); return () => clearTimeout(t); }, []);
  return (
    <MockupShell title="מיקומים (Placements)">
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg" style={{ border: on ? "1px solid #1877F2" : "1px solid #E2E8F0", backgroundColor: on ? "rgba(24, 119, 242, 0.04)" : "#fff" }}>
          <div>
            <p className="text-[10px] font-bold" style={{ color: "#1C1E21" }}>Advantage+ Placements</p>
            <p className="text-[8px]" style={{ color: "#65676B" }}>מומלץ — פייסבוק יבחר אוטומטית</p>
          </div>
          {on && <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: "#1877F2" }}><span className="text-white text-[8px]">✓</span></div>}
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg" style={{ border: "1px solid #E2E8F0" }}>
          <div>
            <p className="text-[10px]" style={{ color: "#65676B" }}>Manual Placements</p>
            <p className="text-[8px]" style={{ color: "#BCC0C4" }}>בחירה ידנית</p>
          </div>
        </div>
      </div>
      {on && (
        <div className="mt-2 flex flex-wrap gap-1 animate-in">
          {["Facebook Feed", "Instagram Feed", "Stories", "Reels"].map((p) => (
            <span key={p} className="px-1.5 py-0.5 rounded text-[8px]" style={{ backgroundColor: "#E7F0FE", color: "#1877F2" }}>{p}</span>
          ))}
        </div>
      )}
    </MockupShell>
  );
}

function MockupFormat() {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setPicked("video"), 1500); return () => clearTimeout(t); }, []);
  return (
    <MockupShell title="בחירת פורמט מודעה">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg text-center" style={{ border: picked === "video" ? "2px solid #1877F2" : "1px solid #E2E8F0", backgroundColor: picked === "video" ? "rgba(24, 119, 242, 0.04)" : "#fff" }}>
          <div className="w-10 h-10 mx-auto mb-1 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F0F2F5" }}>
            <Play size={16} style={{ color: picked === "video" ? "#1877F2" : "#65676B" }} />
          </div>
          <p className="text-[10px] font-bold" style={{ color: picked === "video" ? "#1877F2" : "#1C1E21" }}>סרטון בודד</p>
          <p className="text-[8px]" style={{ color: "#65676B" }}>Single Video</p>
        </div>
        <div className="p-3 rounded-lg text-center" style={{ border: "1px solid #E2E8F0" }}>
          <div className="w-10 h-10 mx-auto mb-1 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F0F2F5" }}>
            <Image size={16} style={{ color: "#65676B" }} />
          </div>
          <p className="text-[10px]" style={{ color: "#1C1E21" }}>תמונה בודדת</p>
          <p className="text-[8px]" style={{ color: "#65676B" }}>Single Image</p>
        </div>
      </div>
    </MockupShell>
  );
}

function MockupCreative() {
  const [stage, setStage] = useState(0);
  useEffect(() => { const t1 = setTimeout(() => setStage(1), 800); const t2 = setTimeout(() => setStage(2), 2000); return () => { clearTimeout(t1); clearTimeout(t2); }; }, []);
  return (
    <MockupShell title="העלאת קריאייטיב וטקסטים">
      <div className="flex gap-3">
        <div className="w-20 h-20 rounded-lg flex flex-col items-center justify-center" style={{ backgroundColor: "#F0F2F5", border: "1px dashed #BCC0C4" }}>
          {stage >= 1 ? (
            <div className="w-full h-full rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)" }}>
              <Play size={16} className="text-white" />
            </div>
          ) : (
            <>
              <Upload size={14} style={{ color: "#BCC0C4" }} />
              <span className="text-[8px] mt-0.5" style={{ color: "#BCC0C4" }}>העלה</span>
            </>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <div>
            <p className="text-[8px]" style={{ color: "#65676B" }}>Primary Text</p>
            <div className="p-1 rounded" style={{ backgroundColor: "#F0F2F5" }}>
              <p className="text-[9px]" style={{ color: stage >= 2 ? "#1C1E21" : "#BCC0C4" }}>
                {stage >= 2 ? "השיטה שמשנה את הכללים..." : "הקופי מ-FBM Studio"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[8px]" style={{ color: "#65676B" }}>Headline</p>
            <div className="p-1 rounded" style={{ backgroundColor: "#F0F2F5" }}>
              <p className="text-[9px]" style={{ color: stage >= 2 ? "#1C1E21" : "#BCC0C4" }}>
                {stage >= 2 ? "הפסק לנחש, תתחיל להרוויח" : "כותרת..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Type size={10} style={{ color: "#65676B" }} />
            <span className="text-[8px]" style={{ color: "#65676B" }}>CTA:</span>
            <span className="text-[8px] font-bold" style={{ color: "#1877F2" }}>Send Message</span>
          </div>
        </div>
      </div>
    </MockupShell>
  );
}

function MockupMessageTemplate() {
  const [stage, setStage] = useState(0);
  useEffect(() => { const t1 = setTimeout(() => setStage(1), 800); const t2 = setTimeout(() => setStage(2), 2000); return () => { clearTimeout(t1); clearTimeout(t2); }; }, []);
  return (
    <MockupShell title="תבנית הודעה — Messenger">
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E2E8F0", maxWidth: "180px", margin: "0 auto" }}>
        {/* Chat header */}
        <div className="flex items-center gap-2 px-2 py-1.5" style={{ backgroundColor: "#0084FF" }}>
          <div className="w-5 h-5 rounded-full bg-white/30" />
          <span className="text-[9px] font-bold text-white">העסק שלך</span>
        </div>
        {/* Chat body */}
        <div className="p-2 space-y-2" style={{ backgroundColor: "#fff" }}>
          {stage >= 1 && (
            <div className="animate-in">
              <div className="inline-block p-2 rounded-2xl rounded-tr-md max-w-[140px]" style={{ backgroundColor: "#F0F2F5" }}>
                <p className="text-[9px]" style={{ color: "#1C1E21" }}>היי! 👋 שמח שהגעת. ספר לי קצת על עצמך</p>
              </div>
            </div>
          )}
          {stage >= 2 && (
            <div className="flex flex-wrap gap-1 animate-in">
              {["אני רוצה לשמוע עוד", "פגישת ייעוץ", "כמה זה עולה?"].map((b) => (
                <span key={b} className="px-2 py-1 rounded-full text-[8px] font-medium" style={{ backgroundColor: "rgba(0, 132, 255, 0.1)", color: "#0084FF", border: "1px solid rgba(0, 132, 255, 0.3)" }}>
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </MockupShell>
  );
}

function MockupPublish() {
  const [checks, setChecks] = useState(0);
  useEffect(() => { const t = setInterval(() => setChecks((c) => c < 5 ? c + 1 : c), 600); return () => clearInterval(t); }, []);
  const items = ["מטרת קמפיין", "תקציב", "קהל יעד", "קריאייטיב", "תבנית הודעה"];
  return (
    <MockupShell title="בדיקה ופרסום">
      <div className="space-y-1.5 mb-3">
        {items.map((item, i) => (
          <div key={item} className="flex items-center gap-2 p-1.5 rounded" style={{ backgroundColor: i < checks ? "rgba(34, 197, 94, 0.06)" : "#F0F2F5" }}>
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: i < checks ? "#22C55E" : "#E4E6EB" }}>
              {i < checks && <span className="text-white text-[7px]">✓</span>}
            </div>
            <span className="text-[10px]" style={{ color: i < checks ? "#1C1E21" : "#65676B" }}>{item}</span>
          </div>
        ))}
      </div>
      {checks >= 5 && (
        <div className="text-center animate-in">
          <FbButton label="Publish 🚀" primary />
        </div>
      )}
    </MockupShell>
  );
}

/* ─── Step definitions ─── */

const STEPS: Step[] = [
  {
    id: 1,
    title: "כניסה למנהל המודעות",
    subtitle: "פתיחת Ads Manager",
    icon: <Settings2 size={20} />,
    mockup: <MockupAdsManager />,
    content: (
      <>
        <NumberedStep num={1}>
          היכנס לכתובת{" "}
          <span className="font-bold text-[var(--text-primary)]">business.facebook.com</span>{" "}
          או לחץ על <MenuPath path="תפריט > מנהל מודעות" /> מתוך הדף העסקי שלך.
        </NumberedStep>
        <NumberedStep num={2}>
          לחץ על הכפתור הירוק <ButtonLabel label="+ צור" /> בפינה השמאלית העליונה של המסך.
        </NumberedStep>
        <NumberedStep num={3}>
          בחר <span className="font-bold">קמפיין</span> מהתפריט שנפתח.
        </NumberedStep>
        <Tip>
          אם אין לך עדיין חשבון פרסום — פייסבוק ייצור לך אחד אוטומטית כשתנסה ליצור קמפיין לראשונה. וודא שיש לך אמצעי תשלום מוגדר.
        </Tip>
      </>
    ),
  },
  {
    id: 2,
    title: "בחירת מטרת הקמפיין",
    subtitle: "Engagement — מעורבות",
    icon: <Target size={20} />,
    mockup: <MockupObjective />,
    content: (
      <>
        <NumberedStep num={1}>
          במסך <ScreenLabel label="בחר מטרת קמפיין" /> תראה 6 אפשרויות. בחר ב:
          <div className="mt-2 p-3 rounded-xl font-bold text-base" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#16A34A" }}>
            מעורבות (Engagement)
          </div>
        </NumberedStep>
        <NumberedStep num={2}>
          לחץ <ButtonLabel label="המשך" />.
        </NumberedStep>
        <Warning>
          אל תבחר &quot;לידים&quot; (Leads) — זה ייצור טופס ולא הודעות. אנחנו רוצים שאנשים ישלחו הודעה ישירה.
        </Warning>
        <Tip>
          מטרת &quot;מעורבות&quot; מאפשרת לנו בשלב הבא לבחור &quot;הודעות&quot; כיעד המרה — ככה פייסבוק יביא אנשים שסביר שישלחו הודעה.
        </Tip>
      </>
    ),
  },
  {
    id: 3,
    title: "הגדרת שם הקמפיין",
    subtitle: "שם ברור ומסודר",
    icon: <Settings2 size={20} />,
    mockup: <MockupCampaignName />,
    content: (
      <>
        <NumberedStep num={1}>
          במסך <ScreenLabel label="קמפיין חדש" /> — מלא את שדה <strong>שם הקמפיין</strong>.
        </NumberedStep>
        <NumberedStep num={2}>
          השתמש בפורמט ברור, למשל:
          <div className="mt-2 space-y-1.5">
            <CodeBox>דודי_מאמן_כושר_מעורבות_הודעות_מרץ25</CodeBox>
            <CodeBox>שרה_יועצת_משכנתאות_הודעות_מרץ25</CodeBox>
          </div>
        </NumberedStep>
        <NumberedStep num={3}>
          <strong>הגדרות מיוחדות:</strong>
          <ul className="mt-1 space-y-1 mr-4 list-disc text-[var(--text-secondary)]">
            <li>קטגוריית מודעה מיוחדת — <strong>לא</strong> (אלא אם מדובר בנדל&quot;ן, אשראי, תעסוקה)</li>
            <li>A/B Test — <strong>כבוי</strong></li>
            <li>Advantage Campaign Budget — <strong>כבוי</strong> (נגדיר תקציב ברמת האדסט)</li>
          </ul>
        </NumberedStep>
        <NumberedStep num={4}>
          לחץ <ButtonLabel label="הבא" /> לעבור לשלב האדסט.
        </NumberedStep>
        <Tip>
          כבה את Advantage Campaign Budget כי אנחנו רוצים שליטה מלאה בתקציב ברמת האדסט.
        </Tip>
      </>
    ),
  },
  {
    id: 4,
    title: "הגדרת האדסט — יעד המרה",
    subtitle: "Messaging Apps — הודעות",
    icon: <MessageCircle size={20} />,
    mockup: <MockupConversion />,
    content: (
      <>
        <NumberedStep num={1}>
          במסך <ScreenLabel label="אדסט חדש" /> — תן שם לאדסט. למשל:
          <div className="mt-2">
            <CodeBox>קהל_חם_גיל_25-55_מרכז</CodeBox>
          </div>
        </NumberedStep>
        <NumberedStep num={2}>
          בסעיף <strong>Conversion Location</strong> (יעד המרה) — בחר:
          <div className="mt-2 p-3 rounded-xl font-bold" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#16A34A" }}>
            Messaging Apps (אפליקציות הודעות)
          </div>
        </NumberedStep>
        <NumberedStep num={3}>
          בסעיף <strong>Messaging Apps</strong> — בחר:
          <ul className="mt-1 space-y-1.5 mr-4">
            <li className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-500" />
              <span><strong>Messenger</strong> — מומלץ כברירת מחדל</span>
            </li>
            <li className="flex items-center gap-2">
              <Circle size={14} className="text-gray-400" />
              <span><strong>WhatsApp</strong> — אופציונלי, אם יש חשבון עסקי</span>
            </li>
            <li className="flex items-center gap-2">
              <Circle size={14} className="text-gray-400" />
              <span><strong>Instagram Direct</strong> — אופציונלי</span>
            </li>
          </ul>
        </NumberedStep>
        <Tip>
          Messenger הוא הכי אמין ופשוט — העדיפו אותו בהתחלה. WhatsApp דורש חשבון WhatsApp Business מחובר לעמוד.
        </Tip>
      </>
    ),
  },
  {
    id: 5,
    title: "תקציב ולוח זמנים",
    subtitle: "כמה להשקיע ומתי להתחיל",
    icon: <DollarSign size={20} />,
    mockup: <MockupBudget />,
    content: (
      <>
        <NumberedStep num={1}>
          בסעיף <strong>Budget & Schedule</strong> — בחר <strong>Daily Budget</strong> (תקציב יומי).
        </NumberedStep>
        <NumberedStep num={2}>
          הגדר תקציב יומי לפי הצורך:
          <div className="mt-2 space-y-2">
            {[
              { label: "בדיקה ראשונית", value: "30-50 ₪/יום" },
              { label: "קמפיין פעיל רגיל", value: "50-100 ₪/יום" },
              { label: "קמפיין אגרסיבי", value: "100-300 ₪/יום" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <span className="text-sm font-medium text-[var(--text-primary)]">{r.label}</span>
                <span className="font-bold" style={{ color: "#D4A843" }}>{r.value}</span>
              </div>
            ))}
          </div>
        </NumberedStep>
        <NumberedStep num={3}>
          <strong>תאריך התחלה:</strong> אפשר להשאיר &quot;מיד&quot; או לבחור תאריך עתידי.
          <br />
          <strong>תאריך סיום:</strong> מומלץ <strong>לא להגדיר</strong> תאריך סיום — ככה תוכל לעצור ידנית כשתרצה.
        </NumberedStep>
        <Warning>
          אל תתחיל עם תקציב גבוה מדי! התחל עם 30-50 ₪ ליום, בדוק תוצאות 3-5 ימים, ואז תעלה בהדרגה.
        </Warning>
        <Tip>
          עדיף לרוץ בתקציב נמוך ל-7 ימים מאשר בתקציב גבוה ליום אחד. פייסבוק צריך זמן ללמוד את הקהל שלך (שלב הלמידה).
        </Tip>
      </>
    ),
  },
  {
    id: 6,
    title: "הגדרת קהל יעד (טרגוט)",
    subtitle: "מי יראה את המודעה",
    icon: <Users size={20} />,
    mockup: <MockupAudience />,
    content: (
      <>
        <NumberedStep num={1}>
          <strong>מיקום גאוגרפי:</strong>
          <ul className="mt-1 space-y-1 mr-4 list-disc text-[var(--text-secondary)]">
            <li>בחר <strong>ישראל</strong> (או אזור ספציפי אם רלוונטי)</li>
            <li>אפשר לצמצם לערים — למשל: תל אביב, חיפה, ירושלים</li>
            <li>אפשר להוסיף רדיוס סביב נקודה — מתאים לעסקים מקומיים</li>
          </ul>
        </NumberedStep>
        <NumberedStep num={2}>
          <strong>גיל:</strong>
          <div className="mt-1 p-3 rounded-xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <span className="text-sm text-[var(--text-primary)]">הטווח המומלץ לרוב העסקים: <strong>25-55</strong></span>
            <br />
            <span className="text-xs text-[var(--text-muted)]">התאם לפי הנישה — מאמני כושר למשל: 22-45, יועצי משכנתאות: 28-50</span>
          </div>
        </NumberedStep>
        <NumberedStep num={3}>
          <strong>מגדר:</strong> בחר <strong>הכל</strong> (אלא אם השירות ספציפי למגדר מסוים).
        </NumberedStep>
        <NumberedStep num={4}>
          <strong>Detailed Targeting (תחומי עניין):</strong>
          <div className="mt-2 p-3 rounded-xl font-bold" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#16A34A" }}>
            השאר ריק — אל תבחר תחומי עניין!
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            האלגוריתם של פייסבוק חכם מספיק כדי למצוא את הקהל הנכון בעצמו. בחירת תחומי עניין ידנית מגבילה אותו ועלולה לייקר את העלויות.
          </p>
        </NumberedStep>
        <NumberedStep num={5}>
          <strong>Advantage+ Audience:</strong> השאר <strong>מופעל</strong> — זה נותן לפייסבוק חופש מלא למצוא את האנשים שהכי סביר שישלחו הודעה.
        </NumberedStep>
        <Tip>
          גישת ה-Broad Targeting (קהל רחב ללא תחומי עניין) היא המומלצת ב-2025. פייסבוק למד מיליארדי נקודות מידע ויודע טוב יותר מכולם מי הקהל הנכון עבור המודעה שלך. רק הגדר מיקום, גיל ומגדר — והשאר את השאר לאלגוריתם.
        </Tip>
      </>
    ),
  },
  {
    id: 7,
    title: "מיקומים (Placements)",
    subtitle: "היכן תופיע המודעה",
    icon: <MousePointerClick size={20} />,
    mockup: <MockupPlacements />,
    content: (
      <>
        <NumberedStep num={1}>
          בסעיף <strong>Placements</strong> — בחר:
          <div className="mt-2 p-3 rounded-xl font-bold" style={{ backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#16A34A" }}>
            Advantage+ Placements (מומלץ)
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            זה נותן לפייסבוק את הגמישות להציג את המודעה במיקום הכי אפקטיבי.
          </p>
        </NumberedStep>
        <NumberedStep num={2}>
          <strong>אם אתה רוצה שליטה ידנית</strong> — בחר &quot;Manual Placements&quot; והפעל:
          <ul className="mt-1 space-y-1.5 mr-4">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /><span>Facebook Feed</span></li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /><span>Instagram Feed</span></li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /><span>Facebook / Instagram Stories & Reels</span></li>
            <li className="flex items-center gap-2"><Circle size={14} className="text-gray-400" /><span className="text-[var(--text-muted)]">Audience Network — מומלץ לכבות</span></li>
          </ul>
        </NumberedStep>
        <NumberedStep num={3}>
          לחץ <ButtonLabel label="הבא" /> לעבור ליצירת המודעה.
        </NumberedStep>
        <Tip>
          למתחילים — השאירו Advantage+ Placements. פייסבוק כבר יודע איפה הקהל שלכם הכי פעיל.
        </Tip>
      </>
    ),
  },
  {
    id: 8,
    title: "יצירת המודעה — בחירת פורמט",
    subtitle: "סרטון או תמונה",
    icon: <Image size={20} />,
    mockup: <MockupFormat />,
    content: (
      <>
        <NumberedStep num={1}>
          במסך <ScreenLabel label="מודעה חדשה" /> — תן שם למודעה. למשל:
          <div className="mt-2"><CodeBox>וידאו_סיפור_אישי_v1</CodeBox></div>
        </NumberedStep>
        <NumberedStep num={2}>
          בסעיף <strong>Ad Setup</strong> — בחר <strong>Create Ad</strong> (יצירת מודעה חדשה).
        </NumberedStep>
        <NumberedStep num={3}>
          בסעיף <strong>Format</strong> (פורמט) — בחר אחד:
          <div className="mt-2 space-y-3">
            <div className="p-4 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.05)", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Video size={16} className="text-green-600" />
                <strong className="text-green-700">Single Video (סרטון בודד) — מומלץ!</strong>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mr-6">
                סרטון FBM מבוסס תדר — הכי אפקטיבי.
              </p>
            </div>
            <div className="p-4 rounded-xl" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div className="flex items-center gap-2 mb-1">
                <Image size={16} className="text-blue-500" />
                <strong className="text-[var(--text-primary)]">Single Image (תמונה בודדת)</strong>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mr-6">
                קריאייטיב תמונה — מתאים לבדיקה מהירה או כשאין סרטון מוכן.
              </p>
            </div>
          </div>
        </NumberedStep>
        <Tip>
          בשיטת FBM, סרטון תמיד יביא תוצאות טובות יותר מתמונה. הסרטון יוצר חיבור רגשי וקרבה. אם אין לך סרטון, צור אחד במערכת &quot;יצירת וידאו&quot;.
        </Tip>
      </>
    ),
  },
  {
    id: 9,
    title: "העלאת קריאייטיב ומילוי טקסטים",
    subtitle: "תמונה/סרטון + קופי",
    icon: <Video size={20} />,
    mockup: <MockupCreative />,
    content: (
      <>
        <NumberedStep num={1}>
          <strong>העלאת מדיה:</strong>
          <ul className="mt-1 space-y-1 mr-4 list-disc text-[var(--text-secondary)]">
            <li><strong>סרטון:</strong> לחץ &quot;Add Video&quot; → &quot;Upload&quot; → בחר את הסרטון מהמחשב</li>
            <li><strong>תמונה:</strong> לחץ &quot;Add Media&quot; → &quot;Upload&quot; → בחר את התמונה</li>
            <li>גודל מומלץ: <strong>1080x1080</strong> (ריבועי) או <strong>1080x1920</strong> (סטורי)</li>
          </ul>
        </NumberedStep>
        <NumberedStep num={2}>
          <strong>Primary Text (טקסט ראשי):</strong>
          <div className="mt-2 p-3 rounded-xl text-sm" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <span className="text-[var(--text-primary)]">זה הטקסט שמופיע <strong>מעל</strong> המודעה בפיד.</span>
            <br />
            <span className="text-[var(--text-muted)]">השתמש בקופי שנוצר במערכת FBM — העתק אותו מדף הקופי בפרויקט שלך.</span>
          </div>
        </NumberedStep>
        <NumberedStep num={3}>
          <strong>Headline (כותרת):</strong>
          <div className="mt-2 p-3 rounded-xl text-sm" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <span className="text-[var(--text-primary)]">כותרת קצרה ואימפקטית. 5-10 מילים.</span>
            <br />
            <span className="text-[var(--text-muted)]">למשל: &quot;הפסק לנחש, תתחיל להרוויח&quot;</span>
          </div>
        </NumberedStep>
        <NumberedStep num={4}>
          <strong>Description (תיאור):</strong>
          <div className="mt-2 p-3 rounded-xl text-sm" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <span className="text-[var(--text-primary)]">משפט תמיכה קצר מתחת לכותרת.</span>
            <br />
            <span className="text-[var(--text-muted)]">למשל: &quot;שלח הודעה עכשיו לפגישת ייעוץ חינם&quot;</span>
          </div>
        </NumberedStep>
        <NumberedStep num={5}>
          <strong>Call to Action (קריאה לפעולה):</strong> בחר <ButtonLabel label="Send Message" /> מהרשימה.
        </NumberedStep>
        <Tip>
          הקופי שנוצר במערכת FBM מותאם בדיוק לשיטת התדר. העתק את הקופי מדף &quot;קופי&quot; בפרויקט שלך.
        </Tip>
      </>
    ),
  },
  {
    id: 10,
    title: "הגדרת תבנית הודעה",
    subtitle: "Message Template",
    icon: <MessageCircle size={20} />,
    mockup: <MockupMessageTemplate />,
    content: (
      <>
        <NumberedStep num={1}>
          בסעיף <strong>Message Template</strong> — לחץ <ButtonLabel label="Create" />.
        </NumberedStep>
        <NumberedStep num={2}>
          בחר <strong>Start Conversations</strong> (התחל שיחות).
        </NumberedStep>
        <NumberedStep num={3}>
          <strong>Greeting (ברכה):</strong> כתוב הודעת פתיחה שהלקוח יראה:
          <div className="mt-2 p-3 rounded-xl text-sm" style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }} dir="rtl">
            <p className="mb-1 text-[var(--text-primary)]">דוגמה:</p>
            <p className="text-[var(--text-secondary)] italic">
              &quot;היי! 👋 שמח שהגעת. ספר לי קצת על עצמך ואשמח לעזור לך.&quot;
            </p>
          </div>
        </NumberedStep>
        <NumberedStep num={4}>
          <strong>Customer Actions (פעולות מוצעות):</strong> הוסף 1-3 כפתורי תגובה מהירה:
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["אני רוצה לשמוע עוד", "מעוניין בפגישת ייעוץ", "כמה זה עולה?"].map((b) => (
              <span key={b} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: "rgba(24, 119, 242, 0.1)", color: "#1877F2", border: "1px solid rgba(24, 119, 242, 0.2)" }}>
                {b}
              </span>
            ))}
          </div>
        </NumberedStep>
        <NumberedStep num={5}>
          לחץ <ButtonLabel label="Save & Finish" /> לסגור את ההגדרה.
        </NumberedStep>
        <Tip>
          כפתורי התגובה המהירה מגדילים את שיעור ההודעות ב-40-60%! הם מורידים את החסם הפסיכולוגי של כתיבת הודעה ראשונה.
        </Tip>
      </>
    ),
  },
  {
    id: 11,
    title: "בדיקה אחרונה ופרסום",
    subtitle: "Review & Publish",
    icon: <CheckCircle2 size={20} />,
    mockup: <MockupPublish />,
    content: (
      <>
        <div className="space-y-2 mb-4">
          <h4 className="font-bold text-sm text-[var(--text-primary)]">צ&apos;קליסט לפני פרסום:</h4>
          {[
            "מטרת קמפיין = מעורבות (Engagement)",
            "יעד המרה = Messaging Apps",
            "תקציב יומי מוגדר (30-50 ₪ להתחלה)",
            "קהל יעד — גיל ומיקום (ללא תחומי עניין)",
            "קריאייטיב — סרטון/תמונה באיכות טובה",
            "טקסט ראשי (קופי FBM)",
            "כותרת ותיאור ממולאים",
            "Call to Action = Send Message",
            "תבנית הודעה עם כפתורי תגובה מהירה",
          ].map((item, i) => (
            <label key={i} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-[var(--sidebar-hover)] transition-colors">
              <input type="checkbox" className="w-4 h-4 rounded accent-[#D4A843]" />
              <span className="text-sm text-[var(--text-primary)]">{item}</span>
            </label>
          ))}
        </div>
        <NumberedStep num={1}>
          לחץ על <ButtonLabel label="Review" /> בפינה התחתונה.
        </NumberedStep>
        <NumberedStep num={2}>
          עבור על הסיכום ובדוק שאין שגיאות (אייקון אדום).
        </NumberedStep>
        <NumberedStep num={3}>
          לחץ על <ButtonLabel label="Publish" /> — הקמפיין ישלח לבדיקה.
        </NumberedStep>
        <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.15)" }}>
          <p className="text-sm font-bold text-green-700 mb-1">🎉 מזל טוב!</p>
          <p className="text-sm text-[var(--text-secondary)]">
            הקמפיין נשלח לאישור. פייסבוק בודק את המודעה תוך 5-60 דקות בדרך כלל.
            לאחר האישור, המודעה תתחיל לרוץ וליצור לידים!
          </p>
        </div>
        <Tip>
          אחרי 3-5 ימים — בדוק את הביצועים. שים לב ל-Cost Per Message (עלות להודעה). אם זה מעל 20 ₪ — שקול לשנות את הקריאייטיב.
        </Tip>
      </>
    ),
  },
];

/* ─── Main page component ─── */

export default function FacebookCampaignGuidePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = STEPS[currentStep];
  const progress = Math.round(((completedSteps.size) / STEPS.length) * 100);

  const toggleComplete = (stepId: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) { next.delete(stepId); } else { next.add(stepId); }
      return next;
    });
  };

  const goNext = () => {
    if (currentStep < STEPS.length - 1) { toggleComplete(step.id); setCurrentStep((s) => s + 1); }
  };

  const goPrev = () => {
    if (currentStep > 0) { setCurrentStep((s) => s - 1); }
  };

  return (
    <div className="max-w-4xl mx-auto" dir="rtl">
      {/* CSS for cursor animation */}
      <style>{`@keyframes pulse-cursor { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          מדריך הקמת קמפיין מעורבות להודעות
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Facebook Ads — צעד אחר צעד למתחילים
        </p>
      </div>

      {/* Progress bar */}
      <div className="card-static p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[var(--text-secondary)]">
            התקדמות: {completedSteps.size} מתוך {STEPS.length} שלבים
          </span>
          <span className="text-xs font-bold" style={{ color: "#D4A843" }}>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: "#D4A843" }} />
        </div>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Step navigation sidebar */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="card-static overflow-hidden lg:sticky lg:top-24">
            <div className="p-4 border-b border-[var(--card-border)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">שלבי ההקמה</h3>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {STEPS.map((s, idx) => {
                const isActive = idx === currentStep;
                const isDone = completedSteps.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStep(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-all cursor-pointer border-b border-[var(--card-border)] last:border-b-0 ${
                      isActive ? "bg-[var(--gold-soft)]" : "hover:bg-[var(--sidebar-hover)]"
                    }`}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone ? "bg-green-500 text-white" : isActive ? "text-white" : "bg-gray-200 text-gray-500"
                    }`} style={isActive && !isDone ? { backgroundColor: "#D4A843" } : undefined}>
                      {isDone ? <CheckCircle2 size={14} /> : idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${isActive ? "text-[var(--gold)]" : "text-[var(--text-primary)]"}`}>
                        {s.title}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">{s.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 min-w-0">
          <div className="card-elevated p-6 animate-in" key={currentStep}>
            {/* Step header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(212, 168, 67, 0.1)", color: "#D4A843" }}>
                {step.icon}
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)]">שלב {step.id} מתוך {STEPS.length}</div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{step.title}</h2>
              </div>
            </div>

            {/* Animated mockup */}
            {step.mockup}

            {/* Step content */}
            {step.content}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-[var(--card-border)]">
              <button
                onClick={goPrev}
                disabled={currentStep === 0}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover)] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
                הקודם
              </button>

              <button
                onClick={() => toggleComplete(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  completedSteps.has(step.id)
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-gray-50 text-gray-500 border border-gray-200 hover:border-green-300 hover:text-green-600"
                }`}
              >
                {completedSteps.has(step.id) ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                {completedSteps.has(step.id) ? "הושלם" : "סמן כהושלם"}
              </button>

              {currentStep < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  className="flex items-center gap-1 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: "#D4A843" }}
                >
                  הבא
                  <ChevronLeft size={16} />
                </button>
              ) : (
                <div className="w-20" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
