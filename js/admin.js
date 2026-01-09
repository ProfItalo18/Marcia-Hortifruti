import { dbInit, getProducts, saveProduct, deleteProduct, getOrders, updateOrderStatus, makeId } from "./db.js";
import { qs, qsa, toast, formatBRL, safeText } from "./ui.js";
import { requireAdmin } from "./auth.js";

function drawChart(orders){
  const canvas = qs("#chart");
  if(!canvas) return;
  const ctx = canvas.getContext("2d");

  // Agrupa por dia (últimos 10)
  const map = new Map();
  for(const o of orders){
    const day = (o.createdAt || "").slice(0,10) || "sem-data";
    map.set(day, (map.get(day) || 0) + Number(o.total || 0));
  }
  const entries = [...map.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(-10);

  const W = canvas.width = canvas.clientWidth * devicePixelRatio;
  const H = canvas.height = 240 * devicePixelRatio;

  ctx.clearRect(0,0,W,H);
  ctx.globalAlpha = 1;

  // Eixos simples
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18*devicePixelRatio, 12*devicePixelRatio);
  ctx.lineTo(18*devicePixelRatio, H-18*devicePixelRatio);
  ctx.lineTo(W-12*devicePixelRatio, H-18*devicePixelRatio);
  ctx.stroke();

  if(entries.length === 0) return;

  const max = Math.max(...entries.map(e=>e[1])) || 1;
  const padL = 22*devicePixelRatio;
  const padB = 22*devicePixelRatio;
  const usableW = W - padL - 16*devicePixelRatio;
  const usableH = H - padB - 18*devicePixelRatio;

  // Linha
  ctx.strokeStyle = "rgba(182,255,79,.95)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  entries.forEach((e, i)=>{
    const x = padL + (i/(entries.length-1 || 1)) * usableW;
    const y = (H - padB) - (e[1]/max) * usableH;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // Pontos
  ctx.fillStyle = "rgba(255,176,0,.95)";
  entries.forEach((e, i)=>{
    const x = padL + (i/(entries.length-1 || 1)) * usableW;
    const y = (H - padB) - (e[1]/max) * usableH;
    ctx.beginPath();
    ctx.arc(x,y, 5*devicePixelRatio, 0, Math.PI*2);
    ctx.fill();
  });
}

function productToForm(p){
  qs("#pId").value = p?.id || "";
  qs("#pName").value = p?.name || "";
  qs("#pCategory").value = p?.category || "Frutas";
  qs("#pUnit").value = p?.unit || "kg";
  qs("#pPrice").value = p?.price ?? "";
  qs("#pStock").value = p?.stock ?? "";
  qs("#pFeatured").checked = !!p?.featured;
  qs("#pDesc").value = p?.desc || "";
}

function readForm(){
  const id = qs("#pId").value.trim() || makeId("p");
  return {
    id,
    name: qs("#pName").value.trim(),
    category: qs("#pCategory").value,
    unit: qs("#pUnit").value.trim(),
    price: Number(qs("#pPrice").value || 0),
    stock: Number(qs("#pStock").value || 0),
    featured: qs("#pFeatured").checked,
    desc: qs("#pDesc").value.trim(),
  };
}

export async function initAdminPage(){
  await requireAdmin();
  await dbInit();

  async function renderProducts(){
    const products = await getProducts();
    const tbody = qs("#productsTbody");
    if(!tbody) return;

    tbody.innerHTML = products.map(p => `
      <tr>
        <td><strong>${safeText(p.name)}</strong><div style="color:var(--muted);font-size:12px">${safeText(p.category)} • ${safeText(p.unit)}</div></td>
        <td>${formatBRL(p.price)}</td>
        <td>${Number(p.stock)||0}</td>
        <td>${p.featured ? "✅" : "—"}</td>
        <td style="white-space:nowrap">
          <button class="btn btnGhost" data-edit="${p.id}" style="padding:8px 10px;border-radius:12px">Editar</button>
          <button class="btn" data-del="${p.id}" style="padding:8px 10px;border-radius:12px;background:linear-gradient(135deg,var(--tomato),var(--berry));color:#fff;font-weight:900">Excluir</button>
        </td>
      </tr>
    `).join("");
  }

  async function renderOrders(){
    const orders = await getOrders();
    const tbody = qs("#ordersTbody");
    if(!tbody) return;

    tbody.innerHTML = orders.map(o => `
      <tr>
        <td><strong>#${safeText(o.id)}</strong><div style="color:var(--muted);font-size:12px">${safeText((o.createdAt||"").replace("T"," ").slice(0,16))}</div></td>
        <td>${safeText(o.customer?.name || "")}<div style="color:var(--muted);font-size:12px">${safeText(o.customer?.phone || "")}</div></td>
        <td>${formatBRL(o.total)}</td>
        <td>
          <select data-status="${o.id}">
            ${["Recebido","Separando","Saiu para entrega","Concluído","Cancelado"].map(s => `
              <option ${o.status===s?"selected":""}>${s}</option>
            `).join("")}
          </select>
        </td>
      </tr>
    `).join("");

    // Atualiza relatório
    qs("#ordersCount") && (qs("#ordersCount").textContent = String(orders.length));
    qs("#ordersTotal") && (qs("#ordersTotal").textContent = formatBRL(orders.reduce((s,x)=>s+Number(x.total||0),0)));
    drawChart(orders);
  }

  // Tabs
  qsa("[data-tab]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      qsa("[data-tab]").forEach(x=>x.classList.remove("btnPrimary"));
      btn.classList.add("btnPrimary");

      const tab = btn.getAttribute("data-tab");
      qsa("[data-panel]").forEach(p=>{
        p.style.display = p.getAttribute("data-panel") === tab ? "block" : "none";
      });
    });
  });

  // Form produto
  qs("#productForm")?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const p = readForm();
    if(!p.name){
      toast("Informe o nome do produto.");
      return;
    }
    await saveProduct(p);
    productToForm(null);
    toast("Produto salvo ✅");
    await renderProducts();
  });

  qs("#btnNew")?.addEventListener("click", ()=>{
    productToForm(null);
    toast("Novo produto.");
  });

  // Ações tabelas
  document.addEventListener("click", async (e)=>{
    const edit = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    if(edit){
      const id = edit.getAttribute("data-edit");
      const products = await getProducts();
      const p = products.find(x=>x.id===id);
      if(p) productToForm(p);
      toast("Modo edição.");
    }
    if(del){
      const id = del.getAttribute("data-del");
      if(confirm("Excluir este produto?")){
        await deleteProduct(id);
        toast("Excluído.");
        await renderProducts();
      }
    }
  });

  document.addEventListener("change", async (e)=>{
    const sel = e.target.closest("[data-status]");
    if(!sel) return;
    const id = sel.getAttribute("data-status");
    await updateOrderStatus(id, sel.value);
    toast("Status atualizado.");
  });

  // Inicial
  productToForm(null);
  await renderProducts();
  await renderOrders();

  // Botão sair
  qs("#btnLogout")?.addEventListener("click", async ()=>{
    const { logout } = await import("./auth.js");
    await logout();
    location.href = "login.html";
  });
}
