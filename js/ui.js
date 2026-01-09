import { SETTINGS } from "./config.js";

export function formatBRL(value){
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: SETTINGS.currency,
  }).format(Number(value || 0));
}

export function qs(sel, root=document){ return root.querySelector(sel); }
export function qsa(sel, root=document){ return [...root.querySelectorAll(sel)]; }

export function toast(msg){
  const el = document.getElementById("toast");
  if(!el){ alert(msg); return; }
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(el._t);
  el._t = setTimeout(()=> el.style.display="none", 2400);
}

export function setCartBadge(count){
  const badge = document.getElementById("cartBadge");
  if(badge) badge.textContent = String(count || 0);
}

export function safeText(s){ return String(s ?? "").replace(/[<>]/g,""); }
