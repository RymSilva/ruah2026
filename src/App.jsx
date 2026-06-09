import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { Sun, Sunset, Moon, Flame, BookOpen, Users, X, Plus, Loader2, ChevronLeft, ChevronRight, Heart, Check, Calendar, Clock } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

const EMPTY = Object.freeze([]);
const PT_DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const PT_DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  { name: "Maio", short: "Mai", idx: 4 },
  { name: "Junho", short: "Jun", idx: 5 },
  { name: "Julho", short: "Jul", idx: 6 },
  { name: "Agosto", short: "Ago", idx: 7 },
  { name: "Setembro", short: "Set", idx: 8 },
];
const PERIODS = [
  { id: "manha", label: "Manhã", Icon: Sun, time: "6h–12h" },
  { id: "tarde", label: "Tarde", Icon: Sunset, time: "12h–18h" },
  { id: "noite", label: "Noite", Icon: Moon, time: "18h–0h" },
];
const PS = {
  manha: { iconBg: "bg-amber-100", iconColor: "text-amber-600", text: "text-amber-800", chip: "bg-amber-100 text-amber-900 border border-amber-200", btn: "bg-amber-600 hover:bg-amber-700", ring: "focus:ring-amber-400" },
  tarde: { iconBg: "bg-orange-100", iconColor: "text-orange-600", text: "text-orange-800", chip: "bg-orange-100 text-orange-900 border border-orange-200", btn: "bg-orange-600 hover:bg-orange-700", ring: "focus:ring-orange-400" },
  noite: { iconBg: "bg-indigo-100", iconColor: "text-indigo-600", text: "text-indigo-800", chip: "bg-indigo-100 text-indigo-900 border border-indigo-200", btn: "bg-indigo-600 hover:bg-indigo-700", ring: "focus:ring-indigo-400" },
};

const CLOCK_DAYS = (() => {
  const days = [], cur = new Date(2026, 8, 20), end = new Date(2026, 9, 3);
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return days;
})();
const ALL_DAYS = (() => {
  const days = [], cur = new Date(2026, 4, 16), end = new Date(2026, 8, 19);
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
  return days;
})();

const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtShort = d => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

function segPath(cx, cy, oR, iR, h) {
  const sa = (h / 24) * 2 * Math.PI - Math.PI / 2, ea = ((h + 1) / 24) * 2 * Math.PI - Math.PI / 2;
  const p = (r, a) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  const i1 = p(iR, sa), o1 = p(oR, sa), o2 = p(oR, ea), i2 = p(iR, ea);
  const f = n => n.toFixed(2);
  return `M${f(i1.x)} ${f(i1.y)} L${f(o1.x)} ${f(o1.y)} A${oR} ${oR} 0 0 1 ${f(o2.x)} ${f(o2.y)} L${f(i2.x)} ${f(i2.y)} A${iR} ${iR} 0 0 0 ${f(i1.x)} ${f(i1.y)}Z`;
}

// ─── Calendar Overview ───────────────────────────────────────────────────────

function CalendarOverview({ signups, onSelectDay }) {
  const [viewMonth, setViewMonth] = useState(0);
  const m = MONTHS[viewMonth];

  // build grid for this month
  const grid = useMemo(() => {
    const firstDay = new Date(2026, m.idx, 1).getDay();
    const daysInMonth = new Date(2026, m.idx + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(2026, m.idx, d);
      const inRange = ALL_DAYS.some(ad => fmt(ad) === fmt(date));
      cells.push({ date, inRange });
    }
    return cells;
  }, [viewMonth]);

  const coverageMap = useMemo(() => {
    const map = {};
    for (const s of signups) {
      if (!map[s.day_key]) map[s.day_key] = new Set();
      map[s.day_key].add(s.period);
    }
    return map;
  }, [signups]);

  const getCoverage = (date) => {
    if (!date) return 0;
    const key = fmt(date);
    return coverageMap[key] ? coverageMap[key].size : 0;
  };

  const coverageColor = (date, inRange) => {
    if (!inRange) return "bg-stone-100 text-stone-300 cursor-default";
    const c = getCoverage(date);
    if (c === 0) return "bg-white border border-stone-200 text-stone-700 hover:border-amber-400 cursor-pointer";
    if (c === 1) return "bg-amber-100 border border-amber-200 text-amber-900 hover:border-amber-400 cursor-pointer";
    if (c === 2) return "bg-orange-200 border border-orange-300 text-orange-900 hover:border-orange-400 cursor-pointer";
    return "bg-amber-500 border border-amber-600 text-white hover:bg-amber-600 cursor-pointer";
  };

  const dotColors = (date) => {
    if (!date) return [];
    const key = fmt(date);
    const periods = coverageMap[key] ? [...coverageMap[key]] : [];
    return periods.map(p => p === "manha" ? "bg-amber-400" : p === "tarde" ? "bg-orange-500" : "bg-indigo-500");
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
      {/* month nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
        <button
          onClick={() => setViewMonth(v => Math.max(0, v - 1))}
          disabled={viewMonth === 0}
          className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-stone-600" />
        </button>
        <div className="text-center">
          <span className="font-serif font-bold text-stone-900">{m.name} 2026</span>
          <p className="text-xs text-stone-400 mt-0.5">Visão geral de cobertura</p>
        </div>
        <button
          onClick={() => setViewMonth(v => Math.min(MONTHS.length - 1, v + 1))}
          disabled={viewMonth === MONTHS.length - 1}
          className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-stone-600" />
        </button>
      </div>

      {/* day headers */}
      <div className="grid grid-cols-7 border-b border-stone-100">
        {PT_DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-stone-400 py-2">{d}</div>
        ))}
      </div>

      {/* grid */}
      <div className="grid grid-cols-7 gap-1 p-3">
        {grid.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />;
          const { date, inRange } = cell;
          const dots = dotColors(date);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          return (
            <button
              key={i}
              onClick={() => inRange && onSelectDay(date, viewMonth)}
              className={`relative rounded-xl py-2 px-1 flex flex-col items-center transition-all ${coverageColor(date, inRange)} ${isWeekend && inRange ? "opacity-90" : ""}`}
            >
              <span className={`text-xs font-bold leading-none mb-1 ${!inRange ? "text-stone-300" : ""}`}>
                {date.getDate()}
              </span>
              {dots.length > 0 && (
                <div className="flex gap-0.5">
                  {dots.map((c, j) => (
                    <span key={j} className={`w-1.5 h-1.5 rounded-full ${c}`} />
                  ))}
                </div>
              )}
              {inRange && dots.length === 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-stone-200" />
              )}
            </button>
          );
        })}
      </div>

      {/* legend */}
      <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs text-stone-500 border-t border-stone-100 pt-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-stone-200 inline-block" />Sem cobertura</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" />1 período</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-200 border border-orange-300 inline-block" />2 períodos</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500 inline-block" />3 períodos</span>
      </div>
    </div>
  );
}

// ─── Existing Components ──────────────────────────────────────────────────────

const ClockFace = memo(function ClockFace({ hourCounts, onHour, hi }) {
  const cx = 175, cy = 175, oR = 150, iR = 68, lR = 109;
  const covered = hourCounts.filter(c => c > 0).length;
  const gc = (count, h, isHi) => {
    if (isHi) return "#92400e";
    if (!count) return "#3d3734";
    if (h < 6 || h >= 22) return count >= 2 ? "#4338ca" : "#818cf8";
    if (h < 12) return count >= 2 ? "#d97706" : "#fbbf24";
    if (h < 18) return count >= 2 ? "#ea580c" : "#fb923c";
    return count >= 2 ? "#7c3aed" : "#a78bfa";
  };
  return (
    <svg viewBox="0 0 350 350" className="w-full max-w-xs mx-auto select-none" style={{ maxHeight: 290 }}>
      <defs>
        <filter id="glow2"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx={cx} cy={cy} r={oR + 13} fill="#0c0a09" />
      <circle cx={cx} cy={cy} r={oR + 6} fill="#1c1917" />
      {hourCounts.map((count, h) => {
        const ma = ((h + .5) / 24) * 2 * Math.PI - Math.PI / 2;
        const lx = cx + lR * Math.cos(ma), ly = cy + lR * Math.sin(ma);
        const isHi = hi === h;
        return (
          <g key={h} onClick={() => onHour(h)} style={{ cursor: "pointer" }}>
            <path d={segPath(cx, cy, oR, iR, h)} fill={gc(count, h, isHi)} stroke="#1a1715" strokeWidth="1.4" />
            <text x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor="middle" dominantBaseline="middle"
              fontSize="7.5" fontWeight={count > 0 ? "700" : "400"}
              fill={count > 0 || isHi ? "#fff" : "#6b6560"}>{h}h</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={iR} fill="#0c0a09" />
      <circle cx={cx} cy={cy} r={iR - 3} fill="#1c1917" />
      <text x={cx} y={cy - 9} textAnchor="middle" fontSize="21" fontWeight="700" fill="#fbbf24" filter="url(#glow2)">{covered}/24</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fill="#78716c" letterSpacing="1.5">HORAS COBERTAS</text>
      <circle cx={cx} cy={cy - oR - 4} r="3" fill="#fbbf24" filter="url(#glow2)" />
      <text x={cx + oR + 18} y={cy + 3} textAnchor="middle" fontSize="8" fill="#57534e">6h</text>
      <text x={cx} y={cy + oR + 20} textAnchor="middle" fontSize="8" fill="#57534e">12h</text>
      <text x={cx - oR - 18} y={cy + 3} textAnchor="middle" fontSize="8" fill="#57534e">18h</text>
    </svg>
  );
});

const PeriodCell = memo(function PeriodCell({ dKey, period, names, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const s = PS[period.id];
  const Icon = period.Icon;

  const handleAdd = async () => {
    const name = input.trim();
    if (!name || saving) return;
    setSaving(true);
    setInput("");
    await onAdd(dKey, period.id, name);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${s.iconColor}`} />
        </div>
        <div>
          <div className={`font-semibold text-sm ${s.text}`}>{period.label}</div>
          <div className="text-xs text-stone-400">{period.time}</div>
        </div>
        {names.length > 0 && <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${s.chip}`}>{names.length}</span>}
      </div>
      {names.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {names.map((n, i) => (
            <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.chip}`}>
              {n.name}
              <button onClick={() => onRemove(n.id, "cal")} className="rounded-full p-0.5 hover:bg-black/10 transition-colors" aria-label="Remover">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-stone-400 italic mb-3">Aguardando intercessor</p>
      )}
      <div className="flex gap-1.5">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Seu nome"
          className={`flex-1 min-w-0 px-3 py-1.5 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 ${s.ring} focus:border-transparent`} />
        <button onClick={handleAdd} disabled={!input.trim() || saving}
          className={`px-2.5 rounded-lg text-white text-sm transition-all ${s.btn} disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[36px]`}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
});

const DayCard = memo(function DayCard({ day, dKey, manhaNames, tardeNames, noiteNames, onAdd, onRemove }) {
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-stone-100 ${isWeekend ? "bg-stone-50" : ""}`}>
        <span className="font-serif text-3xl font-bold text-stone-900 leading-none">{day.getDate()}</span>
        <span className="text-sm font-medium text-stone-500">{PT_DAYS[day.getDay()]}</span>
      </div>
      <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-stone-100">
        <PeriodCell dKey={dKey} period={PERIODS[0]} names={manhaNames} onAdd={onAdd} onRemove={onRemove} />
        <PeriodCell dKey={dKey} period={PERIODS[1]} names={tardeNames} onAdd={onAdd} onRemove={onRemove} />
        <PeriodCell dKey={dKey} period={PERIODS[2]} names={noiteNames} onAdd={onAdd} onRemove={onRemove} />
      </div>
    </div>
  );
});

const HourRow = memo(function HourRow({ dKey, hour, names, onAdd, onRemove, isHighlighted, setRef }) {
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const hc = hour >= 6 && hour < 12 ? "text-amber-700" : hour >= 12 && hour < 18 ? "text-orange-700" : hour >= 18 && hour < 22 ? "text-violet-700" : "text-indigo-700";
  const hbg = hour >= 6 && hour < 12 ? "bg-amber-50" : hour >= 12 && hour < 18 ? "bg-orange-50" : hour >= 18 && hour < 22 ? "bg-violet-50" : "bg-indigo-50";

  const handleAdd = async () => {
    const name = input.trim();
    if (!name || saving) return;
    setSaving(true);
    setInput("");
    await onAdd(dKey, hour, name);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  return (
    <div ref={setRef} className={`p-3 transition-all duration-300 ${isHighlighted ? "bg-amber-50 ring-2 ring-amber-400 ring-inset" : ""}`}>
      <div className="flex items-start gap-2.5">
        <div className={`flex-shrink-0 w-11 h-11 rounded-xl ${hbg} flex items-center justify-center`}>
          <span className={`text-sm font-bold ${hc}`}>{String(hour).padStart(2, "0")}h</span>
        </div>
        <div className="flex-1 min-w-0">
          {names.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {names.map((n, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-800 border border-stone-200">
                  {n.name}
                  <button onClick={() => onRemove(n.id, "clock")} className="rounded-full p-0.5 hover:bg-black/10 transition-colors" aria-label="Remover">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              placeholder={names.length === 0 ? "Seu nome" : "Adicionar nome"}
              className="flex-1 min-w-0 px-2.5 py-1 text-xs rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent" />
            <button onClick={handleAdd} disabled={!input.trim() || saving}
              className="px-2 rounded-lg bg-stone-800 hover:bg-stone-900 text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[30px]">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

function StatCard({ label, value, gradient, Icon }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
      <div className={`inline-flex w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} items-center justify-center mb-2`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="text-2xl font-bold text-stone-900 leading-none mb-1">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("calendar");
  const [month, setMonth] = useState(0);
  const [clockDay, setClockDay] = useState(0);
  const [hi, setHi] = useState(null);
  const [signups, setSignups] = useState([]);
  const [cs, setCs] = useState([]);
  const [loading, setLoading] = useState(true);
  const hourRefs = useRef({});
  const hiTimerRef = useRef(null);
  const calendarSectionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: s }, { data: c }] = await Promise.all([
        supabase.from("signups").select("*"),
        supabase.from("clock_signups").select("*"),
      ]);
      if (!cancelled) {
        setSignups(s || []);
        setCs(c || []);
        setLoading(false);
      }
    })();

    const sub1 = supabase.channel("signups-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "signups" }, () => {
        supabase.from("signups").select("*").then(({ data }) => { if (data) setSignups(data); });
      }).subscribe();

    const sub2 = supabase.channel("clock-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "clock_signups" }, () => {
        supabase.from("clock_signups").select("*").then(({ data }) => { if (data) setCs(data); });
      }).subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(sub1);
      supabase.removeChannel(sub2);
    };
  }, []);

  const addCal = useCallback(async (dKey, pid, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data } = await supabase.from("signups").insert({ day_key: dKey, period: pid, name: trimmed }).select().single();
    if (data) setSignups(prev => [...prev, data]);
  }, []);

  const remCal = useCallback(async (id) => {
    await supabase.from("signups").delete().eq("id", id);
    setSignups(prev => prev.filter(r => r.id !== id));
  }, []);

  const addClock = useCallback(async (dKey, h, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data } = await supabase.from("clock_signups").insert({ day_key: dKey, hour: h, name: trimmed }).select().single();
    if (data) setCs(prev => [...prev, data]);
  }, []);

  const remClock = useCallback(async (id) => {
    await supabase.from("clock_signups").delete().eq("id", id);
    setCs(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleRemove = useCallback((id, type) => {
    if (type === "cal") remCal(id);
    else remClock(id);
  }, [remCal, remClock]);

  const onHour = useCallback((h) => {
    setHi(h);
    if (hiTimerRef.current) clearTimeout(hiTimerRef.current);
    hiTimerRef.current = setTimeout(() => setHi(null), 2000);
    const el = hourRefs.current[h];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const setHourRef = useCallback((h) => (el) => { hourRefs.current[h] = el; }, []);

  // When user clicks a day in the calendar overview, jump to that month's cards
  const handleCalendarDayClick = useCallback((date, monthIdx) => {
    setTab("calendar");
    setMonth(monthIdx);
    setTimeout(() => {
      const dKey = fmt(date);
      const el = document.getElementById(`day-${dKey}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      else if (calendarSectionRef.current) calendarSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const monthDays = useMemo(() => ALL_DAYS.filter(d => d.getMonth() === MONTHS[month].idx), [month]);
  const ckDay = CLOCK_DAYS[clockDay];
  const ckKey = ckDay ? fmt(ckDay) : "";

  const getCalNames = useCallback((dKey, pid) =>
    signups.filter(r => r.day_key === dKey && r.period === pid), [signups]);

  const getClockNames = useCallback((dKey, h) =>
    cs.filter(r => r.day_key === dKey && r.hour === h), [cs]);

  const hourCounts = useMemo(() =>
    Array.from({ length: 24 }, (_, h) => getClockNames(ckKey, h).length),
    [cs, ckKey, getClockNames]);

  const stats = useMemo(() => ({
    total: signups.length + cs.length,
    calFilled: new Set(signups.map(r => `${r.day_key}:${r.period}`)).size,
    calTotal: ALL_DAYS.length * 3,
    clockFilled: new Set(cs.map(r => `${r.day_key}:${r.hour}`)).size,
    clockTotal: CLOCK_DAYS.length * 24,
    clockNames: cs.length,
  }), [signups, cs]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50/30 to-stone-50">
      {/* ── Header ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-stone-100">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%,#f59e0b,transparent 50%),radial-gradient(circle at 80% 80%,#ea580c,transparent 50%)" }} />
        <div className="relative max-w-5xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs tracking-widest uppercase mb-5">
            <Flame className="w-3.5 h-3.5" />RUAH 2026
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mb-2">Jejum & Oração</h1>
          <p className="text-amber-200/80 text-sm tracking-wider uppercase mb-8">16 de Maio — 03 de Outubro de 2026</p>
          <div className="max-w-3xl mx-auto bg-stone-100/5 border border-amber-400/20 rounded-2xl p-5 md:p-7">
            <div className="flex items-center justify-center gap-2 text-amber-300/80 text-xs tracking-widest uppercase mb-3">
              <BookOpen className="w-3.5 h-3.5" />Versículo tema · Malaquias 4:6
            </div>
            <p className="font-serif text-base md:text-lg leading-relaxed text-stone-100 italic">
              "Ele fará que o coração dos pais se volte para os seus filhos, e o coração dos filhos, para os seus pais; do contrário, eu virei e castigarei a terra separando-a para destruição."
            </p>
          </div>
        </div>
      </header>

      {/* ── Info cards ── */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-amber-700" />
              </div>
              <h2 className="font-serif text-xl font-bold text-stone-900">Por que orar e jejuar?</h2>
            </div>
            <p className="text-stone-700 leading-relaxed text-sm">
              A <strong>oração e o jejum</strong> são primordiais para a santificação dos santos, sendo o terreno onde Deus molda o coração e fortalece a fé de seus filhos. Jesus deu prioridade absoluta a essas duas práticas, retirando-Se aos montes para orar <em>(Lc 6:12; Mt 14:23)</em> e ensinando sobre a prática do jejum <em>(Mt 6:16-18)</em> antes de cada grande passo do Seu ministério.
            </p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-700" />
              </div>
              <h2 className="font-serif text-xl font-bold text-stone-900">Sobre o jejum</h2>
            </div>
            <p className="text-stone-700 leading-relaxed text-sm mb-3">
              A palavra "jejum" vem do grego <em className="font-semibold">nesteía</em> (νηστεία), que significa <strong>abstinência de comida</strong>. Existem outras formas de abstinência, mas o jejum bíblico é especificamente sobre alimentação.
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg p-3.5 text-sm text-stone-800 leading-relaxed">
              ⚠️ O jejum <strong>não tem caráter meritório</strong>. É um ato de fé e dependência em Deus. Tudo o que recebemos dEle vem simplesmente da Sua graça.
            </div>
          </div>
        </div>
        <div className="mt-5 bg-gradient-to-br from-stone-900 to-stone-800 text-stone-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold mb-1.5">Como funciona</h3>
              <p className="text-stone-300 leading-relaxed text-sm mb-3">
                Ao colocar seu nome em um dos três períodos (<span className="text-amber-300 font-semibold">Manhã</span>, <span className="text-orange-300 font-semibold">Tarde</span> ou <span className="text-indigo-300 font-semibold">Noite</span>), você se compromete a estar em jejum e oração pelo <strong>RUAH 2026</strong> naquele período.
              </p>
              <p className="text-stone-300 leading-relaxed text-sm">
                A partir do dia <strong className="text-amber-300">20/09</strong>, vamos dar início ao nosso <strong>"Relógio de Oração e Jejum"</strong>! Nesse caso, você pode se inscrever em um horário específico, a cada uma hora, para orar e jejuar diariamente até a data do evento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-5xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total de intercessores" value={stats.total} gradient="from-amber-500 to-amber-600" Icon={Users} />
          <StatCard label="Turnos cobertos" value={`${stats.calFilled}/${stats.calTotal}`} gradient="from-orange-500 to-orange-600" Icon={Calendar} />
          <StatCard label="Horas do relógio" value={`${stats.clockFilled}/${stats.clockTotal}`} gradient="from-indigo-500 to-indigo-600" Icon={Clock} />
          <StatCard label="Intercessores no relógio" value={stats.clockNames} gradient="from-violet-500 to-violet-600" Icon={Flame} />
        </div>
      </section>

      {/* ── Calendar Overview ── */}
      <section className="max-w-5xl mx-auto px-6 pb-8">
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-600" />
          <h2 className="font-serif text-base font-bold text-stone-900">Visão geral do calendário</h2>
          <span className="text-xs text-stone-400 ml-1">Clique em um dia para ir direto à inscrição</span>
        </div>
        {loading ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-10 flex items-center justify-center text-stone-400 text-sm shadow-sm">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />Carregando...
          </div>
        ) : (
          <CalendarOverview signups={signups} onSelectDay={handleCalendarDayClick} />
        )}
      </section>

      {/* ── Tab bar ── */}
      <section className="max-w-5xl mx-auto px-6 pb-6" ref={calendarSectionRef}>
        <div className="bg-white border border-stone-200 rounded-2xl p-2 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {MONTHS.map((m, i) => (
              <button key={i} onClick={() => { setTab("calendar"); setMonth(i); }}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === "calendar" && month === i ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                <span className="sm:hidden">{m.short}</span>
                <span className="hidden sm:inline">{m.name}</span>
              </button>
            ))}
            <div className="w-px h-7 bg-stone-200 mx-1 flex-shrink-0" />
            <button onClick={() => setTab("clock")}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${tab === "clock" ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
              <Clock className="w-4 h-4" />
              <span>Relógio de Oração</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-stone-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />Carregando inscrições...
          </div>
        ) : tab === "calendar" ? (
          <div className="space-y-4">
            {monthDays.map(day => {
              const dKey = fmt(day);
              return (
                <div id={`day-${dKey}`} key={dKey}>
                  <DayCard day={day} dKey={dKey}
                    manhaNames={getCalNames(dKey, "manha")}
                    tardeNames={getCalNames(dKey, "tarde")}
                    noiteNames={getCalNames(dKey, "noite")}
                    onAdd={addCal} onRemove={handleRemove} />
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="bg-white border border-stone-200 rounded-2xl p-3 mb-5 shadow-sm">
              <div className="flex items-center gap-2">
                <button onClick={() => setClockDay(d => Math.max(0, d - 1))} disabled={clockDay === 0} className="p-2 rounded-lg hover:bg-stone-100 disabled:opacity-30 flex-shrink-0">
                  <ChevronLeft className="w-5 h-5 text-stone-600" />
                </button>
                <div className="flex-1 overflow-x-auto">
                  <div className="flex gap-1 min-w-max">
                    {CLOCK_DAYS.map((d, i) => (
                      <button key={i} onClick={() => setClockDay(i)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors text-center ${clockDay === i ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                        <div className="opacity-70">{PT_DAYS[d.getDay()].slice(0, 3)}</div>
                        <div className="font-bold">{fmtShort(d)}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => setClockDay(d => Math.min(CLOCK_DAYS.length - 1, d + 1))} disabled={clockDay === CLOCK_DAYS.length - 1} className="p-2 rounded-lg hover:bg-stone-100 disabled:opacity-30 flex-shrink-0">
                  <ChevronRight className="w-5 h-5 text-stone-600" />
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                <div className="text-center mb-3">
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    {ckDay ? `${PT_DAYS[ckDay.getDay()]}, ${fmtShort(ckDay)}` : ""}
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">Toque em um horário para ir direto à inscrição</p>
                </div>
                <ClockFace hourCounts={hourCounts} onHour={onHour} hi={hi} />
                <div className="flex flex-wrap items-center justify-center gap-3 mt-3 text-xs text-stone-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-amber-400" /><span>Manhã</span></span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-orange-400" /><span>Tarde</span></span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-violet-400" /><span>Noite</span></span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block bg-indigo-500" /><span>Madrugada</span></span>
                </div>
              </div>
              <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-stone-100 bg-stone-50 flex-shrink-0">
                  <h3 className="font-semibold text-sm text-stone-800">Inscrição por hora</h3>
                  <p className="text-xs text-stone-500">Adicione seu nome no turno que irá orar e interceder</p>
                </div>
                <div className="divide-y divide-stone-100 overflow-y-auto" style={{ maxHeight: 460 }}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <HourRow key={h} dKey={ckKey} hour={h}
                      names={getClockNames(ckKey, h)}
                      onAdd={addClock} onRemove={handleRemove}
                      isHighlighted={hi === h}
                      setRef={setHourRef(h)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <footer className="bg-stone-900 text-stone-300 py-10 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Flame className="w-8 h-8 text-amber-400 mx-auto mb-4" />
          <p className="font-serif italic text-lg text-stone-200 mb-2">"Convertam-me o coração e a vida"</p>
          <p className="text-xs text-stone-500 tracking-widest uppercase">RUAH 2026 · Jejum e Oração</p>
        </div>
      </footer>
    </div>
  );
}