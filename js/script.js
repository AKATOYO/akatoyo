const supabaseUrl = 'https://TU-PROYECTO.supabase.co';
const supabaseKey = 'TU_ANON_KEY';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const contenedor = document.getElementById('productos');
const contador = document.getElementById('contador');
let carrito = 0;

async function cargarProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*');

  if (error) {
    console.error('Error cargando productos:', error);
    return;
  }

  mostrarProductos(data);
}

function mostrarProductos(productos) {
  contenedor.innerHTML = '';

  productos.forEach(p => {
    contenedor.innerHTML += `
      <div class="card">
        <img src="${p.imagen_url}" alt="${p.nombre}">
        <div class="card-content">
          <h3>${p.nombre}</h3>
          <p>${p.descripcion}</p>
          <div class="price">$${p.precio}</div>
          <button onclick="agregarCarrito()">Agregar</button>
          <a href="https://wa.me/573000000000?text=Hola quiero comprar ${encodeURIComponent(p.nombre)}" target="_blank">
            <button>WhatsApp</button>
          </a>
        </div>
      </div>
    `;
  });
}

function agregarCarrito() {
  carrito++;
  contador.textContent = carrito;
  localStorage.setItem('carrito', carrito);
}

function cargarCarrito() {
  const guardado = localStorage.getItem('carrito');
  if (guardado) {
    carrito = parseInt(guardado);
    contador.textContent = carrito;
  }
}

cargarCarrito();
cargarProductos();
