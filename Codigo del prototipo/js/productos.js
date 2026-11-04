let cartIcon = document.querySelector('#cart-icon');
let cart = document.querySelector('.cart');
let closeCart = document.querySelector('#close-cart');

if (cartIcon && cart) {
    cartIcon.onclick = () => {
        cart.classList.add("active");
        document.querySelector('.search-form').style.display = "none";
    };
}

if (closeCart && cart) {
    closeCart.onclick = () => {
        cart.classList.remove("active");
        document.querySelector('.search-form').style.display = "flex";
    };
}


// INICIALIZAR CARRITO
if (document.readyState == "loading") {
    document.addEventListener("DOMContentLoaded", ready);
} else {
    ready();
}

function ready() {
    cargarCarritoDesdeLocalStorage();
}


// DETECTAR CLICS EN PRODUCTOS DINÁMICOS
document.querySelector('#seccion-productos').addEventListener('click', function(event) {
    const boton = event.target.closest('.add-cart');

    if (boton) {
        addCartClicked(event);
    }
});


// AÑADIR PRODUCTOS AL CARRITO
function addCartClicked(event) {
    const button = event.target.closest('.add-cart');
    if (!button) return;

    const shopProducts = button.closest('.product-box');

    const title = shopProducts.querySelector('.product-title').innerText;
    const price = shopProducts.querySelector('.price').innerText;
    const productImg = shopProducts.querySelector('.product-img').src;

    const producto = addProductToCart(title, price, productImg);

    if (producto) {
        updatetotal();
    }
}


// CREAR PRODUCTO EN EL CARRITO
function addProductToCart(title, price, productImg, triggeredByUser = true) {
    const cartItems = document.querySelector('.cart-content');

    const cartItemsNames = cartItems.getElementsByClassName('cart-product-title');

    for (let i = 0; i < cartItemsNames.length; i++) {
        if (cartItemsNames[i].innerText === title) {
            if (triggeredByUser) {
                alert("Ya has agregado este elemento al carrito");
            }
            return null;
        }
    }

    const cartShopBox = document.createElement('div');
    cartShopBox.classList.add('cart-box');

    const cartBoxContent = `
        <img src="${productImg}" alt="" class="cart-img">

        <div class="detail-box">
            <div class="cart-product-title">${title}</div>
            <div class="cart-price">${price}</div>
            <input type="number" value="1" min="1" class="cart-quantity">
        </div>

        <i class='bx bx-trash cart-remove'></i>
    `;

    cartShopBox.innerHTML = cartBoxContent;
    cartItems.append(cartShopBox);

    cartShopBox.querySelector('.cart-remove').addEventListener('click', removeCartItem);
    cartShopBox.querySelector('.cart-quantity').addEventListener('change', quantityChanged);

    guardarCarritoEnLocalStorage();

    return cartShopBox;
}


// ELIMINAR PRODUCTOS
function removeCartItem(event) {
    const buttonClicked = event.target;
    const cartBox = buttonClicked.closest('.cart-box');

    if (cartBox) {
        cartBox.remove();
    }

    updatetotal();
    guardarCarritoEnLocalStorage();
}


// CAMBIAR CANTIDAD
function quantityChanged(event) {
    const input = event.target;

    if (isNaN(input.value) || input.value <= 0) {
        input.value = 1;
    }

    updatetotal();
    guardarCarritoEnLocalStorage();
}


// CALCULAR TOTAL
async function updatetotal() {
    const cartContent = document.querySelector('.cart-content');
    const cartBoxes = cartContent.querySelectorAll('.cart-box');

    let total = 0;

    for (let i = 0; i < cartBoxes.length; i++) {
        const cartBox = cartBoxes[i];

        const priceElement = cartBox.querySelector('.cart-price');
        const quantityElement = cartBox.querySelector('.cart-quantity');

        const price = parseFloat(
            priceElement.innerText.replace(/[^\d.-]/g, '')
        );

        const quantity = parseInt(quantityElement.value);

        if (isNaN(price) || isNaN(quantity)) continue;

        try {
            const response = await fetch(
                `/calcular-subtotal?precio=${price}&cantidad=${quantity}`
            );

            if (!response.ok) {
                throw new Error("Error calculando subtotal");
            }

            const data = await response.json();
            total += parseFloat(data.subtotal);

        } catch (error) {
            console.error('Error calculando subtotal:', error);
            total += price * quantity;
        }
    }

    document.querySelector('.total-price').innerText = "C$" + total.toFixed(2);
}


// GUARDAR CARRITO POR USUARIO
function guardarCarritoEnLocalStorage() {
    const usuario = localStorage.getItem("nombreUsuario");

    if (!usuario) return;

    const cartBoxes = document.querySelectorAll('.cart-box');
    const productos = [];

    cartBoxes.forEach(box => {
        const nombre = box.querySelector('.cart-product-title').innerText;
        const precio = box.querySelector('.cart-price').innerText;
        const cantidad = parseInt(box.querySelector('.cart-quantity').value);
        const imagen = box.querySelector('.cart-img').src;

        productos.push({
            nombre,
            precio,
            cantidad,
            imagen
        });
    });

    localStorage.setItem(`carrito_${usuario}`, JSON.stringify(productos));
}


// CARGAR CARRITO GUARDADO
function cargarCarritoDesdeLocalStorage() {
    const usuario = localStorage.getItem("nombreUsuario");

    if (!usuario) return;

    const productos = JSON.parse(
        localStorage.getItem(`carrito_${usuario}`)
    ) || [];

    productos.forEach(producto => {
        const nuevoProducto = addProductToCart(
            producto.nombre,
            producto.precio,
            producto.imagen,
            false
        );

        if (nuevoProducto) {
            nuevoProducto.querySelector('.cart-quantity').value = producto.cantidad;
        }
    });

    updatetotal();
}


// BUSCADOR
const searchInput = document.querySelector(".search-form input");

if (searchInput) {
    searchInput.addEventListener("input", function() {
        const searchTerm = this.value.toLowerCase();
        const productBoxes = document.querySelectorAll(".product-box");

        productBoxes.forEach(box => {
            const title = box.querySelector(".product-title").innerText.toLowerCase();
            box.style.display = title.includes(searchTerm) ? "" : "none";
        });

        document.querySelectorAll(".shop-content").forEach(section => {
            const visibleProducts = section.querySelectorAll(
                ".product-box:not([style*='display: none'])"
            );

            const title = section.previousElementSibling;

            if (title && title.classList.contains("section-title")) {
                title.style.display = visibleProducts.length > 0 ? "" : "none";
            }
        });
    });
}


// COMPRAR AHORA
const buyButton = document.querySelector('.btn-comprar');

if (buyButton) {
    buyButton.addEventListener('click', () => {
        const cartBoxes = document.querySelectorAll('.cart-box');

        if (cartBoxes.length === 0) {
            alert("El carrito está vacío");
            return;
        }

        const productos = [];

        cartBoxes.forEach(box => {
            const nombre = box.querySelector('.cart-product-title').innerText;
            const cantidad = parseInt(box.querySelector('.cart-quantity').value);

            productos.push({
                nombre,
                cantidad
            });
        });

        localStorage.setItem('carrito', JSON.stringify(productos));

        window.location.href = 'pago.html';
    });
}


// RESTAR STOCK
function buyButtonClicked() {
    const cartBoxes = document.querySelectorAll('.cart-box');

    if (cartBoxes.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    const productos = [];

    cartBoxes.forEach(box => {
        const nombre = box.querySelector('.cart-product-title').innerText;
        const cantidad = parseInt(box.querySelector('.cart-quantity').value);

        productos.push({
            nombre,
            cantidad
        });
    });

    fetch('/restar-stock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ productos })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.mensaje);
    })
    .catch(err => {
        console.error('Error al restar stock:', err);
        alert("Error al procesar");
    });
}


// VERIFICAR PAGO EXITOSO
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("pagoExitoso") === "true") {
        localStorage.removeItem("pagoExitoso");
        buyButtonClicked();
    }
});


// CARGAR PRODUCTOS DESDE LA BASE DE DATOS
async function cargarProductos() {
    const contenedor = document.querySelector('#seccion-productos');

    if (!contenedor) return;

    try {
        const respuesta = await fetch('/productos');

        if (!respuesta.ok) {
            throw new Error('Error al obtener los productos');
        }

        const productos = await respuesta.json();

        console.log('Productos recibidos:', productos);

        contenedor.innerHTML = '';

        const categorias = {};

        productos.forEach(producto => {
            if (!categorias[producto.Categoria]) {
                categorias[producto.Categoria] = [];
            }

            categorias[producto.Categoria].push(producto);
        });

        Object.keys(categorias).forEach(categoria => {
            const titulo = document.createElement('h2');
            titulo.classList.add('section-title');
            titulo.textContent = categoria;

            const shopContent = document.createElement('div');
            shopContent.classList.add('shop-content');

            categorias[categoria].forEach(producto => {
                const tarjeta = document.createElement('div');
                tarjeta.classList.add('product-box');

                tarjeta.innerHTML = `
                    <img src="${producto.Imagen}"
                         alt="${producto.Nombre}"
                         class="product-img">

                    <h2 class="product-title">
                        ${producto.Nombre}
                    </h2>

                    <span class="price">
                        C$${producto.Precio}
                    </span>

                    <i class='bx bx-shopping-bag add-cart'></i>
                `;

                shopContent.appendChild(tarjeta);
            });

            contenedor.appendChild(titulo);
            contenedor.appendChild(shopContent);
        });

        console.log('Productos cargados correctamente');

    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
}


// INICIAR CARGA DE PRODUCTOS
document.addEventListener('DOMContentLoaded', cargarProductos);


// CONTROL DE SESIÓN
sessionStorage.setItem("sesionActiva", "true");