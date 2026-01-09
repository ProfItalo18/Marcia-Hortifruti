import { dbInit, getProducts } from "./db.js";
import { qs, qsa, toast, setCartBadge, formatBRL, safeText } from "./ui.js";
import { cartGetCount, cartAdd } from "./cart.js";

function getQuery(){
  const url = new URL(location.href);
  return {
    q: (url.searchParams.get("q") || "").trim(),
    cat: (url.searchParams.get("cat") || "Todos").trim(),
  };
}

function setQuery(params){
  const url = new URL(location.href);
  if(params.q !== undefined) url.searchParams.set("q", params.q);
  if(params.cat !== undefined) url.searchParams.set("cat", params.cat);
  history.replaceState({}, "", url.toString());
}

function categoriesFrom(products){
  const set = new Set(products.map(p => p.category));
  return ["Todos", ...[...set].sort((a,b)=>a.localeCompare(b,"pt-BR"))];
}

function productCard(p){
  const disabled = Number(p.stock) <= 0 ? "disabled" : "";
  const stockText = Number(p.stock) > 0 ? `${p.stock} em estoque` : "Sem estoque";
  return `
    <div class="card product">
      <div class="cardPad">
        <div class="thumb" aria-hidden="true"></div>
        <div class="row" style="margin-top:10px;">
          <span class="tag">#${safeText(p.category)} • ${safeText(p.unit)}</span>
          ${p.featured ? `<span class="tag" style="color:#04130a;background:linear-gradient(135deg,var(--mango),var(--lime));border:none;font-weight:900;">Destaque</span>` : ""}
        </div>
        <h3>${safeText(p.name)}</h3>
        <p style="margin:0 0 10px;color:var(--muted);font-size:13px;line-height:1.5">${safeText(p.desc || "")}</p>
        <div class="meta">
          <div>
            <div class="price">${formatBRL(p.price)}</div>
            <div class="stock">${stockText}</div>
          </div>
          <button class="btn btnPrimary" data-add="${p.id}" ${disabled} title="Adicionar ao carrinho">
            + Carrinho
          </button>
        </div>
      </div>
    </div>
  `;
}

export async function initStorePage(){
  await dbInit();

  const products = await getProducts();
  const { q, cat } = getQuery();

  // Topbar search
  const searchInput = qs("#searchInput");
  if(searchInput){
    searchInput.value = q;
    searchInput.addEventListener("input", (e)=>{
      setQuery({ q: e.target.value });
      render();
    });
  }

  // Categoria cards (home)
  const catWrap = qs("#cats");
  if(catWrap){
    const base = [
      { emoji:"🍌", name:"Frutas", desc:"Doces e fresquinhas" },
      { emoji:"🥬", name:"Verduras", desc:"Crocância todo dia" },
      { emoji:"🥕", name:"Legumes", desc:"Versátil e nutritivo" },
      { emoji:"🧺", name:"Cestas", desc:"Economia inteligente" },
    ];
    catWrap.innerHTML = base.map(c => `
      <a class="card cat" href="produtos.html?cat=${encodeURIComponent(c.name)}">
        <div class="cardPad">
          <div class="emoji">${c.emoji}</div>
          <strong>${c.name}</strong>
          <small>${c.desc}</small>
        </div>
      </a>
    `).join("");
  }

  function applyFilter(list){
    let out = [...list];

    const query = (qs("#searchInput")?.value || q || "").toLowerCase();
    const catSel = qs("#categorySelect")?.value || cat || "Todos";

    if(catSel && catSel !== "Todos"){
      out = out.filter(p => String(p.category) === catSel);
    }
    if(query){
      out = out.filter(p => {
        const blob = `${p.name} ${p.category} ${p.desc || ""}`.toLowerCase();
        return blob.includes(query);
      });
    }
    return out;
  }

  function render(){
    setCartBadge(cartGetCount());

    // Produtos (home highlights)
    const highlights = qs("#highlights");
    if(highlights){
      const featured = products.filter(p => p.featured).slice(0, 8);
      highlights.innerHTML = featured.map(productCard).join("");
    }

    // Página produtos
    const grid = qs("#productGrid");
    if(grid){
      // Popular select de categorias
      const sel = qs("#categorySelect");
      if(sel && !sel.dataset.filled){
        const cats = categoriesFrom(products);
        sel.innerHTML = cats.map(c => `<option value="${safeText(c)}">${safeText(c)}</option>`).join("");
        sel.value = cat || "Todos";
        sel.dataset.filled = "1";
        sel.addEventListener("change", ()=>{
          setQuery({ cat: sel.value });
          render();
        });
      }

      const list = applyFilter(products);
      qs("#countInfo") && (qs("#countInfo").textContent = `${list.length} itens`);
      grid.innerHTML = list.map(productCard).join("");
    }
  }

  document.addEventListener("click", (e)=>{
    const btn = e.target.closest("[data-add]");
    if(!btn) return;
    const id = btn.getAttribute("data-add");
    const p = products.find(x => x.id === id);
    if(!p) return;
    if(Number(p.stock) <= 0){
      toast("Sem estoque no momento.");
      return;
    }
    cartAdd(p, 1);
    setCartBadge(cartGetCount());
    toast("Adicionado ao carrinho ✅");
  });

  render();
}
