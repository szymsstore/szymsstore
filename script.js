let PRODUCTS = [];
let CART = {};
let FAVS = new Set();

const lsCartKey = 'szyms_cart_v1';
const lsFavKey = 'szyms_fav_v1';

async function loadProducts(){
  try{
    const res = await fetch('products.json');
    if(!res.ok) throw new Error('Nie udało się pobrać produktów');
    PRODUCTS = await res.json();
    loadState();
    renderProducts(PRODUCTS);
    hookUI();
  }catch(e){
    document.getElementById('product-list').innerHTML = '<p>Wystąpił błąd podczas ładowania produktów.</p>';
    console.error(e);
  }
}

function loadState(){
  try{
    const c = JSON.parse(localStorage.getItem(lsCartKey) || '{}');
    CART = c || {};
    const f = JSON.parse(localStorage.getItem(lsFavKey) || '[]');
    FAVS = new Set(f || []);
  }catch(e){ CART = {}; FAVS = new Set(); }
  updateBadges();
}

function saveState(){
  localStorage.setItem(lsCartKey, JSON.stringify(CART));
  localStorage.setItem(lsFavKey, JSON.stringify(Array.from(FAVS)));
}

function renderProducts(list){
  const container = document.getElementById('product-list');
  container.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product';
    card.innerHTML = `
      <div class="media"><img src="${p.image}" alt="${p.name}"></div>
      <h4>${p.name}</h4>
      <p>${p.description}</p>
      <div class="price">${p.price} zł</div>
      <div class="actions">
        <button class="btn add" data-id="${p.id}">Dodaj do koszyka</button>
        <button class="fav-btn" data-id="${p.id}" title="Dodaj do ulubionych">${FAVS.has(p.id)?'♥':'♡'}</button>
      </div>
    `;
    container.appendChild(card);
  });
  attachProductListeners();
}

function attachProductListeners(){
  document.querySelectorAll('.btn.add').forEach(b => b.addEventListener('click', e => {
    const id = e.currentTarget.dataset.id; addToCart(id);
  }));
  document.querySelectorAll('.fav-btn').forEach(b => b.addEventListener('click', e => {
    const id = e.currentTarget.dataset.id; toggleFav(id);
  }));
}

function addToCart(id, qty=1){
  CART[id] = (CART[id] || 0) + qty;
  saveState();
  updateBadges();
}

function removeFromCart(id){
  delete CART[id];
  saveState();
  updateBadges();
  renderCart();
}

function changeQty(id, delta){
  CART[id] = Math.max(0, (CART[id]||0) + delta);
  if(CART[id] === 0) delete CART[id];
  saveState();
  updateBadges();
  renderCart();
}

function toggleFav(id){
  if(FAVS.has(id)) FAVS.delete(id); else FAVS.add(id);
  saveState();
  updateBadges();
  renderProducts(filterAndSort());
}

function updateBadges(){
  const cartCount = Object.values(CART).reduce((s,n)=>s+n,0);
  document.getElementById('cart-count').textContent = cartCount;
  document.getElementById('fav-count').textContent = FAVS.size;
}

function hookUI(){
  document.getElementById('search-input').addEventListener('input', ()=>renderProducts(filterAndSort()));
  document.querySelectorAll('.cat-btn').forEach(b => b.addEventListener('click', e => {
    document.querySelectorAll('.cat-btn').forEach(x=>x.classList.remove('active'));
    e.currentTarget.classList.add('active');
    renderProducts(filterAndSort());
  }));
  document.getElementById('sort').addEventListener('change', ()=>renderProducts(filterAndSort()));

  // cart/fav toggles
  document.getElementById('cart-toggle').addEventListener('click', ()=>{openCart();});
  document.getElementById('fav-toggle').addEventListener('click', ()=>{openFavs();});
  document.getElementById('close-cart').addEventListener('click', closeCart);
  document.getElementById('close-fav').addEventListener('click', closeFavs);
  document.getElementById('checkout').addEventListener('click', ()=>alert('Przejdź do płatności — integracja wymagana'));
}

function filterAndSort(){
  const q = document.getElementById('search-input').value.trim().toLowerCase();
  const active = document.querySelector('.cat-btn.active').dataset.cat;
  const sort = document.getElementById('sort').value;
  let list = PRODUCTS.filter(p => {
    if(active !== 'all' && p.category !== active) return false;
    if(!q) return true;
    return (p.name + ' ' + p.description).toLowerCase().includes(q);
  });
  if(sort === 'price-asc') list.sort((a,b)=>a.price-b.price);
  if(sort === 'price-desc') list.sort((a,b)=>b.price-a.price);
  return list;
}

// Cart rendering
function openCart(){
  document.getElementById('cart-modal').classList.remove('hidden');
  document.getElementById('cart-modal').setAttribute('aria-hidden','false');
  renderCart();
}
function closeCart(){
  document.getElementById('cart-modal').classList.add('hidden');
  document.getElementById('cart-modal').setAttribute('aria-hidden','true');
}

function renderCart(){
  const wrap = document.getElementById('cart-items');
  wrap.innerHTML = '';
  const ids = Object.keys(CART);
  if(ids.length===0){ wrap.innerHTML = '<p>Koszyk jest pusty.</p>'; document.getElementById('cart-total').textContent='0 zł'; return; }
  let total = 0;
  ids.forEach(id=>{
    const p = PRODUCTS.find(x=>x.id===id);
    const qty = CART[id];
    const row = document.createElement('div'); row.className='cart-row';
    row.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <div style="flex:1">
        <div>${p.name}</div>
        <div style="color:var(--muted);font-size:0.9rem">${p.price} zł</div>
      </div>
      <div class="qty">
        <button class="btn" data-op="dec" data-id="${id}">-</button>
        <div>${qty}</div>
        <button class="btn" data-op="inc" data-id="${id}">+</button>
        <button class="btn" data-op="rem" data-id="${id}">Usuń</button>
      </div>
    `;
    wrap.appendChild(row);
    total += p.price * qty;
  });
  document.getElementById('cart-total').textContent = total + ' zł';

  wrap.querySelectorAll('button[data-op]').forEach(b=>b.addEventListener('click', e=>{
    const op = e.currentTarget.dataset.op; const id = e.currentTarget.dataset.id;
    if(op==='inc') changeQty(id,1);
    if(op==='dec') changeQty(id,-1);
    if(op==='rem') removeFromCart(id);
  }));
}

// Favorites
function openFavs(){
  document.getElementById('fav-modal').classList.remove('hidden');
  document.getElementById('fav-modal').setAttribute('aria-hidden','false');
  renderFavs();
}
function closeFavs(){
  document.getElementById('fav-modal').classList.add('hidden');
  document.getElementById('fav-modal').setAttribute('aria-hidden','true');
}
function renderFavs(){
  const wrap = document.getElementById('fav-items');
  const items = PRODUCTS.filter(p=>FAVS.has(p.id));
  if(items.length===0){ wrap.innerHTML = '<p>Brak ulubionych.</p>'; return; }
  wrap.innerHTML = '';
  items.forEach(p => {
    const el = document.createElement('div'); el.className='product';
    el.innerHTML = `
      <div class="media"><img src="${p.image}" alt="${p.name}"></div>
      <h4>${p.name}</h4>
      <div class="price">${p.price} zł</div>
      <div class="actions"><button class="btn add" data-id="${p.id}">Dodaj do koszyka</button></div>
    `;
    wrap.appendChild(el);
  });
  wrap.querySelectorAll('.btn.add').forEach(b=>b.addEventListener('click', e=>{addToCart(e.currentTarget.dataset.id);closeFavs();}));
}

document.addEventListener('DOMContentLoaded', loadProducts);
