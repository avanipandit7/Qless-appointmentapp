import { useState, useEffect, useRef, useCallback } from "react";

// ─── DATA ───────────────────────────────────────────────────────────────────

const DOCTORS = [
  { id: 1, name: "Dr. Priya Sharma",   spec: "Cardiologist",  quals: ["MBBS","MD","DM Cardiology"],         hospital: "Sancheti Hospital",        dist: "1.2 km", rating: 4.9, queue: 7,  avgMin: 15, exp: "15 yrs", img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&h=120&fit=crop&crop=face", fee: "₹800",  available: true },
  { id: 2, name: "Dr. Rohit Mehta",    spec: "Neurologist",   quals: ["MBBS","MD","DM Neurology"],          hospital: "Ruby Hall Clinic",         dist: "2.0 km", rating: 4.8, queue: 3,  avgMin: 20, exp: "12 yrs", img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&h=120&fit=crop&crop=face", fee: "₹1000", available: true },
  { id: 3, name: "Dr. Anjali Desai",   spec: "Dermatologist", quals: ["MBBS","MD Dermatology"],             hospital: "Sahyadri Hospital",        dist: "0.8 km", rating: 4.7, queue: 12, avgMin: 10, exp: "8 yrs",  img: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=120&h=120&fit=crop&crop=face", fee: "₹600",  available: true },
  { id: 4, name: "Dr. Vikram Joshi",   spec: "Orthopedic",    quals: ["MBBS","MS Ortho","DNB"],             hospital: "KEM Hospital",             dist: "3.1 km", rating: 4.9, queue: 5,  avgMin: 25, exp: "18 yrs", img: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=120&h=120&fit=crop&crop=face", fee: "₹900",  available: true },
  { id: 5, name: "Dr. Sneha Kulkarni", spec: "Pediatrician",  quals: ["MBBS","MD Pediatrics","DNB"],        hospital: "Deenanath Mangeshkar",     dist: "1.5 km", rating: 4.8, queue: 9,  avgMin: 12, exp: "10 yrs", img: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=120&h=120&fit=crop&crop=face", fee: "₹700",  available: true },
  { id: 6, name: "Dr. Amol Patil",     spec: "General",       quals: ["MBBS","MD General Medicine"],        hospital: "Poona Hospital",           dist: "0.5 km", rating: 4.6, queue: 15, avgMin: 8,  exp: "6 yrs",  img: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=120&h=120&fit=crop&crop=face", fee: "₹400",  available: true },
];

const RESTAURANTS = [
  { id: 1, name: "Babylon",  cuisine: "Continental", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop", rating: 4.8, wait: 20, seats: 4,  queue: 3, priceRange: "₹₹₹",  tags: ["Fine Dining","Rooftop"] },
  { id: 2, name: "Veranda",  cuisine: "Indian",      img: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=200&fit=crop", rating: 4.7, wait: 10, seats: 8,  queue: 6, priceRange: "₹₹",   tags: ["Family","Buffet"] },
  { id: 3, name: "Ginko",    cuisine: "Japanese",    img: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&h=200&fit=crop", rating: 4.9, wait: 35, seats: 2,  queue: 9, priceRange: "₹₹₹₹", tags: ["Sushi","Sake Bar"] },
  { id: 4, name: "Bastian",  cuisine: "Continental", img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=200&fit=crop", rating: 4.6, wait: 15, seats: 6,  queue: 2, priceRange: "₹₹₹",  tags: ["Pasta","Pizza","Wine"] },
];

const TIMES        = ["09:00","09:30","10:00","10:30","11:00","11:30","02:00","02:30","03:00","03:30","04:00","04:30"];
const BOOKED_SLOTS = ["09:30","11:00","03:30"];
const REST_TIMES   = ["12:00","12:30","01:00","01:30","07:00","07:30","08:00","08:30","09:00"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getDates() {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push({
      label: i === 0 ? "Today" : i === 1 ? "Tmrw" : d.toLocaleDateString("en-IN", { weekday: "short" }),
      day:   d.getDate(),
      full:  d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    });
  }
  return dates;
}

function waitStr(q, avgMin) {
  const w = q * avgMin;
  return w < 60 ? `${w}m` : `${Math.floor(w / 60)}h ${w % 60}m`;
}

function queueDotClass(q) {
  return q < 5 ? "queue-dot" : q < 10 ? "queue-dot busy" : "queue-dot full";
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
body{background:#05091a}

#ql-root{font-family:'Outfit',sans-serif;background:#05091a;color:#e2e8f0;min-height:100vh;overflow-x:hidden;position:relative}
#ql-root *::-webkit-scrollbar{width:4px}
#ql-root *::-webkit-scrollbar-track{background:#0d1428}
#ql-root *::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:4px}

/* NAV */
.ql-nav{position:sticky;top:0;z-index:100;background:rgba(5,9,26,0.92);backdrop-filter:blur(12px);border-bottom:1px solid #1e3058;padding:0 20px;display:flex;align-items:center;height:60px;gap:12px}
.ql-logo{font-size:22px;font-weight:800;background:linear-gradient(135deg,#06b6d4,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px;flex:1}
.ql-navbtn{background:none;border:none;color:#94a3b8;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;padding:6px 12px;border-radius:20px;cursor:pointer;transition:all .2s;white-space:nowrap}
.ql-navbtn.active{background:rgba(6,182,212,0.15);color:#06b6d4;border:1px solid rgba(6,182,212,0.3)}
.ql-navbtn:hover:not(.active){background:rgba(255,255,255,0.05);color:#e2e8f0}
.ql-bell{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid #1e3058;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;font-size:14px;flex-shrink:0}

/* HERO */
.hero{padding:28px 20px 20px;text-align:center;position:relative;overflow:hidden;max-width:560px;margin:0 auto}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(6,182,212,0.12),transparent);pointer-events:none}
.hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.25);color:#06b6d4;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;margin-bottom:12px;letter-spacing:0.5px;text-transform:uppercase}
.hero-badge span{width:6px;height:6px;background:#06b6d4;border-radius:50%;animation:pulse-dot 1.5s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
.hero h1{font-size:clamp(26px,5vw,44px);font-weight:800;line-height:1.1;margin-bottom:10px;letter-spacing:-1px}
.hero h1 span{background:linear-gradient(135deg,#06b6d4 20%,#10b981 80%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{color:#94a3b8;font-size:14px;max-width:380px;margin:0 auto 20px;line-height:1.6}

/* STATS */
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:380px;margin:0 auto 20px}
.stat-card{background:rgba(13,20,40,0.8);border:1px solid #1e3058;border-radius:14px;padding:12px 8px;text-align:center}
.stat-num{font-size:clamp(18px,3.5vw,28px);font-weight:800;color:#06b6d4;line-height:1}
.stat-num.green{color:#10b981}
.stat-num.amber{color:#f59e0b}
.stat-label{font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px}

/* SEARCH */
.search-bar{display:flex;align-items:center;gap:8px;background:#0d1428;border:1px solid #1e3058;border-radius:12px;padding:10px 14px;max-width:380px;margin:0 auto 20px;transition:border-color .2s}
.search-bar:focus-within{border-color:#06b6d4}
.search-bar input{flex:1;background:none;border:none;color:#e2e8f0;font-family:'Outfit',sans-serif;font-size:14px;outline:none}
.search-bar input::placeholder{color:#4a5568}
.search-icon{color:#4a5568;font-size:16px}

/* SECTION */
.section{padding:24px 16px}
.section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.section-title{font-size:17px;font-weight:700;color:#e2e8f0}
.see-all{font-size:12px;color:#06b6d4;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-weight:500}

/* DOCTOR CARDS */
.doc-grid{display:grid;grid-template-columns:1fr;gap:14px}
.doc-card{background:#0d1428;border:1px solid #1e3058;border-radius:18px;padding:16px;position:relative;overflow:hidden;cursor:pointer;transition:all .25s}
.doc-card::before{content:'';position:absolute;inset:-1px;border-radius:19px;background:linear-gradient(135deg,rgba(6,182,212,0.4),rgba(16,185,129,0.2),transparent,transparent);opacity:0;transition:opacity .3s;pointer-events:none}
.doc-card:hover::before{opacity:1}
.doc-card:hover{border-color:rgba(6,182,212,0.5);transform:translateY(-2px)}
.doc-top{display:flex;gap:14px;margin-bottom:12px}
.doc-avatar{width:58px;height:58px;border-radius:14px;object-fit:cover;flex-shrink:0;border:2px solid #1e3058}
.doc-info h3{font-size:15px;font-weight:700;margin-bottom:2px}
.doc-spec{font-size:12px;color:#06b6d4;font-weight:500;margin-bottom:6px}
.qual-tags{display:flex;flex-wrap:wrap;gap:4px}
.qtag{font-size:10px;background:rgba(6,182,212,0.1);color:#67e8f9;border:1px solid rgba(6,182,212,0.2);padding:2px 8px;border-radius:10px;font-weight:600}
.doc-meta{display:flex;align-items:center;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.meta-chip{display:flex;align-items:center;gap:4px;font-size:11px;color:#94a3b8;background:#111c35;padding:4px 8px;border-radius:8px}
.queue-bar{background:#111c35;border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid #1e3058}
.queue-info{display:flex;align-items:center;gap:8px}
.queue-dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;animation:pulse-dot 2s ease-in-out infinite;flex-shrink:0}
.queue-dot.busy{background:#f59e0b;box-shadow:0 0 8px #f59e0b}
.queue-dot.full{background:#ef4444;box-shadow:0 0 8px #ef4444}
.queue-text{font-size:12px;color:#94a3b8}
.queue-text strong{color:#e2e8f0;font-weight:700}
.queue-wait{font-size:11px;color:#06b6d4;font-weight:600;text-align:right}
.rating{display:flex;align-items:center;gap:4px;font-size:12px;color:#f59e0b;font-weight:600}
.spec-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;background:rgba(6,182,212,0.08);color:#06b6d4;padding:3px 8px;border-radius:8px;font-weight:500}

/* INTERACTIVE BUTTON */
.ibtn{position:relative;padding:8px 20px;border-radius:30px;border:1px solid rgba(6,182,212,0.4);background:transparent;color:#06b6d4;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;cursor:pointer;overflow:hidden;transition:all .3s;width:110px}
.ibtn-text{display:inline-block;transition:all .3s;transform:translateX(0);opacity:1}
.ibtn:hover .ibtn-text{transform:translateX(50px);opacity:0}
.ibtn-hover{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;gap:6px;color:#fff;transform:translateX(-50px);opacity:0;transition:all .3s;font-size:12px}
.ibtn:hover .ibtn-hover{transform:translateX(0);opacity:1}
.ibtn-bg{position:absolute;left:20%;top:40%;width:8px;height:8px;border-radius:50%;background:#06b6d4;transition:all .3s;transform:scale(1)}
.ibtn:hover .ibtn-bg{left:0;top:0;width:100%;height:100%;border-radius:30px;transform:scale(1.8);background:#06b6d4}

/* RESTAURANT CARDS */
.rest-card{background:#0d1428;border:1px solid #1e3058;border-radius:18px;overflow:hidden;cursor:pointer;transition:all .25s;position:relative}
.rest-card::before{content:'';position:absolute;inset:-1px;border-radius:19px;background:linear-gradient(135deg,rgba(16,185,129,0.4),rgba(6,182,212,0.2),transparent,transparent);opacity:0;transition:opacity .3s;pointer-events:none;z-index:1}
.rest-card:hover::before{opacity:1}
.rest-card:hover{border-color:rgba(16,185,129,0.5);transform:translateY(-2px)}
.rest-img{width:100%;height:130px;object-fit:cover;display:block;max-width:100%}
.rest-body{padding:14px}
.rest-name{font-size:15px;font-weight:700;margin-bottom:4px}
.rest-cuisine{font-size:12px;color:#94a3b8;margin-bottom:8px}
.rest-row{display:flex;align-items:center;justify-content:space-between}
.rest-chips{display:flex;gap:6px;flex-wrap:wrap}
.rchip{font-size:10px;padding:3px 8px;border-radius:8px;font-weight:600}
.rchip.green{background:rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.2)}
.rchip.amber{background:rgba(245,158,11,0.12);color:#fbbf24;border:1px solid rgba(245,158,11,0.2)}

/* MODAL */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.modal{background:#0d1428;border:1px solid #1e3058;border-radius:20px;padding:24px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto;animation:slideUp .3s ease}
@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.modal-title{font-size:18px;font-weight:700}
.close-btn{width:32px;height:32px;border-radius:50%;background:#111c35;border:1px solid #1e3058;color:#94a3b8;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;transition:all .2s}
.close-btn:hover{background:#1e3058;color:#e2e8f0}
.modal-doc-row{display:flex;gap:12px;align-items:center;background:#111c35;border-radius:14px;padding:12px;margin-bottom:20px;border:1px solid #1e3058}
.modal-doc-row img{width:44px;height:44px;border-radius:10px;object-fit:cover}
.modal-label{font-size:12px;color:#94a3b8;margin-bottom:8px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px}

/* DATE / TIME GRIDS */
.date-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:18px}
.date-btn{background:#111c35;border:1px solid #1e3058;border-radius:10px;padding:8px 4px;text-align:center;cursor:pointer;transition:all .2s;color:#94a3b8;font-family:'Outfit',sans-serif}
.date-btn:hover,.date-btn.sel{background:rgba(6,182,212,0.15);border-color:#06b6d4;color:#06b6d4}
.date-btn .dd{font-size:16px;font-weight:700;display:block;color:inherit}
.date-btn .dm{font-size:10px;display:block;margin-top:2px}
.time-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:20px}
.time-btn{background:#111c35;border:1px solid #1e3058;border-radius:8px;padding:8px;text-align:center;cursor:pointer;font-size:12px;font-weight:600;color:#94a3b8;font-family:'Outfit',sans-serif;transition:all .2s}
.time-btn:hover,.time-btn.sel{background:rgba(6,182,212,0.15);border-color:#06b6d4;color:#06b6d4}
.time-btn.disabled{opacity:0.35;cursor:not-allowed}
.confirm-btn{width:100%;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all .25s;letter-spacing:0.3px}
.confirm-btn:hover{transform:scale(1.02);box-shadow:0 8px 24px rgba(6,182,212,0.3)}
.confirm-btn:disabled{opacity:0.4;cursor:not-allowed;transform:none}

/* SUCCESS */
.success-screen{text-align:center;padding:20px 0}
.success-icon{width:64px;height:64px;background:rgba(16,185,129,0.15);border:2px solid #10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;animation:pop .4s ease}
@keyframes pop{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}

/* QUEUE TRACKER */
.queue-tracker{background:linear-gradient(135deg,#0d1e3d,#0f2a35);border:1px solid #1e3a5f;border-radius:18px;padding:20px;margin:0 16px 20px}
.qt-header{font-size:13px;color:#94a3b8;margin-bottom:14px;font-weight:500}
.queue-visual{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.q-person{width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;transition:all .3s}
.q-person.waiting{background:rgba(6,182,212,0.2);border:1px solid rgba(6,182,212,0.3);color:#67e8f9}
.q-person.current{background:#06b6d4;border:1px solid #67e8f9;animation:currentPulse 1.5s ease-in-out infinite}
@keyframes currentPulse{0%,100%{box-shadow:0 0 0 0 rgba(6,182,212,0.5)}50%{box-shadow:0 0 0 6px rgba(6,182,212,0)}}
.q-person.done{background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.2);color:#34d399}
.q-person.you{background:linear-gradient(135deg,#f59e0b,#d97706);border:2px solid #fbbf24;animation:youPulse 1.5s ease-in-out infinite}
@keyframes youPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.5)}50%{box-shadow:0 0 0 6px rgba(245,158,11,0)}}
.qt-stats{display:flex;gap:10px}
.qt-stat{flex:1;background:rgba(0,0,0,0.2);border-radius:10px;padding:10px;border:1px solid rgba(255,255,255,0.05)}
.qt-stat-v{font-size:20px;font-weight:800;color:#06b6d4}
.qt-stat-v.amber{color:#f59e0b}
.qt-stat-l{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px}

/* FEATURES */
.features-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.feat-card{background:#0d1428;border:1px solid #1e3058;border-radius:14px;padding:14px;transition:all .25s}
.feat-card:hover{border-color:rgba(6,182,212,0.4);background:#0f1e3a}
.feat-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;font-size:18px}
.feat-icon.cyan{background:rgba(6,182,212,0.12);color:#06b6d4}
.feat-icon.green{background:rgba(16,185,129,0.12);color:#10b981}
.feat-icon.amber{background:rgba(245,158,11,0.12);color:#f59e0b}
.feat-icon.purple{background:rgba(139,92,246,0.12);color:#a78bfa}
.feat-title{font-size:13px;font-weight:700;margin-bottom:4px}
.feat-desc{font-size:11px;color:#64748b;line-height:1.5}

/* FILTER CHIPS */
.filter-row{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;scrollbar-width:none}
.filter-row::-webkit-scrollbar{display:none}
.f-chip{flex-shrink:0;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;border:1px solid #1e3058;background:#0d1428;color:#94a3b8;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .2s;white-space:nowrap}
.f-chip.active{background:rgba(6,182,212,0.15);border-color:#06b6d4;color:#06b6d4}
.f-chip:hover:not(.active){border-color:#2e4068;color:#e2e8f0}

/* BOOKING BANNER */
.booking-banner{background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,182,212,0.08));border:1px solid rgba(16,185,129,0.25);border-radius:14px;padding:12px 14px;margin:0 16px 16px;display:flex;align-items:center;gap:10px;animation:slideDown .4s ease}
@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
.bb-dot{width:8px;height:8px;border-radius:50%;background:#10b981;flex-shrink:0;animation:pulse-dot 1.5s infinite}

/* FADE IN */
.fade-in{opacity:0;transform:translateY(24px);transition:opacity .5s ease,transform .5s ease}
.fade-in.visible{opacity:1;transform:translateY(0)}

@media(max-width:480px){
  .hero h1{font-size:28px}
  .stats-row{grid-template-columns:repeat(3,1fr)}
  .doc-grid{grid-template-columns:1fr}
}
`;

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function QueueVisual({ total, yourPos }) {
  const items = [];
  const max = Math.min(total + 2, 15);
  for (let i = 1; i <= max; i++) {
    if (i < yourPos - 1)      items.push(<div key={i} className="q-person done">✓</div>);
    else if (i === yourPos-1) items.push(<div key={i} className="q-person current">→</div>);
    else if (i === yourPos)   items.push(<div key={i} className="q-person you">Y</div>);
    else                      items.push(<div key={i} className="q-person waiting">{i}</div>);
  }
  return <div className="queue-visual">{items}</div>;
}

function DocCard({ doc, onBook }) {
  const w = waitStr(doc.queue, doc.avgMin);
  return (
    <div className="doc-card" onClick={() => onBook(doc)}>
      <div className="doc-top">
        <img className="doc-avatar" src={doc.img} alt={doc.name}
          onError={e => { e.target.src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&h=120&fit=crop"; }} />
        <div>
          <h3>{doc.name}</h3>
          <div className="spec-badge">{doc.spec}</div>
          <div style={{ marginTop: 6 }} className="qual-tags">
            {doc.quals.map(q => <span key={q} className="qtag">{q}</span>)}
          </div>
        </div>
      </div>
      <div className="doc-meta">
        <span className="meta-chip">{doc.dist}</span>
        <span className="meta-chip">★ {doc.rating}</span>
        <span className="meta-chip">{doc.hospital.split(" ")[0]}</span>
        <span className="meta-chip">{doc.exp}</span>
        <span className="meta-chip" style={{ color: "#f59e0b" }}>{doc.fee}</span>
      </div>
      <div className="queue-bar">
        <div className="queue-info">
          <span className={queueDotClass(doc.queue)}></span>
          <div className="queue-text"><strong>{doc.queue}</strong> in queue</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="queue-wait">~{w} wait</div>
          <button className="ibtn" onClick={e => { e.stopPropagation(); onBook(doc); }}>
            <span className="ibtn-text">Book</span>
            <div className="ibtn-hover"><span>Book</span><span>→</span></div>
            <div className="ibtn-bg"></div>
          </button>
        </div>
      </div>
    </div>
  );
}

function RestCard({ r, onBook }) {
  return (
    <div className="rest-card" onClick={() => onBook(r)}>
      <img className="rest-img" src={r.img} alt={r.name}
        onError={e => { e.target.src = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop"; }} />
      <div className="rest-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="rest-name">{r.name}</div>
            <div className="rest-cuisine">{r.cuisine} • {r.priceRange}</div>
          </div>
          <div className="rating">⭐ {r.rating}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {r.tags.map(t => (
            <span key={t} style={{ fontSize: 10, color: "#94a3b8", background: "#111c35", padding: "2px 7px", borderRadius: 6 }}>{t}</span>
          ))}
        </div>
        <div className="rest-row">
          <div className="rest-chips">
            <span className={`rchip ${r.queue < 5 ? "green" : "amber"}`}>{r.queue} waiting</span>
            <span className={`rchip ${r.wait < 15 ? "green" : "amber"}`}>~{r.wait}m wait</span>
            <span className="rchip green">{r.seats} seats avail</span>
          </div>
          <button className="ibtn" style={{ background: "transparent", borderColor: "rgba(16,185,129,0.4)", color: "#10b981" }}
            onClick={e => { e.stopPropagation(); onBook(r); }}>
            <span className="ibtn-text">Reserve</span>
            <div className="ibtn-hover" style={{ color: "#fff" }}><span>Book</span><span>→</span></div>
            <div className="ibtn-bg" style={{ background: "#10b981" }}></div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING MODAL ───────────────────────────────────────────────────────────

function BookingModal({ doc, onClose, onConfirm }) {
  const [selDate, setSelDate]   = useState(null);
  const [selTime, setSelTime]   = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [summary, setSummary]   = useState(null);

  const dates = getDates();
  const wait  = doc.queue * doc.avgMin;
  const wStr  = wait < 60 ? `${wait} mins` : `${Math.floor(wait/60)}h ${wait%60}m`;

  const handleConfirm = () => {
    const pos = doc.queue + 1;
    setSummary({ doc, date: selDate, time: selTime, pos });
    setConfirmed(true);
    onConfirm({ doc, date: selDate, time: selTime, pos });
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {!confirmed ? (
          <>
            <div className="modal-header">
              <div className="modal-title">Book Appointment</div>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="modal-doc-row">
              <img src={doc.img} alt={doc.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }}
                onError={e => { e.target.src = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&h=120&fit=crop"; }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{doc.name}</div>
                <div style={{ fontSize: 12, color: "#06b6d4" }}>{doc.spec}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{doc.hospital} • {doc.fee}/visit</div>
              </div>
            </div>
            <div style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: 12, padding: "10px 12px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <div className={queueDotClass(doc.queue)}></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{doc.queue} people waiting</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Estimated wait: ~{wStr}</div>
              </div>
            </div>
            <div className="modal-label">Select Date</div>
            <div className="date-grid">
              {dates.map(d => (
                <button key={d.full} className={`date-btn${selDate === d.full ? " sel" : ""}`} onClick={() => setSelDate(d.full)}>
                  <span className="dd">{d.day}</span>
                  <span className="dm">{d.label}</span>
                </button>
              ))}
            </div>
            <div className="modal-label">Select Time</div>
            <div className="time-grid">
              {TIMES.map(t => (
                <button key={t} className={`time-btn${BOOKED_SLOTS.includes(t) ? " disabled" : ""}${selTime === t ? " sel" : ""}`}
                  disabled={BOOKED_SLOTS.includes(t)} onClick={() => !BOOKED_SLOTS.includes(t) && setSelTime(t)}>
                  {t}
                </button>
              ))}
            </div>
            <button className="confirm-btn" disabled={!selDate || !selTime} onClick={handleConfirm}>
              Confirm Appointment
            </button>
          </>
        ) : (
          <div className="success-screen">
            <div className="success-icon"><span style={{ fontSize: 28 }}>✓</span></div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Booking Confirmed!</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
              Appointment with {summary.doc.name} on {summary.date}
            </div>
            <div style={{ background: "#111c35", borderRadius: 14, padding: 14, border: "1px solid #1e3058", marginBottom: 20, textAlign: "left" }}>
              {[
                ["Doctor", summary.doc.name],
                ["Specialty", summary.doc.spec],
                ["Hospital", summary.doc.hospital],
                ["Date", summary.date],
                ["Time", summary.time],
                ["Fee", summary.doc.fee, "#10b981"],
                ["Queue Position", `#${summary.pos}`, "#f59e0b"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#64748b" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: color || "#e2e8f0" }}>{val}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
              You'll receive a notification 30 mins before your turn. Track your queue position on the home screen.
            </div>
            <button className="confirm-btn" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RESTAURANT MODAL ────────────────────────────────────────────────────────

function RestModal({ rest, onClose }) {
  const [selGuests,   setSelGuests]   = useState(null);
  const [selDate,     setSelDate]     = useState(null);
  const [selTime,     setSelTime]     = useState(null);
  const [confirmed,   setConfirmed]   = useState(false);

  const dates = getDates();

  const handleConfirm = () => setConfirmed(true);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {!confirmed ? (
          <>
            <div className="modal-header">
              <div className="modal-title">Reserve Table</div>
              <button className="close-btn" onClick={onClose}>×</button>
            </div>
            <div className="modal-doc-row">
              <img src={rest.img} alt={rest.name} style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{rest.name}</div>
                <div style={{ fontSize: 12, color: "#10b981" }}>{rest.cuisine} • {rest.priceRange}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>⭐{rest.rating} • ~{rest.wait}m wait</div>
              </div>
            </div>
            <div className="modal-label">Number of Guests</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 18 }}>
              {[1,2,3,4,5,6,7,8].map(n => (
                <button key={n} className={`date-btn${selGuests === n ? " sel" : ""}`} onClick={() => setSelGuests(n)}>
                  {n}{n === 8 ? "+" : ""}
                  <span style={{ fontSize: 9, display: "block", color: "#64748b" }}>guest{n > 1 ? "s" : ""}</span>
                </button>
              ))}
            </div>
            <div className="modal-label">Select Date</div>
            <div className="date-grid">
              {dates.map(d => (
                <button key={d.full} className={`date-btn${selDate === d.full ? " sel" : ""}`} onClick={() => setSelDate(d.full)}>
                  <span className="dd">{d.day}</span>
                  <span className="dm">{d.label}</span>
                </button>
              ))}
            </div>
            <div className="modal-label">Preferred Time</div>
            <div className="time-grid">
              {REST_TIMES.map(t => (
                <button key={t} className={`time-btn${selTime === t ? " sel" : ""}`} onClick={() => setSelTime(t)}>{t}</button>
              ))}
            </div>
            <button className="confirm-btn" disabled={!selGuests || !selDate || !selTime} onClick={handleConfirm}>
              Confirm Reservation
            </button>
          </>
        ) : (
          <div className="success-screen">
            <div className="success-icon"><span style={{ fontSize: 28 }}>✓</span></div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Table Reserved!</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
              Table for {selGuests} at {rest.name} on {selDate}
            </div>
            <div style={{ background: "#111c35", borderRadius: 14, padding: 14, border: "1px solid #1e3058", marginBottom: 20, textAlign: "left" }}>
              {[
                ["Restaurant", rest.name],
                ["Cuisine", rest.cuisine],
                ["Date", selDate],
                ["Time", selTime],
                ["Guests", selGuests, "#e2e8f0"],
                ["Est. Wait", `~${rest.wait} mins`, "#f59e0b"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: "#64748b" }}>{label}</span>
                  <span style={{ fontWeight: 600, color: color || "#e2e8f0" }}>{val}</span>
                </div>
              ))}
            </div>
            <button className="confirm-btn" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TABS ────────────────────────────────────────────────────────────────────

function HomeTab({ lastBooking, onBook, onShowDoctors }) {
  const [docCount, setDocCount] = useState(0);
  const [apptCount, setApptCount] = useState(0);
  const [queueAhead, setQueueAhead] = useState(null);
  const [queueTotal, setQueueTotal] = useState(12);
  const [homeSearch, setHomeSearch] = useState("");

  // Counter animation
  useEffect(() => {
    let d = 0, a = 0;
    const step = setInterval(() => {
      d = Math.min(d + 7, 247);
      a = Math.min(a + 47, 1842);
      setDocCount(d);
      setApptCount(a);
      if (d >= 247 && a >= 1842) clearInterval(step);
    }, 30);
    return () => clearInterval(step);
  }, []);

  // Sync queue from lastBooking
  useEffect(() => {
    if (lastBooking) setQueueAhead(lastBooking.pos - 1);
  }, [lastBooking]);

  // Live queue simulation
  useEffect(() => {
    if (!lastBooking) return;
    const iv = setInterval(() => {
      if (Math.random() < 0.3) {
        setQueueAhead(v => (v > 0 ? v - 1 : v));
        setQueueTotal(v => Math.max(v - 1, 1));
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [lastBooking]);

  const handleSearch = (v) => {
    setHomeSearch(v);
    if (v.trim()) onShowDoctors(v);
  };

  return (
    <>
      <div className="hero">
        <div className="hero-badge"><span></span>Live Queue Updates</div>
        <h1>Skip the Wait,<br /><span>Not the Care</span></h1>
        <p>Real-time appointment booking with live queue tracking. Know your exact wait time before you arrive.</p>
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-num">{docCount.toLocaleString()}</div>
            <div className="stat-label">Doctors</div>
          </div>
          <div className="stat-card">
            <div className="stat-num green">{apptCount.toLocaleString()}</div>
            <div className="stat-label">Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-num amber">~12</div>
            <div className="stat-label">Avg Wait</div>
          </div>
        </div>
        <div className="search-bar">
          <span className="search-icon"><span className="search-icon">🔍</span>#128269;</span>
          <input type="text" placeholder="Search doctors, hospitals, specialties..." value={homeSearch}
            onChange={e => handleSearch(e.target.value)} />
        </div>
      </div>

      {lastBooking && (
        <div className="booking-banner">
          <div className="bb-dot"></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>Appointment Confirmed!</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {lastBooking.doc.name} • {lastBooking.date} at {lastBooking.time} • Queue #{lastBooking.pos}
            </div>
          </div>
        </div>
      )}

      {lastBooking && (
        <div className="queue-tracker">
          <div className="qt-header">
            Your Queue Position — {lastBooking.doc.name}{" "}
            <span style={{ color: "#06b6d4", fontWeight: 700 }}>#{lastBooking.pos}</span>
          </div>
          <QueueVisual total={queueTotal} yourPos={lastBooking.pos} />
          <div className="qt-stats">
            <div className="qt-stat">
              <div className="qt-stat-v">{queueAhead}</div>
              <div className="qt-stat-l">Before You</div>
            </div>
            <div className="qt-stat">
              <div className="qt-stat-v amber">~{(queueAhead ?? lastBooking.pos - 1) * lastBooking.doc.avgMin}m</div>
              <div className="qt-stat-l">Est. Wait</div>
            </div>
            <div className="qt-stat">
              <div className="qt-stat-v" style={{ color: "#a78bfa" }}>{lastBooking.time}</div>
              <div className="qt-stat-l">Your Slot</div>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <div className="section-title">Nearby Doctors</div>
          <button className="see-all" onClick={() => onShowDoctors("")}>See all →</button>
        </div>
        <div className="doc-grid">
          {DOCTORS.slice(0, 3).map(d => <DocCard key={d.id} doc={d} onBook={onBook} />)}
        </div>
      </div>
    </>
  );
}

function DoctorsTab({ initialSearch, onBook }) {
  const [search, setSearch] = useState(initialSearch || "");
  const [activeSpec, setActiveSpec] = useState("All");

  useEffect(() => { if (initialSearch) setSearch(initialSearch); }, [initialSearch]);

  const specs = ["All","Cardiologist","Dermatologist","Neurologist","Orthopedic","Pediatrician","General"];
  const specLabels = { All:"All", Cardiologist:"Cardiology", Dermatologist:"Dermatology",
    Neurologist:"Neurology", Orthopedic:"Orthopedic", Pediatrician:"Pediatrics", General:"General" };

  const filtered = DOCTORS.filter(d => {
    const ms = activeSpec === "All" || d.spec === activeSpec;
    const mq = !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.spec.toLowerCase().includes(search.toLowerCase()) ||
      d.hospital.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  });

  return (
    <>
      <div style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Find a Doctor</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Pune, Maharashtra — 127 available today</div>
        <div className="search-bar">
          <span className="search-icon"><span className="search-icon">🔍</span>#128269;</span>
          <input type="text" placeholder="Search by name or specialty..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-row">
          {specs.map(s => (
            <button key={s} className={`f-chip${activeSpec === s ? " active" : ""}`} onClick={() => setActiveSpec(s)}>
              {specLabels[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="section" style={{ paddingTop: 0 }}>
        <div className="doc-grid">
          {filtered.length > 0
            ? filtered.map(d => <DocCard key={d.id} doc={d} onBook={onBook} />)
            : <div style={{ color: "#64748b", textAlign: "center", padding: "40px 20px" }}>No doctors found matching your search.</div>
          }
        </div>
      </div>
    </>
  );
}

function RestaurantsTab({ onBook }) {
  const [search, setSearch]         = useState("");
  const [activeCuisine, setCuisine] = useState("All");

  const cuisines = ["All","Indian","Italian","Chinese","Japanese","Continental"];
  const cuisineLabels = { All:"All", Indian:"Indian", Italian:"Italian",
    Chinese:"Chinese", Japanese:"Japanese", Continental:"Continental" };

  const filtered = RESTAURANTS.filter(r => {
    const mc = activeCuisine === "All" || r.cuisine === activeCuisine;
    const ms = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisine.toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  return (
    <>
      <div style={{ padding: "20px 16px 8px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Reserve a Table</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Pune — 18 restaurants open now</div>
        <div className="search-bar">
          <span className="search-icon"><span className="search-icon">🔍</span>#128269;</span>
          <input type="text" placeholder="Search restaurants or cuisine..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="filter-row">
          {cuisines.map(c => (
            <button key={c} className={`f-chip${activeCuisine === c ? " active" : ""}`} onClick={() => setCuisine(c)}>
              {cuisineLabels[c]}
            </button>
          ))}
        </div>
      </div>
      <div className="section" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          {filtered.length > 0
            ? filtered.map(r => <RestCard key={r.id} r={r} onBook={onBook} />)
            : <div style={{ color: "#64748b", textAlign: "center", padding: "40px 20px" }}>No restaurants found.</div>
          }
        </div>
      </div>
    </>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab,    setActiveTab]    = useState("home");
  const [bookingDoc,   setBookingDoc]   = useState(null);
  const [bookingRest,  setBookingRest]  = useState(null);
  const [lastBooking,  setLastBooking]  = useState(null);
  const [docSearch,    setDocSearch]    = useState("");

  const showDoctors = useCallback((search = "") => {
    setDocSearch(search);
    setActiveTab("doctors");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBookConfirm = useCallback((booking) => {
    setLastBooking(booking);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div id="ql-root">
        <nav className="ql-nav">
          <div className="ql-logo">Q<span style={{ color: "#10b981", WebkitTextFillColor: "#10b981" }}>Less</span></div>
          {[["home","Home"],["doctors","Doctors"],["restaurants","Dining"]].map(([id, label]) => (
            <button key={id} className={`ql-navbtn${activeTab === id ? " active" : ""}`}
              onClick={() => { setActiveTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              {label}
            </button>
          ))}
          <div className="ql-bell">&#x1F514;</div>
        </nav>

        {activeTab === "home" && (
          <HomeTab lastBooking={lastBooking} onBook={setBookingDoc} onShowDoctors={showDoctors} />
        )}
        {activeTab === "doctors" && (
          <DoctorsTab initialSearch={docSearch} onBook={setBookingDoc} />
        )}
        {activeTab === "restaurants" && (
          <RestaurantsTab onBook={setBookingRest} />
        )}

        {bookingDoc && (
          <BookingModal doc={bookingDoc} onClose={() => setBookingDoc(null)} onConfirm={handleBookConfirm} />
        )}
        {bookingRest && (
          <RestModal rest={bookingRest} onClose={() => setBookingRest(null)} />
        )}
      </div>
    </>
  );
}