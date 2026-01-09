import { dbInit, getProducts, updateStock, createOrder, makeId, nowISO } from "./db.js";
import { qs, toast, formatBRL, setCartBadge } from "./ui.js";
import { cartGet, cartGetTotal, cartClear, cartGetCount } from "./cart.js";

export async function initCheckoutPage(){
  await dbInit();
  setCartBadge(cartGetCount());

  const items = cartGet();
  if(items.length === 0){
    toast("Seu carrinho está vazio.");
    setTimeout(()=> location.href = "produtos.html", 800);
    return;
  }

  // Render resumo
  const wrap = qs("#resume");
  if(wrap){
    wrap.innerHTML = items.map(it => `
      <div class="kpi">
        <div>
          <strong>${it.name}</strong>
          <div style="color:var(--muted);font-size:12px">${it.qty} x ${formatBRL(it.price)} • ${it.unit}</div>
        </div>
        <div style="font-weight:900">${formatBRL(it.qty * it.price)}</div>
      </div>
    `).join("");
  }
  qs("#total") && (qs("#total").textContent = formatBRL(cartGetTotal()));

  qs("#checkoutForm")?.addEventListener("submit", async (e)=>{
    e.preventDefault();

    const data = {
      name: qs("#cName").value.trim(),
      phone: qs("#cPhone").value.trim(),
      address: qs("#cAddress").value.trim(),
      method: qs("#cMethod").value,
      delivery: qs("#cDelivery").value,
      note: qs("#cNote").value.trim(),
    };

    if(!data.name || !data.phone){
      toast("Preencha nome e telefone.");
      return;
    }
    if(data.delivery === "Entrega" && !data.address){
      toast("Para entrega, preencha o endereço.");
      return;
    }

    // Conferir estoque
    const products = await getProducts();
    for(const it of items){
      const p = products.find(x => x.id === it.id);
      if(!p || Number(p.stock) < Number(it.qty)){
        toast(`Estoque insuficiente: ${it.name}`);
        return;
      }
    }

    // Baixar estoque
    for(const it of items){
      await updateStock(it.id, -Number(it.qty));
    }

    const order = {
      id: makeId("o"),
      createdAt: nowISO(),
      status: "Recebido",
      customer: data,
      items,
      total: cartGetTotal(),
    };

    await createOrder(order);
    cartClear();
    setCartBadge(0);

    toast("Pedido confirmado ✅");
    setTimeout(()=> location.href = "index.html?pedido=ok", 900);
  });
}
