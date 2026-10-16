let cartIcon= document.querySelector('#cart-icon')
let cart= document.querySelector('.cart')
let closeCart= document.querySelector('#close-cart')


cartIcon.onclick = () => {
    cart.classList.add("active");
    document.querySelector('.search-form').style.display = "none";
};

closeCart.onclick = () => {
    cart.classList.remove("active");
    document.querySelector('.search-form').style.display = "flex"; // O el valor original
};

if(document.readyState == "loading"){
    document.addEventListener("DOMContentLoaded", ready);
} else{
    ready();
}

document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("seccion-productos");

    try {
        const res = await fetch('/productos');
        const productos = await res.json();

        // Agrupar productos por categoría
        const categorias = {};

        productos.forEach(p => {
            if (!categorias[p.Categoria]) {
                categorias[p.Categoria] = [];
            }
            categorias[p.Categoria].push(p);
        });

        // Renderizar secciones por categoría
        contenedor.innerHTML = '';

        Object.entries(categorias).forEach(([nombreCategoria, listaProductos]) => {
            const seccion = document.createElement("section");
            seccion.classList.add("shop", "container");

            const titulo = document.createElement("h2");
            titulo.classList.add("section-title");
            titulo.textContent = nombreCategoria;

            const divContenido = document.createElement("div");
            divContenido.classList.add("shop-content");

            listaProductos.forEach(p => {
                const productBox = document.createElement("div");
                productBox.classList.add("product-box");

                productBox.innerHTML = `
                    <img src="${p.Imagen}" alt="${p.Nombre}" class="product-img">
                    <h2 class="product-title">${p.Nombre}</h2>
                    <span class="price">$${p.Precio}</span>
                    <i class='bx bx-shopping-bag add-cart'></i>
                `;

                divContenido.appendChild(productBox);
            });

            seccion.appendChild(titulo);
            seccion.appendChild(divContenido);
            contenedor.appendChild(seccion);
        });

        // Conectar eventos al carrito y buscador
        ready();

    } catch (error) {
        console.error("❌ Error al cargar productos:", error);
        contenedor.innerHTML = "<p style='color:red;'>No se pudieron cargar los productos.</p>";
    }
});

function ready(){
    var removeCartButtons= document.getElementsByClassName('cart-remove')
    console.log(removeCartButtons)
    
    for (var i=0; i<removeCartButtons.length; i++){
        var button= removeCartButtons[i]
        button.addEventListener('click', removeCartItem)
    }
    var quantityInputs= document.getElementsByClassName('cart-quantity');

    for(var i=0; i<quantityInputs.length; i++){
        var input= quantityInputs[i];
        input.addEventListener("change", quantityChanged);
    }
    var addCart= document.getElementsByClassName("add-cart");

    for(var i=0; i<addCart.length; i++){
        var button= addCart[i];
        button.addEventListener("click", addCartClicked);
    }

    cargarCarritoDesdeLocalStorage();
    //document.getElementsByClassName("btn-comprar")[0].addEventListener("click", buyButtonClicked);
}

/*function buyButtonClicked(){
    alert("Tu orden esta realizada");
    
    var cartContent= document.getElementsByClassName("cart-content")[0];
    while(cartContent.hasChildNodes()){
        cartContent.removeChild(cartContent.firstChild);
    }
    updatetotal();
}*/

document.querySelector('.btn-comprar').addEventListener('click', () => {
    const cartBoxes = document.querySelectorAll('.cart-box');
    if (cartBoxes.length === 0) {
        alert("El carrito está vacío");
        return;
    }

    const productos = [];
    cartBoxes.forEach(box => {
        const nombre = box.querySelector('.cart-product-title').innerText;
        const cantidad = parseInt(box.querySelector('.cart-quantity').value);
        productos.push({ nombre, cantidad });
    });

    // Guardar en localStorage
    localStorage.setItem('carrito', JSON.stringify(productos));

    // Redirigir a pago.html
    window.location.href = 'pago.html';
});

document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("pagoExitoso") === "true") {
        localStorage.removeItem("pagoExitoso"); // Limpiar para futuros pagos
        buyButtonClicked(); // Ejecutar función de restar stock
    }
});

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

        productos.push({ nombre, cantidad });
    });

    fetch('/restar-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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



// Conectar el botón "Comprar Ahora"
/*document.getElementsByClassName("btn-comprar")[0]
  .addEventListener("click", buyButtonClicked);*/



function removeCartItem(event){
    var buttonClicked= event.target;
    buttonClicked.parentElement.remove();
    updatetotal();

    guardarCarritoEnLocalStorage();
}

function quantityChanged(event){
    var input= event.target;
    const maxCantidad = 15;

    if(isNaN(input.value) || input.value <= 0){
        input.value=1;
    } else if(input.value > maxCantidad){
        input.value = maxCantidad;
        alert(`Solo puedes agregar hasta ${maxCantidad} unidades por producto.`)
    }

    updatetotal();
    guardarCarritoEnLocalStorage();

}

function addCartClicked(event){
    var button= event.target;
    var shopProducts= button.parentElement;
    var title= shopProducts.getElementsByClassName("product-title")[0].innerText;
    var price= shopProducts.getElementsByClassName("price")[0].innerText;
    var productImg= shopProducts.getElementsByClassName("product-img")[0].src;
    
    addProductToCart(title, price, productImg);
    updatetotal();
}

function addProductToCart(title, price, productImg, triggeredByUser = true){
    var cartShopBox= document.createElement('div');
    cartShopBox.classList.add('cart-box');
    var cartItems= document.getElementsByClassName('cart-content')[0];
    var cartItemsNames= cartItems.getElementsByClassName('cart-product-title');

    for(var i=0; i<cartItemsNames.length; i++){
        if(cartItemsNames[i].innerText === title){
            if (triggeredByUser) {
                alert("Ya has agregado este elemento al carrito");
            }   
            return;
        } 
    }

    var cartBoxContent= `
                        <img src="${productImg}" alt="" class="cart-img">
                            <div class="detail-box">
                                <div class="cart-product-title">${title}</div>
                                <div class="cart-price">${price}</div>
                                <input type="number" value="1" class="cart-quantity">
                            </div>

                            <i class='bx bx-trash cart-remove'></i>
`;

cartShopBox.innerHTML= cartBoxContent
cartItems.append(cartShopBox)
cartShopBox.getElementsByClassName('cart-remove')[0].addEventListener('click', removeCartItem)
cartShopBox.getElementsByClassName('cart-quantity')[0].addEventListener('change', quantityChanged)

guardarCarritoEnLocalStorage();
}

/*function updatetotal(){
    var cartContent= document.getElementsByClassName('cart-content')[0];
    var cartBoxes= cartContent.getElementsByClassName('cart-box');
    var total=0;

    for(var i= 0; i<cartBoxes.length; i++){
        var cartBox= cartBoxes[i];
        var priceElement= cartBox.getElementsByClassName("cart-price")[0];
        var quantityElement= cartBox.getElementsByClassName("cart-quantity")[0];
        var price= parseFloat(priceElement.innerText.replace("$",""));
        var quantity= quantityElement.value;
        total= total + (price * quantity);
    }
    document.getElementsByClassName("total-price")[0].innerText="$" + total;
}*/

async function updatetotal(){
    var cartContent= document.getElementsByClassName('cart-content')[0];
    var cartBoxes= cartContent.getElementsByClassName('cart-box');
    var total=0;

    for(var i= 0; i<cartBoxes.length; i++){
        var cartBox= cartBoxes[i];
        var priceElement= cartBox.getElementsByClassName("cart-price")[0];
        var quantityElement= cartBox.getElementsByClassName("cart-quantity")[0];
        var price= parseFloat(priceElement.innerText.replace("$",""));
        var quantity= quantityElement.value;

        try {
            // Llamada a backend para calcular subtotal
            const response = await fetch(`/calcular-subtotal?precio=${price}&cantidad=${quantity}`);
            const data = await response.json();
            total += parseFloat(data.subtotal);
        } catch (error) {
            console.error('Error calculando subtotal:', error);
            total += price * quantity; // fallback local
        }
    }
    document.getElementsByClassName("total-price")[0].innerText = "$" + total.toFixed(2);
}


//Busqueda
document.querySelector(".search-form input").addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase();
    const productBoxes = document.querySelectorAll(".product-box");

    productBoxes.forEach(function (box) {
        const title = box.querySelector(".product-title").innerText.toLowerCase();
        if (title.includes(searchTerm)) {
            box.style.display = ""; // Mostrar producto
        } else {
            box.style.display = "none"; // Ocultar si no coincide
        }
    });

    document.querySelectorAll(".shop").forEach(function(section) {
        const visibleProducts = section.querySelectorAll(".product-box:not([style*='display: none'])");
        const title = section.querySelector(".section-title");
        title.style.display = visibleProducts.length > 0 ? "" : "none";
    });
});

//-----------------------------localstorage guardar Productos Carrito
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

        productos.push({ nombre, precio, cantidad, imagen });
    });

    localStorage.setItem(`carrito_${usuario}`, JSON.stringify(productos));
}

//-------------------------------localstorage cargar Producto Carrito
function cargarCarritoDesdeLocalStorage() {
    const usuario = localStorage.getItem("nombreUsuario");
    if (!usuario) return;

    const productos = JSON.parse(localStorage.getItem(`carrito_${usuario}`)) || [];

    productos.forEach(p => {
        addProductToCart(p.nombre, p.precio, p.imagen, false);
        const cartItems = document.getElementsByClassName('cart-content')[0];
        const lastBox = cartItems.lastChild;
        lastBox.querySelector('.cart-quantity').value = p.cantidad;
    });

    updatetotal();
}

sessionStorage.setItem("sesionActiva", "true");

// Detectar si es una nueva sesión (navegador se cerró completamente)
window.addEventListener("load", () => {
    // Si es una nueva sesión (navegador cerrado completamente), borra carrito
  /*if (!sessionStorage.getItem("sesionActiva")) {
    console.log("🧹 Nueva sesión (no recarga). Limpiando carrito.");
    localStorage.removeItem("carrito");
  }*/

  // Marcar que la sesión está activa (persistirá solo mientras el navegador esté abierto)
  sessionStorage.setItem("sesionActiva", "true");

  // Cargar carrito visualmente
  cargarCarritoDesdeLocalStorage();
});
