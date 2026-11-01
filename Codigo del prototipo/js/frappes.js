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
}

function quantityChanged(event){
    var input= event.target;
    if(isNaN(input.value) || input.value <= 0){
        input.value=1;
    }
    updatetotal();
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

function addProductToCart(title, price, productImg){
    var cartShopBox= document.createElement('div');
    cartShopBox.classList.add('cart-box');
    var cartItems= document.getElementsByClassName('cart-content')[0];
    var cartItemsNames= cartItems.getElementsByClassName('cart-product-title');

    for(var i=0; i<cartItemsNames.length; i++){
        if(cartItemsNames[i].innerText === title){
            alert("Has agregado este elemento al carrito");   
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

document.getElementById("userContainer").addEventListener("click", () => {
    const usuario = localStorage.getItem("nombreUsuario");

    if (usuario && usuario.trim() !== "") {
        // Ya inició sesión: Redirigir a perfil o mostrar menú
        window.location.href = "usuario.html"; // o la página que quieras mostrar
    } else {
        // No ha iniciado sesión: Enviar a login
        window.location.href = "inicio.html";
    }
});

//---------------------------------------------------------------


