import { useState, useEffect, useRef, useCallback } from "react";

// ─── API FUNCTIONS ───────────────────────────────────────────────────────────

const API_BASES = [
  "/api",
  process.env.REACT_APP_API_URL,
  "http://localhost:5000/api",
  "http://127.0.0.1:5000/api"
].filter(Boolean);

function buildApiUrl(base, path) {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function normalizeValue(value) {
  return (value || "").toString().trim().toLowerCase();
}

function sanitizeUserInfo(userInfo) {
  return {
    name: (userInfo?.name || "User").toString().trim(),
    email: normalizeValue(userInfo?.email || "user@example.com"),
    phone: (userInfo?.phone || "1234567890").toString().trim(),
  };
}

function isSameUser(record, currentUser, keys) {
  const email = normalizeValue(record?.[keys.email]);
  const phone = normalizeValue(record?.[keys.phone]);
  const name = normalizeValue(record?.[keys.name]);

  const currentEmail = normalizeValue(currentUser?.email);
  const currentPhone = normalizeValue(currentUser?.phone);
  const currentName = normalizeValue(currentUser?.name);

  const emailMatch = email && currentEmail && email === currentEmail;
  const phoneMatch = phone && currentPhone && phone === currentPhone;
  const nameMatch = name && currentName && name === currentName;

  // Prefer stable identifiers (email/phone). Name is fallback for older rows.
  return emailMatch || phoneMatch || nameMatch;
}

async function apiRequest(path, options = {}) {
  let lastError = null;
  let lastResponseError = null;
  let sawNetworkError = false;

  for (let i = 0; i < API_BASES.length; i++) {
    const base = API_BASES[i];
    const isLastBase = i === API_BASES.length - 1;
    const url = buildApiUrl(base, path);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);

      let payload = null;
      const text = await response.text();
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        const fallbackError = text
          ? text.slice(0, 160).replace(/\s+/g, " ").trim()
          : null;

        lastResponseError = {
          ok: false,
          status: response.status,
          data: payload,
          error: payload?.error || fallbackError || `Request failed with status ${response.status}`,
        };

        // Retry next base when dev proxy fails or route is unavailable.
        const canRetryOnThisBase = !isLastBase && (
          response.status === 404 ||
          (response.status >= 500 && base === "/api")
        );

        if (canRetryOnThisBase) {
          continue;
        }

        return lastResponseError;
      }

      return { ok: true, status: response.status, data: payload };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      sawNetworkError = true;
    }
  }

  if (sawNetworkError && lastError) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: lastError?.name === "AbortError"
        ? "API request timed out. Please check backend server."
        : "Cannot reach API server. Start backend and verify port 5000.",
    };
  }

  if (lastResponseError) {
    return lastResponseError;
  }

  return {
    ok: false,
    status: 0,
    data: null,
    error: lastError?.name === "AbortError"
      ? "API request timed out. Please check backend server."
      : "Cannot reach API server. Start backend and verify port 5000.",
  };
}

// Convert date string like "18 Mar" to "2026-03-18"
function formatDateForDB(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  const [day, month] = dateStr.split(" ");
  const months = { "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5, 
                   "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11 };
  const date = new Date(now.getFullYear(), months[month], parseInt(day));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Convert time like "10:00" to "10:00:00"
function formatTimeForDB(timeStr) {
  if (!timeStr) return null;
  return timeStr + ":00";
}

async function saveAppointment(doctorId, doctorName, specialty, hospital, fee, date, time, userInfo) {
  try {
    console.log("=== SAVING APPOINTMENT ===");
    
    const formattedDate = formatDateForDB(date);
    const formattedTime = formatTimeForDB(time);
    
    console.log("Formatted Date:", formattedDate);
    console.log("Formatted Time:", formattedTime);
    
    if (!formattedDate || !formattedTime) {
      return { success: false, error: "Invalid date or time format" };
    }
    
    const normalizedUser = sanitizeUserInfo(userInfo);

    const response = await apiRequest("/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_id: doctorId,
        doctor_name: doctorName,
        specialty: specialty,
        hospital: hospital,
        fee: fee,
        patient_name: normalizedUser.name,
        patient_email: normalizedUser.email,
        patient_phone: normalizedUser.phone,
        appointment_date: formattedDate,
        appointment_time: formattedTime
      })
    });
    
    console.log("Response status:", response.status);
    
    if (!response.ok) {
      console.error("API Error:", response.error);
      return { success: false, error: response.error || "Failed to book appointment" };
    }
    
    const result = response.data || {};
    console.log("✓ Appointment saved successfully:", result);
    return { success: true, ...result };
  } catch (error) {
    console.error("✗ Error saving appointment:", error.message);
    return { success: false, error: error.message };
  }
}

async function saveReservation(restaurantId, restaurantName, cuisine, date, time, partySize, userInfo) {
  try {
    console.log("=== SAVING RESERVATION ===");
    
    const formattedDate = formatDateForDB(date);
    const formattedTime = formatTimeForDB(time);
    
    console.log("Formatted Date:", formattedDate);
    console.log("Formatted Time:", formattedTime);
    
    if (!formattedDate || !formattedTime) {
      return { success: false, error: "Invalid date or time format" };
    }
    
    const normalizedUser = sanitizeUserInfo(userInfo);

    const response = await apiRequest("/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        cuisine: cuisine,
        customer_name: normalizedUser.name,
        customer_email: normalizedUser.email,
        customer_phone: normalizedUser.phone,
        reservation_date: formattedDate,
        reservation_time: formattedTime,
        party_size: partySize
      })
    });
    
    console.log("Response status:", response.status);
    
    if (!response.ok) {
      console.error("API Error:", response.error);
      return { success: false, error: response.error || "Failed to make reservation" };
    }
    
    const result = response.data || {};
    console.log("✓ Reservation saved successfully:", result);
    return { success: true, ...result };
  } catch (error) {
    console.error("✗ Error saving reservation:", error.message);
    return { success: false, error: error.message };
  }
}

// ─── DATA ───────────────────────────────────────────────────────────────────

const DOCTORS = [
  { id: 1, name: "Dr. Priya Sharma",   spec: "Cardiologist",  quals: ["MBBS","MD","DM Cardiology"],         hospital: "Sancheti Hospital",        dist: "1.2 km", rating: 4.9, queue: 7,  avgMin: 15, exp: "15 yrs", img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&h=120&fit=crop&crop=face", fee: "₹800",  available: true },
  { id: 2, name: "Dr. Rohit Mehta",    spec: "Neurologist",   quals: ["MBBS","MD","DM Neurology"],          hospital: "Ruby Hall Clinic",         dist: "2.0 km", rating: 4.8, queue: 3,  avgMin: 20, exp: "12 yrs", img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=120&h=120&fit=crop&crop=face", fee: "₹1000", available: true },
  { id: 3, name: "Dr. Anjali Desai",   spec: "Dermatologist", quals: ["MBBS","MD Dermatology"],             hospital: "Sahyadri Hospital",        dist: "0.8 km", rating: 4.7, queue: 12, avgMin: 10, exp: "8 yrs",  img: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=120&h=120&fit=crop&crop=face", fee: "₹600",  available: true },
  { id: 4, name: "Dr. Vikram Joshi",   spec: "Orthopedic",    quals: ["MBBS","MS Ortho","DNB"],             hospital: "KEM Hospital",             dist: "3.1 km", rating: 4.9, queue: 5,  avgMin: 25, exp: "18 yrs", img: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=120&h=120&fit=crop&crop=face", fee: "₹900",  available: true },
  { id: 5, name: "Dr. Sneha Kulkarni", spec: "Pediatrician",  quals: ["MBBS","MD Pediatrics","DNB"],        hospital: "Deenanath Mangeshkar",     dist: "1.5 km", rating: 4.8, queue: 9,  avgMin: 12, exp: "10 yrs", img: "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=120&h=120&fit=crop&crop=face", fee: "₹700",  available: true },
  { id: 6, name: "Dr. Amol Patil",     spec: "General",       quals: ["MBBS","MD General Medicine"],        hospital: "Poona Hospital",           dist: "0.5 km", rating: 4.6, queue: 15, avgMin: 8,  exp: "6 yrs",  img: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=120&h=120&fit=crop&crop=face", fee: "₹400",  available: true },
  { id: 7, name: "Dr. Rucha Vaidya",   spec: "Physiotherapist", quals: ["MS Physiotherapy"],                 hospital: "Chellaram",               dist: "2.3 km", rating: 4.7, queue: 6,  avgMin: 18, exp: "10 yrs", img: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=120&h=120&fit=crop&crop=face", fee: "₹800",  available: true },
];

const RESTAURANTS = [
  { id: 5, name: "Sassy Spoon", cuisine: "Continental", img: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=200&fit=crop", rating: 4.7, wait: 20, seats: 10, queue: 5, priceRange: "₹₹₹", tags: ["European","Bistro"] },
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
.ql-logo{font-size:32px;font-weight:800;background:linear-gradient(135deg,#06b6d4,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-0.5px;flex:1}
.ql-navbtn{background:none;border:none;color:#94a3b8;font-family:'Outfit',sans-serif;font-size:13px;font-weight:500;padding:6px 12px;border-radius:20px;cursor:pointer;transition:all .2s;white-space:nowrap}
.ql-navbtn.active{background:rgba(6,182,212,0.15);color:#06b6d4;border:1px solid rgba(6,182,212,0.3)}
.ql-navbtn:hover:not(.active){background:rgba(255,255,255,0.05);color:#e2e8f0}
.ql-bell{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.05);border:1px solid #1e3058;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;font-size:14px;flex-shrink:0}

/* HERO */
.hero{padding:28px 40px 20px;text-align:center;position:relative;overflow:hidden;width:100%}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(6,182,212,0.12),transparent);pointer-events:none}
.hero-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.25);color:#06b6d4;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;margin-bottom:12px;letter-spacing:0.5px;text-transform:uppercase}
.hero-badge span{width:6px;height:6px;background:#06b6d4;border-radius:50%;animation:pulse-dot 1.5s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}
.hero h1{font-size:clamp(36px,8vw,56px);font-weight:800;line-height:1.1;margin-bottom:10px;letter-spacing:-1px}
.hero h1 span{background:linear-gradient(135deg,#06b6d4 20%,#10b981 80%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero p{color:#94a3b8;font-size:14px;margin:0 auto 20px;line-height:1.6}

/* STATS */
.stats-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 auto 20px;max-width:600px}
.stat-card{background:rgba(13,20,40,0.8);border:1px solid #1e3058;border-radius:14px;padding:12px 8px;text-align:center}
.stat-num{font-size:clamp(18px,3.5vw,28px);font-weight:800;color:#06b6d4;line-height:1}
.stat-num.green{color:#10b981}
.stat-num.amber{color:#f59e0b}
.stat-label{font-size:11px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px}

/* SEARCH */
.search-bar{display:flex;align-items:center;gap:8px;background:#0d1428;border:1px solid #1e3058;border-radius:12px;padding:10px 14px;max-width:600px;margin:0 auto 20px;transition:border-color .2s}
.search-bar:focus-within{border-color:#06b6d4}
.search-bar input{flex:1;background:none;border:none;color:#e2e8f0;font-family:'Outfit',sans-serif;font-size:14px;outline:none}
.search-bar input::placeholder{color:#4a5568}
.search-icon{color:#4a5568;font-size:16px}

/* SECTION */
.section{padding:24px 40px}
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
.doc-avatar{width:58px;height:58px;border-radius:14px;flex-shrink:0;border:2px solid #1e3058;display:flex;align-items:center;justify-content:center;background:rgba(6,182,212,0.12);color:#06b6d4;}
.doc-avatar svg{width:28px;height:28px;}
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
.rest-card{background:#0d1428;border:1px solid #1e3058;border-radius:18px;overflow:hidden;cursor:pointer;transition:all .25s;position:relative;display:flex;flex-direction:row;align-items:stretch}
.rest-card::before{content:'';position:absolute;inset:-1px;border-radius:19px;background:linear-gradient(135deg,rgba(16,185,129,0.4),rgba(6,182,212,0.2),transparent,transparent);opacity:0;transition:opacity .3s;pointer-events:none;z-index:1}
.rest-card:hover::before{opacity:1}
.rest-card:hover{border-color:rgba(16,185,129,0.5);transform:translateY(-2px)}
.rest-img{width:120px;height:120px;object-fit:cover;display:block;flex-shrink:0;border-radius:0 14px 14px 0}
.rest-body{padding:14px;flex:1;display:flex;flex-direction:column;justify-content:space-between}
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
        <div className="doc-avatar">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="currentColor"/>
            <path d="M4 22c0-4.418 3.582-8 8-8s8 3.582 8 8v0H4z" fill="currentColor" opacity="0.7"/>
          </svg>
        </div>
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

function BookingModal({ doc, onClose, onConfirm, userInfo, onAddNotification }) {
  const [selDate, setSelDate]   = useState(null);
  const [selTime, setSelTime]   = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [summary, setSummary]   = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const dates = getDates();
  const wait  = doc.queue * doc.avgMin;
  const wStr  = wait < 60 ? `${wait} mins` : `${Math.floor(wait/60)}h ${wait%60}m`;

  const handleConfirm = async () => {
    // Validate selections
    if (!selDate || !selTime) {
      setSaveError("Please select both date and time");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    
    const pos = doc.queue + 1;
    
    try {
      // Save appointment to database
      console.log("DEBUG: Starting save with date:", selDate, "time:", selTime);
      const result = await saveAppointment(doc.id, doc.name, doc.spec, doc.hospital, doc.fee, selDate, selTime, userInfo);

      if (!result.success) {
        setSaveError(`Failed to save appointment: ${result.error}`);
        setIsSaving(false);
        return;
      }

      setSummary({ doc, date: selDate, time: selTime, pos, appointmentId: result.id });
      setConfirmed(true);

      // Keep booking success independent from notification update failures.
      try {
        onAddNotification({
          type: "appointment",
          appointmentId: result.id,
          doctorName: doc.name,
          specialty: doc.spec,
          hospital: doc.hospital,
          fee: doc.fee,
          date: selDate,
          time: selTime,
          queuePos: pos,
          userInfo: userInfo
        });
      } catch (notificationError) {
        console.error("Notification update error:", notificationError);
      }
      
      onConfirm({ doc, date: selDate, time: selTime, pos });
      setIsSaving(false);
    } catch (error) {
      console.error("Booking error:", error);
      setSaveError(`Error: ${error.message}`);
      setIsSaving(false);
    }
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
              <div className="doc-avatar" style={{ width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,182,212,0.2)", color: "#06b6d4" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="currentColor"/>
                <path d="M4 22c0-4.418 3.582-8 8-8s8 3.582 8 8v0H4z" fill="currentColor" opacity="0.7"/>
              </svg>
            </div>
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
            {saveError && (
              <div style={{
                marginBottom: 12,
                padding: "10px 12px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.35)",
                borderRadius: 10,
                color: "#fda4af",
                fontSize: 12,
                lineHeight: 1.4
              }}>
                {saveError}
              </div>
            )}
            <button className="confirm-btn" disabled={!selDate || !selTime || isSaving} onClick={handleConfirm}>
              {isSaving ? "Confirming..." : "Confirm Appointment"}
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

// ─── NOTIFICATIONS MODAL ─────────────────────────────────────────────────────

function NotificationsModal({ userInfo, onClose, latestReceipt, refreshToken }) {
  const [appointments, setAppointments] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueData, setQueueData] = useState({});

  // Fetch all user bookings from database
  useEffect(() => {
    if (!userInfo) return;
    fetchAllBookings();
  }, [userInfo, refreshToken]);

  const fetchAllBookings = async () => {
    setLoading(true);

    const currentUser = sanitizeUserInfo(userInfo);

    try {
      const [apptRes, resRes] = await Promise.all([
        apiRequest("/appointments"),
        apiRequest("/reservations")
      ]);

      if (apptRes.ok && resRes.ok) {
        const appts = apptRes.data || [];
        const ress = resRes.data || [];

        // Filter by current user
        const userAppts = appts.filter(a =>
          isSameUser(a, currentUser, {
            name: "patient_name",
            email: "patient_email",
            phone: "patient_phone",
          })
        );

        const userRess = ress.filter(r =>
          isSameUser(r, currentUser, {
            name: "customer_name",
            email: "customer_email",
            phone: "customer_phone",
          })
        );

        setAppointments(userAppts);
        setReservations(userRess);
      } else {
        throw new Error(apptRes.error || resRes.error || "Failed to fetch bookings");
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!latestReceipt || !userInfo) return;
    const currentUser = sanitizeUserInfo(userInfo);

    if (latestReceipt.type === "appointment") {
      if (!isSameUser({
        patient_name: latestReceipt.userInfo?.name,
        patient_email: latestReceipt.userInfo?.email,
        patient_phone: latestReceipt.userInfo?.phone,
      }, currentUser, {
        name: "patient_name",
        email: "patient_email",
        phone: "patient_phone",
      })) {
        return;
      }

      setAppointments(prev => {
        const newId = latestReceipt.appointmentId;
        if (newId && prev.some(item => item.id === newId)) {
          return prev;
        }

        const nextItem = {
          id: newId || `local-appt-${Date.now()}`,
          doctor_name: latestReceipt.doctorName,
          specialty: latestReceipt.specialty,
          hospital: latestReceipt.hospital,
          fee: latestReceipt.fee,
          appointment_date: formatDateForDB(latestReceipt.date),
          appointment_time: formatTimeForDB(latestReceipt.time),
          status: "booked",
        };

        return [nextItem, ...prev];
      });
      return;
    }

    if (latestReceipt.type === "reservation") {
      if (!isSameUser({
        customer_name: latestReceipt.userInfo?.name,
        customer_email: latestReceipt.userInfo?.email,
        customer_phone: latestReceipt.userInfo?.phone,
      }, currentUser, {
        name: "customer_name",
        email: "customer_email",
        phone: "customer_phone",
      })) {
        return;
      }

      setReservations(prev => {
        const newId = latestReceipt.reservationId;
        if (newId && prev.some(item => item.id === newId)) {
          return prev;
        }

        const nextItem = {
          id: newId || `local-res-${Date.now()}`,
          restaurant_name: latestReceipt.restaurantName,
          cuisine: latestReceipt.cuisine,
          reservation_date: formatDateForDB(latestReceipt.date),
          reservation_time: formatTimeForDB(latestReceipt.time),
          party_size: latestReceipt.guests,
          status: "confirmed",
        };

        return [nextItem, ...prev];
      });
    }
  }, [latestReceipt, userInfo]);
  
  // Simulate live queue updates
  useEffect(() => {
    const interval = setInterval(() => {
      setQueueData(prev => {
        const updated = { ...prev };
        appointments.forEach((appt, idx) => {
          if (updated[`appt-${idx}`]) {
            // Randomly reduce queue people ahead
            if (Math.random() < 0.3 && updated[`appt-${idx}`].queueAhead > 0) {
              updated[`appt-${idx}`].queueAhead -= 1;
            }
          }
        });
        return updated;
      });
    }, 4000);
    
    return () => clearInterval(interval);
  }, [appointments]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Your Bookings & Reservations</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>Loading...</div>
        ) : (appointments.length === 0 && reservations.length === 0) ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No bookings yet</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>Your appointments and reservations will appear here</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "60vh", overflowY: "auto" }}>
            {appointments.map((appt, idx) => (
              <div key={`appt-${appt.id}`} style={{ background: "#111c35", border: "1px solid #1e3058", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{appt.doctor_name}</div>
                    <div style={{ fontSize: 12, color: "#06b6d4", marginTop: 2 }}>{appt.specialty}</div>
                  </div>
                  <div style={{ fontSize: 20, background: "rgba(6,182,212,0.12)", padding: "4px 8px", borderRadius: 6 }}>🏥</div>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                  <div><span style={{ color: "#64748b" }}>Hospital:</span> {appt.hospital}</div>
                  <div><span style={{ color: "#64748b" }}>Date:</span> {appt.appointment_date}</div>
                  <div><span style={{ color: "#64748b" }}>Time:</span> {appt.appointment_time}</div>
                  <div><span style={{ color: "#64748b" }}>Fee:</span> {appt.fee}</div>
                  <div style={{ display: "inline-block", marginTop: 8, padding: "3px 8px", background: appt.status === "booked" ? "rgba(6,182,212,0.2)" : appt.status === "completed" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", color: appt.status === "booked" ? "#06b6d4" : appt.status === "completed" ? "#10b981" : "#ef4444", borderRadius: "6px", fontSize: "10px", fontWeight: 600 }}>{appt.status}</div>
                </div>
              </div>
            ))}
            {reservations.map((res) => (
              <div key={`res-${res.id}`} style={{ background: "#111c35", border: "1px solid #1e3058", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{res.restaurant_name}</div>
                    <div style={{ fontSize: 12, color: "#10b981", marginTop: 2 }}>{res.cuisine}</div>
                  </div>
                  <div style={{ fontSize: 20, background: "rgba(16,185,129,0.12)", padding: "4px 8px", borderRadius: 6 }}>🍽️</div>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                  <div><span style={{ color: "#64748b" }}>Date:</span> {res.reservation_date}</div>
                  <div><span style={{ color: "#64748b" }}>Time:</span> {res.reservation_time}</div>
                  <div><span style={{ color: "#64748b" }}>Party Size:</span> {res.party_size} guests</div>
                  <div style={{ display: "inline-block", marginTop: 8, padding: "3px 8px", background: res.status === "confirmed" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", color: res.status === "confirmed" ? "#10b981" : "#ef4444", borderRadius: "6px", fontSize: "10px", fontWeight: 600 }}>{res.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RESTAURANT MODAL ────────────────────────────────────────────────────────

function RestModal({ rest, onClose, userInfo, onAddNotification, onConfirm }) {
  const [selGuests,   setSelGuests]   = useState(null);
  const [selDate,     setSelDate]     = useState(null);
  const [selTime,     setSelTime]     = useState(null);
  const [confirmed,   setConfirmed]   = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const dates = getDates();

  const handleConfirm = async () => {
    if (!selGuests || !selDate || !selTime) {
      setSaveError("Please select guests, date, and time");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Save reservation to database
      const result = await saveReservation(rest.id, rest.name, rest.cuisine, selDate, selTime, selGuests, userInfo);

      if (!result.success) {
        setSaveError(`Failed to save reservation: ${result.error}`);
        setIsSaving(false);
        return;
      }
      
      // Add to notifications
      onAddNotification({
        type: "reservation",
        restaurantName: rest.name,
        cuisine: rest.cuisine,
        priceRange: rest.priceRange,
        date: selDate,
        time: selTime,
        guests: selGuests,
        estWait: rest.wait,
        userInfo: userInfo,
        reservationId: result.id
      });
      
      // Trigger refresh token update
      if (onConfirm) {
        onConfirm({ rest, date: selDate, time: selTime, guests: selGuests });
      }
      
      setConfirmed(true);
      setIsSaving(false);
    } catch (error) {
      console.error("Reservation error:", error);
      setSaveError(`Error: ${error.message}`);
      setIsSaving(false);
    }
  };

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
            {saveError && (
              <div style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
                padding: "10px 12px",
                borderRadius: "10px",
                marginBottom: "14px",
                fontSize: "12px"
              }}>
                {saveError}
              </div>
            )}
            <button className="confirm-btn" disabled={!selGuests || !selDate || !selTime || isSaving} onClick={handleConfirm}>
              {isSaving ? "Confirming..." : "Confirm Reservation"}
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

// ─── LOGIN TAB ───────────────────────────────────────────────────────────────

function LoginTab({ userInfo, onUserUpdate }) {
  const [name, setName] = useState(userInfo?.name || "");
  const [email, setEmail] = useState(userInfo?.email || "");
  const [phone, setPhone] = useState(userInfo?.phone || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (name && email && phone) {
      onUserUpdate({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", position: "relative", overflow: "hidden" }}>
      {/* Background gradient effect */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 80% 80% at 50% 0%, rgba(6,182,212,0.15), transparent)",
        pointerEvents: "none"
      }}></div>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{
          background: "rgba(13, 20, 40, 0.8)",
          border: "1px solid #1e3058",
          borderRadius: "20px",
          padding: "40px 24px",
          backdropFilter: "blur(12px)",
          animation: "slideUp 0.5s ease"
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              fontSize: 48,
              fontWeight: 800,
              marginBottom: 12,
              background: "linear-gradient(135deg, #06b6d4 20%, #10b981 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-1px"
            }}>
              Welcome
            </div>
            <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Enter your details to get started with instant appointment bookings
            </p>
          </div>

          {/* Form */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Full Name</label>
            <input
              type="text"
              placeholder=""
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "#111c35",
                border: "1px solid #1e3058",
                borderRadius: "10px",
                color: "#e2e8f0",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                outline: "none",
                transition: "all 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={e => {
                e.target.style.borderColor = "#06b6d4";
                e.target.style.boxShadow = "0 0 16px rgba(6, 182, 212, 0.2)";
              }}
              onBlur={e => {
                e.target.style.borderColor = "#1e3058";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</label>
            <input
              type="email"
              placeholder=""
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "#111c35",
                border: "1px solid #1e3058",
                borderRadius: "10px",
                color: "#e2e8f0",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                outline: "none",
                transition: "all 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={e => {
                e.target.style.borderColor = "#06b6d4";
                e.target.style.boxShadow = "0 0 16px rgba(6, 182, 212, 0.2)";
              }}
              onBlur={e => {
                e.target.style.borderColor = "#1e3058";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" }}>Phone Number</label>
            <input
              type="tel"
              placeholder=""
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                background: "#111c35",
                border: "1px solid #1e3058",
                borderRadius: "10px",
                color: "#e2e8f0",
                fontFamily: "'Outfit', sans-serif",
                fontSize: 14,
                outline: "none",
                transition: "all 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={e => {
                e.target.style.borderColor = "#06b6d4";
                e.target.style.boxShadow = "0 0 16px rgba(6, 182, 212, 0.2)";
              }}
              onBlur={e => {
                e.target.style.borderColor = "#1e3058";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <button
            onClick={handleSave}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "none",
              background: name && email && phone ? "linear-gradient(135deg, #06b6d4, #0891b2)" : "linear-gradient(135deg, #064e5a, #045d6a)",
              color: "#fff",
              fontFamily: "'Outfit', sans-serif",
              fontSize: 15,
              fontWeight: 700,
              cursor: name && email && phone ? "pointer" : "not-allowed",
              opacity: name && email && phone ? 1 : 0.6,
              transition: "all 0.25s",
              letterSpacing: "0.3px"
            }}
            disabled={!name || !email || !phone}
            onMouseEnter={e => {
              if (name && email && phone) {
                e.target.style.transform = "scale(1.02)";
                e.target.style.boxShadow = "0 8px 24px rgba(6,182,212,0.3)";
              }
            }}
            onMouseLeave={e => {
              e.target.style.transform = "none";
              e.target.style.boxShadow = "none";
            }}
          >
            Continue to App
          </button>

          {saved && (
            <div style={{
              marginTop: 16,
              padding: "12px 14px",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "10px",
              color: "#34d399",
              fontSize: 13,
              textAlign: "center",
              fontWeight: 600,
              animation: "slideUp 0.3s ease"
            }}>
              ✓ Profile updated successfully!
            </div>
          )}
        </div>

        {/* Info section */}
        <div style={{ textAlign: "center", marginTop: 24, color: "#64748b", fontSize: 12 }}>
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            Your information will be saved with every appointment and reservation you make. You can update it anytime from your profile.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ userInfo, onUserUpdate, refreshToken }) {
  const [appointments, setAppointments] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userInfo) return;

    const fetchProfileBookings = async () => {
      setLoading(true);
      const normalizedUser = sanitizeUserInfo(userInfo);

      try {
        const [apptRes, resRes] = await Promise.all([
          apiRequest("/appointments"),
          apiRequest("/reservations")
        ]);

        if (apptRes.ok && resRes.ok) {
          const userAppts = (apptRes.data || []).filter(a =>
            isSameUser(a, normalizedUser, {
              name: "patient_name",
              email: "patient_email",
              phone: "patient_phone",
            })
          );

          const userRess = (resRes.data || []).filter(r =>
            isSameUser(r, normalizedUser, {
              name: "customer_name",
              email: "customer_email",
              phone: "customer_phone",
            })
          );

          setAppointments(userAppts);
          setReservations(userRess);
        }
      } catch (error) {
        console.error("Error loading profile bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileBookings();
  }, [userInfo, refreshToken]);

  if (!userInfo) {
    return <LoginTab userInfo={userInfo} onUserUpdate={onUserUpdate} />;
  }

  return (
    <div style={{ padding: "24px 16px 32px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ background: "rgba(13, 20, 40, 0.85)", border: "1px solid #1e3058", borderRadius: 20, padding: 20, marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 }}>Profile</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>{userInfo.name}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, color: "#94a3b8", fontSize: 13 }}>
            <span style={{ background: "#111c35", border: "1px solid #1e3058", borderRadius: 999, padding: "6px 12px" }}>{userInfo.email}</span>
            <span style={{ background: "#111c35", border: "1px solid #1e3058", borderRadius: 999, padding: "6px 12px" }}>{userInfo.phone}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={{ background: "#0d1428", border: "1px solid #1e3058", borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Appointments</div>
            {loading ? (
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading...</div>
            ) : appointments.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 13 }}>No appointments yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {appointments.map(appt => (
                  <div key={`profile-appt-${appt.id}`} style={{ background: "#111c35", border: "1px solid #1e3058", borderRadius: 14, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{appt.doctor_name}</div>
                    <div style={{ fontSize: 12, color: "#06b6d4", marginBottom: 10 }}>{appt.specialty}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                      <div>Date: {appt.appointment_date}</div>
                      <div>Time: {appt.appointment_time}</div>
                      <div>Hospital: {appt.hospital}</div>
                      <div>Fee: {appt.fee}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "#0d1428", border: "1px solid #1e3058", borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Reservations</div>
            {loading ? (
              <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading...</div>
            ) : reservations.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 13 }}>No reservations yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reservations.map(res => (
                  <div key={`profile-res-${res.id}`} style={{ background: "#111c35", border: "1px solid #1e3058", borderRadius: 14, padding: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{res.restaurant_name}</div>
                    <div style={{ fontSize: 12, color: "#10b981", marginBottom: 10 }}>{res.cuisine}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                      <div>Date: {res.reservation_date}</div>
                      <div>Time: {res.reservation_time}</div>
                      <div>Party Size: {res.party_size} guests</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TABS ────────────────────────────────────────────────────────────────────

function HomeTab({ lastBooking, onBook, onShowDoctors }) {
  const [docCount, setDocCount] = useState(0);
  const [apptCount, setApptCount] = useState(0);
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

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search doctors, hospitals, specialties..." value={homeSearch}
            onChange={e => handleSearch(e.target.value)} />
        </div>
      </div>



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

function DoctorsTab({ initialSearch, onBook, userInfo, refreshToken }) {
  const [search, setSearch] = useState(initialSearch || "");
  const [activeSpec, setActiveSpec] = useState("All");
  const [userAppointments, setUserAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  useEffect(() => { if (initialSearch) setSearch(initialSearch); }, [initialSearch]);

  // Fetch user's appointments
  useEffect(() => {
    if (!userInfo) return;
    
    const fetchUserAppointments = async () => {
      setLoadingAppts(true);
      const normalizedUser = sanitizeUserInfo(userInfo);
      
      try {
        const res = await apiRequest("/appointments");
        if (res.ok && res.data) {
          const userAppts = res.data.filter(a =>
            isSameUser(a, normalizedUser, {
              name: "patient_name",
              email: "patient_email",
              phone: "patient_phone",
            })
          );
          setUserAppointments(userAppts);
        }
      } catch (err) {
        console.error("Error fetching appointments:", err);
      } finally {
        setLoadingAppts(false);
      }
    };
    
    fetchUserAppointments();
  }, [userInfo, refreshToken]);

  const specs = ["All","Cardiologist","Dermatologist","Neurologist","Orthopedic","Pediatrician","General","Physiotherapist"];
  const specLabels = { All:"All", Cardiologist:"Cardiology", Dermatologist:"Dermatology",
    Neurologist:"Neurology", Orthopedic:"Orthopedic", Pediatrician:"Pediatrics", General:"General", Physiotherapist:"Physiotherapy" };

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
          <span className="search-icon">🔍</span>
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
      
      {userAppointments.length > 0 && (
        <div style={{ padding: "16px 40px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Your Appointments</div>
          <div className="doc-grid">
            {userAppointments.map((appt) => (
              <div key={`appt-${appt.id}`} style={{ background: "rgba(106, 174, 112, 0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{appt.doctor_name}</div>
                    <div style={{ fontSize: 12, color: "#10b981", marginTop: 2 }}>{appt.specialty}</div>
                  </div>
                  <div style={{ fontSize: 18, background: "rgba(16,185,129,0.12)", padding: "4px 8px", borderRadius: 6 }}>✓</div>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                  <div><span style={{ color: "#64748b" }}>Hospital:</span> {appt.hospital}</div>
                  <div><span style={{ color: "#64748b" }}>Date:</span> {appt.appointment_date}</div>
                  <div><span style={{ color: "#64748b" }}>Time:</span> {appt.appointment_time}</div>
                  <div><span style={{ color: "#64748b" }}>Fee:</span> {appt.fee}</div>
                  <div style={{ display: "inline-block", marginTop: 8, padding: "3px 8px", background: "rgba(16,185,129,0.2)", color: "#10b981", borderRadius: "6px", fontSize: "10px", fontWeight: 600 }}>{appt.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="section" style={{ paddingTop: userAppointments.length > 0 ? 0 : 0 }}>
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

function RestaurantsTab({ onBook, userInfo, refreshToken }) {
  const [search, setSearch]         = useState("");
  const [activeCuisine, setCuisine] = useState("All");
  const [userReservations, setUserReservations] = useState([]);
  const [loadingRess, setLoadingRess] = useState(false);

  // Fetch user's reservations
  useEffect(() => {
    if (!userInfo) return;
    
    const fetchUserReservations = async () => {
      setLoadingRess(true);
      const normalizedUser = sanitizeUserInfo(userInfo);
      
      try {
        const res = await apiRequest("/reservations");
        if (res.ok && res.data) {
          const userRess = res.data.filter(r =>
            isSameUser(r, normalizedUser, {
              name: "customer_name",
              email: "customer_email",
              phone: "customer_phone",
            })
          );
          setUserReservations(userRess);
        }
      } catch (err) {
        console.error("Error fetching reservations:", err);
      } finally {
        setLoadingRess(false);
      }
    };
    
    fetchUserReservations();
  }, [userInfo, refreshToken]);

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
          <span className="search-icon">🔍</span>
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
      
      {userReservations.length > 0 && (
        <div style={{ padding: "16px 40px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Your Reservations</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
            {userReservations.map((res) => (
              <div key={`res-${res.id}`} style={{ background: "rgba(106, 174, 112, 0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{res.restaurant_name}</div>
                    <div style={{ fontSize: 12, color: "#10b981", marginTop: 2 }}>{res.cuisine}</div>
                  </div>
                  <div style={{ fontSize: 18, background: "rgba(16,185,129,0.12)", padding: "4px 8px", borderRadius: 6 }}>✓</div>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                  <div><span style={{ color: "#64748b" }}>Date:</span> {res.reservation_date}</div>
                  <div><span style={{ color: "#64748b" }}>Time:</span> {res.reservation_time}</div>
                  <div><span style={{ color: "#64748b" }}>Party Size:</span> {res.party_size} guests</div>
                  <div style={{ display: "inline-block", marginTop: 8, padding: "3px 8px", background: "rgba(16,185,129,0.2)", color: "#10b981", borderRadius: "6px", fontSize: "10px", fontWeight: 600 }}>{res.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="section" style={{ paddingTop: userReservations.length > 0 ? 0 : 0 }}>
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
  const [activeTab,    setActiveTab]    = useState("profile");
  const [bookingDoc,   setBookingDoc]   = useState(null);
  const [bookingRest,  setBookingRest]  = useState(null);
  const [lastBooking,  setLastBooking]  = useState(null);
  const [docSearch,    setDocSearch]    = useState("");
  const [userInfo,     setUserInfo]     = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [bookingsRefreshToken, setBookingsRefreshToken] = useState(0);
  const [latestReceipt, setLatestReceipt] = useState(null);

  const handleUserUpdate = (info) => {
    setUserInfo(info);
    setActiveTab("home");
  };

  const refreshNotificationCount = useCallback(async (currentUser) => {
    if (!currentUser) {
      setNotificationCount(0);
      return;
    }

    const normalizedUser = sanitizeUserInfo(currentUser);
    const [apptRes, resRes] = await Promise.all([
      apiRequest("/appointments"),
      apiRequest("/reservations")
    ]);

    if (!apptRes.ok || !resRes.ok) {
      return;
    }

    const apptCount = (apptRes.data || []).filter(a =>
      isSameUser(a, normalizedUser, {
        name: "patient_name",
        email: "patient_email",
        phone: "patient_phone",
      })
    ).length;

    const resCount = (resRes.data || []).filter(r =>
      isSameUser(r, normalizedUser, {
        name: "customer_name",
        email: "customer_email",
        phone: "customer_phone",
      })
    ).length;

    setNotificationCount(apptCount + resCount);
  }, []);

  const handleAddNotification = useCallback((receipt) => {
    if (receipt && typeof receipt === "object") {
      setLatestReceipt({ ...receipt, createdAt: Date.now() });
    }
    refreshNotificationCount(userInfo);
  }, [refreshNotificationCount, userInfo]);

  useEffect(() => {
    refreshNotificationCount(userInfo);
  }, [refreshNotificationCount, userInfo]);

  const showDoctors = useCallback((search = "") => {
    setDocSearch(search);
    setActiveTab("doctors");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBookConfirm = useCallback((booking) => {
    setLastBooking(booking);
    setBookingsRefreshToken(prev => prev + 1);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div id="ql-root">
        {!userInfo ? (
          <LoginTab userInfo={userInfo} onUserUpdate={handleUserUpdate} />
        ) : (
          <>
            <nav className="ql-nav">
              <div className="ql-logo">Q<span style={{ color: "#10b981", WebkitTextFillColor: "#10b981" }}>Less</span></div>
              {[["home","Home"],["doctors","Doctors"],["restaurants","Dining"],["profile","Profile"]].map(([id, label]) => (
                <button key={id} className={`ql-navbtn${activeTab === id ? " active" : ""}`}
                  onClick={() => { setActiveTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  {label}
                </button>
              ))}
              <div className="ql-bell" onClick={() => setShowNotifications(!showNotifications)} style={{ cursor: "pointer", position: "relative" }}>
                &#x1F514;
                {notificationCount > 0 && (
                  <div style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                    {notificationCount}
                  </div>
                )}
              </div>
            </nav>

            {activeTab === "home" && (
              <HomeTab lastBooking={lastBooking} onBook={setBookingDoc} onShowDoctors={showDoctors} />
            )}
            {activeTab === "doctors" && (
              <DoctorsTab initialSearch={docSearch} onBook={setBookingDoc} userInfo={userInfo} refreshToken={bookingsRefreshToken} />
            )}
            {activeTab === "restaurants" && (
              <RestaurantsTab onBook={setBookingRest} userInfo={userInfo} refreshToken={bookingsRefreshToken} />
            )}
            {activeTab === "profile" && (
              <ProfileTab userInfo={userInfo} onUserUpdate={handleUserUpdate} refreshToken={bookingsRefreshToken} />
            )}

            {bookingDoc && (
              <BookingModal doc={bookingDoc} onClose={() => setBookingDoc(null)} onConfirm={handleBookConfirm} userInfo={userInfo} onAddNotification={handleAddNotification} />
            )}
            {bookingRest && (
              <RestModal rest={bookingRest} onClose={() => setBookingRest(null)} userInfo={userInfo} onAddNotification={handleAddNotification} onConfirm={handleBookConfirm} />
            )}
            {showNotifications && userInfo && (
              <NotificationsModal userInfo={userInfo} onClose={() => setShowNotifications(false)} latestReceipt={latestReceipt} refreshToken={bookingsRefreshToken} />
            )}
          </>
        )}
      </div>
    </>
  );
}
