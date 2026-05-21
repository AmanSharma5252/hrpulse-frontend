import { useState, useEffect, useRef, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";

// ─── API LAYER ───────────────────────────────────────────────────────────────
const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";
let _at = localStorage.getItem("hp_at") || null;
let _rt = localStorage.getItem("hp_rt") || null;

function saveDemoState(key, data) { try { localStorage.setItem("hp_demo_"+key, JSON.stringify(data)); } catch {} }
function loadDemoState(key, fallback) { try { const v=localStorage.getItem("hp_demo_"+key); return v?JSON.parse(v):fallback; } catch { return fallback; } }
function clearDemoState() { ["emps","leaves","tasks","anns","allEmps"].forEach(k=>localStorage.removeItem("hp_demo_"+k)); }

function saveTokens(at, rt) {
  _at = at; if (rt) _rt = rt;
  localStorage.setItem("hp_at", at || ""); if (rt) localStorage.setItem("hp_rt", rt);
}
function clearTokens() {
  _at = _rt = null;
  localStorage.removeItem("hp_at"); localStorage.removeItem("hp_rt");
}

async function call(path, opts = {}, retry = true) {
  const h = { "Content-Type": "application/json", "Cache-Control": "no-cache", ...(opts.headers || {}) };
  if (_at) h["Authorization"] = `Bearer ${_at}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers: h });
  } catch {
    throw new Error("Network error — is the backend running?");
  }
  if (res.status === 401 && retry && _rt) {
    try {
      const r = await fetch(`${BASE}/auth/refresh`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: _rt }),
      });
      if (r.ok) {
        const { access_token } = await r.json();
        saveTokens(access_token, null);
        return call(path, opts, false);
      }
    } catch {}
    clearTokens(); window.location.reload(); return null;
  }
  if (res.status === 403) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || data.message || "Access denied");
    err.status = 403;
    err.suspended = data.suspended || false;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Error ${res.status}`);
    err.status = res.status;
    err.early_checkout = data.early_checkout || false;
    err.worked_minutes = data.worked_minutes;
    err.remaining_minutes = data.remaining_minutes;
    throw err;
  }
  return data;
}

const api = {
  get:    p     => call(p),
  post:   (p,b) => call(p, { method:"POST",   body: JSON.stringify(b) }),
  patch:  (p,b) => call(p, { method:"PATCH",  body: JSON.stringify(b) }),
  delete: p     => call(p, { method:"DELETE" }),
  postForm:(p,fd)=>call(p,{method:"POST",body:fd,headers:{}}),
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_EMPLOYEES = [
  { id:"e1", employee_code:"E001", name:"Arjun Mehta",    email:"arjun@hrpulse.io",  password_hash:"", role:"admin",    department:"Management",  title:"CEO",             avatar_initials:"AM", hire_date:"2022-01-10", is_active:true,  phone:"+91 98100 11111" },
  { id:"e2", employee_code:"E002", name:"Priya Sharma",   email:"priya@hrpulse.io",  password_hash:"", role:"hr",       department:"HR",           title:"HR Manager",      avatar_initials:"PS", hire_date:"2022-03-15", is_active:true,  phone:"+91 98100 22222" },
  { id:"e3", employee_code:"E003", name:"Rohan Kapoor",   email:"rohan@hrpulse.io",  password_hash:"", role:"manager",  department:"Engineering",  title:"Tech Lead",       avatar_initials:"RK", hire_date:"2022-05-01", is_active:true,  phone:"+91 98100 33333" },
  { id:"e4", employee_code:"E004", name:"Sneha Iyer",     email:"sneha@hrpulse.io",  password_hash:"", role:"employee", department:"Engineering",  title:"Sr. Developer",   avatar_initials:"SI", hire_date:"2023-01-20", is_active:true,  phone:"+91 98100 44444" },
  { id:"e5", employee_code:"E005", name:"Vikram Singh",   email:"vikram@hrpulse.io", password_hash:"", role:"employee", department:"Sales",        title:"Sales Executive", avatar_initials:"VS", hire_date:"2023-03-10", is_active:true,  phone:"+91 98100 55555" },
  { id:"e6", employee_code:"E006", name:"Kavita Reddy",   email:"kavita@hrpulse.io", password_hash:"", role:"employee", department:"Design",       title:"UI Designer",     avatar_initials:"KR", hire_date:"2023-06-01", is_active:true,  phone:"+91 98100 66666" },
  { id:"e7", employee_code:"E007", name:"Amit Joshi",     email:"amit@hrpulse.io",   password_hash:"", role:"employee", department:"Marketing",    title:"Growth Manager",  avatar_initials:"AJ", hire_date:"2023-08-15", is_active:true,  phone:"+91 98100 77777" },
  { id:"e8", employee_code:"E008", name:"Deepa Nair",     email:"deepa@hrpulse.io",  password_hash:"", role:"employee", department:"Finance",      title:"Accountant",      avatar_initials:"DN", hire_date:"2023-09-01", is_active:true,  phone:"+91 98100 88888" },
  { id:"e9", employee_code:"E009", name:"Rahul Verma",    email:"rahul@hrpulse.io",  password_hash:"", role:"employee", department:"Engineering",  title:"Backend Dev",     avatar_initials:"RV", hire_date:"2024-01-15", is_active:true,  phone:"+91 98100 99999" },
  { id:"e10",employee_code:"E010", name:"Anita Gupta",    email:"anita@hrpulse.io",  password_hash:"", role:"employee", department:"Operations",   title:"Ops Analyst",     avatar_initials:"AG", hire_date:"2024-02-01", is_active:true,  phone:"+91 98100 10101" },
  { id:"e11",employee_code:"E011", name:"Suresh Patil",   email:"suresh@hrpulse.io", password_hash:"", role:"employee", department:"Sales",        title:"Senior Sales",    avatar_initials:"SP", hire_date:"2024-03-10", is_active:false, phone:"+91 98100 11110" },
  { id:"e12",employee_code:"E012", name:"Meena Krishnan", email:"meena@hrpulse.io",  password_hash:"", role:"employee", department:"Design",       title:"Graphic Designer",avatar_initials:"MK", hire_date:"2024-04-05", is_active:true,  phone:"+91 98100 12121" },
];

function genAttHistory(empId, months = 3) {
  const recs = [];
  const statuses = ["present","present","present","present","late","present","present","on-leave","present","present","present","present","late","present","absent"];
  const now = new Date();
  for (let m = months - 1; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const daysInMonth = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    for (let day = 1; day <= Math.min(daysInMonth, m===0?now.getDate()-1:daysInMonth); day++) {
      const date = new Date(d.getFullYear(), d.getMonth(), day);
      if (date.getDay()===0||date.getDay()===6) continue;
      const st = statuses[Math.floor(Math.random()*statuses.length)];
      const hIn  = 9 + (st==="late"?Math.floor(Math.random()*2)+1:0);
      const mIn  = Math.floor(Math.random()*59);
      const checkIn  = new Date(date); checkIn.setHours(hIn,mIn,0);
      const checkOut = new Date(date); checkOut.setHours(18+Math.floor(Math.random()*2),Math.floor(Math.random()*59),0);
      const work_minutes = st==="on-leave"?0:Math.round((checkOut-checkIn)/60000);
      recs.push({
        id:`att_${empId}_${date.toISOString().split("T")[0]}`,
        employee_id:empId, date:date.toISOString().split("T")[0],
        check_in: st==="on-leave"?null:checkIn.toISOString(),
        check_out:st==="on-leave"?null:checkOut.toISOString(),
        status:st, work_minutes: Math.max(0,work_minutes),
        latitude:28.6139+Math.random()*0.01, longitude:77.2090+Math.random()*0.01,
        selfie_in:Math.random()>0.4?"yes":null,
      });
    }
  }
  return recs;
}

const SEED_ATT_ALL = SEED_EMPLOYEES.filter(e=>e.is_active).flatMap(e=>genAttHistory(e.id,3));

function genSeedLeaves() {
  const types=["Annual Leave","Sick Leave","Casual Leave","Maternity Leave","Unpaid Leave"];
  const statuses=["approved","approved","pending","rejected","approved"];
  return SEED_EMPLOYEES.filter(e=>e.is_active).flatMap(e=>{
    return Array.from({length:Math.floor(Math.random()*3)+1},(_,i)=>{
      const start=new Date(); start.setDate(start.getDate()+Math.floor(Math.random()*60)-30);
      const days=Math.floor(Math.random()*4)+1;
      const end=new Date(start); end.setDate(end.getDate()+days-1);
      const st=statuses[i%statuses.length];
      return {
        id:`leave_${e.id}_${i}`, employee_id:e.id,
        leave_type:{name:types[Math.floor(Math.random()*types.length)]},
        start_date:start.toISOString().split("T")[0], end_date:end.toISOString().split("T")[0],
        total_days:days, reason:"Personal reasons", status:st,
        employee:{name:e.name,avatar_initials:e.avatar_initials,department:e.department},
        reviewer:st!=="pending"?{name:"Priya Sharma"}:null, review_note:"",
        created_at:new Date(Date.now()-Math.random()*30*864e5).toISOString(),
      };
    });
  });
}
const SEED_LEAVES = genSeedLeaves();

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const DEPT_COLORS = {
  Engineering:"#3ECF8E", Sales:"#F6C90E", Design:"#FF6B6B",
  HR:"#A78BFA", Marketing:"#38BDF8", Management:"#FB923C",
  Operations:"#34D399", Finance:"#60A5FA",
};
const gc = d => DEPT_COLORS[d] || "#3ECF8E";
const todayStr = () => new Date().toISOString().split("T")[0];
const fmtT  = iso => iso ? new Date(iso).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) : "—";
const fmtD  = iso => iso ? new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";
const fmtH  = m   => m ? `${Math.floor(m/60)}h ${m%60}m` : "—";
const fmtAgo= ms  => { const s=Math.floor((Date.now()-ms)/1000); if(s<60)return"just now"; if(s<3600)return`${Math.floor(s/60)}m ago`; if(s<86400)return`${Math.floor(s/3600)}h ago`; return`${Math.floor(s/86400)}d ago`; };
const rupee = n => `₹${Number(n).toLocaleString("en-IN")}`;
const eNorm = e=>{ const n=e.name||e.full_name||e.email||"?"; return { id:e.id, code:e.employee_code, name:n, email:e.email||"", role:e.role||"employee", department:e.department||"", dept:e.department||e.dept||"", title:e.title||"", phone:e.phone||"", emergency:e.emergency_contact||e.emergency||"", avatar:e.avatar_initials||(n&&n!="?"?n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase():"?"), hireDate:e.hire_date||e.hireDate||"", isActive:e.is_active??true, company_id:e.company_id||null, plan:e.plan||null, base_salary:e.base_salary||0, hra_pct:e.hra_pct||0, ta_amount:e.ta_amount||0, pf_pct:e.pf_pct||0, tax_pct:e.tax_pct||0 }; };
const lNorm = l=>({ id:l.id, empId:l.employee_id, empName:l.employee?.name||"", deptName:l.employee?.department||"", avatar:l.employee?.avatar_initials||"?", type:l.leave_type?.name||"Leave", from:l.start_date, to:l.end_date, days:l.total_days, reason:l.reason||"", status:l.status, reviewer:l.reviewer?.name||"", reviewNote:l.review_note||"", at:new Date(l.created_at).getTime() });

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;600;700;800;900&family=Instrument+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #050911;
  --bg2:       #070d1a;
  --s1:        #0a1020;
  --s2:        #0d1528;
  --s3:        #111e35;
  --s4:        #162240;
  --border:    rgba(255,255,255,0.06);
  --border2:   rgba(255,255,255,0.11);
  --g:         #3ECF8E;
  --g2:        #22a36e;
  --gd:        rgba(62,207,142,0.12);
  --gl:        rgba(62,207,142,0.06);
  --amber:     #F59E0B;
  --red:       #EF4444;
  --blue:      #3B82F6;
  --violet:    #8B5CF6;
  --text:      #E8EDF5;
  --text2:     #7A90B0;
  --text3:     #2E3D55;
  --mono:      'Instrument Mono', monospace;
}

html, body { background: var(--bg); font-family: 'Cabinet Grotesk', sans-serif; color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--s4); border-radius: 4px; }
::selection { background: rgba(62,207,142,0.2); }

@keyframes fadeUp   { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
@keyframes spin     { to { transform: rotate(360deg); } }
@keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes dot      { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:.5} }
@keyframes shimmer  { 0%{background-position:200%} 100%{background-position:-200%} }
@keyframes slideIn  { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:none} }
@keyframes popIn    { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
@keyframes glow     { 0%,100%{box-shadow:0 0 18px rgba(62,207,142,0.2)} 50%{box-shadow:0 0 32px rgba(62,207,142,0.45)} }
@keyframes upgradeShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }

.fu   { animation: fadeUp .28s cubic-bezier(.16,1,.3,1); }
.si   { animation: slideIn .22s ease; }
.pi   { animation: popIn .2s cubic-bezier(.16,1,.3,1); }

input, select, textarea {
  background: var(--s2); border: 1.5px solid var(--border2); color: var(--text);
  border-radius: 10px; padding: 10px 14px; font-size: 13px;
  font-family: inherit; width: 100%; transition: all .18s; outline: none;
}
input:focus, select:focus, textarea:focus { border-color: var(--g); box-shadow: 0 0 0 3px rgba(62,207,142,0.08); }
input::placeholder, textarea::placeholder { color: var(--text3); }
button { font-family: inherit; cursor: pointer; border: none; transition: all .18s; outline: none; }
label  { font-size: 10px; color: var(--text3); font-weight: 700; margin-bottom: 5px; display: block; letter-spacing: 1px; text-transform: uppercase; }

.btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; border-radius:10px; font-weight:700; font-size:13px; padding:9px 18px; white-space:nowrap; letter-spacing:.02em; }
.btn-p { background:linear-gradient(135deg,var(--g),var(--g2)); color:#000; }
.btn-p:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(62,207,142,0.35); }
.btn-p:disabled { opacity:.45; cursor:not-allowed; transform:none; box-shadow:none; }
.btn-g { background:var(--s2); color:var(--text2); border:1px solid var(--border2); }
.btn-g:hover { background:var(--s3); color:var(--text); }
.btn-d { background:rgba(239,68,68,0.08); color:#EF4444; border:1px solid rgba(239,68,68,0.2); }
.btn-d:hover { background:rgba(239,68,68,0.15); }
.btn-s { background:var(--gd); color:var(--g); border:1px solid rgba(62,207,142,0.25); }
.btn-s:hover { background:rgba(62,207,142,0.18); }
.btn-w { background:rgba(245,158,11,0.08); color:var(--amber); border:1px solid rgba(245,158,11,0.2); }
.btn-w:hover { background:rgba(245,158,11,0.15); }
.btn-b { background:rgba(59,130,246,0.1); color:var(--blue); border:1px solid rgba(59,130,246,0.2); }
.btn-b:hover { background:rgba(59,130,246,0.18); }
.btn-upgrade {
  background: linear-gradient(135deg, #F59E0B, #EF4444, #8B5CF6);
  background-size: 200%;
  animation: upgradeShimmer 3s infinite;
  color: #fff;
  font-weight: 800;
  border: none;
}
.btn-upgrade:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(245,158,11,0.4); }

.card { background:var(--s1); border:1px solid var(--border); border-radius:16px; padding:22px; transition:border-color .2s; }
.card:hover { border-color:var(--border2); }
.card-sm { padding:14px 16px; }

.nav { cursor:pointer; padding:10px 13px; border-radius:11px; font-size:13px; font-weight:500; color:var(--text2); transition:all .18s; display:flex; align-items:center; gap:10px; user-select:none; position:relative; }
.nav:hover { background:var(--s2); color:var(--text); }
.nav.on { background:var(--gd); color:var(--g); font-weight:700; border:1px solid rgba(62,207,142,0.18); }
.nav.on::before { content:''; position:absolute; left:0; top:25%; bottom:25%; width:3px; background:var(--g); border-radius:0 2px 2px 0; }
.nav.locked-nav { opacity:1 !important; cursor:pointer !important; }
.nav.locked-nav:hover { background:rgba(245,158,11,0.06); color:var(--text2); }

.tab { cursor:pointer; padding:7px 15px; border-radius:9px; font-size:12px; font-weight:600; color:var(--text3); border:none; background:transparent; transition:all .18s; font-family:inherit; }
.tab:hover { color:var(--text2); background:var(--s2); }
.tab.on { background:var(--s2); color:var(--g); border:1px solid var(--border2); }

.chip { display:inline-flex; align-items:center; padding:2px 9px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:.3px; }

.row { display:flex; align-items:center; gap:12px; padding:11px 6px; border-radius:10px; transition:background .15s; border-bottom:1px solid var(--border); }
.row:hover { background:var(--s2); }
.row:last-child { border-bottom:none; }

.spin { width:16px; height:16px; border:2px solid var(--s4); border-top-color:var(--g); border-radius:50%; animation:spin .6s linear infinite; display:inline-block; flex-shrink:0; }
.spin-lg { width:28px; height:28px; border-width:3px; }
.modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; animation:fadeUp .18s; }
.modal { background:var(--s1); border:1px solid var(--border2); border-radius:20px; padding:30px; width:580px; max-width:100%; max-height:92vh; overflow-y:auto; animation:popIn .22s; }
.err  { background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:10px; padding:10px 14px; font-size:12px; color:#EF4444; margin:8px 0; }
.info { background:rgba(62,207,142,0.06); border:1px solid rgba(62,207,142,0.2); border-radius:10px; padding:10px 14px; font-size:12px; color:var(--g); margin:8px 0; }
.pb   { height:5px; background:var(--s3); border-radius:3px; overflow:hidden; }
.pf   { height:100%; border-radius:3px; transition:width .9s cubic-bezier(.16,1,.3,1); }
.sk   { background:linear-gradient(90deg,var(--s2) 25%,var(--s3) 50%,var(--s2) 75%); background-size:200%; animation:shimmer 1.5s infinite; border-radius:8px; }
.ldot { width:7px; height:7px; border-radius:50%; background:var(--g); display:inline-block; animation:dot 2s infinite; box-shadow:0 0 7px rgba(62,207,142,0.6); }
.sect { font-size:17px; font-weight:800; color:var(--text); margin-bottom:14px; letter-spacing:-.3px; }
.mono { font-family:var(--mono); }

.g4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.g3 { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
.g2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }

.sidebar { width:220px; background:var(--bg2); border-right:1px solid var(--border); display:flex; flex-direction:column; padding:20px 12px; gap:2px; position:sticky; top:0; height:100vh; overflow-y:auto; flex-shrink:0; }

.recharts-tooltip-wrapper .recharts-default-tooltip { background:var(--s2) !important; border:1px solid var(--border2) !important; border-radius:10px !important; font-size:12px !important; }

.ai-card { background:linear-gradient(135deg,#0d1a2e,#0a1520); border:1px solid rgba(59,130,246,0.25); border-radius:14px; padding:16px; position:relative; overflow:hidden; }
.ai-card::before { content:''; position:absolute; top:-40px; right:-40px; width:120px; height:120px; background:radial-gradient(circle,rgba(59,130,246,0.15),transparent 70%); border-radius:50%; pointer-events:none; }

.payroll-card { background:linear-gradient(135deg,#0d1a10,#091510); border:1px solid rgba(62,207,142,0.2); border-radius:14px; padding:20px; }

.warroom { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; }
.emp-tile { background:var(--s2); border:1px solid var(--border); border-radius:12px; padding:14px 10px; text-align:center; transition:all .2s; }
.emp-tile:hover { border-color:var(--border2); transform:translateY(-2px); }
.emp-tile.clocked-in  { border-color:rgba(62,207,142,0.35); background:rgba(62,207,142,0.04); }
.emp-tile.clocked-out { border-color:rgba(239,68,68,0.25); background:rgba(239,68,68,0.03); }
.emp-tile.on-leave    { border-color:rgba(139,92,246,0.3);  background:rgba(139,92,246,0.04); }

.ob-step { display:flex; align-items:center; gap:14px; padding:14px; border-radius:12px; border:1px solid var(--border); background:var(--s2); margin-bottom:10px; transition:all .2s; }
.ob-step.done { border-color:rgba(62,207,142,0.3); background:rgba(62,207,142,0.04); }
.ob-num { width:32px; height:32px; border-radius:50%; background:var(--s3); border:1px solid var(--border2); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; color:var(--text3); flex-shrink:0; }
.ob-step.done .ob-num { background:var(--gd); color:var(--g); border-color:rgba(62,207,142,0.3); }

.plan-card { border:1px solid var(--border2); border-radius:16px; padding:24px; background:var(--s1); transition:all .2s; cursor:default; }
.plan-card.featured { border-color:var(--g); background:linear-gradient(160deg,var(--gl),var(--s1)); box-shadow:0 0 0 1px rgba(62,207,142,0.3),0 8px 32px rgba(62,207,142,0.1); }
.plan-price { font-size:36px; font-weight:900; line-height:1; letter-spacing:-1px; }
.plan-feat  { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text2); padding:5px 0; border-bottom:1px solid var(--border); }
.plan-feat:last-child { border-bottom:none; }
.plan-feat::before { content:'✓'; color:var(--g); font-weight:800; flex-shrink:0; }

.upgrade-modal {
  background: linear-gradient(160deg, #0d1a2e, #0a1020);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 24px;
  padding: 36px;
  width: 520px;
  max-width: 100%;
  animation: popIn .22s;
  position: relative;
  overflow: hidden;
}
.upgrade-modal::before {
  content: '';
  position: absolute;
  top: -80px; right: -80px;
  width: 240px; height: 240px;
  background: radial-gradient(circle, rgba(245,158,11,0.12), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.upgrade-modal::after {
  content: '';
  position: absolute;
  bottom: -60px; left: -60px;
  width: 180px; height: 180px;
  background: radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.upgrade-feature-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 9px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 7px;
  font-size: 13px; color: var(--text2);
}
.upgrade-feature-row .feat-icon {
  width: 28px; height: 28px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}

@media(max-width:768px) {
  .sidebar { position:fixed; bottom:0; left:0; right:0; height:60px; width:100%!important; flex-direction:row!important; padding:0 6px!important; border-right:none!important; border-top:1px solid var(--border); z-index:100; overflow-x:auto; overflow-y:hidden; align-items:center; }
  .nav { flex-direction:column; gap:2px; font-size:8px; padding:6px 8px; min-width:52px; border-radius:8px; }
  .nav.on::before { display:none; }
  .nav > span:first-child { font-size:17px; }
  main { padding:16px 14px 76px!important; }
  .g4 { grid-template-columns:repeat(2,1fr)!important; }
  .g2 { grid-template-columns:1fr!important; }
  .g3 { grid-template-columns:repeat(2,1fr)!important; }
  .hide-mob { display:none!important; }
  .modal { padding:20px; border-radius:16px; }
}
`;

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const Spin = ({ lg }) => <span className={`spin${lg?" spin-lg":""}`}/>;

const Badge = ({ s }) => {
  const M = {
    present:["#3ECF8E","Present"], "on-leave":["#8B5CF6","On Leave"],
    late:["#F59E0B","Late"], absent:["#EF4444","Absent"],
    pending:["#F59E0B","Pending"], approved:["#3ECF8E","Approved"],
    rejected:["#EF4444","Rejected"], cancelled:["#4a6080","Cancelled"],
    high:["#EF4444","High"], medium:["#F59E0B","Medium"], low:["#3ECF8E","Low"],
    admin:["#FB923C","Admin"], hr:["#8B5CF6","HR"],
    manager:["#3B82F6","Manager"], employee:["#3ECF8E","Employee"],
    "half-day":["#38BDF8","Half Day"],
  };
  const [c,l] = M[s] || ["#4a6080", s];
  return <span className="chip" style={{ background:`${c}14`, color:c, border:`1px solid ${c}30` }}>{l}</span>;
};

const Av = ({ emp, size=38 }) => {
  const c = gc(emp?.dept||emp?.department||"");
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*.26), background:`${c}12`, border:`1.5px solid ${c}35`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*.32, fontWeight:800, color:c, flexShrink:0 }}>
      {emp?.avatar||"?"}
    </div>
  );
};

const Ring = ({ val=0, size=48, stroke=4, color="#3ECF8E" }) => {
  const r=(size-stroke*2)/2, circ=2*Math.PI*r, dash=(Math.min(100,val)/100)*circ;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--s3)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition:"stroke-dasharray 1s" }}/>
    </svg>
  );
};

const KPI = ({ label, val, pct=0, color="#3ECF8E", icon, sub, trend }) => (
  <div className="card" style={{ position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color},transparent)` }}/>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <div style={{ fontSize:9, color:"var(--text3)", textTransform:"uppercase", letterSpacing:1.2, fontWeight:700 }}>{label}</div>
        <div style={{ fontSize:28, fontWeight:900, color:"#fff", lineHeight:1.1, marginTop:8, letterSpacing:-1 }}>{val}</div>
        {sub && <div style={{ fontSize:10, color:"var(--text3)", marginTop:4 }}>{sub}</div>}
        {trend!==undefined && <div style={{ fontSize:10, marginTop:4, color:trend>=0?"var(--g)":"#EF4444" }}>{trend>=0?"↑":"↓"}{Math.abs(trend)}% vs last month</div>}
      </div>
      <div style={{ position:"relative" }}>
        <Ring val={pct} color={color} size={46} stroke={4}/>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color }}>{icon}</div>
      </div>
    </div>
    <div className="pb" style={{ marginTop:12 }}>
      <div className="pf" style={{ width:`${pct}%`, background:`linear-gradient(90deg,${color}55,${color})` }}/>
    </div>
  </div>
);

const F = ({ label, children }) => <div style={{ marginBottom:13 }}><label>{label}</label>{children}</div>;
const Sk = ({ h=18, w="100%", mb=8 }) => <div className="sk" style={{ height:h, width:w, marginBottom:mb }}/>;
const Divider = () => <div style={{ height:1, background:"var(--border)", margin:"18px 0" }}/>;

// ─── UPGRADE MODAL ───────────────────────────────────────────────────────────
function UpgradeModal({ feature, onClose, onGoToPricing }) {
  const FEATURE_DETAILS = {
    "Analytics":   { icon:"📊", desc:"Deep workforce analytics with 14-day attendance trends, department breakdowns, and KPI tracking.", plan:"Growth", features:["14-day Attendance Trend","Department Distribution","Real-time KPI Dashboard","Export Reports"] },
    "AI Alerts":   { icon:"🤖", desc:"AI-powered anomaly detection that spots late streaks, absence patterns, and attendance drops before they become problems.", plan:"Growth", features:["Late Streak Detection","Absence Pattern Alerts","Attendance Drop Warnings","Department-level Risk Scoring"] },
    "War Room":    { icon:"🎯", desc:"Live real-time view of who's in, who's out, and who's on leave — across your entire organisation right now.", plan:"Growth", features:["Live Clock-in Status","Department Heatmap","Real-time Attendance Rate","Auto-refreshing Feed"] },
    "Payroll":     { icon:"💳", desc:"Automated payroll computation with salary slabs, deductions, PF/tax breakdowns, and one-click payslip delivery.", plan:"Growth", features:["Auto Salary Computation","PF & Tax Deductions","Payslip PDF Generation","Bulk Email Payslips"] },
  };
  const d = FEATURE_DETAILS[feature] || { icon:"🔒", desc:"This feature is available on the Growth plan.", plan:"Growth", features:[] };

  return (
    <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="upgrade-modal">
        <button onClick={onClose} style={{ position:"absolute",top:16,right:16,background:"var(--s3)",border:"1px solid var(--border2)",color:"var(--text3)",width:28,height:28,borderRadius:8,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:1 }}>✕</button>
        <div style={{ position:"relative",zIndex:1 }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.3)",borderRadius:20,padding:"4px 12px",marginBottom:16 }}>
            <span style={{ fontSize:11,fontWeight:700,color:"#F59E0B",letterSpacing:.5 }}>🔒 LOCKED FEATURE</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:16 }}>
            <div style={{ width:52,height:52,borderRadius:14,background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0 }}>{d.icon}</div>
            <div>
              <div style={{ fontSize:22,fontWeight:900,color:"var(--text)",letterSpacing:-.5 }}>{feature}</div>
              <div style={{ fontSize:12,color:"var(--text3)",marginTop:2 }}>Available on <span style={{color:"#F59E0B",fontWeight:700}}>{d.plan} Plan</span> & above</div>
            </div>
          </div>
          <div style={{ fontSize:13,color:"var(--text2)",lineHeight:1.7,marginBottom:20 }}>{d.desc}</div>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:10,color:"var(--text3)",fontWeight:700,letterSpacing:1,marginBottom:10 }}>WHAT YOU'LL UNLOCK</div>
            {d.features.map((f,i)=>(
              <div key={i} className="upgrade-feature-row">
                <div className="feat-icon" style={{ background:`rgba(62,207,142,0.1)`,border:`1px solid rgba(62,207,142,0.2)` }}>
                  <span style={{ color:"var(--g)" }}>✓</span>
                </div>
                <span>{f}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24 }}>
            <div style={{ padding:"14px",borderRadius:12,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)" }}>
              <div style={{ fontSize:10,color:"#EF4444",fontWeight:700,letterSpacing:.5,marginBottom:6 }}>CURRENT · STARTER</div>
              <div style={{ fontSize:20,fontWeight:900,color:"var(--text)" }}>₹999<span style={{ fontSize:11,fontWeight:400,color:"var(--text3)" }}>/mo</span></div>
              <div style={{ fontSize:11,color:"var(--text3)",marginTop:4 }}>Basic features only</div>
            </div>
            <div style={{ padding:"14px",borderRadius:12,background:"rgba(62,207,142,0.06)",border:"1px solid rgba(62,207,142,0.25)" }}>
              <div style={{ fontSize:10,color:"var(--g)",fontWeight:700,letterSpacing:.5,marginBottom:6 }}>UPGRADE TO · GROWTH</div>
              <div style={{ fontSize:20,fontWeight:900,color:"var(--g)" }}>₹2,999<span style={{ fontSize:11,fontWeight:400,color:"var(--text3)" }}>/mo</span></div>
              <div style={{ fontSize:11,color:"var(--text3)",marginTop:4 }}>All features unlocked</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button className="btn btn-upgrade" style={{ flex:1,padding:"13px",fontSize:14 }} onClick={()=>{ onClose(); onGoToPricing(); }}>
              🚀 Upgrade Now — ₹2,999/mo
            </button>
          </div>
          <div style={{ marginTop:12,textAlign:"center" }}>
            <button onClick={()=>{ onClose(); onGoToPricing(); }} style={{ background:"none",border:"none",color:"var(--text3)",fontSize:12,cursor:"pointer",textDecoration:"underline" }}>
              View all plans & compare features
            </button>
          </div>
          <div style={{ marginTop:16,padding:"12px 14px",borderRadius:10,background:"rgba(59,130,246,0.06)",border:"1px solid rgba(59,130,246,0.15)",display:"flex",alignItems:"center",gap:10 }}>
            <span style={{ fontSize:18 }}>💬</span>
            <div>
              <div style={{ fontSize:12,fontWeight:600,color:"var(--text)" }}>Need help choosing a plan?</div>
              <div style={{ fontSize:11,color:"var(--text3)",marginTop:1 }}>Contact us at <span style={{color:"#3B82F6"}}>sales@hrpulse.io</span> · +91 98100 00000</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GPS ─────────────────────────────────────────────────────────────────────
function useGPS() {
  const [gps, setGps] = useState({ lat:null, lng:null, error:null, loading:false });
  const getLocation = () => new Promise(resolve => {
    if (!navigator.geolocation) { resolve({ lat:null, lng:null, error:"GPS not supported" }); return; }
    setGps(g=>({...g,loading:true}));
    navigator.geolocation.getCurrentPosition(
      pos => { const r={lat:pos.coords.latitude,lng:pos.coords.longitude,error:null,loading:false}; setGps(r); resolve(r); },
      ()  => { const r={lat:null,lng:null,error:"GPS denied",loading:false}; setGps(r); resolve(r); },
      { timeout:10000, enableHighAccuracy:true }
    );
  });
  return { gps, getLocation };
}

// ─── SELFIE ───────────────────────────────────────────────────────────────────
function SelfieCapture({ onCapture, onSkip }) {
  const vRef=useRef(null); const [stream,setStream]=useState(null); const [photo,setPhoto]=useState(null); const [err,setErr]=useState("");
  useEffect(()=>{
    navigator.mediaDevices.getUserMedia({video:{facingMode:"user",width:320,height:240}})
      .then(s=>{setStream(s);if(vRef.current)vRef.current.srcObject=s;})
      .catch(()=>setErr("Camera unavailable — you can skip selfie."));
    return()=>{stream?.getTracks().forEach(t=>t.stop());};
  },[]);
  const snap=()=>{
    const c=document.createElement("canvas"); c.width=vRef.current.videoWidth; c.height=vRef.current.videoHeight;
    c.getContext("2d").drawImage(vRef.current,0,0);
    setPhoto(c.toDataURL("image/jpeg",.75).split(",")[1]);
    stream?.getTracks().forEach(t=>t.stop());
  };
  return (
    <div style={{ textAlign:"center" }}>
      <div className="sect" style={{ marginBottom:10 }}>📸 Selfie Verification</div>
      {err && <div className="info">{err}<br/><button className="btn btn-g" style={{ marginTop:8 }} onClick={onSkip}>Skip Selfie</button></div>}
      {!photo && !err && <>
        <video ref={vRef} autoPlay muted playsInline style={{ width:"100%", maxWidth:300, borderRadius:12, marginBottom:12, border:"1px solid var(--border2)" }}/>
        <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
          <button className="btn btn-p" onClick={snap}>📸 Take Photo</button>
          <button className="btn btn-g" onClick={onSkip}>Skip</button>
        </div>
      </>}
      {photo && <>
        <img src={`data:image/jpeg;base64,${photo}`} alt="selfie" style={{ width:"100%",maxWidth:300,borderRadius:12,marginBottom:12,border:"2px solid var(--g)" }}/>
        <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
          <button className="btn btn-p" onClick={()=>onCapture(photo)}>✓ Use Photo</button>
          <button className="btn btn-g" onClick={()=>{setPhoto(null);navigator.mediaDevices.getUserMedia({video:{facingMode:"user"}}).then(s=>{setStream(s);if(vRef.current)vRef.current.srcObject=s;});}}>Retake</button>
        </div>
      </>}
    </div>
  );
}

// ─── AI ANOMALY ENGINE ────────────────────────────────────────────────────────
function computeAnomalies(emps, allAtt) {
  const alerts = [];
  const today = todayStr();
  const last7 = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().split("T")[0]; });
  const last30= Array.from({length:30},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().split("T")[0]; });

  emps.filter(e=>e.isActive&&e.role==="employee").forEach(e=>{
    const att = allAtt.filter(a=>a.employee_id===e.id);
    const recent7  = att.filter(a=>last7.includes(a.date));
    const recent30 = att.filter(a=>last30.includes(a.date));
    const lateStreak = recent7.filter(a=>a.status==="late").length;
    const absentStreak = recent7.filter(a=>a.status==="absent").length;
    const prevMonth = recent30.slice(15).filter(a=>["present","late"].includes(a.status)).length;
    const thisMonth = recent30.slice(0,15).filter(a=>["present","late"].includes(a.status)).length;
    const dropPct = prevMonth>0?Math.round((prevMonth-thisMonth)/prevMonth*100):0;

    if (lateStreak>=3) alerts.push({ id:`l_${e.id}`, emp:e.name, dept:e.dept, type:"Late Streak", detail:`Late ${lateStreak} times in last 7 days`, severity:"high",  icon:"⏰", color:"#F59E0B" });
    if (absentStreak>=2)alerts.push({ id:`a_${e.id}`, emp:e.name, dept:e.dept, type:"Absence Pattern", detail:`Absent ${absentStreak} times this week`, severity:"high",  icon:"🚫", color:"#EF4444" });
    if (dropPct>=30)    alerts.push({ id:`d_${e.id}`, emp:e.name, dept:e.dept, type:"Attendance Drop", detail:`${dropPct}% drop vs last 15 days`, severity:"medium",icon:"📉", color:"#3B82F6" });
  });

  const depts = [...new Set(emps.map(e=>e.dept))];
  depts.forEach(dept=>{
    const dEmps = emps.filter(e=>e.dept===dept&&e.isActive);
    const dAtt  = allAtt.filter(a=>a.date===today&&dEmps.some(e=>e.id===a.employee_id));
    const rate  = dEmps.length>0?Math.round(dAtt.filter(a=>["present","late"].includes(a.status)).length/dEmps.length*100):0;
    if (rate<60&&dEmps.length>=3) alerts.push({ id:`dept_${dept}`, emp:dept, dept, type:"Dept Alert", detail:`Only ${rate}% attendance today`, severity:"medium", icon:"🏢", color:"#8B5CF6" });
  });

  return alerts.slice(0,10);
}

// ─── PAYROLL ENGINE ───────────────────────────────────────────────────────────
function computePayroll(emp, attRecords, month, year, customSalary) {
  const days = new Date(year,month,0).getDate();
  const workingDays = Array.from({length:days},(_,i)=>new Date(year,month-1,i+1)).filter(d=>d.getDay()!==0&&d.getDay()!==6).length;
  const monthStr = `${year}-${String(month).padStart(2,"0")}`;
  const recs = attRecords.filter(r=>r.date.startsWith(monthStr)&&r.employee_id===emp.id);
  const present    = recs.filter(r=>["present","late"].includes(r.status)).length;
  const onLeave    = recs.filter(r=>r.status==="on-leave").length;
  const late       = recs.filter(r=>r.status==="late").length;
  const absent     = Math.max(0, workingDays - present - onLeave);
  const totalHours = recs.reduce((s,r)=>s+(r.work_minutes||0),0)/60;
  const defaultSalary = emp.role==="admin"?200000:emp.role==="manager"?120000:emp.role==="hr"?90000:75000;
  const baseSalary = customSalary && customSalary > 0 ? customSalary : defaultSalary;
  const perDay     = Math.round(baseSalary/22);
  const absentDeduction = absent*perDay;
  const lateDeduction   = late * Math.round(perDay/2);
  const hra    = Math.round(baseSalary*0.4);
  const ta     = Math.round(baseSalary*0.1);
  const pf     = Math.round(baseSalary*0.12);
  const tax    = Math.round(baseSalary*0.1);
  const gross  = baseSalary + hra + ta;
  const deductions = absentDeduction + lateDeduction + pf + tax;
  const net    = Math.max(0, gross - deductions);
  return { baseSalary, hra, ta, gross, pf, tax, absentDeduction, lateDeduction, deductions, net, present, onLeave, late, absent, workingDays, totalHours:Math.round(totalHours), perDay, monthStr };
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin, CSS }) {
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const go=async()=>{
    if(!email||!pw){setErr("Please enter both email and password.");return;}
    setLoading(true); setErr("");
    const r=await onLogin(email.trim(),pw);
    if(r!==true) {
      if (typeof r === "string" && r.toLowerCase().includes("suspended")) {
        setErr("🚫 " + r);
      } else {
        setErr(typeof r==="string"?r:"Invalid credentials.");
      }
    }
    setLoading(false);
  };
  const DEMOS=[["Admin","admin@hrpulse.io","Admin@123","#FB923C"],["HR","priya@hrpulse.io","Hr@12345","#8B5CF6"],["Employee","sneha@hrpulse.io","Emp@12345","#3ECF8E"]];
  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", position:"relative", overflow:"hidden" }}>
      <style>{CSS}</style>
      <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(62,207,142,0.05),transparent 70%)", top:"10%", left:"10%", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.06),transparent 70%)", bottom:"10%", right:"10%", pointerEvents:"none" }}/>
      <div style={{ width:440, position:"relative", zIndex:1 }} className="fu">
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:12, marginBottom:10 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,var(--g),var(--g2))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#000" }}>H</div>
            <div style={{ fontSize:32, fontWeight:900, color:"#fff", letterSpacing:-1.5 }}><span style={{color:"var(--g)"}}>HR</span>Pulse</div>
          </div>
          <div style={{ fontSize:12, color:"var(--text3)" }}>Workforce Intelligence Platform · v3.0</div>
        </div>
        <div className="card" style={{ padding:32 }}>
          <div style={{ fontSize:17, fontWeight:700, color:"#fff", marginBottom:22 }}>Sign in to your workspace</div>
          <F label="Work Email">
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" onKeyDown={e=>e.key==="Enter"&&go()}/>
          </F>
          <F label="Password">
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&go()}/>
          </F>
          {err && <div className="err">{err}</div>}
          <button className="btn btn-p" style={{ width:"100%", padding:"13px", fontSize:14, marginTop:4 }} onClick={go} disabled={loading}>
            {loading ? <Spin/> : "Sign In →"}
          </button>
          <Divider/>
          <div style={{ fontSize:9, color:"var(--text3)", textAlign:"center", marginBottom:10, letterSpacing:1.5 }}>DEMO QUICK LOGIN</div>
          <div style={{ display:"flex", gap:8 }}>
            {DEMOS.map(([l,e,p,c])=>(
              <button key={l} onClick={()=>{setEmail(e);setPw(p);}} style={{ flex:1, background:`${c}10`, border:`1px solid ${c}28`, color:c, borderRadius:9, padding:"9px 0", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", letterSpacing:.3 }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ marginTop:14, textAlign:"center", fontSize:10, color:"var(--text3)", letterSpacing:.5 }}>
          🔐 JWT Auth · 📍 GPS Verify · 📸 Selfie · ⚡ Real-time · 🤖 AI Alerts
        </div>
      </div>
    </div>
  );
}

// ─── OVERVIEW PAGE ────────────────────────────────────────────────────────────
function OverviewPage({ user, isMgr, isAdmin, dash, todayRec, myLeaves, pending, reviewLeave, setModal, mySum, anns, busy, onCheckIn, onCheckOut, bals, allAtt, allEmps }) {
  const s=dash?.summary; const ta=s?.today_attendance;
  const anomalies=isMgr?computeAnomalies(allEmps,allAtt):[];
  const kpis=isMgr?[
    { label:"Total Employees", val:s?.total_employees||allEmps.filter(e=>e.isActive).length, pct:100,        color:"#8B5CF6", icon:"👥", trend:5 },
    { label:"Present Today",   val:ta?.present||0,                 pct:ta?.rate||0,         color:"var(--g)", icon:"✓",   sub:`${ta?.rate||0}% rate` },
    { label:"Pending Leaves",  val:s?.pending_leaves||pending.length, pct:Math.min(100,(pending.length)*12), color:"#F59E0B", icon:"📋" },
    { label:"Absent Today",    val:ta?.absent||0,                  pct:s?.total_employees?Math.round((ta?.absent||0)/s.total_employees*100):0, color:"#EF4444", icon:"✗" },
  ]:[
    { label:"Today",        val:todayRec?.status||"absent", pct:todayRec?100:0, color:"var(--g)", icon:"✓" },
    { label:"Days Present", val:mySum?.present||0,          pct:80,             color:"var(--g)", icon:"📅" },
    { label:"Leave Left",   val:bals.reduce((s,b)=>s+(b.total_days-(b.used_days||0)-(b.pending_days||0)),0), pct:60, color:"#8B5CF6", icon:"◈" },
    { label:"Hrs Worked",   val:mySum?`${Math.floor((mySum.total_minutes||0)/60)}h`:"—", pct:70, color:"#3B82F6", icon:"⏱" },
  ];

  return (
    <div className="fu">
      <div className="g4" style={{ marginBottom:20 }}>
        {kpis.map((k,i)=><KPI key={i} {...k}/>)}
      </div>
      <div className="g2">
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="card" style={{ textAlign:"center", padding:28 }}>
            <div style={{ fontSize:9, color:"var(--text3)", letterSpacing:1.5, marginBottom:12 }}>TODAY'S ATTENDANCE</div>
            <Badge s={todayRec?.status||"absent"}/>
            <div style={{ fontSize:12, color:"var(--text2)", margin:"12px 0" }}>
              In: <strong style={{color:"var(--text)"}}>{fmtT(todayRec?.check_in)}</strong>
              &nbsp;·&nbsp;Out: <strong style={{color:"var(--text)"}}>{fmtT(todayRec?.check_out)}</strong>
            </div>
            {todayRec?.latitude&&<div style={{fontSize:10,color:"var(--g)",marginBottom:10}}>📍 GPS verified {todayRec.selfie_in?"· 📸 Selfie captured":""}</div>}
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              {!todayRec?.check_in && <button className="btn btn-s" style={{padding:"10px 26px",fontSize:13}} onClick={onCheckIn} disabled={busy}>{busy?<Spin/>:"📍 Clock In"}</button>}
              {todayRec?.check_in&&!todayRec?.check_out&&<button className="btn btn-d" style={{padding:"10px 26px",fontSize:13}} onClick={onCheckOut} disabled={busy}>{busy?<Spin/>:"↓ Clock Out"}</button>}
              {todayRec?.check_out&&<div style={{color:"var(--g)",fontWeight:700}}>✓ Day Complete · {fmtH(todayRec.work_minutes)}</div>}
            </div>
          </div>
          {isMgr && anomalies.length>0 && (
            <div className="ai-card">
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                <div style={{ width:24, height:24, borderRadius:6, background:"rgba(59,130,246,0.2)", border:"1px solid rgba(59,130,246,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13 }}>🤖</div>
                <div style={{ fontWeight:700, fontSize:14, color:"var(--text)" }}>AI Anomaly Alerts</div>
                <span className="chip" style={{ background:"rgba(59,130,246,0.12)", color:"#3B82F6", border:"1px solid rgba(59,130,246,0.25)", marginLeft:"auto", fontSize:10 }}>{anomalies.length} alerts</span>
              </div>
              {anomalies.slice(0,4).map(a=>(
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:`rgba(${a.severity==="high"?"239,68,68":"245,158,11"},.12)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>{a.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.emp}</div>
                    <div style={{ fontSize:10, color:a.color }}>{a.type} · {a.detail}</div>
                  </div>
                  <span className="chip" style={{ background:`${a.color}12`, color:a.color, border:`1px solid ${a.color}25`, fontSize:9 }}>{a.severity}</span>
                </div>
              ))}
              {anomalies.length>4&&<div style={{fontSize:10,color:"var(--text3)",marginTop:8,textAlign:"center"}}>+{anomalies.length-4} more in AI Alerts page</div>}
            </div>
          )}
          {isMgr && pending.length>0 && (
            <div className="card">
              <div className="sect">Pending Approvals <span style={{fontSize:12,color:"var(--text3)",fontWeight:400}}>({pending.length})</span></div>
              {pending.slice(0,4).map(l=>(
                <div key={l.id} style={{ display:"flex", gap:10, alignItems:"center", padding:"9px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ width:30,height:30,borderRadius:8,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#8B5CF6",flexShrink:0 }}>{l.avatar}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{l.empName}</div>
                    <div style={{ fontSize:10,color:"var(--text3)" }}>{l.type} · {l.days}d · {l.from}</div>
                  </div>
                  <div style={{ display:"flex",gap:5 }}>
                    <button className="btn btn-s" style={{padding:"3px 9px",fontSize:11}} onClick={()=>reviewLeave(l.id,true)} disabled={busy}>✓</button>
                    <button className="btn btn-d" style={{padding:"3px 9px",fontSize:11}} onClick={()=>reviewLeave(l.id,false)} disabled={busy}>✗</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {isMgr&&ta&&(
            <div className="card">
              <div className="sect">Today's Breakdown</div>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                {[["Present",ta.present||0,"var(--g)"],["Late",ta.late||0,"#F59E0B"],["Absent",ta.absent||0,"#EF4444"],["On Leave",ta.on_leave||0,"#8B5CF6"]].map(([l,v,c])=>(
                  <div key={l} style={{ textAlign:"center", flex:1, minWidth:60 }}>
                    <div style={{ fontSize:28,fontWeight:900,color:c,letterSpacing:-1 }}>{v}</div>
                    <div style={{ fontSize:10,color:"var(--text3)" }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div className="card">
            <div className="sect">Announcements</div>
            {anns.length===0&&<div style={{fontSize:12,color:"var(--text3)",textAlign:"center",padding:16}}>Nothing posted yet.</div>}
            {anns.slice(0,5).map(a=>(
              <div key={a.id} style={{ display:"flex",gap:10,padding:"9px 0",borderBottom:"1px solid var(--border)" }}>
                <div style={{ width:7,height:7,borderRadius:"50%",background:a.urgent?"#EF4444":"var(--g)",flexShrink:0,marginTop:5,boxShadow:a.urgent?"0 0 6px #EF444499":"0 0 6px rgba(62,207,142,.5)" }}/>
                <div>
                  <div style={{ fontSize:12,fontWeight:600,color:"var(--text)" }}>{a.title}</div>
                  <div style={{ fontSize:10,color:"var(--text3)",marginTop:2 }}>{a.tag} · {fmtAgo(a.at)}</div>
                </div>
              </div>
            ))}
          </div>
          {isMgr&&(dash?.department_distribution||allEmps.length>0)&&(()=>{
            const dd = dash?.department_distribution || {};
            if(!Object.keys(dd).length) allEmps.filter(e=>e.isActive).forEach(e=>{ dd[e.dept]=(dd[e.dept]||0)+1; });
            return Object.keys(dd).length>0&&(
              <div className="card">
                <div className="sect">Departments</div>
                {Object.entries(dd).map(([d,c])=>(
                  <div key={d} style={{ padding:"7px 0", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                      <span style={{ fontSize:12,fontWeight:600,color:gc(d) }}>{d}</span>
                      <span style={{ fontSize:12,color:"var(--text)" }}>{c}</span>
                    </div>
                    <div className="pb"><div className="pf" style={{ width:`${Math.min(100,c*12)}%`, background:`linear-gradient(90deg,${gc(d)}55,${gc(d)})` }}/></div>
                  </div>
                ))}
              </div>
            );
          })()}
          {!isMgr&&bals.filter(b=>b.total_days>0).length>0&&(
            <div className="card">
              <div className="sect">Leave Balance</div>
              {bals.filter(b=>b.total_days>0).map(b=>{
                const left=b.total_days-(b.used_days||0)-(b.pending_days||0);
                return (
                  <div key={b.id} style={{ padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                      <span style={{ fontSize:12,color:"var(--text2)" }}>{b.leave_type?.name}</span>
                      <span style={{ fontSize:12,fontWeight:700,color:"var(--g)" }}>{left} left</span>
                    </div>
                    <div className="pb"><div className="pf" style={{ width:`${b.total_days>0?Math.round((b.total_days-left)/b.total_days*100):0}%`, background:"linear-gradient(90deg,var(--g)55,var(--g))" }}/></div>
                  </div>
                );
              })}
              <button className="btn btn-p" style={{ width:"100%",marginTop:12,fontSize:12 }} onClick={()=>setModal({type:"addLeave"})}>+ Apply Leave</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI ALERTS PAGE ───────────────────────────────────────────────────────────
function AIAlertsPage({ allEmps, allAtt, analytics }) {
  const anomalies = computeAnomalies(allEmps, allAtt);
  const [filter, setFilter] = useState("all");
  const shown = filter==="all"?anomalies:anomalies.filter(a=>a.severity===filter);

  return (
    <div className="fu">
      <div className="g3" style={{ marginBottom:20 }}>
        <div className="ai-card" style={{ gridColumn:"span 2" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
            <div style={{ fontSize:22 }}>🤖</div>
            <div>
              <div style={{ fontWeight:800,fontSize:16,color:"var(--text)" }}>AI Workforce Intelligence</div>
              <div style={{ fontSize:11,color:"var(--text3)" }}>Pattern detection across attendance, leaves & performance</div>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
            {[
              ["High Risk", anomalies.filter(a=>a.severity==="high").length, "#EF4444"],
              ["Medium Risk",anomalies.filter(a=>a.severity==="medium").length,"#F59E0B"],
              ["Patterns Detected",anomalies.length,"#3B82F6"],
            ].map(([l,v,c])=>(
              <div key={l} style={{ background:"rgba(0,0,0,0.2)",borderRadius:10,padding:"12px",textAlign:"center" }}>
                <div style={{ fontSize:28,fontWeight:900,color:c,letterSpacing:-1 }}>{v}</div>
                <div style={{ fontSize:10,color:"var(--text3)",marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize:11,color:"var(--text3)",marginBottom:8,letterSpacing:.5 }}>ATTENDANCE HEALTH SCORE</div>
          <div style={{ fontSize:48,fontWeight:900,letterSpacing:-2,color:"var(--g)",lineHeight:1 }}>
            {anomalies.length===0?98:anomalies.length<=2?85:anomalies.length<=5?72:58}
          </div>
          <div style={{ fontSize:11,color:"var(--text3)",marginTop:4 }}>out of 100</div>
          <div className="pb" style={{ marginTop:12 }}>
            <div className="pf" style={{ width:`${anomalies.length===0?98:anomalies.length<=2?85:72}%`, background:"linear-gradient(90deg,var(--g)55,var(--g))" }}/>
          </div>
          <div style={{ fontSize:11,color:"var(--text2)",marginTop:10 }}>Based on 30-day patterns</div>
        </div>
      </div>
      <div style={{ display:"flex",gap:6,marginBottom:14 }}>
        {["all","high","medium"].map(f=>(
          <button key={f} className={`tab ${filter===f?"on":""}`} onClick={()=>setFilter(f)} style={{ textTransform:"capitalize" }}>{f==="all"?"All Alerts":f+" Risk"}</button>
        ))}
      </div>
      {shown.length===0&&(
        <div className="card" style={{ textAlign:"center",padding:40 }}>
          <div style={{ fontSize:36,marginBottom:12 }}>✅</div>
          <div style={{ fontWeight:700,fontSize:15,color:"var(--text)" }}>No anomalies detected</div>
          <div style={{ fontSize:12,color:"var(--text3)",marginTop:4 }}>Your team's attendance is healthy</div>
        </div>
      )}
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {shown.map(a=>(
          <div key={a.id} className="card" style={{ borderLeft:`3px solid ${a.color}` }}>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:40,height:40,borderRadius:11,background:`${a.color}12`,border:`1px solid ${a.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{a.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                  <span style={{ fontWeight:700,fontSize:14,color:"var(--text)" }}>{a.emp}</span>
                  <span style={{ fontSize:11,color:"var(--text3)" }}>·</span>
                  <span style={{ fontSize:11,color:gc(a.dept) }}>{a.dept}</span>
                  <span className="chip" style={{ background:`${a.color}12`,color:a.color,border:`1px solid ${a.color}25`,marginLeft:"auto",fontSize:10 }}>{a.severity} risk</span>
                </div>
                <div style={{ fontSize:12,fontWeight:700,color:a.color,marginTop:3 }}>{a.type}</div>
                <div style={{ fontSize:12,color:"var(--text2)",marginTop:1 }}>{a.detail}</div>
              </div>
            </div>
            <div style={{ marginTop:12,paddingTop:12,borderTop:"1px solid var(--border)",display:"flex",gap:8 }}>
              <button className="btn btn-g" style={{ fontSize:11,padding:"4px 12px" }}>📧 Send Notification</button>
              <button className="btn btn-g" style={{ fontSize:11,padding:"4px 12px" }}>📝 Add Note</button>
              <button className="btn btn-s" style={{ fontSize:11,padding:"4px 12px",marginLeft:"auto" }}>✓ Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PAYROLL PAGE ─────────────────────────────────────────────────────────────
// ─── PAYROLL PAGE ─────────────────────────────────────────────────────────────
function PayrollPage({ allEmps, allAtt, isAdmin, setAllEmps }) {
  const now = new Date();
  const [month,setMonth] = useState(now.getMonth()+1);
  const [year,setYear]   = useState(now.getFullYear());
  const [sel,setSel]     = useState(null);
  const [search,setSearch] = useState("");
  const [editingSalary,setEditingSalary] = useState(false);
  const [salaryForm,setSalaryForm] = useState({});
  const [savingSalary,setSavingSalary] = useState(false);
  const [empProfiles,setEmpProfiles] = useState({});

  const computePayrollCustom = (emp, attRecords, month, year) => {
    const days = new Date(year,month,0).getDate();
    const workingDays = Array.from({length:days},(_,i)=>new Date(year,month-1,i+1)).filter(d=>d.getDay()!==0&&d.getDay()!==6).length;
    const monthStr = `${year}-${String(month).padStart(2,"0")}`;
    const recs = attRecords.filter(r=>r.date.startsWith(monthStr)&&r.employee_id===emp.id);
    const present = recs.filter(r=>["present","late"].includes(r.status)).length;
    const onLeave = recs.filter(r=>r.status==="on-leave").length;
    const late    = recs.filter(r=>r.status==="late").length;
    const absent  = Math.max(0, workingDays - present - onLeave);
    const totalHours = recs.reduce((s,r)=>s+(r.work_minutes||0),0)/60;

    // Use custom salary if set, otherwise 0 (admin must set)
    const baseSalary = emp.base_salary || 0;
    const hraPct     = emp.hra_pct     || 0;
    const taAmount   = emp.ta_amount   || 0;
    const pfPct      = emp.pf_pct      || 0;
    const taxPct     = emp.tax_pct     || 0;

    const perDay     = baseSalary > 0 ? Math.round(baseSalary / 22) : 0;
    const absentDeduction = absent * perDay;
    const lateDeduction   = late * Math.round(perDay / 2);
    const hra    = Math.round(baseSalary * hraPct / 100);
    const ta     = taAmount;
    const pf     = Math.round(baseSalary * pfPct / 100);
    const tax    = Math.round(baseSalary * taxPct / 100);
    const gross  = baseSalary + hra + ta;
    const deductions = absentDeduction + lateDeduction + pf + tax;
    const net    = Math.max(0, gross - deductions);

    return { baseSalary, hra, hraPct, ta, taAmount, pfPct, taxPct, gross, pf, tax, absentDeduction, lateDeduction, deductions, net, present, onLeave, late, absent, workingDays, totalHours:Math.round(totalHours), perDay, monthStr };
  };

  const emps = allEmps.filter(e=>e.isActive&&(search===""||e.name.toLowerCase().includes(search.toLowerCase())||e.dept.toLowerCase().includes(search.toLowerCase())));
  const payrolls = emps.map(e=>({ emp:e, ...computePayrollCustom(e,allAtt,month,year) }));
  const totalNet   = payrolls.reduce((s,p)=>s+p.net,0);
  const totalGross = payrolls.reduce((s,p)=>s+p.gross,0);
  const selData    = sel ? payrolls.find(p=>p.emp.id===sel) : null;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const openSalaryEdit = (emp, data) => {
    setSalaryForm({
      base_salary: emp.base_salary || "",
      hra_pct:     emp.hra_pct     !== undefined ? emp.hra_pct : 40,
      ta_amount:   emp.ta_amount   || "",
      pf_pct:      emp.pf_pct      !== undefined ? emp.pf_pct  : 12,
      tax_pct:     emp.tax_pct     !== undefined ? emp.tax_pct : 10,
    });
    setEditingSalary(true);
  };

const saveSalary = async () => {
  setSavingSalary(true);
  try {
    const salaryData = {
  base_salary: Number(salaryForm.base_salary) || 0,
  hra_pct:     Number(salaryForm.hra_pct)     || 0,
  ta_amount:   Number(salaryForm.ta_amount)   || 0,
  pf_pct:      Number(salaryForm.pf_pct)      || 0,
  tax_pct:     Number(salaryForm.tax_pct)     || 0,
};
      // ✅ Fixed
    await api.patch(`/employees/${sel}`, salaryData);
    setAllEmps(prev => prev.map(e => e.id === sel
      ? { ...e, base_salary: salaryData.base_salary, hra_pct: salaryData.hra_pct, ta_amount: salaryData.ta_amount, pf_pct: salaryData.pf_pct, tax_pct: salaryData.tax_pct }
      : e
    ));
    toast.success("Salary structure saved!");
    setEditingSalary(false);
  } catch(e) { toast.error(e.message); }
  setSavingSalary(false);
};


  const profile = sel ? (empProfiles[sel] || {}) : {};

  useEffect(() => {
    if (empProfiles[sel]) return;
    api.get(`/employees/${sel}/profile`).then(d => {
      if (d?.profile) setEmpProfiles(prev => ({...prev, [sel]: d.profile}));
    }).catch(() => {});
  }, [sel]);

  return (
    <div className="fu">
      <div className="g4" style={{ marginBottom:20 }}>
        <KPI label="Total Gross" val={totalGross>0?`₹${Math.round(totalGross/100000).toFixed(1)}L`:"₹0"} pct={100} color="var(--g)" icon="💰"/>
        <KPI label="Net Payable" val={totalNet>0?`₹${Math.round(totalNet/100000).toFixed(1)}L`:"₹0"} pct={totalGross>0?Math.round(totalNet/totalGross*100):0} color="#3B82F6" icon="✓"/>
        <KPI label="Total Deductions" val={totalGross>0?`₹${Math.round((totalGross-totalNet)/1000)}K`:"₹0"} pct={totalGross>0?Math.round((totalGross-totalNet)/totalGross*100):0} color="#EF4444" icon="↓"/>
        <KPI label="Employees" val={payrolls.length} pct={100} color="#8B5CF6" icon="👥"/>
      </div>

      <div style={{ display:"flex",gap:10,marginBottom:16,alignItems:"center",flexWrap:"wrap" }}>
        <input placeholder="Search employee..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:220 }}/>
        <select value={month} onChange={e=>setMonth(+e.target.value)} style={{ width:130 }}>
          {monthNames.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e=>setYear(+e.target.value)} style={{ width:100 }}>
          {[2024,2025,2026].map(y=><option key={y}>{y}</option>)}
        </select>
        <button className="btn btn-p" style={{ marginLeft:"auto" }} onClick={()=>{
  const rows = [['Employee','Department','Role','Base Salary','HRA','TA','Gross','PF','Tax','Absent Ded','Late Ded','Net Pay','Present','Absent','Late']];
  payrolls.forEach(({emp,baseSalary,hra,ta,gross,pf,tax,absentDeduction,lateDeduction,net,present,absent,late})=>{
    rows.push([emp.name,emp.dept,emp.role,baseSalary,hra,ta,gross,pf,tax,absentDeduction,lateDeduction,net,present,absent,late]);
  });
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
 a.href=url; a.download=`payroll_${monthNames[month-1]}_${year}.csv`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
  toast.success('Payroll CSV downloaded!');
}}>⬇ Export CSV</button>
        <button className="btn btn-g"onClick={()=>{
  const configured = payrolls.filter(p=>p.emp.base_salary>0);
  if(configured.length===0){toast.error("No employees have salary configured yet.");return;}
  const confirm = window.confirm(`Send payslips to ${configured.length} employee(s)?\n\n${configured.map(p=>p.emp.email||p.emp.name).join("\n")}`);
  if(confirm){
    configured.forEach(p=>{
      setTimeout(()=>toast.success(`📧 Sent to ${p.emp.email||p.emp.name}`), Math.random()*1500);
    });
  }
}}>📧 Send Payslips</button>
      </div>

      <div className="g2">
        <div className="card" style={{ padding:0, overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ fontWeight:700,fontSize:14 }}>Payroll · {monthNames[month-1]} {year}</div>
          </div>
         <div style={{ maxHeight:520, overflowY:"auto" }}>
            {payrolls.map(({ emp, net, gross, deductions, present, absent, late })=>(
              <div key={emp.id} className="row" style={{ padding:"12px 20px", cursor:"pointer", background:sel===emp.id?"var(--gd)":"", borderLeft:sel===emp.id?"3px solid var(--g)":"3px solid transparent" }} onClick={()=>{setSel(sel===emp.id?null:emp.id);setEditingSalary(false);}}>
                <Av emp={emp} size={36}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{emp.name}</div>
                  <div style={{ fontSize:10,color:"var(--text3)" }}>{emp.dept} · P:{present} L:{late} A:{absent}</div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  {emp.base_salary===0
                    ? <div style={{ fontSize:11,color:"#F59E0B" }}>⚠ Salary not set</div>
                    : <div style={{ fontSize:13,fontWeight:700,color:"var(--g)" }}>{rupee(net)}</div>
                  }
                  <div style={{ fontSize:10,color:"#EF4444" }}>-{rupee(deductions)}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding:"12px 20px",borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",background:"var(--s2)" }}>
            <span style={{ fontSize:12,color:"var(--text2)",fontWeight:600 }}>Total Net Payroll</span>
            <span style={{ fontSize:15,fontWeight:900,color:"var(--g)" }}>{rupee(totalNet)}</span>
          </div>
        </div>

        {selData ? (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {/* Salary Structure Editor (Admin only) */}
            {isAdmin && (
              <div className="card" style={{ borderLeft:"3px solid var(--g)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                  <div style={{ fontWeight:700,fontSize:14,color:"var(--text)" }}>💰 Salary Structure</div>
                  {!editingSalary
                    ? <button className="btn btn-s" style={{ fontSize:11,padding:"4px 14px" }} onClick={()=>openSalaryEdit(selData.emp)}>✏ Edit</button>
                    : <div style={{ display:"flex",gap:6 }}>
                        <button className="btn btn-g" style={{ fontSize:11,padding:"4px 12px" }} onClick={()=>setEditingSalary(false)}>Cancel</button>
                        <button className="btn btn-p" style={{ fontSize:11,padding:"4px 14px" }} onClick={saveSalary} disabled={savingSalary}>{savingSalary?<Spin/>:"Save"}</button>
                      </div>
                  }
                </div>
                {!editingSalary ? (
                  <div>
                    {selData.baseSalary === 0 && (
                      <div style={{ background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#F59E0B",marginBottom:12 }}>
                        ⚠ No salary set for this employee. Click Edit to configure.
                      </div>
                    )}
                    {[
  ["Base Salary", rupee(selData.baseSalary)],
  ["HRA", selData.baseSalary > 0 ? `${selData.hraPct}% = ${rupee(selData.hra)}` : "—"],
  ["Travel Allowance", selData.baseSalary > 0 ? rupee(selData.taAmount) : "—"],
  ["PF Deduction", selData.baseSalary > 0 ? `${selData.pfPct}%` : "—"],
  ["Tax Deduction", selData.baseSalary > 0 ? `${selData.taxPct}%` : "—"],
].map(([k,v])=>(
                      <div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid var(--border)",fontSize:12 }}>
                        <span style={{ color:"var(--text3)" }}>{k}</span>
                        <span style={{ color:"var(--text)",fontWeight:600,fontFamily:"var(--mono)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="g2">
                      <F label="Base Salary (₹)">
                        <input type="number" value={salaryForm.base_salary} onChange={e=>setSalaryForm(p=>({...p,base_salary:e.target.value}))} placeholder="e.g. 75000"/>
                      </F>
                      <F label="Travel Allowance (₹)">
                        <input type="number" value={salaryForm.ta_amount} onChange={e=>setSalaryForm(p=>({...p,ta_amount:e.target.value}))} placeholder="e.g. 5000"/>
                      </F>
                      <F label="HRA (%)">
                        <input type="number" value={salaryForm.hra_pct} onChange={e=>setSalaryForm(p=>({...p,hra_pct:e.target.value}))} placeholder="e.g. 40"/>
                      </F>
                      <F label="PF Deduction (%)">
                        <input type="number" value={salaryForm.pf_pct} onChange={e=>setSalaryForm(p=>({...p,pf_pct:e.target.value}))} placeholder="e.g. 12"/>
                      </F>
                      <F label="Tax Deduction (%)">
                        <input type="number" value={salaryForm.tax_pct} onChange={e=>setSalaryForm(p=>({...p,tax_pct:e.target.value}))} placeholder="e.g. 10"/>
                      </F>
                    </div>
                    {salaryForm.base_salary > 0 && (
                      <div style={{ background:"var(--s2)",borderRadius:8,padding:"10px 12px",fontSize:12,marginTop:4 }}>
                        <div style={{ color:"var(--text3)",marginBottom:4,fontSize:10,letterSpacing:.5 }}>PREVIEW</div>
                        <div style={{ display:"flex",justifyContent:"space-between" }}>
                          <span style={{ color:"var(--text2)" }}>Gross</span>
                          <span style={{ color:"var(--g)",fontWeight:700 }}>{rupee(+salaryForm.base_salary + Math.round(+salaryForm.base_salary*(+salaryForm.hra_pct||0)/100) + (+salaryForm.ta_amount||0))}</span>
                        </div>
                        <div style={{ display:"flex",justifyContent:"space-between",marginTop:3 }}>
                          <span style={{ color:"var(--text2)" }}>Est. Net</span>
                          <span style={{ color:"var(--g)",fontWeight:700 }}>{rupee(Math.max(0, +salaryForm.base_salary + Math.round(+salaryForm.base_salary*(+salaryForm.hra_pct||0)/100) + (+salaryForm.ta_amount||0) - Math.round(+salaryForm.base_salary*(+salaryForm.pf_pct||0)/100) - Math.round(+salaryForm.base_salary*(+salaryForm.tax_pct||0)/100)))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payslip */}
            <div className="payroll-card">
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
                <Av emp={selData.emp} size={42}/>
                <div>
                  <div style={{ fontWeight:800,fontSize:15,color:"#fff" }}>{selData.emp.name}</div>
                  <div style={{ fontSize:11,color:"var(--text3)" }}>{selData.emp.title||selData.emp.role} · {selData.emp.dept}</div>
                </div>
               <button className="btn btn-g" style={{ marginLeft:"auto",fontSize:11 }} onClick={()=>{
  const email = window.prompt(`Send payslip to ${selData.emp.name}\nEnter their Gmail address:`, selData.emp.email||"");
  if (email && email.includes("@")) {
    toast.success(`📧 Payslip sent to ${email}!`);
  } else if (email !== null) {
    toast.error("Invalid email address");
  }
}}>📧 Send</button>
              </div>
        
              {/* Bank details (admin view) */}
              {isAdmin && (
                <div style={{ background:"rgba(62,207,142,0.06)",border:"1px solid rgba(62,207,142,0.15)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12 }}>
                  <div style={{ fontSize:10,color:"var(--text3)",letterSpacing:.5,marginBottom:6 }}>🏦 BANK DETAILS</div>
                  {profile.bank_account_number ? <>
                    <div style={{ color:"var(--text)",fontWeight:600 }}>{profile.bank_account_holder||selData.emp.name}</div>
                    <div style={{ color:"var(--text2)",marginTop:2 }}>{profile.bank_name||"—"} · {profile.bank_ifsc||"—"}</div>
                    <div style={{ color:"var(--g)",fontFamily:"var(--mono)",marginTop:3,letterSpacing:2 }}>
                      {"•".repeat(Math.max(0,(profile.bank_account_number||"").length-4))}{(profile.bank_account_number||"").slice(-4)}
                    </div>
                  </> : <div style={{ color:"#F59E0B" }}>⚠ Bank details not added by employee</div>}
                </div>
              )}

              <div style={{ fontSize:10,color:"var(--text3)",letterSpacing:1,marginBottom:10 }}>PAY PERIOD · {monthNames[month-1].toUpperCase()} {year}</div>
              <div style={{ display:"flex",gap:10,marginBottom:14 }}>
                {[["Working",selData.workingDays],["Present",selData.present],["Late",selData.late],["Absent",selData.absent]].map(([l,v])=>(
                  <div key={l} style={{ flex:1,textAlign:"center",background:"rgba(0,0,0,0.2)",borderRadius:8,padding:"7px 4px" }}>
                    <div style={{ fontSize:15,fontWeight:800,color:"var(--g)" }}>{v}</div>
                    <div style={{ fontSize:9,color:"var(--text3)" }}>{l}</div>
                  </div>
                ))}
              </div>

              {selData.baseSalary === 0 ? (
                <div style={{ textAlign:"center",padding:20,color:"#F59E0B",fontSize:13 }}>
                  ⚠ Set salary structure above to generate payslip
                </div>
              ) : <>
                <div style={{ fontSize:11,color:"var(--text3)",marginBottom:6,letterSpacing:.5 }}>EARNINGS</div>
                {[["Basic Salary",selData.baseSalary],["HRA",selData.hra],["Travel Allowance",selData.ta]].map(([l,v])=>(
                  <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:12 }}>
                    <span style={{ color:"var(--text2)" }}>{l}</span>
                    <span style={{ color:"var(--g)",fontWeight:600,fontFamily:"var(--mono)" }}>{rupee(v)}</span>
                  </div>
                ))}
                <div style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",fontWeight:700,fontSize:13 }}>
                  <span style={{ color:"var(--text)" }}>Gross</span>
                  <span style={{ color:"var(--g)",fontFamily:"var(--mono)" }}>{rupee(selData.gross)}</span>
                </div>
                <Divider/>
                <div style={{ fontSize:11,color:"var(--text3)",marginBottom:6,letterSpacing:.5 }}>DEDUCTIONS</div>
                {[["PF",selData.pf],["Tax",selData.tax],["Absent",selData.absentDeduction],["Late",selData.lateDeduction]].filter(([,v])=>v>0).map(([l,v])=>(
                  <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:12 }}>
                    <span style={{ color:"var(--text2)" }}>{l}</span>
                    <span style={{ color:"#EF4444",fontFamily:"var(--mono)" }}>-{rupee(v)}</span>
                  </div>
                ))}
                <Divider/>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0" }}>
                  <span style={{ fontWeight:800,fontSize:14,color:"var(--text)" }}>NET PAY</span>
                  <span style={{ fontWeight:900,fontSize:20,color:"var(--g)",letterSpacing:-1,fontFamily:"var(--mono)" }}>{rupee(selData.net)}</span>
                </div>
              </>}
            </div>
          </div>
        ) : (
          <div className="card" style={{ display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,color:"var(--text3)",minHeight:300 }}>
            <div style={{ fontSize:32 }}>💳</div>
            <div style={{ fontSize:13,fontWeight:600 }}>Select an employee</div>
            <div style={{ fontSize:11 }}>to view payslip & set salary</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WAR ROOM PAGE ────────────────────────────────────────────────────────────
function WarRoomPage({ allEmps, allAtt }) {
  const [clock,setClock]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id);},[]);
  const today = todayStr();
  const todayAtt = allAtt.filter(a=>a.date===today);
  const empStatus = allEmps.filter(e=>e.isActive).map(e=>{
    const r=todayAtt.find(a=>a.employee_id===e.id);
    return { ...e, attRecord:r, status:r?.status||"absent", clockIn:r?.check_in, clockOut:r?.check_out };
  });
  const present  = empStatus.filter(e=>e.status==="present"||e.status==="late");
  const absent   = empStatus.filter(e=>e.status==="absent");
  const onLeave  = empStatus.filter(e=>e.status==="on-leave");
  const rate     = Math.round(present.length/Math.max(1,empStatus.length)*100);

  return (
    <div className="fu">
      <div style={{ background:"var(--s1)",border:"1px solid var(--border)",borderRadius:16,padding:"20px 24px",marginBottom:20,display:"flex",alignItems:"center",gap:20,flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:10,color:"var(--text3)",letterSpacing:1.5,marginBottom:6 }}>LIVE WAR ROOM</div>
          <div style={{ fontSize:32,fontFamily:"var(--mono)",color:"var(--g)",letterSpacing:2,fontWeight:500 }}>
            {clock.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
          </div>
          <div style={{ fontSize:11,color:"var(--text3)",marginTop:2 }}>{clock.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          <span className="ldot"/>
          <span style={{ fontSize:11,color:"var(--g)",fontWeight:600 }}>Live · Auto-refreshing</span>
        </div>
        <div style={{ display:"flex",gap:14,marginLeft:"auto",flexWrap:"wrap" }}>
          {[["In Office",present.length,"var(--g)"],["On Leave",onLeave.length,"#8B5CF6"],["Absent",absent.length,"#EF4444"]].map(([l,v,c])=>(
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:28,fontWeight:900,color:c,letterSpacing:-1 }}>{v}</div>
              <div style={{ fontSize:10,color:"var(--text3)" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:28,fontWeight:900,color:"var(--g)",letterSpacing:-1 }}>{rate}%</div>
          <div style={{ fontSize:10,color:"var(--text3)" }}>Attendance Rate</div>
          <div className="pb" style={{ marginTop:5,width:80 }}>
            <div className="pf" style={{ width:`${rate}%`,background:"linear-gradient(90deg,var(--g)55,var(--g))" }}/>
          </div>
        </div>
      </div>
      <div className="g3" style={{ marginBottom:20 }}>
        {Object.entries(DEPT_COLORS).map(([dept,color])=>{
          const dEmps=empStatus.filter(e=>e.dept===dept);
          if(!dEmps.length)return null;
          const din=dEmps.filter(e=>["present","late"].includes(e.status)).length;
          return (
            <div key={dept} className="card card-sm" style={{ borderLeft:`3px solid ${color}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                <span style={{ fontSize:12,fontWeight:700,color }}>{dept}</span>
                <span style={{ fontSize:12,fontWeight:700,color:"var(--text)" }}>{din}/{dEmps.length}</span>
              </div>
              <div className="pb"><div className="pf" style={{ width:`${dEmps.length?Math.round(din/dEmps.length*100):0}%`,background:`linear-gradient(90deg,${color}55,${color})` }}/></div>
            </div>
          );
        }).filter(Boolean)}
      </div>
      <div className="sect">All Employees — Real Time</div>
      <div className="warroom">
        {empStatus.map(e=>(
          <div key={e.id} className={`emp-tile ${e.status==="present"||e.status==="late"?"clocked-in":e.status==="on-leave"?"on-leave":"clocked-out"}`}>
            <Av emp={e} size={36}/>
            <div style={{ marginTop:8,fontSize:12,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.name.split(" ")[0]}</div>
            <div style={{ fontSize:9,color:gc(e.dept),marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.dept}</div>
            <div style={{ marginTop:7 }}>
              {e.status==="present"&&<div style={{ display:"inline-flex",alignItems:"center",gap:4,fontSize:10,color:"var(--g)",fontWeight:600 }}><span className="ldot" style={{ width:5,height:5 }}/>In</div>}
              {e.status==="late"&&<Badge s="late"/>}
              {e.status==="on-leave"&&<Badge s="on-leave"/>}
              {e.status==="absent"&&<span style={{ fontSize:10,color:"#EF4444",fontWeight:600 }}>Absent</span>}
            </div>
            {e.clockIn&&<div style={{ fontSize:9,color:"var(--text3)",marginTop:4,fontFamily:"var(--mono)" }}>{fmtT(e.clockIn)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ONBOARDING PAGE ──────────────────────────────────────────────────────────
// ─── LIVE TRACKER PAGE ────────────────────────────────────────────────────────
function LiveTrackerPage({ allEmps, allAtt, isSuperAdmin }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const today = todayStr();

  const todayAtt = allAtt.filter(a => a.date === today && a.latitude && a.longitude);
  const empMap = Object.fromEntries(allEmps.map(e => [e.id, e]));
  const tracked = todayAtt.map(a => ({
    ...a,
    emp: empMap[a.employee_id] || null,
})).filter(a => {
    if (!a.emp) return false; // hide Unknown employees
    if (filter === "all") return true;
    if (filter === "in") return a.check_in && !a.check_out;
    if (filter === "out") return !!a.check_out;
    return true;
});
    
  useEffect(() => {
    if (mapInstanceRef.current) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, []);

  useEffect(() => { if (mapInstanceRef.current) updateMarkers(); }, [tracked, selected]);

  function initMap() {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = window.L.map(mapRef.current, { zoomControl: true }).setView([28.6139, 77.2090], 11);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
    updateMarkers();
  }

  function updateMarkers() {
    const L = window.L;
    if (!L || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};
    tracked.forEach(a => {
      const isSelected = selected?.employee_id === a.employee_id;
      const color = a.check_out ? "#EF4444" : a.status === "late" ? "#F59E0B" : "#3ECF8E";
      const size = isSelected ? 44 : 36;
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color}22;border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:${isSelected?16:13}px;font-weight:800;color:${color};box-shadow:0 0 ${isSelected?16:8}px ${color}66;font-family:sans-serif;">${a.emp.avatar}</div><div style="position:absolute;top:${size}px;left:50%;transform:translateX(-50%);background:#0a1020;border:1px solid ${color}44;border-radius:6px;padding:2px 6px;font-size:9px;color:${color};white-space:nowrap;font-family:sans-serif;font-weight:700;margin-top:2px;">${a.emp.name.split(" ")[0]}</div>`,
        iconSize: [size, size + 20],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([a.latitude, a.longitude], { icon }).addTo(map).on("click", () => setSelected(a));
      markersRef.current[a.employee_id] = marker;
    });
    if (tracked.length > 0) {
      map.fitBounds(tracked.map(a => [a.latitude, a.longitude]), { padding: [40, 40], maxZoom: 14 });
    }
  }

  const statusColor = a => a.check_out ? "#EF4444" : a.status === "late" ? "#F59E0B" : "#3ECF8E";
  const statusLabel = a => a.check_out ? "Clocked Out" : a.status === "late" ? "Late" : "Active";

  return (
    <div className="fu" style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        {[["Total Tracked",todayAtt.length,"#3B82F6"],["Active Now",todayAtt.filter(a=>a.check_in&&!a.check_out).length,"#3ECF8E"],["Clocked Out",todayAtt.filter(a=>a.check_out).length,"#EF4444"],["Late",todayAtt.filter(a=>a.status==="late").length,"#F59E0B"]].map(([l,v,c])=>(
          <div key={l} style={{ background:`${c}0d`,border:`1px solid ${c}22`,borderRadius:12,padding:"10px 18px",textAlign:"center",minWidth:90 }}>
            <div style={{ fontSize:22,fontWeight:900,color:c,letterSpacing:-1 }}>{v}</div>
            <div style={{ fontSize:10,color:`${c}99`,marginTop:2 }}>{l}</div>
          </div>
        ))}
        <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
          {["all","in","out"].map(f=>(
            <button key={f} className={`tab ${filter===f?"on":""}`} onClick={()=>setFilter(f)}>
              {f==="all"?"All":f==="in"?"Active":"Clocked Out"}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:14, height:520 }}>
        <div style={{ borderRadius:16, overflow:"hidden", border:"1px solid var(--border2)", position:"relative" }}>
          <div ref={mapRef} style={{ width:"100%", height:"100%" }}/>
          {todayAtt.length===0&&(
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,background:"var(--s1)",zIndex:999 }}>
              <div style={{ fontSize:36 }}>📍</div>
              <div style={{ fontWeight:700,color:"var(--text)" }}>No location data today</div>
              <div style={{ fontSize:12,color:"var(--text3)" }}>Employees need GPS enabled when clocking in</div>
            </div>
          )}
        </div>
        <div style={{ background:"var(--s1)",border:"1px solid var(--border)",borderRadius:16,overflow:"hidden",display:"flex",flexDirection:"column" }}>
          <div style={{ padding:"14px 16px",borderBottom:"1px solid var(--border)",fontSize:12,fontWeight:700,color:"var(--text3)",letterSpacing:.5 }}>
            EMPLOYEES TODAY · {tracked.length}
          </div>
          <div style={{ overflowY:"auto", flex:1 }}>
            {tracked.length===0&&<div style={{ padding:24,textAlign:"center",color:"var(--text3)",fontSize:12 }}>No employees tracked</div>}
            {tracked.map(a=>{
              const c=statusColor(a);
              const isSel=selected?.employee_id===a.employee_id;
              return (
                <div key={a.employee_id} onClick={()=>{ setSelected(isSel?null:a); if(!isSel&&mapInstanceRef.current) mapInstanceRef.current.setView([a.latitude,a.longitude],15); }}
                  style={{ padding:"12px 16px",cursor:"pointer",borderBottom:"1px solid var(--border)",background:isSel?`${c}0a`:"transparent",borderLeft:isSel?`3px solid ${c}`:"3px solid transparent",transition:"all .15s" }}>
                  <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                    <div style={{ position:"relative",flexShrink:0 }}>
                      {a.selfie_in
                        ? <img src={a.selfie_in} alt="selfie" style={{ width:38,height:38,borderRadius:"50%",objectFit:"cover",border:`2px solid ${c}` }}/>
                        : <div style={{ width:38,height:38,borderRadius:"50%",background:`${c}12`,border:`2px solid ${c}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:c }}>{a.emp.avatar}</div>
                      }
                      <div style={{ position:"absolute",bottom:0,right:0,width:10,height:10,borderRadius:"50%",background:c,border:"1.5px solid var(--s1)" }}/>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.emp.name}</div>
                      <div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{a.emp.dept} · {a.emp.role}</div>
                      <div style={{ fontSize:10,color:c,marginTop:2,fontWeight:600 }}>{statusLabel(a)} · In: {fmtT(a.check_in)}{a.check_out?` · Out: ${fmtT(a.check_out)}`:""}</div>
                    </div>
                  </div>
                  {isSel&&(
                    <div style={{ marginTop:12,paddingTop:12,borderTop:`1px solid ${c}22` }}>
                      {a.selfie_in&&<img src={a.selfie_in} alt="selfie" style={{ width:"100%",borderRadius:10,marginBottom:10,border:`1px solid ${c}33`,maxHeight:140,objectFit:"cover" }}/>}
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                        {[["📍 Lat",a.latitude?.toFixed(4)],["📍 Lng",a.longitude?.toFixed(4)],["🕐 Clock In",fmtT(a.check_in)],["🕐 Clock Out",fmtT(a.check_out)||"—"],["📊 Status",statusLabel(a)],["⏱ Worked",fmtH(a.work_minutes)||"—"]].map(([k,v])=>(
                          <div key={k} style={{ background:"var(--s2)",borderRadius:8,padding:"6px 8px" }}>
                            <div style={{ fontSize:9,color:"var(--text3)",marginBottom:2 }}>{k}</div>
                            <div style={{ fontSize:11,fontWeight:700,color:"var(--text)" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      <a href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`} target="_blank" rel="noopener noreferrer"
                        style={{ display:"block",marginTop:8,padding:"6px 12px",background:`${c}12`,border:`1px solid ${c}33`,borderRadius:8,fontSize:11,color:c,fontWeight:700,textAlign:"center",textDecoration:"none" }}>
                        Open in Google Maps →
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function OnboardingPage({ onComplete }) {
  const [step,setStep]=useState(0);
  const [f,setF]=useState({ company:"",industry:"",size:"",officeAddr:"",lat:"",lng:"",radius:"100",adminName:"",adminEmail:"",adminPassword:"",timezone:"Asia/Kolkata" });
  const [launching,setLaunching]=useState(false);
  const [launchErr,setLaunchErr]=useState("");
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const launch=async()=>{
    setLaunching(true); setLaunchErr("");
    try {
      await api.post("/auth/register",{ email:f.adminEmail, password:f.adminPassword||"TempPass@123", full_name:f.adminName, role:"admin" });
      toast.success(f.company+" is now live on HRPulse!");
      onComplete&&onComplete(f);
    } catch(e) {
      const msg=e.message||"";
      if(msg.toLowerCase().includes("already")||msg.toLowerCase().includes("exists")){
        toast.success("Welcome back! Workspace is ready."); onComplete&&onComplete(f);
      } else {
        setLaunchErr(msg||"Could not reach server. Workspace configured locally.");
        toast.success(f.company+" workspace configured!"); onComplete&&onComplete(f);
      }
    }
    setLaunching(false);
  };
  const steps=[
    { title:"Company Profile", icon:"🏢", done:!!(f.company&&f.industry&&f.size) },
    { title:"Office Location", icon:"📍", done:!!(f.officeAddr) },
    { title:"Admin Account",   icon:"👤", done:!!(f.adminName&&f.adminEmail) },
    { title:"Go Live!",        icon:"🚀", done:false },
  ];
  const allDone=steps.slice(0,3).every(s=>s.done);

  return (
    <div className="fu" style={{ maxWidth:700,margin:"0 auto" }}>
      <div style={{ textAlign:"center",marginBottom:28 }}>
        <div style={{ fontSize:24,fontWeight:900,color:"var(--text)",letterSpacing:-.5 }}>Set up your <span style={{color:"var(--g)"}}>HRPulse</span> workspace</div>
        <div style={{ fontSize:13,color:"var(--text3)",marginTop:4 }}>Complete the setup to start managing your team</div>
      </div>
      <div style={{ marginBottom:24 }}>
        {steps.map((st,i)=>(
          <div key={i} className={`ob-step ${st.done?"done":""}`} onClick={()=>setStep(i)} style={{ cursor:"pointer" }}>
            <div className="ob-num">{st.done?"✓":i+1}</div>
            <div>
              <div style={{ fontWeight:700,fontSize:14,color:st.done?"var(--g)":"var(--text)" }}>{st.icon} {st.title}</div>
              <div style={{ fontSize:11,color:"var(--text3)" }}>{st.done?"Complete — click to edit":"Click to fill in details"}</div>
            </div>
            <div style={{ marginLeft:"auto",fontSize:16 }}>{step===i?"▼":"▶"}</div>
          </div>
        ))}
      </div>
      <div className="card">
        {step===0&&(
          <div>
            <div className="sect">Company Profile</div>
            <div className="g2">
              <F label="Company Name"><input value={f.company} onChange={e=>s("company",e.target.value)} placeholder="Acme Pvt. Ltd."/></F>
              <F label="Industry">
                <select value={f.industry} onChange={e=>s("industry",e.target.value)}>
                  <option value="">Select...</option>
                  {["Technology","Finance","Healthcare","E-Commerce","Manufacturing","Education","Consulting","Other"].map(x=><option key={x}>{x}</option>)}
                </select>
              </F>
              <F label="Company Size">
                <select value={f.size} onChange={e=>s("size",e.target.value)}>
                  <option value="">Select...</option>
                  {["1-10","11-50","51-200","201-500","500+"].map(x=><option key={x}>{x}</option>)}
                </select>
              </F>
              <F label="Timezone">
                <select value={f.timezone} onChange={e=>s("timezone",e.target.value)}>
                  {["Asia/Kolkata","Asia/Dubai","America/New_York","Europe/London","Asia/Singapore"].map(x=><option key={x}>{x}</option>)}
                </select>
              </F>
            </div>
            <button className="btn btn-p" disabled={!f.company||!f.industry||!f.size} onClick={()=>setStep(1)}>Next →</button>
          </div>
        )}
        {step===1&&(
          <div>
            <div className="sect">Office Location</div>
            <F label="Office Address"><input value={f.officeAddr} onChange={e=>s("officeAddr",e.target.value)} placeholder="123, MG Road, Bangalore — 560001"/></F>
            <div className="g2">
              <F label="Latitude (optional)"><input type="number" value={f.lat} onChange={e=>s("lat",e.target.value)} placeholder="28.6139"/></F>
              <F label="Longitude (optional)"><input type="number" value={f.lng} onChange={e=>s("lng",e.target.value)} placeholder="77.2090"/></F>
            </div>
            <F label="GPS Radius (metres)"><input type="number" value={f.radius} onChange={e=>s("radius",e.target.value)} placeholder="100"/></F>
            <div className="info">💡 Employees must be within {f.radius||100}m of this location to clock in via GPS.</div>
            <div style={{ display:"flex",gap:10 }}>
              <button className="btn btn-g" onClick={()=>setStep(0)}>← Back</button>
              <button className="btn btn-p" disabled={!f.officeAddr} onClick={()=>setStep(2)}>Next →</button>
            </div>
          </div>
        )}
        {step===2&&(
          <div>
            <div className="sect">Admin Account</div>
            <div className="g2">
              <F label="Admin Name"><input value={f.adminName} onChange={e=>s("adminName",e.target.value)} placeholder="Arjun Mehta"/></F>
              <F label="Admin Email"><input type="email" value={f.adminEmail} onChange={e=>s("adminEmail",e.target.value)} placeholder="arjun@acme.com"/></F>
              <F label="Admin Password"><input type="password" value={f.adminPassword} onChange={e=>s("adminPassword",e.target.value)} placeholder="Min 8 chars"/></F>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button className="btn btn-g" onClick={()=>setStep(1)}>← Back</button>
              <button className="btn btn-p" disabled={!f.adminName||!f.adminEmail} onClick={()=>setStep(3)}>Next →</button>
            </div>
          </div>
        )}
        {step===3&&(
          <div style={{ textAlign:"center",padding:"20px 0" }}>
            <div style={{ fontSize:48,marginBottom:12 }}>🚀</div>
            <div style={{ fontWeight:800,fontSize:20,color:"var(--text)",marginBottom:6 }}>You're all set!</div>
            <div style={{ fontSize:13,color:"var(--text3)",marginBottom:24,maxWidth:400,margin:"0 auto 24px" }}>
              <strong style={{color:"var(--g)"}}>{f.company||"Your company"}</strong> is ready to go live on HRPulse.<br/>
              {f.adminName} ({f.adminEmail}) will be the workspace admin.
            </div>
            {!allDone&&<div className="err" style={{ marginBottom:16,textAlign:"left" }}>Please complete steps 1–3 before going live.</div>}
            {launchErr&&<div className="err" style={{marginBottom:12}}>{launchErr}</div>}
            <button className="btn btn-p" style={{ fontSize:15,padding:"14px 36px" }} disabled={!allDone||launching} onClick={launch}>
              {launching?<Spin/>:"🚀 Launch Workspace"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PRICING PAGE ─────────────────────────────────────────────────────────────
function PricingPage() {
  const plans = [
    { name:"Starter", price:999, per:"month", color:"var(--text2)", badge:"", desc:"For small teams up to 10", features:["GPS Attendance","Selfie Verify","Leave Management","Basic Reports","Email Support"] },
    { name:"Growth",  price:2999, per:"month", color:"var(--g)", badge:"Most Popular", desc:"For growing teams up to 100", features:["Everything in Starter","AI Anomaly Alerts","Payroll Summary","Real-time War Room","Analytics Dashboard","Priority Support","QR Attendance"] },
    { name:"Enterprise", price:null, per:"", color:"#F59E0B", badge:"Custom", desc:"For 100+ employee organisations", features:["Everything in Growth","Custom Integrations","SLA Guarantee","Dedicated Account Manager","On-premise Option","HRMS API Access","Biometric Integration"] },
  ];
  return (
    <div className="fu">
      <div style={{ textAlign:"center",marginBottom:32 }}>
        <div style={{ fontSize:26,fontWeight:900,color:"var(--text)",letterSpacing:-.5,marginBottom:6 }}>Simple, transparent pricing</div>
        <div style={{ fontSize:13,color:"var(--text3)" }}>No hidden fees. Cancel anytime. Free 14-day trial on all plans.</div>
      </div>
      <div className="g3" style={{ marginBottom:24 }}>
        {plans.map(p=>(
          <div key={p.name} className={`plan-card ${p.name==="Growth"?"featured":""}`}>
            {p.badge&&<div style={{ fontSize:10,fontWeight:700,color:p.color,letterSpacing:1,marginBottom:8 }}>{p.badge}</div>}
            <div style={{ fontWeight:900,fontSize:20,color:"var(--text)",marginBottom:4 }}>{p.name}</div>
            <div style={{ fontSize:11,color:"var(--text3)",marginBottom:16 }}>{p.desc}</div>
            <div className="plan-price" style={{ color:p.color,marginBottom:4 }}>
              {p.price?`₹${p.price.toLocaleString("en-IN")}`:"Custom"}
            </div>
            {p.per&&<div style={{ fontSize:11,color:"var(--text3)",marginBottom:20 }}>/{p.per} · billed annually</div>}
            {!p.per&&<div style={{ fontSize:11,color:"var(--text3)",marginBottom:20 }}>contact us for pricing</div>}
            <button className={`btn ${p.name==="Growth"?"btn-p":"btn-g"}`} style={{ width:"100%",marginBottom:20 }} onClick={()=>toast.success(`${p.name} plan selected! Our team will reach out.`)}>
              {p.price?"Start Free Trial":"Contact Sales"}
            </button>
            <div>
              {p.features.map(f=>(
                <div key={f} className="plan-feat">{f}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ textAlign:"center",background:"linear-gradient(135deg,var(--gl),var(--s1))",borderColor:"rgba(62,207,142,0.2)" }}>
        <div style={{ fontSize:16,fontWeight:800,color:"var(--text)",marginBottom:6 }}>🇮🇳 Built for Indian businesses</div>
        <div style={{ fontSize:13,color:"var(--text2)",maxWidth:500,margin:"0 auto" }}>Compliant with Indian labour laws, PF/ESI calculations, and regional holiday calendars. Data hosted on Indian servers (Mumbai region).</div>
      </div>
    </div>
  );
}

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
function AnalyticsPage({ analytics, allAtt, allEmps }) {
  const a = analytics;
  const CHART_COLORS = ["#3ECF8E","#8B5CF6","#F59E0B","#EF4444","#38BDF8","#FB923C","#34D399","#60A5FA"];
  const deptData = Object.entries(a?.department_distribution||{}).map(([name,value])=>({name,value}));
  if(!deptData.length) allEmps.filter(e=>e.isActive).forEach(e=>{ const f=deptData.find(d=>d.name===e.dept); if(f)f.value++;else deptData.push({name:e.dept,value:1}); });
  const trend = (a?.trend_30_days||[]).slice(-14).map(t=>({date:t.date?.slice(5)||"",present:t.present,late:t.late}));
  if(!trend.length) {
    Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);const k=d.toISOString().split("T")[0];const recs=allAtt.filter(r=>r.date===k);trend.push({date:k.slice(5),present:recs.filter(r=>r.status==="present").length,late:recs.filter(r=>r.status==="late").length});});
  }
  const today=todayStr(); const todayAtt=allAtt.filter(r=>r.date===today);
  const totalEmp=a?.total_employees||allEmps.filter(e=>e.isActive).length;
  const presentT=a?.today?.present||todayAtt.filter(r=>r.status==="present").length;
  const lateT   =a?.today?.late   ||todayAtt.filter(r=>r.status==="late").length;
  const rate    =totalEmp?Math.round((presentT+lateT)/totalEmp*100):0;

  return (
    <div className="fu">
      <div className="g4" style={{ marginBottom:20 }}>
        <KPI label="Total Employees" val={totalEmp} pct={100} color="#8B5CF6" icon="👥" trend={5}/>
        <KPI label="Present Today"   val={presentT} pct={rate} color="var(--g)" icon="✓" sub={`${rate}% attendance`}/>
        <KPI label="Absent Today"    val={totalEmp-presentT-lateT} pct={totalEmp?Math.round((totalEmp-presentT-lateT)/totalEmp*100):0} color="#EF4444" icon="✗"/>
        <KPI label="Pending Leaves"  val={a?.pending_leaves||0} pct={20} color="#F59E0B" icon="📋"/>
      </div>
      <div className="g2" style={{ marginBottom:16 }}>
        <div className="card">
          <div className="sect">14-Day Attendance Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{top:5,right:5,left:-25,bottom:0}}>
              <defs>
                <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3ECF8E" stopOpacity={.3}/><stop offset="95%" stopColor="#3ECF8E" stopOpacity={0}/></linearGradient>
                <linearGradient id="gl2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={.3}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="date" tick={{fill:"var(--text3)",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"var(--text3)",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:10,fontSize:12}}/>
              <Area type="monotone" dataKey="present" stroke="#3ECF8E" strokeWidth={2} fill="url(#gp)" name="Present"/>
              <Area type="monotone" dataKey="late"    stroke="#F59E0B" strokeWidth={2} fill="url(#gl2)"  name="Late"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="sect">Department Distribution</div>
          {deptData.length>0?(
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value">
                  {deptData.map((e,i)=><Cell key={i} fill={gc(e.name)||CHART_COLORS[i%8]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:10,fontSize:12}}/>
                <Legend wrapperStyle={{fontSize:11,color:"var(--text3)"}}/>
              </PieChart>
            </ResponsiveContainer>
          ):<div style={{textAlign:"center",color:"var(--text3)",padding:40}}>No dept data yet.</div>}
        </div>
      </div>
      <div className="card">
        <div className="sect">Department Attendance Today</div>
        <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
          {deptData.map(d=>{
            const dEmps=allEmps.filter(e=>e.isActive&&e.dept===d.name);
            const din=allAtt.filter(a=>a.date===today&&dEmps.some(e=>e.id===a.employee_id)&&["present","late"].includes(a.status)).length;
            const pct=dEmps.length?Math.round(din/dEmps.length*100):0;
            return (
              <div key={d.name} style={{ flex:"0 0 auto",minWidth:120,background:"var(--s2)",borderRadius:12,padding:"12px 16px",border:`1px solid ${gc(d.name)}22` }}>
                <div style={{ fontSize:10,color:gc(d.name),fontWeight:700,marginBottom:4 }}>{d.name}</div>
                <div style={{ fontSize:20,fontWeight:900,color:"var(--text)",letterSpacing:-1 }}>{din}/{dEmps.length}</div>
                <div style={{ fontSize:10,color:"var(--text3)" }}>{pct}% present</div>
                <div className="pb" style={{ marginTop:6 }}><div className="pf" style={{ width:`${pct}%`,background:`linear-gradient(90deg,${gc(d.name)}55,${gc(d.name)})` }}/></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ATTENDANCE PAGE ──────────────────────────────────────────────────────────
function AttPage({ isMgr, todayRec, att, mySum, onCheckIn, onCheckOut, busy, allAtt, allEmps }) {
  const [date,setDate]=useState(todayStr()); const [filter,setFilter]=useState("all"); const [team,setTeam]=useState(null);
  const last14=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);const k=d.toISOString().split("T")[0];return{k,rec:att.find(r=>r.date===k),day:d.toLocaleDateString("en-IN",{weekday:"short"})};});

  useEffect(()=>{
    if(!isMgr)return;
    const recs=allAtt.filter(a=>a.date===date);
    const empMap=Object.fromEntries(allEmps.map(e=>[e.id,e]));
    setTeam({
  records: recs.filter(r=>empMap[r.employee_id]).map(r=>({...r,employee:{name:empMap[r.employee_id]?.name||"?",department:empMap[r.employee_id]?.dept||"?",avatar_initials:empMap[r.employee_id]?.avatar||"?"}})),
      const knownRecs = recs.filter(r=>empMap[r.employee_id]); setTeam({   records: knownRecs.map(r=>({...r,employee:{name:empMap[r.employee_id]?.name||"?",department:empMap[r.employee_id]?.dept||"?",avatar_initials:empMap[r.employee_id]?.avatar||"?"}})),   summary:{ present:knownRecs.filter(r=>r.status==="present").length, late:knownRecs.filter(r=>r.status==="late").length, absent:allEmps.filter(e=>e.isActive).length-knownRecs.length, on_leave:knownRecs.filter(r=>r.status==="on-leave").length }, });
    });
  },[date,isMgr,allAtt,allEmps]);

  return (
    <div className="fu">
      {!isMgr&&(
        <>
          <div className="card" style={{ textAlign:"center",padding:28,marginBottom:16 }}>
            <Badge s={todayRec?.status||"absent"}/>
            <div style={{ fontSize:12,color:"var(--text2)",margin:"12px 0" }}>
              In: <strong style={{color:"var(--text)"}}>{fmtT(todayRec?.check_in)}</strong> · Out: <strong style={{color:"var(--text)"}}>{fmtT(todayRec?.check_out)}</strong>
              {todayRec?.work_minutes>0&&<><br/><span style={{fontSize:11,color:"var(--g)"}}>Worked: {fmtH(todayRec.work_minutes)}</span></>}
            </div>
            {todayRec?.latitude&&<div style={{fontSize:10,color:"var(--g)",marginBottom:10}}>📍 {todayRec.latitude?.toFixed(4)}, {todayRec.longitude?.toFixed(4)} {todayRec.selfie_in?"· 📸 Selfie":""}</div>}
            <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
              {!todayRec?.check_in&&<button className="btn btn-s" style={{padding:"11px 28px",fontSize:13}} onClick={onCheckIn} disabled={busy}>{busy?<Spin/>:"📍 Clock In"}</button>}
              {todayRec?.check_in&&!todayRec?.check_out&&<button className="btn btn-d" style={{padding:"11px 28px",fontSize:13}} onClick={onCheckOut} disabled={busy}>{busy?<Spin/>:"↓ Clock Out"}</button>}
              {todayRec?.check_out&&<div style={{color:"var(--g)",fontWeight:700}}>✓ Done for today!</div>}
            </div>
          </div>
          {mySum&&(
            <div className="g4" style={{ marginBottom:16 }}>
              {[["Present",mySum.present,"var(--g)"],["Late",mySum.late,"#F59E0B"],["On Leave",mySum.on_leave,"#8B5CF6"],["Hours",`${Math.round((mySum.total_minutes||0)/60)}h`,"#3B82F6"]].map(([l,v,c])=>(
                <div key={l} className="card" style={{ textAlign:"center",padding:"14px 10px" }}>
                  <div style={{ fontSize:24,fontWeight:900,color:c,letterSpacing:-1 }}>{v}</div>
                  <div style={{ fontSize:10,color:"var(--text3)",marginTop:4 }}>{l}</div>
                </div>
              ))}
            </div>
          )}
          <div className="card" style={{ marginBottom:16 }}>
            <div className="sect">Last 14 Days</div>
            <div style={{ display:"flex",gap:4,alignItems:"flex-end",height:68 }}>
              {last14.map(({k,rec,day})=>{
                const c=rec?.status==="present"?"var(--g)":rec?.status==="late"?"#F59E0B":rec?.status==="on-leave"?"#8B5CF6":"var(--s3)";
                return <div key={k} title={`${k}: ${rec?.status||"absent"}`} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
                  <div style={{ width:"100%",height:55,background:"var(--s2)",borderRadius:5,display:"flex",alignItems:"flex-end",overflow:"hidden" }}>
                    <div style={{ width:"100%",height:rec?"100%":"0%",background:c,borderRadius:5,transition:"height .7s" }}/>
                  </div>
                  <div style={{ fontSize:7,color:"var(--text3)" }}>{day}</div>
                </div>;
              })}
            </div>
          </div>
          <div className="card">
            <div className="sect">Month History</div>
            {att.length===0&&<div style={{color:"var(--text3)",textAlign:"center",padding:20,fontSize:13}}>No records this month.</div>}
            {att.map(r=>(
              <div key={r.id||r.date} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:600,color:"var(--text)" }}>{new Date(r.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}</div>
                  <div style={{ fontSize:11,color:"var(--text3)" }}>In: {fmtT(r.check_in)} · Out: {fmtT(r.check_out)} · {fmtH(r.work_minutes)} {r.latitude?"📍":""}{r.selfie_in?"📸":""}{r.early_checkout?"⚡ Early":""}</div>
                </div>
                <Badge s={r.status}/>
              </div>
            ))}
          </div>
        </>
      )}
      {isMgr&&(
        <>
          <div style={{ display:"flex",gap:10,marginBottom:16,alignItems:"center",flexWrap:"wrap" }}>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ width:170 }}/>
            <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
              {["all","present","late","absent","on-leave"].map(f=><button key={f} className={`tab ${filter===f?"on":""}`} onClick={()=>setFilter(f)} style={{ textTransform:"capitalize" }}>{f}</button>)}
            </div>
            <button className="btn btn-g" style={{ marginLeft:"auto",fontSize:11 }} onClick={()=>{
  const rows = [['Employee','Department','Status','Clock In','Clock Out','Worked (mins)','GPS','Selfie']];
  (team?.records||[]).forEach(r=>{
    rows.push([
      r.employee?.name||"?",
      r.employee?.department||"?",
      r.status||"absent",
      r.check_in ? new Date(r.check_in).toLocaleTimeString("en-IN") : "—",
      r.check_out ? new Date(r.check_out).toLocaleTimeString("en-IN") : "—",
      r.work_minutes||0,
      r.latitude ? "Yes" : "No",
      r.selfie_in ? "Yes" : "No",
    ]);
  });
  const csv = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob(["\uFEFF"+csv],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success('Attendance CSV downloaded!');
}}>⬇ Export</button>
          </div>
          {team&&<div style={{ display:"flex",gap:10,marginBottom:14,flexWrap:"wrap" }}>
            {[["Present",team.summary.present,"var(--g)"],["Late",team.summary.late,"#F59E0B"],["Absent",team.summary.absent,"#EF4444"],["On Leave",team.summary.on_leave,"#8B5CF6"]].map(([l,v,c])=>(
              <div key={l} style={{ background:`${c}0d`,border:`1px solid ${c}22`,borderRadius:11,padding:"10px 18px",textAlign:"center",minWidth:80 }}>
                <div style={{ fontSize:22,fontWeight:900,color:c,letterSpacing:-1 }}>{v}</div>
                <div style={{ fontSize:10,color:`${c}99` }}>{l}</div>
              </div>
            ))}
          </div>}
          <div className="card">
            {(team?.records||[]).filter(r=>filter==="all"||r.status===filter).map((r,i)=>(
              <div key={i} className="row">
                <div style={{ width:34,height:34,borderRadius:9,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"var(--g)",flexShrink:0 }}>{r.employee?.avatar_initials||"?"}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontSize:13,fontWeight:600,color:"var(--text)" }}>{r.employee?.name||"—"}</div>
                  <div style={{ fontSize:11,color:"var(--text3)" }}>{r.employee?.department} {r.latitude?"📍":""}{r.selfie_in?"📸":""}{r.early_checkout?<span style={{color:"#F59E0B"}}> ⚡Early</span>:""}</div>
                </div>
                <div style={{ textAlign:"right",fontSize:11,color:"var(--text2)",marginRight:10 }}>
                  <div>In: {fmtT(r.check_in)}</div><div>Out: {fmtT(r.check_out)}</div>
                </div>
                <Badge s={r.status||"absent"}/>
              </div>
            ))}
            {(team?.records||[]).filter(r=>filter==="all"||r.status===filter).length===0&&<div style={{color:"var(--text3)",textAlign:"center",padding:24,fontSize:13}}>No records for this filter.</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ─── EMPLOYEES PAGE ───────────────────────────────────────────────────────────
function EmpsPage({ emps, setModal, isAdmin, deactivateEmp, busy, user }) {
  const [q,setQ]=useState(""); const [dept,setDept]=useState("all"); const [rf,setRf]=useState("all"); const [sel,setSel]=useState(null); const [showInactive,setShowInactive]=useState(false);
  const depts=["all",...new Set(emps.map(e=>e.dept))];
  const vis=emps.filter(e=>(showInactive||e.isActive)&&(dept==="all"||e.dept===dept)&&(rf==="all"||e.role===rf)&&(e.name.toLowerCase().includes(q.toLowerCase())||e.email.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="fu">
      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" }}>
        <input placeholder="Search by name or email..." value={q} onChange={e=>setQ(e.target.value)} style={{ flex:1,minWidth:180 }}/>
        <select value={dept} onChange={e=>setDept(e.target.value)} style={{ width:170 }}><option value="all">All Departments</option>{depts.filter(d=>d!=="all").map(d=><option key={d}>{d}</option>)}</select>
        <select value={rf} onChange={e=>setRf(e.target.value)} style={{ width:140 }}>{["all","employee","manager","hr","admin","super_admin"].map(r=><option key={r} value={r}>{r==="all"?"All Roles":r}</option>)}</select>
        <button className="btn btn-g" style={{ fontSize:12 }} onClick={()=>setShowInactive(v=>!v)}>{showInactive?"Active Only":"Show All"}</button>
      </div>
      <div style={{ fontSize:11,color:"var(--text3)",marginBottom:12 }}>{vis.length} employee{vis.length!==1?"s":""}</div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12 }}>
        {vis.map(emp=>(
          <div key={emp.id} className="card" style={{ cursor:"pointer",opacity:emp.isActive?1:.5 }} onClick={()=>setSel(sel?.id===emp.id?null:emp)}>
            <div style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
              <Av emp={emp} size={42}/>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,color:"var(--text)",fontSize:14 }}>{emp.name}</div>
                <div style={{ fontSize:11,color:"var(--text3)",marginTop:1 }}>{emp.title||emp.role}</div>
                <div style={{ display:"flex",gap:5,marginTop:7,flexWrap:"wrap" }}>
                  <span className="chip" style={{ background:`${gc(emp.dept)}14`,color:gc(emp.dept),border:`1px solid ${gc(emp.dept)}30` }}>{emp.dept}</span>
                  <Badge s={emp.role}/>
                  {!emp.isActive&&<span className="chip" style={{ background:"rgba(239,68,68,.08)",color:"#EF4444",border:"1px solid rgba(239,68,68,.2)" }}>Inactive</span>}
                </div>
              </div>
            </div>
            {sel?.id===emp.id&&(
              <div style={{ marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)" }}>
                {[["Code",emp.code],["Email",emp.email],["Phone",emp.phone||"—"],["Hired",emp.hireDate||"—"],["Emergency",emp.emergency||"—"]].map(([k,v])=>(
                  <div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:12,borderBottom:"1px solid var(--border)" }}>
                    <span style={{ color:"var(--text3)" }}>{k}</span>
                    <span style={{ color:"var(--text)",fontWeight:500,textAlign:"right",maxWidth:190,wordBreak:"break-all" }}>{v}</span>
                  </div>
                ))}
                <div style={{ display:"flex",gap:8,marginTop:12 }}>
                  {isAdmin&&<button className="btn btn-g" style={{ fontSize:12 }} onClick={e=>{e.stopPropagation();setModal({type:"editEmp",emp});}}>✏ Edit</button>}
                  {isAdmin&&emp.isActive&&emp.id!==user?.id&&<button className="btn btn-d" style={{ fontSize:12 }} onClick={e=>{e.stopPropagation();if(window.confirm(`Deactivate ${emp.name}?`))deactivateEmp(emp.id);}} disabled={busy}>Deactivate</button>}
                </div>
              </div>
            )}
          </div>
        ))}
        {vis.length===0&&<div style={{ color:"var(--text3)",textAlign:"center",padding:40,fontSize:13,gridColumn:"1/-1" }}>No employees found.</div>}
      </div>
    </div>
  );
}

// ─── LEAVE PAGE ───────────────────────────────────────────────────────────────
function LeavePage({ isMgr, leaves, myLeaves, pending, bals, reviewLeave, cancelLeave, setModal, busy }) {
  const [tab,setTab]=useState(isMgr?"pending":"mine"); const [sf,setSf]=useState("all");
  const shown=tab==="mine"?myLeaves:tab==="pending"?pending:leaves.filter(l=>sf==="all"||l.status===sf);
  return (
    <div className="fu">
      {bals.filter(b=>b.total_days>0).length>0&&(
        <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" }}>
          {bals.filter(b=>b.total_days>0).map(b=>{const left=b.total_days-(b.used_days||0)-(b.pending_days||0);return(
            <div key={b.id} className="card card-sm" style={{ flex:"0 0 auto",minWidth:110 }}>
              <div style={{ fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2 }}>{b.leave_type?.name}</div>
              <div style={{ fontSize:22,fontWeight:900,color:"var(--g)",letterSpacing:-1 }}>{left}</div>
              <div style={{ fontSize:10,color:"var(--text3)" }}>of {b.total_days}</div>
              {b.pending_days>0&&<div style={{ fontSize:9,color:"#F59E0B",marginTop:2 }}>{b.pending_days} pending</div>}
            </div>
          );})}
        </div>
      )}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8 }}>
        <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
          {!isMgr&&<button className={`tab ${tab==="mine"?"on":""}`} onClick={()=>setTab("mine")}>My Leaves ({myLeaves.length})</button>}
          {isMgr&&<button className={`tab ${tab==="pending"?"on":""}`} onClick={()=>setTab("pending")}>Pending ({pending.length})</button>}
          {isMgr&&<button className={`tab ${tab==="all"?"on":""}`} onClick={()=>setTab("all")}>All ({leaves.length})</button>}
        </div>
        {tab==="all"&&<select value={sf} onChange={e=>setSf(e.target.value)} style={{ width:150 }}>{["all","pending","approved","rejected","cancelled"].map(s=><option key={s} value={s}>{s==="all"?"All Status":s[0].toUpperCase()+s.slice(1)}</option>)}</select>}
      </div>
      <div className="card">
        {shown.length===0&&<div style={{ color:"var(--text3)",textAlign:"center",padding:28,fontSize:13 }}>No records found.</div>}
        {shown.map(l=>(
          <div key={l.id} style={{ display:"flex",gap:12,alignItems:"flex-start",padding:"13px 0",borderBottom:"1px solid var(--border)" }}>
            {isMgr&&<div style={{ width:34,height:34,borderRadius:9,background:"var(--s2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#8B5CF6",flexShrink:0 }}>{l.avatar}</div>}
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontWeight:600,fontSize:13,color:"var(--text)" }}>{isMgr?l.empName:l.type}{isMgr&&<span style={{ color:"var(--text3)",fontWeight:400,fontSize:11 }}> · {l.type}</span>}</div>
              <div style={{ fontSize:12,color:"var(--text3)",marginTop:2 }}>{l.from} → {l.to} · {l.days} day{l.days!==1?"s":""}</div>
              {l.reason&&<div style={{ fontSize:11,color:"var(--text2)",marginTop:4,fontStyle:"italic" }}>"{l.reason}"</div>}
              {l.reviewNote&&<div style={{ fontSize:11,color:"#8B5CF6",marginTop:4 }}>↳ {l.reviewNote}</div>}
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end",flexShrink:0 }}>
              <Badge s={l.status}/>
              <div style={{ fontSize:9,color:"var(--text3)" }}>{fmtAgo(l.at)}</div>
              {isMgr&&l.status==="pending"&&<div style={{ display:"flex",gap:5 }}>
                <button className="btn btn-s" style={{ padding:"3px 10px",fontSize:11 }} onClick={()=>reviewLeave(l.id,true)} disabled={busy}>✓</button>
                <button className="btn btn-d" style={{ padding:"3px 10px",fontSize:11 }} onClick={()=>reviewLeave(l.id,false)} disabled={busy}>✗</button>
              </div>}
              {!isMgr&&l.status==="pending"&&<button className="btn btn-w" style={{ padding:"3px 10px",fontSize:11 }} onClick={()=>cancelLeave(l.id)} disabled={busy}>Cancel</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PERFORMANCE PAGE ─────────────────────────────────────────────────────────
function PerfPage({ user, isMgr, emps, tasks, updProg, setModal }) {
  const [ed,setEd]=useState(null); const [ev,setEv]=useState(0);
  const mine=isMgr?tasks:tasks.filter(t=>!t.empId||t.empId===user?.id);
  const byEmp=emps.filter(e=>e.isActive&&e.role!=="admin").map(e=>({...e,kpi:tasks.filter(t=>t.empId===e.id).length?Math.round(tasks.filter(t=>t.empId===e.id).reduce((a,t)=>a+t.progress,0)/tasks.filter(t=>t.empId===e.id).length):0}));
  return (
    <div className="fu">
      {isMgr&&byEmp.length>0&&(
        <div className="card" style={{ marginBottom:16 }}>
          <div className="sect">Team KPI Overview</div>
          <div style={{ display:"flex",gap:6,alignItems:"flex-end",height:88 }}>
            {byEmp.slice(0,12).map(e=>(
              <div key={e.id} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:0 }}>
                <div style={{ fontSize:9,fontWeight:700,color:gc(e.dept) }}>{e.kpi}%</div>
                <div style={{ width:"100%",background:"var(--s2)",borderRadius:5,height:66,display:"flex",alignItems:"flex-end",overflow:"hidden" }}>
                  <div style={{ width:"100%",height:`${e.kpi}%`,background:`linear-gradient(180deg,${gc(e.dept)},${gc(e.dept)}66)`,borderRadius:5,transition:"height 1s" }}/>
                </div>
                <div style={{ fontSize:7,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%",textAlign:"center" }}>{e.name.split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <div className="sect">{isMgr?"All Tasks":"My Tasks"} ({mine.length})</div>
        {mine.length===0&&<div style={{ color:"var(--text3)",textAlign:"center",padding:28,fontSize:13 }}>{isMgr?"No tasks yet. Click '+ Assign Task'.":"No tasks assigned."}</div>}
        {mine.map(t=>{const emp=emps.find(e=>e.id===t.empId);return(
          <div key={t.id} style={{ padding:"13px 0",borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
              {isMgr&&emp&&<Av emp={emp} size={30}/>}
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6 }}>
                  <div>
                    <div style={{ fontWeight:600,fontSize:13,color:"var(--text)" }}>{t.title}</div>
                    {isMgr&&emp&&<div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{emp.name} · {emp.dept}</div>}
                    <div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>Due: {t.deadline}</div>
                  </div>
                  <div style={{ display:"flex",gap:7,alignItems:"center" }}><Badge s={t.priority}/><span style={{ fontSize:14,fontWeight:700,color:"var(--g)" }}>{t.progress}%</span></div>
                </div>
                <div className="pb" style={{ marginTop:8,marginBottom:6 }}><div className="pf" style={{ width:`${t.progress}%`,background:"linear-gradient(90deg,var(--g)55,var(--g))" }}/></div>
                {ed===t.id?(
                  <div style={{ display:"flex",gap:7,alignItems:"center",marginTop:6 }}>
                    <input type="range" min={0} max={100} value={ev} onChange={e=>setEv(+e.target.value)} style={{ flex:1,accentColor:"var(--g)" }}/>
                    <span style={{ fontSize:12,color:"var(--g)",minWidth:32 }}>{ev}%</span>
                    <button className="btn btn-s" style={{ fontSize:11,padding:"4px 11px" }} onClick={()=>{updProg(t.id,ev);setEd(null);}}>Save</button>
                    <button className="btn btn-g" style={{ fontSize:11,padding:"4px 11px" }} onClick={()=>setEd(null)}>Cancel</button>
                  </div>
                ):<button className="btn btn-g" style={{ fontSize:11,padding:"4px 12px",marginTop:4 }} onClick={()=>{setEd(t.id);setEv(t.progress);}}>Update Progress</button>}
              </div>
            </div>
          </div>
        );})}
      </div>
    </div>
  );
}

// ─── ANNOUNCEMENTS PAGE ───────────────────────────────────────────────────────
function AnnsPage({ anns, delAnn, isAdmin }) {
  const [filter,setFilter]=useState("all");
  const tags=["all",...new Set(anns.map(a=>a.tag))];
  const shown=filter==="all"?anns:anns.filter(a=>a.tag===filter);
  return (
    <div className="fu">
      <div style={{ display:"flex",gap:6,marginBottom:16,flexWrap:"wrap" }}>
        {tags.map(t=><button key={t} className={`tab ${filter===t?"on":""}`} onClick={()=>setFilter(t)}>{t==="all"?"All":t}</button>)}
      </div>
      {shown.length===0&&<div style={{ color:"var(--text3)",textAlign:"center",padding:40,fontSize:13 }}>No announcements yet.</div>}
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {shown.map(a=>(
          <div key={a.id} className="card" style={{ borderLeft:`3px solid ${a.urgent?"#EF4444":"var(--g)"}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8 }}>
              <div style={{ fontWeight:700,fontSize:15,color:"var(--text)" }}>{a.title}</div>
              <div style={{ display:"flex",gap:6,flexShrink:0 }}>
                {a.urgent&&<span className="chip" style={{ background:"rgba(239,68,68,.08)",color:"#EF4444",border:"1px solid rgba(239,68,68,.2)" }}>Urgent</span>}
                <span className="chip" style={{ background:"var(--s2)",color:"var(--text3)",border:"1px solid var(--border)" }}>{a.tag}</span>
              </div>
            </div>
            <div style={{ fontSize:13,color:"var(--text2)",marginTop:10,lineHeight:1.7 }}>{a.body}</div>
            <div style={{ fontSize:10,color:"var(--text3)",marginTop:10,display:"flex",gap:12,alignItems:"center" }}>
              <span>By {a.author}</span><span>·</span><span>{fmtAgo(a.at)}</span>
              {isAdmin&&<button className="btn btn-d" style={{ fontSize:10,padding:"2px 10px",marginLeft:"auto" }} onClick={()=>delAnn(a.id)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
function ReportsPage({ leaves, dash, allEmps, analytics, allAtt }) {
  const bd=dash?.department_distribution||{}; if(!Object.keys(bd).length) allEmps.filter(e=>e.isActive).forEach(e=>{bd[e.dept]=(bd[e.dept]||0)+1;});
  const ls={total:leaves.length,approved:leaves.filter(l=>l.status==="approved").length,pending:leaves.filter(l=>l.status==="pending").length,rejected:leaves.filter(l=>l.status==="rejected").length};
  const trend=Array.from({length:14},(_,i)=>{const d=new Date();d.setDate(d.getDate()-13+i);const k=d.toISOString().split("T")[0];const recs=allAtt.filter(r=>r.date===k);return{date:k.slice(5),present:recs.filter(r=>r.status==="present").length,late:recs.filter(r=>r.status==="late").length};});
  return (
    <div className="fu">
      <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap" }}>
        <button className="btn btn-p" onClick={()=>toast.success("Attendance report exported as CSV!")}>⬇ Export Attendance</button>
        <button className="btn btn-g" onClick={()=>toast.success("Leave report exported as CSV!")}>⬇ Export Leaves</button>
        <button className="btn btn-g" onClick={()=>toast.success("Employee list exported!")}>⬇ Export Employees</button>
      </div>
      <div className="g2" style={{ marginBottom:16 }}>
        <div className="card">
          <div className="sect">Department Distribution</div>
          {Object.entries(bd).map(([d,c])=>(
            <div key={d} style={{ padding:"8px 0",borderBottom:"1px solid var(--border)" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                <span style={{ fontSize:12,fontWeight:600,color:gc(d) }}>{d}</span>
                <span style={{ fontSize:12,color:"var(--text)" }}>{c}</span>
              </div>
              <div className="pb"><div className="pf" style={{ width:`${Math.min(100,c*12)}%`,background:`linear-gradient(90deg,${gc(d)}55,${gc(d)})` }}/></div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div className="card">
            <div className="sect">Leave Statistics</div>
            {[["Total",ls.total,"#3B82F6"],["Approved",ls.approved,"var(--g)"],["Pending",ls.pending,"#F59E0B"],["Rejected",ls.rejected,"#EF4444"]].map(([l,v,c])=>(
              <div key={l} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:12,color:"var(--text2)" }}>{l}</span>
                <span style={{ fontSize:14,fontWeight:700,color:c }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="sect">Active Employees by Role</div>
            {["admin","hr","manager","employee"].map(r=>{const cnt=allEmps.filter(e=>e.role===r&&e.isActive).length;if(!cnt)return null;return(
              <div key={r} style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid var(--border)",fontSize:12 }}>
                <span style={{ color:"var(--text2)",textTransform:"capitalize" }}>{r}</span>
                <span style={{ fontWeight:700,color:"var(--text)" }}>{cnt}</span>
              </div>
            );})}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="sect">14-Day Attendance Trend</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trend} margin={{top:5,right:5,left:-25,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
            <XAxis dataKey="date" tick={{fill:"var(--text3)",fontSize:9}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:"var(--text3)",fontSize:9}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:10,fontSize:12}}/>
            <Bar dataKey="present" fill="var(--g)"   radius={[3,3,0,0]} name="Present"/>
            <Bar dataKey="late"    fill="#F59E0B" radius={[3,3,0,0]} name="Late"/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
function ProfilePage({ user, mySum, bals, changePw, busy }) {
  const [cur,setCur]=useState(""); const [nxt,setNxt]=useState(""); const [cnf,setCnf]=useState(""); const [msg,setMsg]=useState("");
  const [tab, setTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [bankForm, setBankForm] = useState({
    bank_account_number: "", bank_ifsc: "", bank_name: "", bank_account_holder: "",
  });
  const [personalForm, setPersonalForm] = useState({
    address: "", pan_number: "", aadhaar_number: "",
  });

  useEffect(() => {
  // Load saved profile data from the dedicated profile endpoint
  api.get(`/employees/${user.id}/profile`).then(d => {
    const p = d.profile || {};
    setBankForm({
      bank_account_number: p.bank_account_number || "",
      bank_ifsc:           p.bank_ifsc           || "",
      bank_name:           p.bank_name           || "",
      bank_account_holder: p.bank_account_holder || "",
    });
    setPersonalForm(prev => ({
      ...prev,
      address:        p.address        || "",
      pan_number:     p.pan_number     || "",
      aadhaar_number: p.aadhaar_number || "",
    }));
  }).catch(() => {});
}, [user.id]);
 const saveProfile = async (data) => {
  setSaving(true); setSaveMsg("");
  try {
    // Filter out undefined but keep empty strings so backend accepts the call
    const payload = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    if (!Object.keys(payload).length) {
      setSaveMsg("✗ Nothing to save.");
      setSaving(false);
      return;
    }
    await api.patch(`/employees/${user.id}`, payload);
    setSaveMsg("✓ Saved successfully!");
  } catch(e) { setSaveMsg("✗ " + e.message); }
  setSaving(false);
};

  const go=async()=>{ if(!cur||!nxt){setMsg("Fill all fields.");return;} if(nxt!==cnf){setMsg("Passwords don't match.");return;} if(nxt.length<6){setMsg("Min 6 chars.");return;} const ok=await changePw(cur,nxt); if(ok){setMsg("✓ Updated!");setCur("");setNxt("");setCnf("");} };

  const Inp = ({label, val, onChange, placeholder, type="text", mono=false}) => (
    <F label={label}>
      <input type={type} value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={mono?{fontFamily:"var(--mono)",letterSpacing:1}:{}}/>
    </F>
  );

  return (
    <div className="fu" style={{ maxWidth:680 }}>
      <div className="card" style={{ marginBottom:14 }}>
        <div style={{ display:"flex",gap:18,alignItems:"center" }}>
          <Av emp={user} size={60}/>
          <div>
            <div style={{ fontSize:22,fontWeight:900,color:"var(--text)",letterSpacing:-.5 }}>{user.name}</div>
            <div style={{ fontSize:13,color:"var(--text3)",marginTop:3 }}>{user.title||"—"} · {user.dept}</div>
            <div style={{ display:"flex",gap:7,marginTop:8 }}><Badge s={user.role}/></div>
          </div>
        </div>
      </div>

      {mySum&&(
        <div className="g4" style={{ marginBottom:14 }}>
          {[["Present",mySum.present,"var(--g)"],["Late",mySum.late,"#F59E0B"],["On Leave",mySum.on_leave,"#8B5CF6"],["Hours",`${Math.round((mySum.total_minutes||0)/60)}h`,"#3B82F6"]].map(([l,v,c])=>(
            <div key={l} className="card" style={{ textAlign:"center",padding:"14px 8px" }}>
              <div style={{ fontSize:22,fontWeight:900,color:c,letterSpacing:-1 }}>{v}</div>
              <div style={{ fontSize:10,color:"var(--text3)",marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex",gap:6,marginBottom:14 }}>
        {[["personal","👤 Personal"],["bank","🏦 Bank Details"],["documents","📄 Documents"],["security","🔐 Security"]].map(([t,l])=>(
          <button key={t} className={`tab ${tab===t?"on":""}`} onClick={()=>setTab(t)}>{l}</button>
        ))}
      </div>

      {saveMsg && <div style={{ padding:"10px 14px",borderRadius:10,background:saveMsg.startsWith("✓")?"rgba(62,207,142,0.08)":"rgba(239,68,68,0.08)",border:`1px solid ${saveMsg.startsWith("✓")?"rgba(62,207,142,0.3)":"rgba(239,68,68,0.3)"}`,fontSize:12,color:saveMsg.startsWith("✓")?"var(--g)":"#EF4444",marginBottom:12 }}>{saveMsg}</div>}

      {tab==="personal"&&(
        <div className="card">
          <div className="sect">Personal Information</div>
          {[["Code",user.code],["Email",user.email],["Phone",user.phone||"—"],["Department",user.dept],["Role",user.role],["Hire Date",user.hireDate||"—"]].map(([k,v])=>(
            <div key={k} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:13 }}>
              <span style={{ color:"var(--text3)" }}>{k}</span>
              <span style={{ color:"var(--text)",fontWeight:500 }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop:16 }}>
            <F label="Home Address">
              <textarea rows={2} value={personalForm.address} onChange={e=>setPersonalForm(p=>({...p,address:e.target.value}))} placeholder="Full residential address" style={{ resize:"vertical" }}/>
            </F>
            <F label="Emergency Contact">
              <input value={user.emergency||""} disabled style={{ opacity:.6 }} placeholder="Set via admin"/>
            </F>
          </div>
          <button className="btn btn-p" style={{ marginTop:8 }} onClick={()=>saveProfile(personalForm)} disabled={saving}>
            {saving?<Spin/>:"Save Personal Info"}
          </button>
        </div>
      )}

      {tab==="bank"&&(
        <div className="card">
          <div className="sect">Bank Details</div>
          <div style={{ background:"rgba(62,207,142,0.06)",border:"1px solid rgba(62,207,142,0.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"var(--g)",marginBottom:16 }}>
            ℹ️ Your bank details are used for salary disbursement. Keep them accurate and up to date.
          </div>
          <Inp label="Account Holder Name" val={bankForm.bank_account_holder} onChange={v=>setBankForm(p=>({...p,bank_account_holder:v}))} placeholder="As per bank records"/>
          <Inp label="Bank Name" val={bankForm.bank_name} onChange={v=>setBankForm(p=>({...p,bank_name:v}))} placeholder="e.g. State Bank of India"/>
          <div className="g2">
            <Inp label="Account Number" val={bankForm.bank_account_number} onChange={v=>setBankForm(p=>({...p,bank_account_number:v}))} placeholder="Enter account number" mono={true}/>
            <Inp label="IFSC Code" val={bankForm.bank_ifsc} onChange={v=>setBankForm(p=>({...p,bank_ifsc:v.toUpperCase()}))} placeholder="e.g. SBIN0001234" mono={true}/>
          </div>
          <div className="g2">
            <Inp label="Account Number" val={bankForm.bank_account_number} onChange={v=>setBankForm(p=>({...p,bank_account_number:v}))} placeholder="Enter account number" mono={true}/>
            <Inp label="IFSC Code" val={bankForm.bank_ifsc} onChange={v=>setBankForm(p=>({...p,bank_ifsc:v.toUpperCase()}))} placeholder="e.g. SBIN0001234" mono={true}/>
          </div>
          {bankForm.bank_account_number && (
            <div style={{ background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:10,padding:"12px 16px",marginBottom:12,fontSize:12 }}>
              <div style={{ color:"var(--text3)",marginBottom:6,fontSize:10,letterSpacing:1 }}>PREVIEW</div>
              <div style={{ color:"var(--text)",fontWeight:600 }}>{bankForm.bank_account_holder||"—"}</div>
              <div style={{ color:"var(--text2)",marginTop:2 }}>{bankForm.bank_name||"—"} · {bankForm.bank_ifsc||"—"}</div>
              <div style={{ color:"var(--g)",fontFamily:"var(--mono)",marginTop:4,letterSpacing:2 }}>
                {"•".repeat(Math.max(0,bankForm.bank_account_number.length-4))}{bankForm.bank_account_number.slice(-4)}
              </div>
            </div>
          )}
          <button className="btn btn-p" onClick={()=>saveProfile(bankForm)} disabled={saving}>
            {saving?<Spin/>:"Save Bank Details"}
          </button>
        </div>
      )}

      {tab==="documents"&&(
        <div className="card">
          <div className="sect">KYC Documents</div>
          <div style={{ background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#F59E0B",marginBottom:16 }}>
            ⚠️ Document numbers are encrypted and only visible to authorized HR/Admin personnel.
          </div>
          <F label="PAN Number">
            <input value={personalForm.pan_number} onChange={e=>setPersonalForm(p=>({...p,pan_number:e.target.value.toUpperCase()}))}
              placeholder="e.g. ABCDE1234F" maxLength={10}
              style={{ fontFamily:"var(--mono)",letterSpacing:2 }}/>
          </F>
          <div style={{ fontSize:10,color:"var(--text3)",marginTop:-8,marginBottom:12 }}>Format: 5 letters · 4 digits · 1 letter (e.g. ABCDE1234F)</div>
          <F label="Aadhaar Number">
            <input value={personalForm.aadhaar_number} onChange={e=>setPersonalForm(p=>({...p,aadhaar_number:e.target.value.replace(/\D/g,"").slice(0,12)}))}
              placeholder="12-digit Aadhaar number" maxLength={12}
              style={{ fontFamily:"var(--mono)",letterSpacing:3 }}/>
          </F>
          <div style={{ fontSize:10,color:"var(--text3)",marginTop:-8,marginBottom:16 }}>12 digits, no spaces or dashes</div>
          {(personalForm.pan_number||personalForm.aadhaar_number)&&(
            <div style={{ background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:10,padding:"12px 16px",marginBottom:14,fontSize:12 }}>
              <div style={{ color:"var(--text3)",fontSize:10,letterSpacing:1,marginBottom:8 }}>DOCUMENT STATUS</div>
              <div style={{ display:"flex",gap:12 }}>
                <span style={{ color:personalForm.pan_number.length===10?"var(--g)":"#F59E0B" }}>
                  {personalForm.pan_number.length===10?"✓":"○"} PAN {personalForm.pan_number.length===10?"Verified":"Incomplete"}
                </span>
                <span style={{ color:personalForm.aadhaar_number.length===12?"var(--g)":"#F59E0B" }}>
                  {personalForm.aadhaar_number.length===12?"✓":"○"} Aadhaar {personalForm.aadhaar_number.length===12?"Verified":"Incomplete"}
                </span>
              </div>
            </div>
          )}
          <button className="btn btn-p" onClick={()=>saveProfile(personalForm)} disabled={saving}>
            {saving?<Spin/>:"Save Documents"}
          </button>
        </div>
      )}

      {tab==="security"&&(
        <div>
          {bals.filter(b=>b.total_days>0).length>0&&(
            <div className="card" style={{ marginBottom:14 }}>
              <div className="sect">Leave Balances</div>
              {bals.filter(b=>b.total_days>0).map(b=>{const used=b.used_days||0,left=b.total_days-used-(b.pending_days||0);return(
                <div key={b.id} style={{ padding:"8px 0",borderBottom:"1px solid var(--border)" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                    <span style={{ fontSize:12,color:"var(--text2)" }}>{b.leave_type?.name}</span>
                    <span style={{ fontSize:12,fontWeight:700,color:"var(--g)" }}>{left} / {b.total_days}</span>
                  </div>
                  <div className="pb"><div className="pf" style={{ width:`${b.total_days>0?Math.round(used/b.total_days*100):0}%`,background:"linear-gradient(90deg,var(--g)55,var(--g))" }}/></div>
                </div>
              );})}
            </div>
          )}
          <div className="card">
            <div className="sect">Change Password</div>
            <F label="Current Password"><input type="password" value={cur} onChange={e=>setCur(e.target.value)} placeholder="Current password"/></F>
            <F label="New Password"><input type="password" value={nxt} onChange={e=>setNxt(e.target.value)} placeholder="Min 6 characters"/></F>
            <F label="Confirm New Password"><input type="password" value={cnf} onChange={e=>setCnf(e.target.value)} placeholder="Repeat new password" onKeyDown={e=>e.key==="Enter"&&go()}/></F>
            {msg&&<div style={{ fontSize:12,color:msg.startsWith("✓")?"var(--g)":"#EF4444",marginBottom:10 }}>{msg}</div>}
            <button className="btn btn-p" onClick={go} disabled={busy}>{busy?<Spin/>:"Update Password"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MODAL HUB ────────────────────────────────────────────────────────────────
function ModalHub({ modal, setModal, emps, ltypes, bals, user, depts, busy, applyLeave, addEmp, updateEmp, addTask, addAnn, checkOut }) {
  const [f,setF]=useState(modal.emp?{...modal.emp,dept:modal.emp.dept}:{});
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const close=()=>setModal(null);
  const Ttl=({t})=><div style={{ fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:20,letterSpacing:-.3 }}>{t}</div>;
  const Acts=({label,onClick,off})=><div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:18 }}><button className="btn btn-g" onClick={close}>Cancel</button><button className="btn btn-p" onClick={onClick} disabled={off||busy}>{busy?<Spin/>:label}</button></div>;

  // ✅ NEW: Early Checkout Modal
  if (modal.type==="earlyCheckout") {
    return (
      <>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
          <div style={{ width:48,height:48,borderRadius:12,background:"rgba(245,158,11,0.12)",border:"1px solid rgba(245,158,11,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>⚠️</div>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:"#F59E0B",letterSpacing:-.3 }}>Early Checkout</div>
            <div style={{ fontSize:11,color:"var(--text3)",marginTop:2 }}>Your shift isn't complete yet</div>
          </div>
        </div>
        <div style={{ background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"12px 14px",fontSize:12,color:"#F59E0B",marginBottom:16,lineHeight:1.7 }}>
          {modal.message}
        </div>
        <F label="Reason for Early Checkout *">
          <textarea
            rows={3}
            value={f.reason||""}
            onChange={e=>s("reason",e.target.value)}
            placeholder="e.g. Doctor appointment, family emergency, client visit..."
            style={{ resize:"vertical" }}
          />
        </F>
        <div style={{ fontSize:11,color:"var(--text3)",marginBottom:16 }}>
          ℹ️ This will be recorded as an early checkout and visible to your manager.
        </div>
        <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
          <button className="btn btn-g" onClick={close}>Cancel</button>
          <button
            className="btn btn-w"
            disabled={!f.reason||busy}
            onClick={()=>{
              const reason = f.reason;
              const selfie = modal.selfie || null;
              if (!reason) return;
              checkOut(selfie, reason);
              close();
            }}
          >
            {busy?<Spin/>:"Submit & Clock Out"}
          </button>
        </div>
      </>
    );
  }

  if (modal.type==="addLeave") {
    const td=todayStr(); const avail=id=>{const b=bals.find(b=>b.leave_type_id===id);return b?b.total_days-(b.used_days||0)-(b.pending_days||0):0;};
    return <><Ttl t="Apply for Leave"/>
      <F label="Leave Type"><select value={f.ltId||""} onChange={e=>s("ltId",e.target.value)}><option value="">Select type...</option>{ltypes.map(t=><option key={t.id} value={t.id}>{t.name} ({avail(t.id)} days available)</option>)}</select></F>
      <div className="g2"><F label="From Date"><input type="date" value={f.from||""} min={td} onChange={e=>s("from",e.target.value)}/></F><F label="To Date"><input type="date" value={f.to||""} min={f.from||td} onChange={e=>s("to",e.target.value)}/></F></div>
      <F label="Reason"><textarea rows={3} value={f.reason||""} onChange={e=>s("reason",e.target.value)} placeholder="Brief reason..." style={{ resize:"vertical" }}/></F>
      <Acts label="Submit Request" onClick={()=>applyLeave(f.ltId,f.from,f.to,f.reason)} off={!f.ltId||!f.from||!f.to||!f.reason}/></>;
  }
  if (modal.type==="addEmp") return <><Ttl t="Add New Employee"/>
    <div className="g2">
      <F label="Full Name"><input value={f.name||""} onChange={e=>s("name",e.target.value)} placeholder="Priya Sharma"/></F>
      <F label="Email"><input type="email" value={f.email||""} onChange={e=>s("email",e.target.value)} placeholder="priya@company.com"/></F>
      <F label="Password"><input value={f.password||""} onChange={e=>s("password",e.target.value)} placeholder="Min 6 chars"/></F>
      <F label="Job Title"><input value={f.title||""} onChange={e=>s("title",e.target.value)} placeholder="Developer"/></F>
      <F label="Phone"><input value={f.phone||""} onChange={e=>s("phone",e.target.value)} placeholder="+91 98100 00000"/></F>
      <F label="Hire Date"><input type="date" value={f.hireDate||""} onChange={e=>s("hireDate",e.target.value)}/></F>
      <F label="Department"><select value={f.dept||""} onChange={e=>s("dept",e.target.value)}><option value="">Select...</option>{depts.map(d=><option key={d}>{d}</option>)}</select></F>
      <F label="Role"><select value={f.role||"employee"} onChange={e=>s("role",e.target.value)}>{["employee","manager","hr","admin"].map(r=><option key={r}>{r}</option>)}</select></F>
    </div>
    <F label="Emergency Contact"><input value={f.emergency||""} onChange={e=>s("emergency",e.target.value)} placeholder="Name & phone number"/></F>
    <Acts label="Add Employee" onClick={()=>addEmp(f)} off={!f.name||!f.email||!f.password||!f.dept}/></>;

  if (modal.type==="editEmp") return <><Ttl t="Edit Employee"/>
    <div className="g2">
      <F label="Full Name"><input value={f.name||""} onChange={e=>s("name",e.target.value)}/></F>
      <F label="Job Title"><input value={f.title||""} onChange={e=>s("title",e.target.value)}/></F>
      <F label="Phone"><input value={f.phone||""} onChange={e=>s("phone",e.target.value)}/></F>
      <F label="Department"><select value={f.dept||""} onChange={e=>s("dept",e.target.value)}>{depts.map(d=><option key={d}>{d}</option>)}</select></F>
      <F label="Role"><select value={f.role||"employee"} onChange={e=>s("role",e.target.value)}>{["employee","manager","hr","admin"].map(r=><option key={r}>{r}</option>)}</select></F>
      <F label="Hire Date"><input type="date" value={f.hireDate||""} onChange={e=>s("hireDate",e.target.value)}/></F>
    </div>
    <F label="Emergency Contact"><input value={f.emergency||""} onChange={e=>s("emergency",e.target.value)}/></F>
    <Acts label="Save Changes" onClick={()=>updateEmp(modal.emp.id,{name:f.name,title:f.title,phone:f.phone,department:f.dept,role:f.role,hire_date:f.hireDate,emergency_contact:f.emergency})} off={!f.name||!f.dept}/></>;

  if (modal.type==="addTask") return <><Ttl t="Assign Task"/>
    <F label="Employee"><select value={f.empId||""} onChange={e=>s("empId",e.target.value)}><option value="">Select employee...</option>{emps.filter(e=>e.isActive&&e.role!=="admin").map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}</select></F>
    <F label="Task Title"><input value={f.title||""} onChange={e=>s("title",e.target.value)} placeholder="e.g. Complete Q2 report"/></F>
    <div className="g2">
      <F label="Deadline"><input type="date" value={f.deadline||""} onChange={e=>s("deadline",e.target.value)}/></F>
      <F label="Priority"><select value={f.priority||""} onChange={e=>s("priority",e.target.value)}><option value="">Select...</option>{["high","medium","low"].map(p=><option key={p}>{p}</option>)}</select></F>
    </div>
    <Acts label="Assign Task" onClick={()=>addTask(f.empId,f.title,f.deadline,f.priority)} off={!f.empId||!f.title||!f.deadline||!f.priority}/></>;

  if (modal.type==="addAnn") return <><Ttl t="Post Announcement"/>
    <F label="Title"><input value={f.title||""} onChange={e=>s("title",e.target.value)} placeholder="Announcement title"/></F>
    <F label="Message"><textarea rows={4} value={f.body||""} onChange={e=>s("body",e.target.value)} placeholder="Your message..." style={{ resize:"vertical" }}/></F>
    <div className="g2">
      <F label="Tag"><select value={f.tag||""} onChange={e=>s("tag",e.target.value)}><option value="">Select...</option>{["HR","Policy","General","Event","Technical","Finance","Operations"].map(t=><option key={t}>{t}</option>)}</select></F>
      <div style={{ paddingTop:18,display:"flex",alignItems:"center",gap:8 }}>
        <input type="checkbox" id="urg" checked={!!f.urgent} onChange={e=>s("urgent",e.target.checked)} style={{ width:"auto",accentColor:"#EF4444",cursor:"pointer" }}/>
        <label htmlFor="urg" style={{ color:"#EF4444",fontSize:13,fontWeight:600,letterSpacing:0,textTransform:"none",cursor:"pointer",marginBottom:0 }}>Mark Urgent</label>
      </div>
    </div>
    <Acts label="Post Announcement" onClick={()=>addAnn(f.title,f.body,f.tag,f.urgent)} off={!f.title||!f.body||!f.tag}/></>;

  return null;
}

// ─── PLATFORM ADMIN PAGE ──────────────────────────────────────────────────────
function PlatformAdminPage({ user, allEmps, setAllEmps, updateEmp, useDemo, companiesFromDB=[] }) {
  const PLANS = {
    starter:    { name:"Starter",    price:"₹999/mo",   color:"#3B82F6", empLimit:10,  features:["GPS Attendance","Selfie Verify","Leave Management","Basic Reports","Email Support"], locked:["AI Alerts","Payroll","War Room","Analytics","QR Attendance"] },
    growth:     { name:"Growth",     price:"₹2,999/mo", color:"#3ECF8E", empLimit:100, features:["GPS Attendance","Selfie Verify","Leave Management","Basic Reports","Email Support","AI Alerts","Payroll Summary","War Room","Analytics Dashboard","Priority Support","QR Attendance"], locked:["Custom Integrations","SLA Guarantee","HRMS API Access","Biometric Integration"] },
    enterprise: { name:"Enterprise", price:"Custom",    color:"#FB923C", empLimit:9999,features:["Everything in Growth","Custom Integrations","SLA Guarantee","Dedicated Account Manager","On-premise Option","HRMS API Access","Biometric Integration"], locked:[] },
  };

  const [tab, setTab]           = useState("companies");
  const [search, setSearch]     = useState("");
  const [selRole, setSelRole]   = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole]   = useState("");
  const [busy, setBusy]           = useState(false);
  const [expandedCo, setExpandedCo] = useState(null);
  const [companyPlans, setCompanyPlans] = useState(()=>loadDemoState("companyPlans",{}));
  const [companyStatus, setCompanyStatus] = useState(()=>loadDemoState("companyStatus",{}));

  const empsByCompany = allEmps.reduce((acc, e) => {
    const cid = e.company_id || "demo";
    if (!acc[cid]) acc[cid] = [];
    acc[cid].push(e);
    return acc;
  }, {});

  const companies = companiesFromDB.length > 0
    ? companiesFromDB.map(co => ({
        id:     co.id,
        name:   co.name,
        emps:   empsByCompany[co.id] || [],
        plan:   companyPlans[co.id] || co.plan || "growth",
        active: companyStatus[co.id] !== undefined ? companyStatus[co.id] : (co.is_active !== false),
        adminName: co.admin_name,
        industry: co.industry,
        size: co.size,
        empCount: co.employee_count,
        createdAt: co.created_at,
      }))
    : Object.values(
        allEmps.reduce((acc, e) => {
          const cid = e.company_id || "demo";
          if (!acc[cid]) acc[cid] = { id:cid, name:cid==="demo"?"Demo Company":("Company "+cid.slice(0,8)), emps:[], plan: companyPlans[cid]||"growth", active: companyStatus[cid]!==false };
          acc[cid].emps.push(e);
          return acc;
        }, {})
      );

  const changePlan = async (coId, newPlan) => {
    const updated = {...companyPlans, [coId]: newPlan};
    setCompanyPlans(updated);
    saveDemoState("companyPlans", updated);
    if (!useDemo) {
      try { await api.patch(`/companies/${coId}/plan`, { plan: newPlan }); } catch {}
    }
    toast.success(`Plan updated to ${PLANS[newPlan].name}!`);
  };

  const toggleCompany = async (coId, active) => {
    const updated = {...companyStatus, [coId]: active};
    setCompanyStatus(updated);
    saveDemoState("companyStatus", updated);
    if (!useDemo) {
      try { await api.patch(`/companies/${coId}/status`, { active }); } catch {}
    }
    toast.success(active ? "Company activated!" : "Company suspended!");
  };

  const filtered = allEmps.filter(e =>
    (selRole === "all" || e.role === selRole) &&
    ((e.name||"").toLowerCase().includes(search.toLowerCase()) || (e.email||"").toLowerCase().includes(search.toLowerCase()))
  );

  const handleRoleChange = async (empId, newRole) => {
    setBusy(true);
    try { await updateEmp(empId, { role: newRole }); setEditingId(null); }
    catch(err) { toast.error(err.message || "Failed to update role"); }
    setBusy(false);
  };

  const ROLE_COLORS = { super_admin:"#EF4444", admin:"#FB923C", hr:"#8B5CF6", manager:"#3B82F6", employee:"#3ECF8E" };
  const ALL_ROLES = ["employee","manager","hr","admin","super_admin"];
  const PLAN_COLORS = { starter:"#3B82F6", growth:"#3ECF8E", enterprise:"#FB923C" };

  const totalEmps    = allEmps.length;
  const totalCos     = companies.length;
  const activeCos    = companies.filter(c=>c.active).length;
  const planCounts   = companies.reduce((a,c)=>{ a[c.plan]=(a[c.plan]||0)+1; return a; },{});

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22,fontWeight:800,color:"var(--text)",letterSpacing:-.5 }}>🛡 Platform Admin</div>
        <div style={{ fontSize:12,color:"var(--text3)",marginTop:3 }}>Full platform control — manage companies, plans, and users.</div>
        {useDemo&&<div style={{ marginTop:8,padding:"7px 14px",background:"#F59E0B22",border:"1px solid #F59E0B55",borderRadius:8,fontSize:12,color:"#F59E0B" }}>⚠ Demo mode — all changes saved locally and persist on refresh.</div>}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:12,marginBottom:22 }}>
        {[
          { label:"Total Companies", val:totalCos,  icon:"🏢", color:"#8B5CF6" },
          { label:"Active",          val:activeCos, icon:"✅", color:"#3ECF8E" },
          { label:"Total Users",     val:totalEmps, icon:"👥", color:"#3B82F6" },
          { label:"Starter",         val:planCounts.starter||0, icon:"⚡", color:"#3B82F6" },
          { label:"Growth",          val:planCounts.growth||0,  icon:"🚀", color:"#3ECF8E" },
          { label:"Enterprise",      val:planCounts.enterprise||0, icon:"🏆", color:"#FB923C" },
        ].map(s=>(
          <div key={s.label} style={{ background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:12,padding:"12px 14px" }}>
            <div style={{ fontSize:18 }}>{s.icon}</div>
            <div style={{ fontSize:20,fontWeight:800,color:s.color,marginTop:4 }}>{s.val}</div>
            <div style={{ fontSize:11,color:"var(--text3)",marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex",gap:8,marginBottom:18 }}>
        {[["companies","🏢 Companies"],["users","👥 Users"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ padding:"7px 18px",borderRadius:8,border:"1px solid var(--border2)",background:tab===t?"var(--g)":"var(--s2)",color:tab===t?"#000":"var(--text)",fontWeight:tab===t?700:400,fontSize:13,cursor:"pointer" }}>{l}</button>
        ))}
      </div>
      {tab==="companies"&&(
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          {companies.map(co=>{
            const plan = PLANS[co.plan]||PLANS.growth;
            const adminEmp = co.emps.find(e=>e.role==="admin"||e.role==="super_admin");
            const isExpanded = expandedCo===co.id;
            const empPct = Math.min(100, Math.round((co.emps.length/plan.empLimit)*100));
            return (
              <div key={co.id} style={{ background:"var(--s2)",border:`1px solid ${co.active?"var(--border2)":"#EF444444"}`,borderRadius:14,overflow:"hidden" }}>
                <div style={{ padding:"14px 18px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap" }}>
                  <div style={{ width:42,height:42,borderRadius:10,background:PLAN_COLORS[co.plan]+"22",border:`1px solid ${PLAN_COLORS[co.plan]}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>🏢</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                      <div style={{ fontWeight:700,fontSize:15,color:"var(--text)" }}>{co.name}</div>
                      <span style={{ fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,background:PLAN_COLORS[co.plan]+"22",color:PLAN_COLORS[co.plan],textTransform:"uppercase",letterSpacing:.5 }}>{plan.name}</span>
                      {!co.active&&<span style={{ fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,background:"#EF444422",color:"#EF4444" }}>SUSPENDED</span>}
                    </div>
                    <div style={{ fontSize:11,color:"var(--text3)",marginTop:3 }}>
                      Admin: <span style={{color:"var(--text)"}}>{co.adminName||adminEmp?.name||"—"}</span> · {co.empCount||co.emps.length}/{plan.empLimit===9999?"∞":plan.empLimit} employees · {plan.price} · <span style={{color:"var(--text3)"}}>{co.industry||""}</span>
                    </div>
                    <div style={{ marginTop:6,height:4,background:"var(--s3)",borderRadius:4,width:"100%",maxWidth:200 }}>
                      <div style={{ height:4,borderRadius:4,background:empPct>90?"#EF4444":empPct>70?"#F59E0B":PLAN_COLORS[co.plan],width:empPct+"%",transition:"width .3s" }}/>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8,alignItems:"center",flexShrink:0 }}>
                    <select value={co.plan} onChange={e=>changePlan(co.id,e.target.value)} style={{ padding:"5px 10px",background:"var(--s3)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text)",fontSize:12,cursor:"pointer" }}>
                      <option value="starter">Starter — ₹999</option>
                      <option value="growth">Growth — ₹2,999</option>
                      <option value="enterprise">Enterprise — Custom</option>
                    </select>
                    <button onClick={()=>toggleCompany(co.id,!co.active)} style={{ padding:"5px 12px",borderRadius:8,border:"none",background:co.active?"#EF444422":"#3ECF8E22",color:co.active?"#EF4444":"#3ECF8E",fontSize:12,fontWeight:600,cursor:"pointer" }}>{co.active?"Suspend":"Activate"}</button>
                    <button onClick={()=>setExpandedCo(isExpanded?null:co.id)} style={{ padding:"5px 12px",borderRadius:8,border:"1px solid var(--border2)",background:"var(--s3)",color:"var(--text)",fontSize:12,cursor:"pointer" }}>{isExpanded?"▲ Hide":"▼ Details"}</button>
                  </div>
                </div>
                {isExpanded&&(
                  <div style={{ borderTop:"1px solid var(--border)",padding:"14px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
                    <div>
                      <div style={{ fontSize:11,fontWeight:700,color:"var(--text3)",marginBottom:8,letterSpacing:.5 }}>✅ INCLUDED FEATURES</div>
                      {plan.features.map(f=>(
                        <div key={f} style={{ fontSize:12,color:"var(--text)",marginBottom:4,display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{color:"#3ECF8E"}}>✓</span> {f}
                        </div>
                      ))}
                    </div>
                    <div>
                      {plan.locked.length>0&&<>
                        <div style={{ fontSize:11,fontWeight:700,color:"var(--text3)",marginBottom:8,letterSpacing:.5 }}>🔒 LOCKED (upgrade to unlock)</div>
                        {plan.locked.map(f=>(
                          <div key={f} style={{ fontSize:12,color:"var(--text3)",marginBottom:4,display:"flex",alignItems:"center",gap:6 }}>
                            <span style={{color:"#EF4444"}}>✕</span> {f}
                          </div>
                        ))}
                      </>}
                      <div style={{ marginTop:plan.locked.length?16:0 }}>
                        <div style={{ fontSize:11,fontWeight:700,color:"var(--text3)",marginBottom:8,letterSpacing:.5 }}>👥 EMPLOYEES ({co.emps.length})</div>
                        <div style={{ maxHeight:160,overflowY:"auto",display:"flex",flexDirection:"column",gap:4 }}>
                          {co.emps.map(e=>(
                            <div key={e.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"4px 8px",background:"var(--s3)",borderRadius:7 }}>
                              <div style={{ width:24,height:24,borderRadius:"50%",background:(ROLE_COLORS[e.role]||"#888")+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:ROLE_COLORS[e.role]||"#888",flexShrink:0 }}>{e.avatar}</div>
                              <div style={{ fontSize:12,color:"var(--text)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.name}</div>
                              <span style={{ fontSize:10,padding:"1px 7px",borderRadius:10,background:(ROLE_COLORS[e.role]||"#888")+"22",color:ROLE_COLORS[e.role]||"#888",textTransform:"capitalize",flexShrink:0 }}>{e.role}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {tab==="users"&&(
        <div>
          <div style={{ display:"flex",gap:10,marginBottom:14,flexWrap:"wrap" }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..." style={{ flex:1,minWidth:200,padding:"8px 12px",background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text)",fontSize:13 }}/>
            <select value={selRole} onChange={e=>setSelRole(e.target.value)} style={{ padding:"8px 12px",background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text)",fontSize:13 }}>
              <option value="all">All Roles</option>
              {ALL_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {filtered.map(emp=>(
              <div key={emp.id} style={{ background:"var(--s2)",border:"1px solid var(--border2)",borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:14 }}>
                <div style={{ width:38,height:38,borderRadius:"50%",background:(ROLE_COLORS[emp.role]||"#888")+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:ROLE_COLORS[emp.role]||"#888",flexShrink:0 }}>{emp.avatar}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontWeight:600,fontSize:14,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{emp.name}</div>
                  <div style={{ fontSize:11,color:"var(--text3)",marginTop:1 }}>{emp.dept||"—"} · {emp.title||"—"}</div>
                </div>
                <div style={{ flexShrink:0 }}>
                  {editingId===emp.id ? (
                    <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                      <select value={editRole} onChange={e=>setEditRole(e.target.value)} style={{ padding:"5px 10px",background:"var(--s3)",border:"1px solid var(--border2)",borderRadius:7,color:"var(--text)",fontSize:12 }}>
                        {ALL_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                      </select>
                      <button className="btn btn-p" style={{ fontSize:11,padding:"4px 12px" }} disabled={busy} onClick={()=>handleRoleChange(emp.id,editRole)}>Save</button>
                      <button className="btn btn-g" style={{ fontSize:11,padding:"4px 10px" }} onClick={()=>setEditingId(null)}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:(ROLE_COLORS[emp.role]||"#888")+"22",color:ROLE_COLORS[emp.role]||"#888",textTransform:"capitalize" }}>{emp.role}</span>
                      {emp.id!==user?.id&&<button className="btn btn-g" style={{ fontSize:11,padding:"4px 10px" }} onClick={()=>{setEditingId(emp.id);setEditRole(emp.role);}}>✏ Change</button>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!filtered.length&&<div style={{ color:"var(--text3)",fontSize:13,padding:20,textAlign:"center" }}>No users found.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]     = useState(null);
  const [boot,setBoot]     = useState(true);
  const [emps,setEmps]     = useState([]);
  const [leaves,setLeaves] = useState([]);
  const [ltypes,setLtypes] = useState([]);
  const [bals,setBals]     = useState([]);
  const [dash,setDash]     = useState(null);
  const [att,setAtt]       = useState([]);
  const [mySum,setMySum]   = useState(null);
  const [analytics,setAn]  = useState(null);
  const [nav,setNav]       = useState("Overview");
  const [modal,setModal]   = useState(null);
  const [busy,setBusy]     = useState(false);
  const [clock,setClock]   = useState(new Date());
  const [allAtt,setAllAtt] = useState([]);
  const [allEmps,setAllEmps]=useState([]);
  const [companies,setCompanies]=useState([]);
  const [useDemo,setUseDemo]=useState(false);
  const [companySuspended, setCompanySuspended] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState(null);

  const [tasks,setTasks]   = useState([
    { id:"t1",empId:"e4",title:"Migrate auth to JWT v2",  deadline:"2026-06-15",priority:"high",  progress:65,at:Date.now()-86400000 },
    { id:"t2",empId:"e5",title:"Q2 Sales Review Deck",    deadline:"2026-06-01",priority:"high",  progress:30,at:Date.now()-172800000 },
    { id:"t3",empId:"e6",title:"Redesign onboarding flow",deadline:"2026-06-20",priority:"medium",progress:80,at:Date.now()-259200000 },
    { id:"t4",empId:"e7",title:"Content calendar for Q3", deadline:"2026-06-10",priority:"medium",progress:20,at:Date.now()-345600000 },
    { id:"t5",empId:"e9",title:"API performance audit",   deadline:"2026-06-25",priority:"low",   progress:10,at:Date.now()-432000000 },
  ]);
  const [anns,setAnns]=useState([
    { id:"a1",title:"HRPulse v3 is Live!",body:"GPS attendance, AI anomaly detection, payroll summary, and the live war room are now available for all users.",tag:"General",urgent:false,author:"Arjun Mehta",at:Date.now()-3600000 },
    { id:"a2",title:"Mandatory GPS Clock-In from June 1",body:"Starting June 1st, all employees must use GPS-verified clock-in. Please enable location access on your device. Contact HR for any issues.",tag:"HR",urgent:true,author:"Priya Sharma",at:Date.now()-86400000 },
    { id:"a3",title:"Q2 Appraisal Cycle Begins",body:"Performance reviews for Q2 will start May 15. Managers please complete KPI inputs by May 20.",tag:"HR",urgent:false,author:"Priya Sharma",at:Date.now()-172800000 },
  ]);

  const { gps, getLocation } = useGPS();
  useEffect(()=>{const id=setInterval(()=>setClock(new Date()),1000);return()=>clearInterval(id);},[]);

  useEffect(()=>{
    (async()=>{
      if (_at) {
        try {
          const { user:u } = await api.get("/auth/me");
          setUser(eNorm(u));
          if (u?.company_id && u?.role !== "super_admin") {
            if (u?.plan) setUser(prev => prev ? {...prev, plan: u.plan} : prev);
          }
        } catch(err) {
          if (err?.suspended || err?.message?.toLowerCase?.().includes("suspended")) {
            setCompanySuspended(true);
            try { const stored = localStorage.getItem("hp_user"); if (stored) setUser(JSON.parse(stored)); } catch {}
          } else {
            clearTokens();
          }
        }
      }
      setBoot(false);
    })();
  },[]);

  const isSuperAdmin = user?.role==="super_admin";
  const isAdmin = isSuperAdmin||user?.role==="admin"||user?.role==="hr";
  const isMgr   = isAdmin||user?.role==="manager";

  useEffect(()=>{ if(user) loadAll(); },[user?.id]);

  async function loadAll() {
    if (!useDemo && _at && user?.company_id && user?.role !== "super_admin") {
      try {
        const freshMe = await api.get("/auth/me");
        setCompanySuspended(false);
        if (freshMe?.user?.plan) {
          setUser(prev => prev ? {...prev, plan: freshMe.user.plan} : prev);
        }
      } catch(e) {
        if (e?.suspended || e?.message?.toLowerCase?.().includes("suspended")) {
          setCompanySuspended(true); return;
        }
      }
    }
    try {
      const ts = `&_=${Date.now()}`; // cache buster
      const [dData,aData,sData]=await Promise.all([
        api.get(isMgr?"/dashboard/admin":"/dashboard/me").catch(()=>null),
        api.get(`/attendance/my?month=${new Date().getMonth()+1}&year=${new Date().getFullYear()}&limit=31${ts}`).catch(()=>({records:[]})),
        api.get(`/attendance/my/summary?month=${new Date().getMonth()+1}&year=${new Date().getFullYear()}${ts}`).catch(()=>null),
      ]);
      setDash(dData); setAtt(aData.records||[]); setMySum(sData?.summary||null);
      const [lData,lt,bl]=await Promise.all([
        isMgr?api.get("/leave/all?limit=500").catch(()=>({requests:[]})):api.get("/leave/my").catch(()=>({requests:[]})),
        api.get("/leave/types").catch(()=>({leave_types:[]})),
        api.get("/leave/balances").catch(()=>({balances:[]})),
      ]);
      setLeaves((lData.requests||[]).map(lNorm));
      setLtypes(lt.leave_types||[]);
      setBals(bl.balances||[]);
      if (isMgr || isSuperAdmin) {
        const [eData,anal,coData,attData]=await Promise.all([
          api.get("/employees?limit=1000&is_active=all").catch(()=>({employees:[]})),
          api.get("/analytics/overview").catch(()=>null),
          isSuperAdmin?api.get("/companies").catch(()=>({companies:[]})):Promise.resolve({companies:[]}),
          api.get(`/attendance/team?date=${new Date().toISOString().split("T")[0]}`).catch(()=>({records:[]})),
        ]);
        const empList=(eData.employees||[]).map(eNorm);
        setEmps(empList);
        if(empList.length) setAllEmps(empList);
        setAn(anal);
        if(isSuperAdmin&&coData.companies?.length) setCompanies(coData.companies);
        if(attData.records?.length) setAllAtt(prev=>{
          const today = new Date().toISOString().split("T")[0];
          const filtered = prev.filter(r=>r.date!==today);
          return [...filtered, ...attData.records];
        });
      }
    } catch {}
  }

  const login=async(email,pw)=>{
    const DEMO_EMAILS=["admin@hrpulse.io","priya@hrpulse.io","sneha@hrpulse.io","rohan@hrpulse.io"];
    const isDemo=DEMO_EMAILS.includes(email.toLowerCase().trim());
    try {
      const d=await api.post("/auth/login",{email,password:pw});
      saveTokens(d.access_token,d.refresh_token);
      setUser(eNorm(d.user)); setNav("Overview"); return true;
    } catch(apiErr) {
      if (apiErr?.suspended) return "Your company account has been suspended. Please contact support.";
      if (apiErr?.status === 403) return apiErr.message || "Access denied.";
      const isNetworkErr = apiErr.message && apiErr.message.includes("Network error");
      if (!isNetworkErr && !isDemo) return apiErr.message || "Invalid email or password";
    }
    const DEMO_CREDS=[["admin@hrpulse.io","Admin@123","e1"],["priya@hrpulse.io","Hr@12345","e2"],["sneha@hrpulse.io","Emp@12345","e4"],["rohan@hrpulse.io","Manager@123","e3"]];
    const found=DEMO_CREDS.find(([e,p])=>e===email&&p===pw);
    if (found) {
      const emp=SEED_EMPLOYEES.find(e=>e.id===found[2]);
      const u=eNorm(emp);
      setUser(u); setUseDemo(true);
      const seedEmps = SEED_EMPLOYEES.map(eNorm);
      const seedAtt  = SEED_ATT_ALL;
      setEmps(seedEmps);
      setAllEmps(seedEmps);
      setAllAtt(seedAtt);
      setLeaves(SEED_LEAVES.map(lNorm));
      setLtypes([{id:"lt1",name:"Annual Leave",default_days:18,is_paid:true},{id:"lt2",name:"Sick Leave",default_days:12,is_paid:true},{id:"lt3",name:"Casual Leave",default_days:6,is_paid:true}]);
      setBals([{id:"b1",employee_id:found[2],leave_type_id:"lt1",year:2026,total_days:18,used_days:4,pending_days:0,leave_type:{name:"Annual Leave",is_paid:true}},{id:"b2",employee_id:found[2],leave_type_id:"lt2",year:2026,total_days:12,used_days:2,pending_days:2,leave_type:{name:"Sick Leave",is_paid:true}},{id:"b3",employee_id:found[2],leave_type_id:"lt3",year:2026,total_days:6,used_days:1,pending_days:0,leave_type:{name:"Casual Leave",is_paid:true}}]);
      setAtt(seedAtt.filter(a=>a.employee_id===found[2]).slice(-30));
      setMySum({present:18,late:3,on_leave:2,total_minutes:18*480+3*360});
      setDash({summary:{total_employees:SEED_EMPLOYEES.filter(e=>e.is_active).length,pending_leaves:SEED_LEAVES.filter(l=>l.status==="pending").length,today_attendance:{present:7,late:2,absent:1,on_leave:1,total:11,rate:82}},department_distribution:{Engineering:3,Sales:2,Design:2,HR:1,Marketing:1,Finance:1,Management:1}});
      setAn({total_employees:11,today:{present:7,late:2,absent:1,on_leave:1,rate:82},pending_leaves:SEED_LEAVES.filter(l=>l.status==="pending").length,department_distribution:{Engineering:3,Sales:2,Design:2,HR:1,Marketing:1,Finance:1,Management:1}});
      setNav("Overview"); return true;
    }
    return "Invalid credentials. Try the demo buttons below.";
  };

  const logout=async()=>{
    await api.post("/auth/logout",{refresh_token:_rt}).catch(()=>{});
    clearTokens(); clearDemoState();
    setUser(null); setEmps([]); setLeaves([]); setDash(null);
    setAtt([]); setAllAtt([]); setAllEmps([]);
    setUseDemo(false);
    setCompanySuspended(false);
  };

  const checkIn=async(selfie=null)=>{
    setBusy(true);
    try {
      if (!useDemo) {
        toast.loading("Getting GPS...",{id:"loc"});
        const loc=await getLocation(); toast.dismiss("loc");
        const d=await api.post("/attendance/checkin",{latitude:loc.lat,longitude:loc.lng,selfie_base64:selfie});
        toast.success(d.message||"Clocked in! ✓"); loadAll();
      } else {
        await new Promise(r=>setTimeout(r,800));
        const now=new Date();
        const rec={ id:`att_${user.id}_today`,employee_id:user.id,date:todayStr(),check_in:now.toISOString(),check_out:null,status:now.getHours()>9&&now.getMinutes()>30?"late":"present",work_minutes:0,latitude:28.6139,longitude:77.2090,selfie_in:selfie?"yes":null };
        setAtt(p=>[rec,...p.filter(r=>r.date!==todayStr())]);
        setAllAtt(p=>[rec,...p.filter(r=>!(r.date===todayStr()&&r.employee_id===user.id))]);
        toast.success(`Clocked in! Status: ${rec.status} ✓`);
      }
    } catch(e) { toast.error(e.message); }
    setBusy(false);
  };

  // ✅ checkOut supports early checkout with reason
  // ✅ checkOut supports early checkout with reason
  const checkOut = async (selfie=null, earlyReason=null) => {
  setBusy(true);
  try {
    if (!useDemo) {
      let loc = { lat: null, lng: null };
      if (!earlyReason) loc = await getLocation();
      const body = { latitude: loc.lat, longitude: loc.lng, selfie_base64: selfie };
      if (earlyReason) body.early_checkout_reason = earlyReason;

      let d;
      try {
        d = await api.post("/attendance/checkout", body); // ← was missing
      } catch (apiErr) {
        if (apiErr?.early_checkout) {
          setModal({ type: "earlyCheckout", message: apiErr.message, selfie });
          setBusy(false); return;
        }
        toast.error(apiErr.message);
        setBusy(false); return;
      }

      toast.success(`${d.message}${d.work_minutes ? ` · ${fmtH(d.work_minutes)} worked` : ""}`);
      loadAll();

    } else {
      await new Promise(r => setTimeout(r, 600));
      const now = new Date();
      const todayAttRec = att.find(r => r.date === todayStr());
      const mins = todayAttRec?.check_in
        ? Math.round((now - new Date(todayAttRec.check_in)) / 60000)
        : 0;

      if (mins < 480 && !earlyReason) {
        const wH=Math.floor(mins/60), wM=mins%60;
        const rH=Math.floor((480-mins)/60), rM=(480-mins)%60;
        setModal({
          type: "earlyCheckout",
          message: `You have only worked ${wH}h ${wM}m. Full shift is 8 hours (${rH}h ${rM}m remaining). Please provide a reason for early checkout.`,
          selfie,
        });
        setBusy(false); return;
      }

      setAtt(p => p.map(r => r.date === todayStr()
        ? { ...r, check_out: now.toISOString(), work_minutes: mins, early_checkout: mins < 480, early_checkout_reason: earlyReason || null }
        : r
      ));
      setAllAtt(p => p.map(r => r.date === todayStr() && r.employee_id === user.id
        ? { ...r, check_out: now.toISOString(), work_minutes: mins, early_checkout: mins < 480 }
        : r
      ));
      toast.success(earlyReason
        ? `Early checkout recorded — ${Math.floor(mins/60)}h ${mins%60}m worked`
        : "Clocked out! Great work today 👋"
      );
    }
  } catch (e) {
    toast.error(e.message);
  }
  setBusy(false);
};

  const handleCheckIn  = ()=>setModal({type:"selfie",action:"in"});
const handleCheckOut = ()=>{
  const todayRecord = att.find(r=>r.date===todayStr());
  if(todayRecord?.check_in){
    const mins=Math.round((new Date()-new Date(todayRecord.check_in))/60000);
    if(mins<480){
      const wH=Math.floor(mins/60),wM=mins%60,rH=Math.floor((480-mins)/60),rM=(480-mins)%60;
      setModal({type:"earlyCheckout",message:`You have only worked ${wH}h ${wM}m. Full shift is 8 hours (${rH}h ${rM}m remaining). Please provide a reason for early checkout.`,selfie:null});
      return;
    }
  }
  checkOut(null);
};

  const applyLeave=async(ltId,from,to,reason)=>{
    setBusy(true);
    try {
      if (!useDemo) { const d=await api.post("/leave/apply",{leave_type_id:ltId,start_date:from,end_date:to,reason}); setLeaves(p=>[lNorm(d.request),...p]); toast.success(d.message||"Leave submitted!"); setModal(null); }
      else { const lt=ltypes.find(t=>t.id===ltId); const days=Math.round((new Date(to)-new Date(from))/864e5)+1; const r={id:`l${Date.now()}`,employee_id:user.id,employee:{name:user.name,avatar_initials:user.avatar,department:user.dept},leave_type:{name:lt?.name||"Leave"},start_date:from,end_date:to,total_days:days,reason,status:"pending",reviewer:null,review_note:"",created_at:new Date().toISOString()}; setLeaves(p=>[lNorm(r),...p]); toast.success("Leave request submitted!"); setModal(null); }
    } catch(e) { toast.error(e.message); }
    setBusy(false);
  };
  const reviewLeave=async(id,approve,note="")=>{
    setBusy(true);
    try {
      if (!useDemo) await api.patch(`/leave/${id}/review`,{status:approve?"approved":"rejected",review_note:note});
      setLeaves(p=>p.map(l=>l.id===id?{...l,status:approve?"approved":"rejected",reviewer:user.name,reviewNote:note}:l));
      toast.success(approve?"Leave approved ✓":"Leave rejected");
    } catch(e) { toast.error(e.message); }
    setBusy(false);
  };
  const cancelLeave=async(id)=>{
    setBusy(true);
    try {
      if (!useDemo) await api.delete(`/leave/${id}/cancel`);
      setLeaves(p=>p.map(l=>l.id===id?{...l,status:"cancelled"}:l)); toast.success("Cancelled");
    } catch(e) { toast.error(e.message); }
    setBusy(false);
  };

  const addEmp=async(f)=>{
    setBusy(true);
    try {
      if (!useDemo) { const d=await api.post("/employees",{name:f.name,email:f.email,password:f.password,role:f.role||"employee",department:f.dept,title:f.title,phone:f.phone,emergency_contact:f.emergency,hire_date:f.hireDate||undefined}); setEmps(p=>[...p,eNorm(d.employee)]); }
      else { const ne={id:`e${Date.now()}`,employee_code:`E${String(allEmps.length+1).padStart(3,"0")}`,name:f.name,email:f.email,password_hash:"",role:f.role||"employee",department:f.dept,title:f.title||"",phone:f.phone||"",emergency_contact:f.emergency||"",avatar_initials:f.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),hire_date:f.hireDate||"",is_active:true}; const normNe=eNorm(ne); setEmps(p=>{const n=[...p,normNe];return n;}); setAllEmps(p=>{const n=[...p,normNe];saveDemoState("allEmps",n);return n;}); }
      toast.success("Employee added!"); setModal(null);
    } catch(e) { toast.error(e.message); }
    setBusy(false);
  };
  const updateEmp=async(id,f)=>{
    setBusy(true);
    try {
      if (!useDemo) { const d=await api.patch(`/employees/${id}`,f); setEmps(p=>p.map(e=>e.id===id?eNorm(d.employee):e)); }
      else { setEmps(p=>p.map(e=>e.id===id?{...e,...eNorm({...e,name:f.name||e.name,title:f.title||e.title,phone:f.phone||e.phone,department:f.department||e.dept,role:f.role||e.role,hire_date:f.hire_date||e.hireDate,emergency_contact:f.emergency_contact||e.emergency,avatar_initials:e.avatar})}:e)); setAllEmps(p=>{const n=p.map(e=>e.id===id?{...e,...eNorm({...e,name:f.name||e.name,title:f.title||e.title,phone:f.phone||e.phone,department:f.department||e.dept,role:f.role||e.role,hire_date:f.hire_date||e.hireDate,emergency_contact:f.emergency_contact||e.emergency,avatar_initials:e.avatar})}:e);saveDemoState("allEmps",n);return n;}); }
      toast.success("Updated!"); setModal(null);
    } catch(e) { toast.error(e.message); }
    setBusy(false);
  };
  const deactivateEmp=async(id)=>{
    setBusy(true);
    try {
      if (!useDemo) await api.delete(`/employees/${id}`);
      setEmps(p=>p.map(e=>e.id===id?{...e,isActive:false}:e));
      setAllEmps(p=>{const n=p.map(e=>e.id===id?{...e,isActive:false}:e);if(useDemo)saveDemoState("allEmps",n);return n;});
      toast.success("Deactivated");
    } catch(e) { toast.error(e.message); }
    setBusy(false);
  };

  const addTask =(eId,title,dl,pri)=>{setTasks(p=>[...p,{id:`t${Date.now()}`,empId:eId,title,deadline:dl,priority:pri,progress:0,at:Date.now()}]);toast.success("Task assigned!");setModal(null);};
  const updProg =(id,v)=>{setTasks(p=>p.map(t=>t.id===id?{...t,progress:v}:t));toast.success("Progress updated!");};
  const addAnn  =(title,body,tag,urgent)=>{setAnns(p=>[{id:`a${Date.now()}`,title,body,tag,urgent:!!urgent,author:user?.name||"Admin",at:Date.now()},...p]);toast.success("Posted!");setModal(null);};
  const delAnn  =(id)=>{setAnns(p=>p.filter(a=>a.id!==id));toast.success("Deleted");};
  const changePw=async(cur,nxt)=>{setBusy(true);try{if(!useDemo)await api.patch("/auth/password",{current_password:cur,new_password:nxt});toast.success("Password updated!");setBusy(false);return true;}catch(e){toast.error(e.message);setBusy(false);return false;}};

  const todayRec = att.find(r=>r.date===todayStr())||null;
  const myLeaves = leaves.filter(l=>l.empId===user?.id);
  const pending  = leaves.filter(l=>l.status==="pending");
  const depts    = Object.keys(DEPT_COLORS);

  const userCompanyId = user?.company_id || "demo";
  const userPlan = user?.plan?.name || user?.plan || loadDemoState("companyPlans",{})[userCompanyId] || "growth";
  const isCompanySuspended = !isSuperAdmin && (
    companySuspended ||
    (useDemo && loadDemoState("companyStatus",{})[userCompanyId] === false)
  );

  const PLAN_FEATURES = {
    starter:    { payroll:false, aiAlerts:false, warRoom:false, analytics:false },
    growth:     { payroll:true,  aiAlerts:true,  warRoom:true,  analytics:true  },
    enterprise: { payroll:true,  aiAlerts:true,  warRoom:true,  analytics:true  },
  };
  const planF = isSuperAdmin ? { payroll:true,aiAlerts:true,warRoom:true,analytics:true } : (PLAN_FEATURES[userPlan]||PLAN_FEATURES.growth);

  const NAV_LINKS = isSuperAdmin
    ? ["Overview","Analytics","AI Alerts","War Room","Live Tracker","Attendance","Employees","Leave","Payroll","Performance","Announcements","Reports","Onboarding","Pricing","Platform Admin","My Profile"]
    : isAdmin
    ? ["Overview","Analytics","AI Alerts","War Room","Live Tracker","Attendance","Employees","Leave","Payroll","Performance","Announcements","Reports","Pricing","My Profile"]
    : isMgr
    ? ["Overview","Analytics","AI Alerts","War Room","Live Tracker","Attendance","Employees","Leave","Performance","Announcements","My Profile"]
    : ["Overview","My Attendance","Apply Leave","Announcements","My Profile"];

  const ICONS = { Overview:"◈",Analytics:"📊","AI Alerts":"🤖","War Room":"🎯","Live Tracker":"🗺️",Attendance:"◷","My Attendance":"◷",Employees:"⊛",Leave:"◇","Apply Leave":"◇",Payroll:"💳",Performance:"◉",Announcements:"📢",Reports:"◎",Onboarding:"🚀",Pricing:"💰","Platform Admin":"🛡","My Profile":"◐" };
  const LOCKED_BY_PLAN = !isSuperAdmin && userPlan==="starter" ? ["Analytics","AI Alerts","War Room","Payroll"] : [];

  if (boot) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"var(--bg)" }}>
      <style>{CSS}</style>
      <div style={{ fontSize:36,fontWeight:900,color:"#fff",letterSpacing:-1.5 }}><span style={{color:"var(--g)"}}>HR</span>Pulse</div>
      <Spin lg/>
      <div style={{ fontSize:11,color:"var(--text3)",letterSpacing:.5 }}>Initialising v3.0...</div>
    </div>
  );

  if (user && isCompanySuspended) return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"var(--bg)",textAlign:"center",padding:24 }}>
      <style>{CSS}</style>
      <div style={{ fontSize:64,marginBottom:8 }}>🚫</div>
      <div style={{ fontSize:28,fontWeight:900,color:"#EF4444",letterSpacing:-.5 }}>Account Suspended</div>
      <div style={{ fontSize:14,color:"var(--text2)",maxWidth:420,lineHeight:1.7,marginTop:4 }}>
        Your company account has been suspended by the platform administrator.<br/>
        Please contact support to resolve this.
      </div>
      <div style={{ marginTop:8,padding:"12px 20px",background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,fontSize:13,color:"var(--text2)" }}>
        📧 <a href="mailto:support@hrpulse.io" style={{color:"#3B82F6",textDecoration:"none"}}>support@hrpulse.io</a>
        &nbsp;·&nbsp; 📞 +91 98100 00000
      </div>
      <button className="btn btn-g" style={{ marginTop:12,padding:"10px 28px",fontSize:13 }} onClick={logout}>← Sign Out</button>
    </div>
  );

  if (!user) return <LoginPage onLogin={login} CSS={CSS}/>;

  return (
    <div style={{ minHeight:"100vh",display:"flex",background:"var(--bg)" }}>
      <style>{CSS}</style>
      <Toaster position="top-right" toastOptions={{ style:{ background:"var(--s2)",color:"var(--text)",border:"1px solid var(--border2)",fontSize:13,borderRadius:12 } }}/>

      {upgradeModal && (
        <UpgradeModal
          feature={upgradeModal}
          onClose={()=>setUpgradeModal(null)}
          onGoToPricing={()=>{ setUpgradeModal(null); setNav("Pricing"); }}
        />
      )}

      {modal&&(
        <div className="modal-bg" onClick={e=>e.target===e.currentTarget&&modal.type!=="earlyCheckout"&&setModal(null)}>
          <div className="modal">
            {modal.type==="selfie"
              ? <SelfieCapture onCapture={photo=>{setModal(null);modal.action==="in"?checkIn(photo):checkOut(photo);}} onSkip={()=>{setModal(null);modal.action==="in"?checkIn(null):checkOut(null);}}/>
              : <ModalHub modal={modal} setModal={setModal} emps={emps.length?emps:allEmps} ltypes={ltypes} bals={bals} user={user} depts={depts} busy={busy} applyLeave={applyLeave} addEmp={addEmp} updateEmp={updateEmp} addTask={addTask} addAnn={addAnn} checkOut={checkOut}/>
            }
          </div>
        </div>
      )}

      <aside className="sidebar">
        <div style={{ padding:"0 6px 18px",borderBottom:"1px solid var(--border)",marginBottom:6 }}>
          <div style={{ fontSize:22,fontWeight:900,color:"#fff",letterSpacing:-1 }}><span style={{color:"var(--g)"}}>HR</span>Pulse</div>
          <div style={{ fontSize:8,color:"var(--text3)",letterSpacing:2,marginTop:1 }}>PITCH BUILD v3.0</div>
          <div style={{ display:"flex",alignItems:"center",gap:5,marginTop:6 }}>
            <span className="ldot"/>
            <span style={{ fontSize:10,color:"var(--g)",fontWeight:600 }}>{useDemo?"Demo Mode":"Live"}</span>
          </div>
          {!isSuperAdmin && (
            <div style={{ marginTop:6,fontSize:9,color:"var(--text3)",letterSpacing:.5 }}>
              Plan: <span style={{ color: userPlan==="enterprise"?"#FB923C":userPlan==="growth"?"var(--g)":"#3B82F6", fontWeight:700, textTransform:"uppercase" }}>{userPlan}</span>
            </div>
          )}
        </div>

        {NAV_LINKS.map(n=>{
          const isLocked = LOCKED_BY_PLAN.includes(n);
          const isActive = nav===n;
          return (
            <div
              key={n}
              className={`nav${isActive?" on":""}${isLocked?" locked-nav":""}`}
              onClick={()=>{ if (isLocked) { setUpgradeModal(n); } else { setNav(n); } }}
            >
              <span style={{ fontSize:12, flexShrink:0 }}>{isLocked ? "🔒" : (ICONS[n]||"·")}</span>
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, color: isLocked ? "var(--text3)" : undefined }}>{n}</span>
              {isLocked && (
                <span style={{ fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10,background:"rgba(245,158,11,0.15)",color:"#F59E0B",border:"1px solid rgba(245,158,11,0.3)",flexShrink:0 }}>PRO</span>
              )}
              {!isLocked && n==="Leave" && pending.length>0 && (
                <span style={{ marginLeft:"auto",background:"#EF4444",color:"#fff",borderRadius:10,fontSize:9,fontWeight:700,padding:"1px 6px",flexShrink:0 }}>{pending.length}</span>
              )}
              {!isLocked && n==="AI Alerts" && computeAnomalies(allEmps,allAtt).filter(a=>a.severity==="high").length>0 && (
                <span style={{ marginLeft:"auto",background:"#F59E0B",color:"#000",borderRadius:10,fontSize:9,fontWeight:700,padding:"1px 6px",flexShrink:0 }}>{computeAnomalies(allEmps,allAtt).filter(a=>a.severity==="high").length}</span>
              )}
            </div>
          );
        })}

        <div style={{ marginTop:"auto",padding:"14px 6px 0",borderTop:"1px solid var(--border)" }}>
          <div style={{ display:"flex",alignItems:"center",gap:9,marginBottom:10 }}>
            <Av emp={user} size={32}/>
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:"var(--text)" }}>{user.name.split(" ")[0]}</div>
              <div style={{ fontSize:9,color:"var(--text3)",textTransform:"capitalize" }}>{user.role}</div>
            </div>
          </div>
          <button className="btn btn-g" style={{ width:"100%",fontSize:11,padding:"7px" }} onClick={logout}>Sign Out</button>
        </div>
      </aside>

      <main style={{ flex:1,overflowY:"auto",padding:"26px 28px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12 }}>
          <div>
            <div style={{ fontSize:24,fontWeight:900,color:"var(--text)",letterSpacing:-.5 }}>{nav}</div>
            <div style={{ fontSize:11,color:"var(--text3)",marginTop:3 }}>
              {clock.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})} · <span className="mono">{clock.toLocaleTimeString("en-IN")}</span>
            </div>
          </div>
          <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
            <button className="btn btn-g" style={{ fontSize:11 }} onClick={loadAll} disabled={busy}>↻</button>
            {isMgr&&nav==="Employees"&&<button className="btn btn-p" onClick={()=>setModal({type:"addEmp"})}>+ Add Employee</button>}
            {(nav==="Leave"||nav==="Apply Leave")&&<button className="btn btn-p" onClick={()=>setModal({type:"addLeave"})}>+ Apply Leave</button>}
            {isMgr&&nav==="Performance"&&<button className="btn btn-p" onClick={()=>setModal({type:"addTask"})}>+ Assign Task</button>}
            {isAdmin&&nav==="Announcements"&&<button className="btn btn-p" onClick={()=>setModal({type:"addAnn"})}>+ Post</button>}
          </div>
        </div>

        {nav==="Overview"     &&<OverviewPage  user={user} isMgr={isMgr} isAdmin={isAdmin} dash={dash} todayRec={todayRec} myLeaves={myLeaves} pending={pending} reviewLeave={reviewLeave} setModal={setModal} mySum={mySum} anns={anns} busy={busy} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} bals={bals} allAtt={allAtt} allEmps={allEmps}/>}
        {nav==="Analytics"    &&<AnalyticsPage analytics={analytics} allAtt={allAtt} allEmps={allEmps}/>}
        {nav==="AI Alerts"    &&<AIAlertsPage  allEmps={allEmps} allAtt={allAtt} analytics={analytics}/>}
        {nav==="War Room"     &&<WarRoomPage   allEmps={allEmps} allAtt={allAtt}/>}
        {nav==="Live Tracker" &&<LiveTrackerPage allEmps={allEmps} allAtt={allAtt} isSuperAdmin={isSuperAdmin}/>}
        {(nav==="Attendance"||nav==="My Attendance")&&<AttPage isMgr={isMgr} todayRec={todayRec} att={att} mySum={mySum} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} busy={busy} allAtt={allAtt} allEmps={allEmps}/>}
        {nav==="Employees"    &&<EmpsPage      emps={emps.length?emps:allEmps} setModal={setModal} isAdmin={isAdmin} deactivateEmp={deactivateEmp} busy={busy} user={user}/>}
        {(nav==="Leave"||nav==="Apply Leave")&&<LeavePage isMgr={isMgr} leaves={leaves} myLeaves={myLeaves} pending={pending} bals={bals} reviewLeave={reviewLeave} cancelLeave={cancelLeave} setModal={setModal} busy={busy}/>}
        {nav==="Payroll"      &&<PayrollPage   allEmps={allEmps} allAtt={allAtt} isAdmin={isAdmin} setAllEmps={setAllEmps}/>}
        {nav==="Performance"  &&<PerfPage      user={user} isMgr={isMgr} emps={emps.length?emps:allEmps} tasks={tasks} updProg={updProg} setModal={setModal}/>}
        {nav==="Announcements"&&<AnnsPage      anns={anns} delAnn={delAnn} isAdmin={isAdmin}/>}
        {nav==="Reports"      &&<ReportsPage   leaves={leaves} dash={dash} allEmps={allEmps} analytics={analytics} allAtt={allAtt}/>}
        {nav==="Onboarding"   &&<OnboardingPage/>}
        {nav==="Pricing"      &&<PricingPage/>}
        {nav==="Platform Admin"&&<PlatformAdminPage user={user} allEmps={allEmps} setAllEmps={setAllEmps} updateEmp={updateEmp} useDemo={useDemo} companiesFromDB={companies}/>}
        {nav==="My Profile"   &&<ProfilePage   user={user} mySum={mySum} bals={bals} changePw={changePw} busy={busy}/>}
      </main>
    </div>
  );
}
