// ================== CONFIGURACIÓN (cambia estos datos) ==================
const CONFIG = {
  yapeNumber: '903116519',      // <- tu número de Yape
  plinNumber: '979385801',      // <- tu número de Plin
  accountName: 'Luis Fernando Rengifo Pineda', // <- nombre que sale al yapear
  qrImage: 'yape-qr.png',         // <- imagen del QR de Yape (misma carpeta)
  originMaps: 'https://www.google.com/maps/search/?api=1&query=Av.+Cesar+Canevaro+950+Lince+Lima',
  whatsapp: '51933760462',        // <- WhatsApp con código de país, sin + ni espacios
  originLabel: 'Av. Canevaro 950, Lince',
  baseFee: 5,                     // S/ fijos de delivery
  feePerKm: 0.8,                  // S/ por km
  freeShippingFrom:null    // pon 150 si quieres envío gratis desde S/ 150
};

// Distancia aproximada por carretera (km) desde Av. Canevaro 950, Lince
const DISTRICTS = {
  'Lince': 0.8, 'Jesús María': 2, 'Breña': 3.5, 'La Victoria': 4, 'Lima Cercado': 5,
  'San Isidro': 3.5, 'Pueblo Libre': 5, 'Magdalena del Mar': 5.5, 'Miraflores': 6,
  'Surquillo': 6, 'San Luis': 7, 'Rímac': 8, 'San Borja': 8, 'San Miguel': 9,
  'Barranco': 9.5, 'Santiago de Surco': 10, 'Chorrillos': 12, 'Ate': 14,
  'Callao': 14, 'La Molina': 16, 'San Martín de Porres': 14, 'Independencia': 16,
  'Los Olivos': 17, 'San Juan de Lurigancho': 17, 'San Juan de Miraflores': 15,
  'Comas': 22, 'Villa María del Triunfo': 22
};

// ================== Estado ==================
let cart = [];
let deliveryMode = 'belle'; // 'belle' = delivery Belle Rouge | 'own' = el cliente pide su propio delivery
let delivery = null; // { district, km, fee, minMin, maxMin }

const $ = id => document.getElementById(id);
const cartBtn = $('cartBtn'), cartClose = $('cartClose'), cartOverlay = $('cartOverlay');
const cartDrawer = $('cartDrawer'), cartItemsEl = $('cartItems'), cartEmptyEl = $('cartEmpty');
const cartCountEl = $('cartCount'), cartTotalEl = $('cartTotal'), checkoutBtn = $('checkoutBtn');

const formatPrice = v => 'S/ ' + v.toFixed(2);
const subtotal = () => cart.reduce((s, i) => s + i.price * i.qty, 0);

// ================== Carrito ==================
function openCart() { cartDrawer.classList.add('open'); cartOverlay.classList.add('open'); }
function closeCart() { cartDrawer.classList.remove('open'); cartOverlay.classList.remove('open'); }
cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

function addToCart(name, price) {
  const ex = cart.find(i => i.name === name);
  ex ? ex.qty++ : cart.push({ name, price, qty: 1 });
  renderCart(); openCart();
}
function removeFromCart(name) { cart = cart.filter(i => i.name !== name); renderCart(); }

function renderCart() {
  cartItemsEl.innerHTML = '';
  if (!cart.length) {
    cartItemsEl.appendChild(cartEmptyEl);
  } else {
    cart.forEach(item => {
      const line = document.createElement('div');
      line.className = 'cart-line';
      const info = document.createElement('div');
      info.innerHTML = `<div class="cart-line-name">${item.name} × ${item.qty}</div>
        <div class="cart-line-price">${formatPrice(item.price * item.qty)}</div>`;
      const rm = document.createElement('button');
      rm.className = 'cart-line-remove'; rm.textContent = 'Quitar';
      rm.addEventListener('click', () => removeFromCart(item.name));
      line.append(info, rm);
      cartItemsEl.appendChild(line);
    });
  }
  cartCountEl.textContent = cart.reduce((s, i) => s + i.qty, 0);
  cartTotalEl.textContent = formatPrice(subtotal());
}

document.querySelectorAll('.product-card').forEach(card => {
  card.querySelector('.btn-add').addEventListener('click',
    () => addToCart(card.dataset.name, parseFloat(card.dataset.price)));
});

// ================== Modal de pago ==================
const modal = document.createElement('div');
modal.className = 'modal-overlay';
modal.innerHTML = `
<div class="modal" role="dialog" aria-modal="true" aria-label="Finalizar compra">
  <button class="modal-close" id="mClose" aria-label="Cerrar">✕</button>
  <div id="mForm">
    <h2>Finalizar compra</h2>
    <div class="m-grid">
      <label>Nombre completo<input id="fName" type="text" autocomplete="name"></label>
      <label>Celular<input id="fPhone" type="tel" inputmode="numeric" maxlength="9" placeholder="9 dígitos"></label>
    </div>

    <h3 class="m-sub">Tipo de entrega</h3>
    <div class="ship-options">
      <label class="ship-opt"><input type="radio" name="ship" value="belle" checked>
        <span><strong>Delivery Belle Rouge</strong><small>Te lo llevamos. Costo según tu distrito, calculado desde Lince.</small></span></label>
      <label class="ship-opt"><input type="radio" name="ship" value="own">
        <span><strong>Mi propio delivery</strong><small>Pides un moto/taxi por app (Uber, inDrive, Rappi…) a recoger tu pedido.</small></span></label>
    </div>

    <div id="belleBlock">
      <div class="m-grid" style="margin-top:.9rem">
        <label class="full">Dirección de entrega<input id="fAddress" type="text" autocomplete="street-address"></label>
        <label class="full">Distrito
          <select id="fDistrict"><option value="">Selecciona tu distrito…</option></select>
        </label>
      </div>
      <div class="delivery-box" id="deliveryBox">Elige tu distrito para calcular el delivery.</div>
    </div>
    <div class="delivery-box own-box" id="ownBlock" hidden>
      <strong>Punto de recojo:</strong> ${CONFIG.originLabel}
      (<a href="${CONFIG.originMaps}" target="_blank" rel="noopener">ver en Google Maps</a>)
      <ul>
        <li>Pide tu delivery por app con ese punto de recojo y paga la carrera directamente al conductor.</li>
        <li>Pásale al conductor tu nombre y el código de pedido que te daremos por WhatsApp.</li>
        <li>Avísanos por WhatsApp cuando el conductor esté en camino.</li>
      </ul>
    </div>

    <h3 class="m-sub">Método de pago</h3>
    <div class="pay-options">
      <label class="pay-opt"><input type="radio" name="pay" value="Yape" checked><span class="pay-chip yape">Yape</span></label>
      <label class="pay-opt"><input type="radio" name="pay" value="Plin"><span class="pay-chip plin">Plin</span></label>
    </div>
    <div class="pay-instructions" id="payInstr"></div>
    <label class="full">N.º de operación (6+ dígitos)
      <input id="fOp" type="text" inputmode="numeric" maxlength="12">
    </label>

    <div class="m-summary">
      <div><span>Productos</span><span id="sSub"></span></div>
      <div><span>Delivery</span><span id="sDel">—</span></div>
      <div class="m-total"><span>Total a pagar</span><span id="sTot"></span></div>
    </div>
    <p class="m-error" id="mError"></p>
    <button class="btn btn-primary btn-checkout" id="mConfirm">Confirmar pedido</button>
  </div>
  <div id="mDone" hidden>
    <h2>¡Pedido listo!</h2>
    <p>Para validar tu pago, envíanos el pedido por WhatsApp junto con la captura de tu operación.</p>
    <a class="btn btn-primary btn-checkout" id="waLink" target="_blank" rel="noopener">Enviar por WhatsApp</a>
  </div>
</div>`;
document.body.appendChild(modal);

const fDistrict = $('fDistrict');
Object.keys(DISTRICTS).sort((a, b) => a.localeCompare(b, 'es')).forEach(d => {
  const o = document.createElement('option'); o.value = d; o.textContent = d; fDistrict.appendChild(o);
});

function calcDelivery(district) {
  const km = DISTRICTS[district];
  let fee = Math.round((CONFIG.baseFee + km * CONFIG.feePerKm) * 2) / 2;
  if (CONFIG.freeShippingFrom && subtotal() >= CONFIG.freeShippingFrom) fee = 0;
  const base = 12 + km * 3; // minutos aprox. en tráfico limeño
  return { district, km, fee, minMin: Math.round(base / 5) * 5, maxMin: Math.round((base * 1.6) / 5) * 5 };
}

const currentFee = () => (deliveryMode === 'own' || !delivery) ? 0 : delivery.fee;

function updateSummary() {
  const sub = subtotal();
  $('sSub').textContent = formatPrice(sub);
  const fee = currentFee();
  $('sDel').textContent = deliveryMode === 'own' ? 'Por tu cuenta (pagas al conductor)'
    : delivery ? (fee === 0 ? 'Gratis' : formatPrice(fee)) : '—';
  $('sTot').textContent = formatPrice(sub + fee);
  const m = document.querySelector('input[name="pay"]:checked').value;
  const num = m === 'Yape' ? CONFIG.yapeNumber : CONFIG.plinNumber;
  const qr = m === 'Yape'
    ? `<div class="qr-box"><img src="${CONFIG.qrImage}" alt="Código QR de Yape"><small>Escanea el QR desde Yape</small></div>` : '';
  $('payInstr').innerHTML = `Abre ${m} y paga <strong>${$('sTot').textContent}</strong> al
    <strong>${num}</strong> (${CONFIG.accountName}).${qr}<br>Luego escribe aquí el número de operación.`;
}

fDistrict.addEventListener('change', () => {
  const box = $('deliveryBox');
  if (!fDistrict.value) { delivery = null; box.textContent = 'Elige tu distrito para calcular el delivery.'; }
  else {
    delivery = calcDelivery(fDistrict.value);
    box.innerHTML = `<strong>Desde ${CONFIG.originLabel}:</strong> ≈ ${delivery.km} km · tiempo estimado
      ${delivery.minMin}–${delivery.maxMin} min<br>Costo de delivery:
      <strong>${delivery.fee === 0 ? 'Gratis' : formatPrice(delivery.fee)}</strong>
      <small>(se cobra aparte; distancia y tiempo son aproximados)</small>`;
  }
  updateSummary();
});
document.querySelectorAll('input[name="ship"]').forEach(r => r.addEventListener('change', () => {
  deliveryMode = document.querySelector('input[name="ship"]:checked').value;
  $('belleBlock').hidden = deliveryMode === 'own';
  $('ownBlock').hidden = deliveryMode !== 'own';
  updateSummary();
}));
document.querySelectorAll('input[name="pay"]').forEach(r => r.addEventListener('change', updateSummary));

function openModal() { $('mForm').hidden = false; $('mDone').hidden = true; $('mError').textContent = '';
  updateSummary(); modal.classList.add('open'); }
function closeModal() { modal.classList.remove('open'); }
$('mClose').addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

checkoutBtn.addEventListener('click', () => {
  if (!cart.length) { alert('Tu carrito está vacío. Agrega un labial o una base antes de continuar.'); return; }
  closeCart(); delivery = delivery && fDistrict.value ? calcDelivery(fDistrict.value) : null;
  openModal();
});

$('mConfirm').addEventListener('click', () => {
  const name = $('fName').value.trim(), phone = $('fPhone').value.trim();
  const addr = $('fAddress').value.trim(), op = $('fOp').value.trim();
  const err = $('mError');
  if (name.length < 3) return err.textContent = 'Escribe tu nombre completo.';
  if (!/^9\d{8}$/.test(phone)) return err.textContent = 'Ingresa un celular válido de 9 dígitos (empieza con 9).';
  if (deliveryMode === 'belle') {
    if (addr.length < 6) return err.textContent = 'Escribe tu dirección de entrega.';
    if (!delivery) return err.textContent = 'Selecciona tu distrito para calcular el delivery.';
  }
  if (!/^\d{6,12}$/.test(op)) return err.textContent = 'Ingresa el número de operación de tu pago.';

  const method = document.querySelector('input[name="pay"]:checked').value;
  const fee = currentFee(), total = subtotal() + fee;
  const lines = cart.map(i => `• ${i.name} x${i.qty} — ${formatPrice(i.price * i.qty)}`).join('\n');
  const msg = `Hola Belle Rouge, quiero confirmar mi pedido:\n\n${lines}\n\nProductos: ${formatPrice(subtotal())}\n` +
    (deliveryMode === 'own'
      ? `Entrega: MI PROPIO DELIVERY (recojo en ${CONFIG.originLabel}, pago la carrera al conductor)\n`
      : `Delivery Belle Rouge (${delivery.district}, ≈${delivery.km} km): ${fee === 0 ? 'Gratis' : formatPrice(fee)}\n`) +
    `TOTAL: ${formatPrice(total)}\nPago: ${method} · Operación N.º ${op}\n\n` +
    `Nombre: ${name}\nCelular: ${phone}` +
    (deliveryMode === 'belle' ? `\nDirección: ${addr}, ${delivery.district}` : '');
  $('waLink').href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
  $('mForm').hidden = true; $('mDone').hidden = false;
  cart = []; renderCart();
});

renderCart();