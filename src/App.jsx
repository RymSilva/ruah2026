
import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { Sun, Sunset, Moon, Flame, BookOpen, Users, X, Plus, Loader2, ChevronLeft, ChevronRight, Heart, Check, Calendar, Clock } from "lucide-react";

const EMPTY = Object.freeze([]);
const PT_DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
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

// ============================================================
// Camada de storage com fallback para localStorage
// (Mantém compatibilidade com window.storage do Claude
//  e funciona em qualquer ambiente fora do Claude.ai)
// ============================================================
const storage = {
  async get(key) {
    if (typeof window !== "undefined" && window.storage?.get) {
      try {
        const r = await window.storage.get(key, true);
        return r?.value ?? null;
      } catch { return null; }
    }
    try { return localStorage.getItem(key); } catch { return null; }
  },
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage?.set) {
      try { await window.storage.set(key, value, true); return; } catch {}
    }
    try { localStorage.setItem(key, value); } catch {}
  }
};

function segPath(cx, cy, oR, iR, h) {
  const sa = (h / 24) * 2 * Math.PI - Math.PI / 2, ea = ((h + 1) / 24) * 2 * Math.PI - Math.PI / 2;
  const p = (r, a) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  const i1 = p(iR, sa), o1 = p(oR, sa), o2 = p(oR, ea), i2 = p(iR, ea);
  const f = n => n.toFixed(2);
  return `M${f(i1.x)} ${f(i1.y)} L${f(o1.x)} ${f(o1.y)} A${oR} ${oR} 0 0 1 ${f(o2.x)} ${f(o2.y)} L${f(i2.x)} ${f(i2.y)} A${iR} ${iR} 0 0 0 ${f(i1.x)} ${f(i1.y)}Z`;
}

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
          {names.map((name, i) => (
            <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.chip}`}>
              {name}
              <button onClick={() => onRemove(dKey, period.id, i)} className="rounded-full p-0.5 hover:bg-black/10 transition-colors" aria-label="Remover">
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
              {names.map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-stone-100 text-stone-800 border border-stone-200">
                  {name}
                  <button onClick={() => onRemove(dKey, hour, i)} className="rounded-full p-0.5 hover:bg-black/10 transition-colors" aria-label="Remover">
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

export default function App() {
  const [tab, setTab] = useState("calendar");
  const [month, setMonth] = useState(0);
  const [clockDay, setClockDay] = useState(0);
  const [hi, setHi] = useState(null);
  const [signups, setSignups] = useState({});
  const [cs, setCs] = useState({});
  const [loading, setLoading] = useState(true);

  const hourRefs = useRef({});
  const signupsRef = useRef(signups);
  const csRef = useRef(cs);
  const hiTimerRef = useRef(null);
  const persistCalTimer = useRef(null);
  const persistClockTimer = useRef(null);
  signupsRef.current = signups;
  csRef.current = cs;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const v1 = await storage.get("ruah-signups-2026");
      if (!cancelled && v1) { try { setSignups(JSON.parse(v1)); } catch {} }
      const v2 = await storage.get("ruah-clock-2026");
      if (!cancelled && v2) { try { setCs(JSON.parse(v2)); } catch {} }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const schedulePersistCal = useCallback((data) => {
    if (persistCalTimer.current) clearTimeout(persistCalTimer.current);
    persistCalTimer.current = setTimeout(() => {
      storage.set("ruah-signups-2026", JSON.stringify(data));
    }, 150);
  }, []);
  const schedulePersistClock = useCallback((data) => {
    if (persistClockTimer.current) clearTimeout(persistClockTimer.current);
    persistClockTimer.current = setTimeout(() => {
      storage.set("ruah-clock-2026", JSON.stringify(data));
    }, 150);
  }, []);

  const addCal = useCallback((dKey, pid, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const k = `${dKey}:${pid}`;
    const next = { ...signupsRef.current, [k]: [...(signupsRef.current[k] || EMPTY), trimmed] };
    setSignups(next);
    schedulePersistCal(next);
  }, [schedulePersistCal]);

  const remCal = useCallback((dKey, pid, i) => {
    const k = `${dKey}:${pid}`;
    const arr = signupsRef.current[k] || EMPTY;
    const next = { ...signupsRef.current, [k]: arr.filter((_, j) => j !== i) };
    setSignups(next);
    schedulePersistCal(next);
  }, [schedulePersistCal]);

  const addClock = useCallback((dKey, h, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const k = `${dKey}:${h}`;
    const next = { ...csRef.current, [k]: [...(csRef.current[k] || EMPTY), trimmed] };
    setCs(next);
    schedulePersistClock(next);
  }, [schedulePersistClock]);

  const remClock = useCallback((dKey, h, i) => {
    const k = `${dKey}:${h}`;
    const arr = csRef.current[k] || EMPTY;
    const next = { ...csRef.current, [k]: arr.filter((_, j) => j !== i) };
    setCs(next);
    schedulePersistClock(next);
  }, [schedulePersistClock]);

  const onHour = useCallback((h) => {
    setHi(h);
    if (hiTimerRef.current) clearTimeout(hiTimerRef.current);
    hiTimerRef.current = setTimeout(() => setHi(null), 2000);
    const el = hourRefs.current[h];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const setHourRef = useCallback((h) => (el) => { hourRefs.current[h] = el; }, []);

  useEffect(() => () => {
    if (hiTimerRef.current) clearTimeout(hiTimerRef.current);
    if (persistCalTimer.current) clearTimeout(persistCalTimer.current);
    if (persistClockTimer.current) clearTimeout(persistClockTimer.current);
  }, []);

  const monthDays = useMemo(() => ALL_DAYS.filter(d => d.getMonth() === MONTHS[month].idx), [month]);
  const ckDay = CLOCK_DAYS[clockDay];
  const ckKey = ckDay ? fmt(ckDay) : "";

  const hourCounts = useMemo(() => {
    const out = new Array(24);
    for (let h = 0; h < 24; h++) out[h] = (cs[`${ckKey}:${h}`] || EMPTY).length;
    return out;
  }, [cs, ckKey]);

  const stats = useMemo(() => {
    let cn = 0, cf = 0;
    for (const k in signups) { const a = signups[k]; if (a && a.length > 0) { cn += a.length; cf++; } }
    let kn = 0, kf = 0;
    for (const k in cs) { const a = cs[k]; if (a && a.length > 0) { kn += a.length; kf++; } }
    return { calNames: cn, calFilled: cf, calTotal: ALL_DAYS.length * 3, clockNames: kn, clockFilled: kf, clockTotal: CLOCK_DAYS.length * 24, total: cn + kn };
  }, [signups, cs]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50/30 to-stone-50">
      {/* HERO */}
      <header className="relative overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-stone-100">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%,#f59e0b,transparent 50%),radial-gradient(circle at 80% 80%,#ea580c,transparent 50%)" }} />
        <div className="relative max-w-5xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs tracking-widest uppercase mb-5">
            <Flame className="w-3.5 h-3.5" />RUAH 2026
          </div>
          <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mb-2">Jejum & Oração</h1>
          <p className="text-amber-200/80 text-sm tracking-wider uppercase mb-8">16 de Maio — 19 de Setembro de 2026</p>
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

      {/* INFO CARDS */}
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
              A <strong>oração e o jejum</strong> são primordiais para a santificação dos santos — o terreno onde Deus molda o coração e fortalece a fé. Jesus deu prioridade absoluta a essas duas práticas, retirando-Se sozinho aos montes para orar <em>(Lc 6:12; Mt 14:23)</em> antes de cada grande passo do Seu ministério.
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

      {/* STATS */}
      <section className="max-w-5xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total de intercessores" value={stats.total} gradient="from-amber-500 to-amber-600" Icon={Users} />
          <StatCard label="Turnos cobertos" value={`${stats.calFilled}/${stats.calTotal}`} gradient="from-orange-500 to-orange-600" Icon={Calendar} />
          <StatCard label="Horas do relógio" value={`${stats.clockFilled}/${stats.clockTotal}`} gradient="from-indigo-500 to-indigo-600" Icon={Clock} />
          <StatCard label="Intercessores no relógio" value={stats.clockNames} gradient="from-violet-500 to-violet-600" Icon={Flame} />
        </div>
      </section>

      {/* TABS */}
      <section className="max-w-5xl mx-auto px-6 pb-6">
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

      {/* CONTENT */}
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
                <DayCard key={dKey} day={day} dKey={dKey}
                  manhaNames={signups[`${dKey}:manha`] || EMPTY}
                  tardeNames={signups[`${dKey}:tarde`] || EMPTY}
                  noiteNames={signups[`${dKey}:noite`] || EMPTY}
                  onAdd={addCal} onRemove={remCal} />
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
                      names={cs[`${ckKey}:${h}`] || EMPTY}
                      onAdd={addClock} onRemove={remClock}
                      isHighlighted={hi === h}
                      setRef={setHourRef(h)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* FOOTER */}
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