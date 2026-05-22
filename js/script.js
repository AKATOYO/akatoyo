// ==========================================
// CONFIGURACIÓN DE SUPABASE
// ==========================================
const SUPABASE_URL = 'https://yliohprzqxzpyyrpvlvh.supabase.co'; // Tu URL
const SUPABASE_KEY = 'sb_publishable_jWnZtBxthINwZnn2NDS6wg_wour17Cc'; // ¡PON TU CLAVE ANON PUBLIC AQUI!

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// CONFIGURACIÓN DE MONEDA (Pesos Colombianos)
// ==========================================
const money = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
});

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let productos = [];
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// ==========================================
// REFERENCIAS AL DOM
// ==========================================
const productosDiv = document.getElementById("productos");
const detalleCarrito = document.getElementById("detalle-carrito");
const subtotalEl = document.getElementById("subtotal");
const ivaEl = document.getElementById("iva");
const totalEl = document.getElementById("total");
const contador = document.getElementById("contador");
const carritoPanel = document.getElementById("carrito");
const toastDiv = document.getElementById("toast");
const btnCarrito = document.getElementById("btnCarrito");
const busqueda = document.getElementById("busqueda");
const filtroCategoria = document.getElementById("filtroCategoria");
const numCot = document.getElementById("numCot");

// ==========================================
// EVENT LISTENERS
// ==========================================
btnCarrito.addEventListener("click", toggleCarrito);
busqueda.addEventListener("input", filtrarProductos); // Busca mientras escribe
filtroCategoria.addEventListener("change", filtrarProductos); // Busca al cambiar categoria

// ==========================================
// FUNCIONES DE CARGA DE DATOS
// ==========================================
async function cargarProductos() {
    productosDiv.innerHTML = "<p>Cargando productos...</p>";

    const { data, error } = await client
        .from("productos") // Asegúrate que tu tabla se llame "productos"
        .select('nombre, descripcion, precio, imagen_url, categorias')
        .order("categorias", { ascending: true });

    if (error) {
        productosDiv.innerHTML = "<p>Error cargando productos.</p>";
        console.error("Error de Supabase:", error);
        return;
    }

    productos = data || [];
    cargarCategorias();
    renderProductos(productos);
}

function cargarCategorias() {
    // Extraer categorías únicas basadas en la columna 'categorias'
    const categoriasLimpias = productos.map(p => (p.categorias || '').trim());
    const categoriasValidas = categoriasLimpias.filter(c => c !== '');
    
    const categoriasUnicas = [];
    const vistos = new Set();
    
    categoriasValidas.forEach(categoria => {
        const clave = categoria.toLowerCase();
        if (!vistos.has(clave)) {
            vistos.add(clave);
            categoriasUnicas.push(categoria);
        }
    });

    filtroCategoria.innerHTML = `
        <option value="">Todas las categorías</option>
        ${categoriasUnicas.map(c => `<option value="${c}">${c}</option>`).join('')}
    `;
}

function renderProductos(lista) {
    if (!lista.length) {
        productosDiv.innerHTML = "<p>No hay productos disponibles.</p>";
        return;
    }

    productosDiv.innerHTML = lista.map(p => `
        <div class="producto">
            <img 
                src="${p.imagen_url || 'https://via.placeholder.com/300x200?text=Sin+Imagen'}"
                alt="${p.nombre}"
                onerror="this.src='https://via.placeholder.com/300x200?text=Error+Imagen'"
            >
            <span class="categoria">${p.categorias || 'Sin categoría'}</span>
            <h3>${p.nombre}</h3>
            <p>${p.descripcion || ''}</p>
            <strong>${money.format(p.precio || 0)}</strong>
            <button onclick="agregar('${p.nombre}')">Agregar</button>
        </div>
    `).join('');
}

// ==========================================
// BÚSQUEDA INTELIGENTE (Supabase Query)
// ==========================================
async function filtrarProductos() {
    const texto = busqueda.value.trim();
    const categoria = filtroCategoria.value;

    let query = client.from("productos").select('nombre, descripcion, precio, imagen_url, categorias');

    // Si hay texto, busca en nombre, descripcion o categorias (insensible a mayúsculas)
    if (texto) {
        query = query.or(`nombre.ilike.%${texto}%,descripcion.ilike.%${texto}%,categorias.ilike.%${texto}%`);
    }

    // Si hay categoría seleccionada, filtra por categoría
    if (categoria) {
        query = query.eq("categorias", categoria);
    }

    // Ordenar
    query = query.order("categorias", { ascending: true });

    const { data, error } = await query;

    if (error) {
        console.error("Error buscando:", error);
        return;
    }

    renderProductos(data || []);
}

// ==========================================
// FUNCIONES DEL CARRITO
// ==========================================
function agregar(nombre) {
    const p = productos.find(x => x.nombre === nombre);
    if (!p) return;

    const item = carrito.find(x => x.nombre === nombre);

    if (item) {
        item.cantidad++;
    } else {
        carrito.push({ ...p, cantidad: 1 });
    }

    guardar();
    toast("Producto agregado");
}

function actualizarCarrito() {
    let subtotal = 0;

    detalleCarrito.innerHTML = carrito.map((p, i) => {
        const precio = Number(p.precio) || 0;
        const total = precio * p.cantidad;
        subtotal += total;

        return `
            <tr>
                <td>
                    ${p.nombre}
                    <br>
                    <small>${p.categorias || ''}</small>
                </td>
                <td>
                    <button onclick="cambiar(${i},-1)">-</button>
                    ${p.cantidad}
                    <button onclick="cambiar(${i},1)">+</button>
                </td>
                <td>${money.format(total)}</td>
                <td>
                    <button onclick="eliminar(${i})">✕</button>
                </td>
            </tr>
        `;
    }).join('');

    const iva = subtotal * 0.19;
    const total = subtotal + iva;

    subtotalEl.textContent = money.format(subtotal);
    ivaEl.textContent = money.format(iva);
    totalEl.textContent = money.format(total);

    contador.textContent = carrito.reduce((a, b) => a + b.cantidad, 0);
}

function cambiar(i, n) {
    carrito[i].cantidad += n;
    if (carrito[i].cantidad <= 0) {
        carrito.splice(i, 1);
    }
    guardar();
}

function eliminar(i) {
    carrito.splice(i, 1);
    guardar();
}

function vaciarCarrito() {
    carrito = [];
    guardar();
}

function guardar() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarCarrito();
}

// ==========================================
// FUNCIONES DE INTERFAZ
// ==========================================
function toggleCarrito() {
    carritoPanel.classList.toggle("visible");
}

function toast(msg) {
    toastDiv.textContent = msg;
    toastDiv.classList.add("show");
    setTimeout(() => {
        toastDiv.classList.remove("show");
    }, 2000);
}

function enviarWhatsApp() {
    if (!carrito.length) {
        alert("El carrito está vacío");
        return;
    }

    const nombre = document.getElementById("nombreCliente")?.value.trim() || '';
    const telefono = document.getElementById("telefonoCliente")?.value.trim() || '';
    const obs = document.getElementById("observacionesCliente")?.value.trim() || '';

    if (!nombre) {
        alert("Por favor ingrese su nombre");
        return;
    }

    let msg = `*PEDIDO*\n`;
    msg += `Cliente: ${nombre}\n`;
    msg += `Teléfono: ${telefono}\n`;
    msg += `Observaciones: ${obs}\n\n`;

    carrito.forEach(p => {
        const precio = Number(p.precio) || 0;
        msg += `• ${p.nombre}`;
        msg += ` (${p.categorias || 'General'})`;
        msg += ` x${p.cantidad}`;
        msg += ` = ${money.format(precio * p.cantidad)}\n`;
    });

    msg += `\nTOTAL: ${totalEl.textContent}`;

    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/573192654225?text=${encodedMsg}`, '_blank');
}

// ==========================================
// INICIALIZACIÓN
// ==========================================
window.onload = () => {
    numCot.textContent = "Cotización #" + Date.now().toString().slice(-6);
    cargarProductos();
    actualizarCarrito();
};
