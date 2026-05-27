// ==========================================
// ⚠️ SECURITY WARNING ⚠️
// 1. Ensure SUPABASE_KEY is your 'anon' (public) key, NOT a 'service_role' key.
// 2. Client-side password checking (admin123) is highly insecure. Anyone can read the source code.
//    Consider using Supabase Auth for admin actions.
// ==========================================

const SUPABASE_URL = 'https://yliohprzqxzpyyrpvlvh.supabase.co';
// FIX: Replace this with your actual 'anon' key (usually starts with 'eyJ...')
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsaW9ocHJ6cXh6cHl5cnB2bHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTIyNTcsImV4cCI6MjA5MTc2ODI1N30.vvWoWAnHbfmZMEDWTKV8aGs6OsTKjpMam1h2OXVCjQI'; 

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const money = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
});

let productos = [];
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// DOM Elements
const productosDiv = document.getElementById("productos");
const detalleCarrito = document.getElementById("detalle-carrito");
const subtotalEl = document.getElementById("subtotal");
const ivaEl = document.getElementById("iva");
const totalEl = document.getElementById("total");
const contador = document.getElementById("contador");
const carritoPanel = document.getElementById("carrito");
const overlay = document.getElementById("overlay");
const toastDiv = document.getElementById("toast");
const btnCarrito = document.getElementById("btnCarrito");
const btnAdmin = document.getElementById("btnAdmin");
const busqueda = document.getElementById("busqueda");
const filtroCategoria = document.getElementById("filtroCategoria");
const numCot = document.getElementById("numCot");
const adminModal = document.getElementById("adminModal");
const formProducto = document.getElementById("formProducto");
const adminLista = document.getElementById("adminLista");
const btnTop = document.getElementById("btnTop");
const nombreCliente = document.getElementById("nombreCliente");
const telefonoCliente = document.getElementById("telefonoCliente");
const observacionesCliente = document.getElementById("observacionesCliente");

// FIX: Moved inline HTML onclick to event listeners
document.getElementById("btnCloseCarrito").addEventListener("click", toggleCarrito);
document.getElementById("btnCloseAdmin").addEventListener("click", toggleAdmin);
document.getElementById("btnWhatsApp").addEventListener("click", enviarWhatsApp);
document.getElementById("btnVaciar").addEventListener("click", vaciarCarrito);

// Event Listeners
btnCarrito.addEventListener("click", toggleCarrito);
overlay.addEventListener("click", toggleCarrito);
btnAdmin.addEventListener("click", toggleAdmin);
busqueda.addEventListener("input", filtrarProductos);
filtroCategoria.addEventListener("change", filtrarProductos);
formProducto.addEventListener("submit", agregarProductoDB);

window.addEventListener('scroll', () => {
    btnTop.style.display = window.scrollY > 300 ? "block" : "none";
});
btnTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// FIX: Use DOMContentLoaded instead of window.onload for faster execution
document.addEventListener('DOMContentLoaded', () => {
    numCot.textContent = "Cotización #" + Date.now().toString().slice(-6);
    cargarProductos().then(() => {
        const params = new URLSearchParams(window.location.search);
        const productoId = params.get('producto');
        
        if (productoId) {
            setTimeout(() => {
                // FIX: Use data-id instead of querySelector based on onclick string
                const cardContainer = document.querySelector(`.producto[data-id="${productoId}"]`);
                if (cardContainer) {
                    cardContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    cardContainer.style.boxShadow = "0 0 15px rgba(0, 123, 255, 0.8)";
                    setTimeout(() => { cardContainer.style.boxShadow = ""; }, 3000);
                }
            }, 500);
        }
    });
    actualizarCarrito();
});

// --- SECURITY HELPER ---
// Prevents Cross-Site Scripting (XSS) from malicious product names
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- PRODUCTS LOGIC ---
async function cargarProductos() {
    productosDiv.innerHTML = "<p>Cargando productos...</p>";

    const { data, error } = await client
        .from("productos")
        .select(`id, categoria, nombre, descripcion, precio, imagen_url`)
        .order("categoria", { ascending: true })
        .order("nombre", { ascending: true });

    if (error) {
        productosDiv.innerHTML = "<p>Error cargando productos.</p>";
        console.error(error);
        return;
    }

    productos = data || [];
    sincronizarCarrito(); // FIX: Update prices of items already in cart
    cargarCategorias();
    renderProductos(productos);
    return data;
}

// FIX: Keep cart updated with latest DB prices if user reloads page
function sincronizarCarrito() {
    carrito = carrito.map(item => {
        const dbProduct = productos.find(p => p.id === item.id);
        if (dbProduct) {
            return { ...item, precio: dbProduct.precio, nombre: dbProduct.nombre };
        }
        return item; // Keep item even if deleted from DB, could also filter it out
    });
    guardar();
}

function cargarCategorias() {
    const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))];
    filtroCategoria.innerHTML = `
        <option value="">Todas las categorías</option>
        ${categorias.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('')}
    `;
}

function renderProductos(lista) {
    if (!lista.length) {
        productosDiv.innerHTML = "<p>No hay productos disponibles.</p>";
        return;
    }

    productosDiv.innerHTML = lista.map(p => `
        <div class="producto" data-id="${p.id}">
            <div class="img-container">
                <img src="${escapeHTML(p.imagen_url || 'https://via.placeholder.com/300x200?text=Sin+Imagen')}" alt="${escapeHTML(p.nombre)}" loading="lazy">
            </div>
            <div class="producto-info">
                <span class="categoria-badge">${escapeHTML(p.categoria || 'Sin categoría')}</span>
                <h3>${escapeHTML(p.nombre)}</h3>
                <p>${escapeHTML(p.descripcion || '')}</p>
                <strong>${money.format(p.precio || 0)}</strong>
                
                <div class="producto-actions">
                    <button class="btn-agregar" data-id="${p.id}">Agregar</button>
                    <div class="share-buttons">
                        <button class="btn-share whatsapp" data-share="whatsapp" data-id="${p.id}" title="Compartir en WhatsApp">💬</button>
                        <button class="btn-share facebook" data-share="facebook" data-id="${p.id}" title="Compartir en Facebook">📘</button>
                        <button class="btn-share copy" data-share="copy" data-id="${p.id}" title="Copiar enlace">🔗</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // FIX: Event Delegation for buttons instead of inline onclick
    document.querySelectorAll('.btn-agregar').forEach(btn => {
        btn.addEventListener('click', () => agregar(parseInt(btn.dataset.id)));
    });
    document.querySelectorAll('.btn-share').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const type = btn.dataset.share;
            if (type === 'whatsapp') compartirWhatsApp(id);
            else if (type === 'facebook') compartirFacebook(id);
            else if (type === 'copy') copiarEnlace(id);
        });
    });
}

function filtrarProductos() {
    const txt = busqueda.value.toLowerCase();
    const categoria = filtroCategoria.value;

    const filtrados = productos.filter(p => {
        const coincideTexto = p.nombre?.toLowerCase().includes(txt) || p.descripcion?.toLowerCase().includes(txt) || p.categoria?.toLowerCase().includes(txt);
        const coincideCategoria = !categoria || p.categoria === categoria;
        return coincideTexto && coincideCategoria;
    });

    renderProductos(filtrados);
}

// --- CART LOGIC ---
function agregar(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;

    const item = carrito.find(x => x.id === id);
    if (item) {
        item.cantidad++;
    } else {
        carrito.push({ ...p, cantidad: 1 });
    }
    guardar();
    toast("Producto agregado al carrito");
}

function actualizarCarrito() {
    let subtotal = 0;

    detalleCarrito.innerHTML = carrito.map((p, i) => {
        const total = p.precio * p.cantidad;
        subtotal += total;
        return `
            <tr>
                <td>${escapeHTML(p.nombre)}<br><small>${escapeHTML(p.categoria || '')}</small></td>
                <td>
                    <button class="btn-cambiar" data-index="${i}" data-dir="-1">-</button>
                    ${p.cantidad}
                    <button class="btn-cambiar" data-index="${i}" data-dir="1">+</button>
                </td>
                <td>${money.format(total)}</td>
                <td><button class="btn-danger btn-eliminar" data-index="${i}">✕</button></td>
            </tr>
        `;
    }).join('');

    // Event Delegation for Cart Buttons
    detalleCarrito.querySelectorAll('.btn-cambiar').forEach(btn => {
        btn.addEventListener('click', () => cambiar(parseInt(btn.dataset.index), parseInt(btn.dataset.dir)));
    });
    detalleCarrito.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => eliminar(parseInt(btn.dataset.index)));
    });

    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    subtotalEl.textContent = money.format(subtotal);
    ivaEl.textContent = money.format(iva);
    totalEl.textContent = money.format(total);
    contador.textContent = carrito.reduce((a, b) => a + b.cantidad, 0);
}

function cambiar(i, n) {
    carrito[i].cantidad += n;
    if (carrito[i].cantidad <= 0) carrito.splice(i, 1);
    guardar();
}

function eliminar(i) {
    carrito.splice(i, 1);
    guardar();
}

function vaciarCarrito() {
    if(confirm("¿Estás seguro de vaciar el carrito?")) {
        carrito = [];
        guardar();
    }
}

function guardar() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarCarrito();
}

function toggleCarrito() {
    const isVisible = carritoPanel.classList.toggle("visible");
    if (isVisible) {
        overlay.classList.add("active");
    } else {
        overlay.classList.remove("active");
    }
}

function enviarWhatsApp() {
    if (!carrito.length) return toast("Carrito vacío");
    
    const nombre = nombreCliente ? nombreCliente.value.trim() : "";
    const telefono = telefonoCliente ? telefonoCliente.value.trim() : "";
    const obs = observacionesCliente ? observacionesCliente.value.trim() : "";

    if (!nombre) return toast("Por favor, ingrese su nombre");

    let msg = `*PEDIDO*\n`;
    msg += `Cliente: ${nombre}\n`;
    msg += `Teléfono: ${telefono}\n`;
    msg += `Observaciones: ${obs}\n\n`;

    carrito.forEach(p => {
        msg += `• ${p.nombre} (${p.categoria || 'General'}) x${p.cantidad} = ${money.format(p.precio * p.cantidad)}\n`;
    });

    msg += `\nTOTAL: ${totalEl.textContent}`;
    
    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/573192654225?text=${encodedMsg}`);
}

// --- SHARE LOGIC ---
function generarEnlaceProducto(productoId) {
    const baseUrl = window.location.href.split('?')[0];
    return `${baseUrl}?producto=${productoId}`;
}

function compartirWhatsApp(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    
    const url = generarEnlaceProducto(id);
    const texto = `Mira este producto: ${p.nombre} - ${money.format(p.precio)} ${url}`;
    const encodedText = encodeURIComponent(texto);
    
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
}

function compartirFacebook(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    
    const url = generarEnlaceProducto(id);
    const encodedUrl = encodeURIComponent(url);
    
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
}

function copiarEnlace(id) {
    const url = generarEnlaceProducto(id);
    
    navigator.clipboard.writeText(url).then(() => {
        toast("Enlace copiado al portapapeles");
    }).catch(err => {
        console.error('Error al copiar el enlace: ', err);
        toast("Error al copiar el enlace");
    });
}

// --- ADMIN LOGIC ---
function toggleAdmin() {
    const isActive = adminModal.classList.toggle("active");
    if (isActive) {
        // SECURITY WARNING: Prompt password is unsafe
        const pass = prompt("Ingrese contraseña de administrador:");
        if (pass !== "admin123") { 
            toast("Contraseña incorrecta");
            adminModal.classList.remove("active");
            return;
        }
        renderAdminList();
    }
}

function renderAdminList() {
    adminLista.innerHTML = productos.map(p => `
        <div class="admin-item">
            <div class="admin-item-info">
                <strong>${escapeHTML(p.nombre)}</strong> - ${money.format(p.precio)}<br>
                <small>${escapeHTML(p.categoria || 'Sin categoría')}</small>
            </div>
            <button class="btn-danger btn-delete-db" data-id="${p.id}">Eliminar</button>
        </div>
    `).join('');

    // Event Delegation for Delete Buttons
    adminLista.querySelectorAll('.btn-delete-db').forEach(btn => {
        btn.addEventListener('click', () => eliminarProductoDB(parseInt(btn.dataset.id)));
    });
}

async function agregarProductoDB(e) {
    e.preventDefault();
    
    const nuevoProducto = {
        nombre: document.getElementById("adminNombre").value,
        categoria: document.getElementById("adminCategoria").value,
        descripcion: document.getElementById("adminDesc").value,
        precio: parseFloat(document.getElementById("adminPrecio").value),
        imagen_url: document.getElementById("adminImagen").value || null
    };

    const { data, error } = await client.from("productos").insert([nuevoProducto]);
    
    if (error) {
        toast("Error al agregar producto");
        console.error(error);
    } else {
        toast("Producto agregado exitosamente");
        formProducto.reset();
        cargarProductos();
        renderAdminList();
    }
}

async function eliminarProductoDB(id) {
    if (!confirm("¿Eliminar este producto de la base de datos?")) return;

    const { error } = await client.from("productos").delete().eq("id", id);
    
    if (error) {
        toast("Error al eliminar producto");
        console.error(error);
    } else {
        toast("Producto eliminado");
        cargarProductos();
        renderAdminList();
    }
}

// --- UTILITIES ---
function toast(msg) {
    toastDiv.textContent = msg;
    toastDiv.classList.add("show");
    setTimeout(() => { toastDiv.classList.remove("show"); }, 2000);
}
