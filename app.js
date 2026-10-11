const initialProducts = [
  {id:1,name:'Playera esencial',category:'Playeras',price:199,size:'M',color:'Blanco',stock:12,icon:'👕'},
  {id:2,name:'Jeans clásicos',category:'Pantalones',price:449,size:'30',color:'Azul mezclilla',stock:7,icon:'👖'},
  {id:3,name:'Chamarra urbana',category:'Chamarras',price:699,size:'G',color:'Negro',stock:4,icon:'🧥'},
  {id:4,name:'Vestido casual',category:'Vestidos',price:389,size:'M',color:'Beige',stock:6,icon:'👗'},
  {id:5,name:'Tenis diario',category:'Calzado',price:599,size:'27',color:'Blanco',stock:5,icon:'👟'},
  {id:6,name:'Bolsa mini',category:'Accesorios',price:299,size:'Unitalla',color:'Café',stock:9,icon:'👜'},
  {id:7,name:'Playera oversize',category:'Playeras',price:249,size:'XL',color:'Verde olivo',stock:8,icon:'👚'},
  {id:8,name:'Gorra urbana',category:'Accesorios',price:159,size:'Unitalla',color:'Negro',stock:10,icon:'🧢'}
];

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : JSON.parse(JSON.stringify(fallback));
  } catch (error) {
    return JSON.parse(JSON.stringify(fallback));
  }
}

let products = load('modaviva_products', initialProducts);
let cart = load('modaviva_cart', []);
let orders = load('modaviva_orders', []);

function persist() {
  localStorage.setItem('modaviva_products', JSON.stringify(products));
  localStorage.setItem('modaviva_cart', JSON.stringify(cart));
  localStorage.setItem('modaviva_orders', JSON.stringify(orders));
}

function money(n) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(n) || 0);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function showView(view) {
  ['shop', 'cart', 'admin'].forEach(v => {
    const element = document.getElementById(v + 'View');
    if (element) element.classList.toggle('hidden', v !== view);
  });

  if (view === 'cart') renderCart();
  if (view === 'admin') renderAdmin();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Convierte las fotografías a un formato más ligero */
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('Selecciona un archivo de imagen.'));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error('No se pudo leer la fotografía.'));

    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error('La fotografía no se pudo abrir.'));

      image.onload = () => {
        const maxSide = 1000;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');

        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

/* Catálogo: una sola función y fotografías individuales */
function renderProducts() {
  const search = document.getElementById('search');
  const category = document.getElementById('category');

  const q = (search?.value || '').toLowerCase();
  const cat = category?.value || '';

  const list = products.filter(p =>
    (String(p.name).toLowerCase().includes(q) ||
     String(p.color).toLowerCase().includes(q)) &&
    (!cat || p.category === cat)
  );

  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML =
      '<div class="empty" style="grid-column:1/-1">No encontramos prendas con esa búsqueda.</div>';
    return;
  }

  grid.innerHTML = list.map(p => `
    <article class="product">
      <div class="product-art">
        ${p.foto
          ? `<img src="${p.foto}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;">`
          : `<span>${esc(p.icon || '👕')}</span>`}
      </div>
      <div class="product-body">
        <span class="pill">${esc(p.category)}</span>
        <h3>${esc(p.name)}</h3>
        <div class="muted">${esc(p.color)} · Talla ${esc(p.size)}</div>
        <div class="price">${money(p.price)}</div>
        <div class="row">
          <span class="muted">${p.stock > 0 ? p.stock + ' disponibles' : 'Agotado'}</span>
          <button ${p.stock < 1 ? 'disabled' : ''} onclick="addToCart(${p.id})">Agregar</button>
        </div>
      </div>
    </article>
  `).join('');
}

function addToCart(id) {
  const p = products.find(x => x.id === id);
  const line = cart.find(x => x.id === id);

  if (!p || p.stock < 1) return;

  if (line) {
    if (line.qty >= p.stock) {
      alert('No hay más existencias disponibles.');
      return;
    }
    line.qty++;
  } else {
    cart.push({ id, qty: 1 });
  }

  try {
    persist();
    updateCartCount();
    alert('Producto agregado al carrito.');
  } catch (error) {
    alert('No se pudo guardar. El almacenamiento podría estar lleno.');
  }
}

function updateCartCount() {
  const element = document.getElementById('cartCount');
  if (element) {
    element.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
  }
}

function renderCart() {
  const el = document.getElementById('cartContents');
  const checkout = document.getElementById('checkoutPanel');
  if (!el || !checkout) return;

  cart = cart.filter(c => products.some(p => p.id === c.id));

  if (!cart.length) {
    el.innerHTML = '<div class="empty">Tu carrito está vacío. ¡Agrega alguna prenda!</div>';
    checkout.classList.add('hidden');
    return;
  }

  checkout.classList.remove('hidden');
  let total = 0;

  el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>Prenda</th><th>Precio</th><th>Cantidad</th><th>Subtotal</th><th></th></tr></thead><tbody>' +
    cart.map(c => {
      const p = products.find(x => x.id === c.id);
      if (!p) return '';

      total += p.price * c.qty;

      return `<tr>
        <td>${p.foto ? `<img src="${p.foto}" alt="" style="width:45px;height:45px;object-fit:cover;border-radius:6px;vertical-align:middle;">` : esc(p.icon)} ${esc(p.name)}
          <div class="muted">${esc(p.size)} · ${esc(p.color)}</div>
        </td>
        <td>${money(p.price)}</td>
        <td><div class="qty">
          <button class="secondary" onclick="changeQty(${p.id},-1)">−</button>
          ${c.qty}
          <button class="secondary" onclick="changeQty(${p.id},1)" ${c.qty >= p.stock ? 'disabled' : ''}>+</button>
        </div></td>
        <td>${money(p.price * c.qty)}</td>
        <td><button class="danger" onclick="removeCart(${p.id})">Quitar</button></td>
      </tr>`;
    }).join('') +
    '</tbody></table></div>' +
    `<h3 style="text-align:right">Total: ${money(total)}</h3>`;

  try { persist(); } catch (error) {
    console.error('No se pudo guardar el carrito:', error);
  }
}

function changeQty(id, difference) {
  const c = cart.find(x => x.id === id);
  const p = products.find(x => x.id === id);
  if (!c || !p) return;

  if (difference > 0 && c.qty >= p.stock) return;

  c.qty += difference;
  if (c.qty <= 0) cart = cart.filter(x => x.id !== id);

  try {
    persist();
    updateCartCount();
    renderCart();
  } catch (error) {
    alert('No se pudo guardar el cambio.');
  }
}

function removeCart(id) {
  cart = cart.filter(x => x.id !== id);

  try {
    persist();
    updateCartCount();
    renderCart();
  } catch (error) {
    alert('No se pudo guardar el cambio.');
  }
}

function placeOrder() {
  if (!cart.length) return;

  const name = document.getElementById('customerName')?.value.trim();
  if (!name) {
    alert('Escribe el nombre del cliente.');
    return;
  }

  for (const c of cart) {
    const p = products.find(x => x.id === c.id);
    if (!p || p.stock < c.qty) {
      alert('El inventario cambió para una prenda. Revisa tu carrito.');
      return;
    }
  }

  let total = 0;
  const items = [];

  cart.forEach(c => {
    const p = products.find(x => x.id === c.id);
    p.stock -= c.qty;
    total += p.price * c.qty;
    items.push(`${p.name} x${c.qty}`);
  });

  orders.unshift({
    id: 'MV-' + Date.now().toString().slice(-6),
    name,
    phone: document.getElementById('customerPhone')?.value.trim() || '',
    date: new Date().toLocaleString('es-MX'),
    items,
    total
  });

  cart = [];

  try {
    persist();
    updateCartCount();
    alert('Pedido registrado. Total: ' + money(total));
    showView('admin');
  } catch (error) {
    alert('No se pudo guardar el pedido. Revisa el almacenamiento.');
  }
}

function renderAdmin() {
  const statProducts = document.getElementById('statProducts');
  const statStock = document.getElementById('statStock');
  const statSales = document.getElementById('statSales');
  const inventoryBody = document.getElementById('inventoryBody');
  const ordersBody = document.getElementById('ordersBody');

  if (statProducts) statProducts.textContent = products.length;
  if (statStock) statStock.textContent = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
  if (statSales) statSales.textContent = money(orders.reduce((sum, o) => sum + Number(o.total || 0), 0));

  if (inventoryBody) {
    inventoryBody.innerHTML = products.map(p => `
      <tr>
        <td>${p.foto ? `<img src="${p.foto}" alt="" style="width:40px;height:40px;object-fit:cover;border-radius:6px;vertical-align:middle;">` : esc(p.icon)} ${esc(p.name)}</td>
        <td>${esc(p.category)}</td>
        <td>${esc(p.size)} / ${esc(p.color)}</td>
        <td>${money(p.price)}</td>
        <td>${p.stock}</td>
        <td>
          <button class="ghost" onclick="editProduct(${p.id})">Editar</button>
          <button class="danger" onclick="deleteProduct(${p.id})">Eliminar</button>
        </td>
      </tr>
    `).join('') || '<tr><td colspan="6">Sin productos.</td></tr>';
  }

  if (ordersBody) {
    ordersBody.innerHTML = orders.map(o => `
      <tr>
        <td>${esc(o.id)}</td>
        <td>${esc(o.name)}<div class="muted">${esc(o.phone || '')}</div></td>
        <td>${esc(o.date)}</td>
        <td>${esc((o.items || []).join(', '))}</td>
        <td>${money(o.total)}</td>
      </tr>
    `).join('') || '<tr><td colspan="5">Todavía no hay ventas registradas.</td></tr>';
  }
}

/* Guardar una prenda nueva o actualizar una existente */
async function saveProduct(e) {
  if (e) e.preventDefault();

  const get = id => document.getElementById(id);

  const name = get('pName')?.value.trim();
  const category = get('pCategory')?.value;
  const price = Number(get('pPrice')?.value);
  const size = get('pSize')?.value.trim();
  const color = get('pColor')?.value.trim();
  const stock = Number(get('pStock')?.value);
  const icon = get('pIcon')?.value.trim() || '👕';
  const editId = get('editId')?.value;
  const photoInput = get('pFoto');
  const file = photoInput?.files?.[0];

  if (!name || !category || !size || !color ||
      !Number.isFinite(price) || price < 0 ||
      !Number.isFinite(stock) || stock < 0) {
    alert('Completa los campos del producto y revisa el precio y las existencias.');
    return;
  }

  const oldProduct = editId
    ? products.find(p => String(p.id) === String(editId))
    : null;

  try {
    let foto = oldProduct?.foto || '';

    if (file) {
      foto = await readPhoto(file);
    }

    const product = {
      id: oldProduct ? oldProduct.id : Date.now(),
      name,
      category,
      price,
      size,
      color,
      stock,
      icon,
      foto
    };

    const previousProducts = products.slice();

    if (oldProduct) {
      products = products.map(p =>
        String(p.id) === String(editId) ? product : p
      );
    } else {
      products.push(product);
    }

    try {
      persist();
    } catch (storageError) {
      products = previousProducts;
      alert('No se pudo guardar. El almacenamiento del navegador podría estar lleno. Intenta usar una foto más pequeña.');
      return;
    }

    resetForm();
    renderAdmin();
    renderProducts();

    alert(oldProduct ? 'Cambios guardados.' : 'Producto guardado correctamente.');
  } catch (error) {
    console.error(error);
    alert(error.message || 'No se pudo guardar la fotografía. Prueba con otra imagen.');
  }
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  document.getElementById('editId').value = p.id;
  document.getElementById('pName').value = p.name;
  document.getElementById('pCategory').value = p.category;
  document.getElementById('pPrice').value = p.price;
  document.getElementById('pSize').value = p.size;
  document.getElementById('pColor').value = p.color;
  document.getElementById('pStock').value = p.stock;
  document.getElementById('pIcon').value = p.icon || '👕';

  const photoInput = document.getElementById('pFoto');
  if (photoInput) photoInput.value = '';

  const title = document.getElementById('formTitle');
  if (title) title.textContent = 'Editar producto';

  document.getElementById('productForm')?.scrollIntoView({ behavior: 'smooth' });
}

function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;

  products = products.filter(p => p.id !== id);
  cart = cart.filter(c => c.id !== id);

  try {
    persist();
    updateCartCount();
    renderAdmin();
    renderProducts();
  } catch (error) {
    alert('No se pudo guardar el cambio.');
  }
}

function resetForm() {
  const form = document.getElementById('productForm');
  if (form) form.reset();

  const editId = document.getElementById('editId');
  if (editId) editId.value = '';

  const title = document.getElementById('formTitle');
  if (title) title.textContent = 'Agregar producto';
}

function resetDemo() {
  if (!confirm('Esto reemplazará productos, carrito y pedidos por los datos de ejemplo. ¿Continuar?')) return;

  products = JSON.parse(JSON.stringify(initialProducts));
  cart = [];
  orders = [];

  try {
    persist();
    resetForm();
    updateCartCount();
    renderAdmin();
    renderProducts();
  } catch (error) {
    alert('No se pudieron guardar los datos.');
  }
}

function exportData() {
  const blob = new Blob(
    [JSON.stringify({ products, orders }, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ceci-mariana-datos.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* Conectar el formulario con la función de guardado */
const productForm = document.getElementById('productForm');

if (productForm) {
  productForm.addEventListener('submit', saveProduct);
}

document.getElementById('search')?.addEventListener('input', renderProducts);
document.getElementById('category')?.addEventListener('change', renderProducts);

renderProducts();
updateCartCount();