// Global Variables
let currentUser = null;
let cart = [];
let orders = [];
let menuItems = [];
let loyaltyPoints = 0;

// API Client (will be loaded from api.js)
let api = null;

// Sample Menu Data
const sampleMenuItems = [
    {
        id: 1,
        name: "Chicken Burger",
        price: 8.99,
        category: "main",
        description: "Juicy grilled chicken breast with fresh lettuce, tomato, and our special sauce",
        nutrition: { calories: 450, protein: 35, carbs: 25, fat: 20 },
        image: "🍔",
        customizable: true,
        options: {
            size: ["Regular", "Large"],
            extras: ["Cheese", "Bacon", "Avocado"],
            sides: ["Fries", "Onion Rings", "Salad"]
        }
    },
    {
        id: 2,
        name: "Vegetarian Pizza",
        price: 12.99,
        category: "main",
        description: "Fresh vegetables on a crispy crust with mozzarella cheese",
        nutrition: { calories: 320, protein: 15, carbs: 40, fat: 12 },
        image: "🍕",
        customizable: true,
        options: {
            size: ["Small", "Medium", "Large"],
            toppings: ["Mushrooms", "Bell Peppers", "Olives", "Onions"],
            crust: ["Thin", "Regular", "Thick"]
        }
    },
    {
        id: 3,
        name: "Caesar Salad",
        price: 7.99,
        category: "main",
        description: "Fresh romaine lettuce with parmesan cheese and croutons",
        nutrition: { calories: 180, protein: 12, carbs: 15, fat: 8 },
        image: "🥗",
        customizable: true,
        options: {
            dressing: ["Caesar", "Ranch", "Italian", "Balsamic"],
            protein: ["Chicken", "Salmon", "Tofu", "None"],
            extras: ["Croutons", "Parmesan", "Bacon Bits"]
        }
    },
    {
        id: 4,
        name: "French Fries",
        price: 4.99,
        category: "snacks",
        description: "Crispy golden fries with sea salt",
        nutrition: { calories: 320, protein: 4, carbs: 40, fat: 16 },
        image: "🍟",
        customizable: true,
        options: {
            size: ["Small", "Medium", "Large"],
            seasoning: ["Sea Salt", "Cajun", "Garlic", "Cheese"]
        }
    },
    {
        id: 5,
        name: "Chicken Wings",
        price: 9.99,
        category: "snacks",
        description: "Spicy buffalo wings with ranch dip",
        nutrition: { calories: 280, protein: 25, carbs: 2, fat: 18 },
        image: "🍗",
        customizable: true,
        options: {
            sauce: ["Buffalo", "BBQ", "Honey Mustard", "Teriyaki"],
            spice: ["Mild", "Medium", "Hot", "Extra Hot"]
        }
    },
    {
        id: 6,
        name: "Fresh Orange Juice",
        price: 3.99,
        category: "beverages",
        description: "Freshly squeezed orange juice",
        nutrition: { calories: 120, protein: 2, carbs: 28, fat: 0 },
        image: "🍊",
        customizable: false
    },
    {
        id: 7,
        name: "Coffee",
        price: 2.99,
        category: "beverages",
        description: "Freshly brewed coffee",
        nutrition: { calories: 5, protein: 0, carbs: 1, fat: 0 },
        image: "☕",
        customizable: true,
        options: {
            size: ["Small", "Medium", "Large"],
            type: ["Regular", "Decaf", "Espresso"],
            milk: ["None", "Whole", "Skim", "Almond", "Soy"]
        }
    },
    {
        id: 8,
        name: "Chocolate Cake",
        price: 5.99,
        category: "desserts",
        description: "Rich chocolate cake with chocolate frosting",
        nutrition: { calories: 420, protein: 6, carbs: 65, fat: 16 },
        image: "🍰",
        customizable: true,
        options: {
            size: ["Slice", "Whole"],
            frosting: ["Chocolate", "Vanilla", "Strawberry"],
            extras: ["Whipped Cream", "Ice Cream", "Berries"]
        }
    },
    {
        id: 9,
        name: "Ice Cream",
        price: 4.99,
        category: "desserts",
        description: "Creamy vanilla ice cream",
        nutrition: { calories: 250, protein: 4, carbs: 30, fat: 12 },
        image: "🍦",
        customizable: true,
        options: {
            flavor: ["Vanilla", "Chocolate", "Strawberry", "Mint"],
            size: ["Single Scoop", "Double Scoop", "Triple Scoop"],
            toppings: ["Chocolate Chips", "Sprinkles", "Nuts", "Caramel"]
        }
    },
    {
        id: 10,
        name: "Fish and Chips",
        price: 11.99,
        category: "main",
        description: "Beer-battered fish with crispy fries",
        nutrition: { calories: 580, protein: 28, carbs: 45, fat: 32 },
        image: "🐟",
        customizable: true,
        options: {
            fish: ["Cod", "Haddock", "Salmon"],
            batter: ["Beer", "Tempura", "Panko"],
            sides: ["Fries", "Mushy Peas", "Coleslaw"]
        }
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    try {
        // Wait for API client to be available
        if (typeof window.api !== 'undefined') {
            api = window.api;
        } else {
            // Fallback: wait a bit for api.js to load
            await new Promise(resolve => setTimeout(resolve, 100));
            api = window.api;
        }

        if (!api) {
            console.error('API client not available');
            return;
        }

        // Load data from API
        await loadUserData();
        await loadMenuData();
        
        // Initialize UI
        updateCartDisplay();
        updateUserDisplay();
        await renderMenu();
        await renderOrders();
        updateLoyaltyDisplay();
        
        // Set up event listeners
        setupEventListeners();
        
        // Show home section by default
        showSection('home');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Failed to initialize application', 'error');
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('href').substring(1);
            showSection(section);
        });
    });
    
    // Menu filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.getAttribute('data-category');
            filterMenu(category);
            
            // Update active filter
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Order tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const status = e.target.getAttribute('data-status');
            filterOrders(status);
            
            // Update active tab
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const mode = e.target.getAttribute('data-mode');
            switchAuthMode(mode);
            
            // Update active tab
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
    
    // Auth form submission
    document.getElementById('authForm').addEventListener('submit', handleAuthSubmit);
    
    // Allergy input
    document.getElementById('allergyInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addAllergy();
        }
    });
    
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProfile();
    });
}

// Navigation Functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
    
    // Load section-specific data
    if (sectionId === 'orders') {
        renderOrders();
    } else if (sectionId === 'profile') {
        loadProfileData();
    }
}

// Authentication Functions
function toggleAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.toggle('active');
    
    if (!modal.classList.contains('active')) {
        document.getElementById('authForm').reset();
        switchAuthMode('login');
    }
}

function switchAuthMode(mode) {
    const title = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const fullNameGroup = document.getElementById('fullNameGroup');
    const studentIdGroup = document.getElementById('studentIdGroup');
    
    if (mode === 'login') {
        title.textContent = 'Login';
        submitBtn.textContent = 'Login';
        confirmPasswordGroup.style.display = 'none';
        fullNameGroup.style.display = 'none';
        studentIdGroup.style.display = 'none';
    } else {
        title.textContent = 'Register';
        submitBtn.textContent = 'Register';
        confirmPasswordGroup.style.display = 'block';
        fullNameGroup.style.display = 'block';
        studentIdGroup.style.display = 'block';
    }
}

function handleAuthSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    const fullName = formData.get('fullName');
    const studentId = formData.get('studentId');
    
    const activeTab = document.querySelector('.auth-tab.active');
    const mode = activeTab.getAttribute('data-mode');
    
    if (mode === 'register') {
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        if (!fullName || !studentId) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        registerUser(email, password, fullName, studentId);
    } else {
        loginUser(email, password);
    }
}

async function registerUser(email, password, fullName, studentId) {
    try {
        const response = await api.register({
            email,
            password,
            fullName,
            studentId
        });
        
        if (response.success) {
            currentUser = response.data.user;
            showToast('Registration successful!', 'success');
            toggleAuthModal();
            updateUserDisplay();
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message || 'Registration failed', 'error');
    }
}

async function loginUser(email, password) {
    try {
        const response = await api.login({
            email,
            password
        });
        
        if (response.success) {
            currentUser = response.data.user;
            showToast('Login successful!', 'success');
            toggleAuthModal();
            updateUserDisplay();
            
            // Load user's cart and orders
            await loadCartData();
            await loadOrdersData();
            updateCartDisplay();
            renderOrders();
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message || 'Login failed', 'error');
    }
}

function logout() {
    currentUser = null;
    cart = [];
    orders = [];
    api.setToken(null);
    updateUserDisplay();
    updateCartDisplay();
    showToast('Logged out successfully', 'success');
    showSection('home');
}

// User Display Functions
function updateUserDisplay() {
    const userName = document.getElementById('userName');
    const userPoints = document.getElementById('userPoints');
    const loginBtn = document.getElementById('loginBtn');
    
    if (currentUser) {
        userName.textContent = currentUser.fullName;
        userPoints.textContent = `${currentUser.loyaltyPoints} pts`;
        loginBtn.textContent = 'Logout';
        loginBtn.onclick = logout;
    } else {
        userName.textContent = 'Guest';
        userPoints.textContent = '0 pts';
        loginBtn.textContent = 'Login';
        loginBtn.onclick = toggleAuthModal;
    }
}

// Menu Functions
async function loadMenuData() {
    try {
        const response = await api.getMenuItems();
        if (response.success) {
            menuItems = response.data;
        } else {
            // Fallback to sample data
            menuItems = sampleMenuItems;
        }
    } catch (error) {
        console.error('Failed to load menu data:', error);
        // Fallback to sample data
        menuItems = sampleMenuItems;
    }
}

function renderMenu() {
    const menuGrid = document.getElementById('menuGrid');
    menuGrid.innerHTML = '';
    
    menuItems.forEach(item => {
        const menuItemElement = createMenuItemElement(item);
        menuGrid.appendChild(menuItemElement);
    });
}

function createMenuItemElement(item) {
    const div = document.createElement('div');
    div.className = 'menu-item';
    div.setAttribute('data-category', item.category);
    
    div.innerHTML = `
        <div class="menu-item-image">
            ${item.image}
        </div>
        <div class="menu-item-content">
            <div class="menu-item-header">
                <h3 class="menu-item-name">${item.name}</h3>
                <span class="menu-item-price">$${item.price.toFixed(2)}</span>
            </div>
            <p class="menu-item-description">${item.description}</p>
            <div class="menu-item-nutrition">
                <div class="nutrition-item">
                    <i class="fas fa-fire"></i>
                    <span>${item.nutrition.calories} cal</span>
                </div>
                <div class="nutrition-item">
                    <i class="fas fa-dumbbell"></i>
                    <span>${item.nutrition.protein}g protein</span>
                </div>
                <div class="nutrition-item">
                    <i class="fas fa-bread-slice"></i>
                    <span>${item.nutrition.carbs}g carbs</span>
                </div>
            </div>
            <div class="menu-item-actions">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="decreaseQuantity(${item.id})">-</button>
                    <input type="number" class="quantity-input" id="qty-${item.id}" value="1" min="1" max="10">
                    <button class="quantity-btn" onclick="increaseQuantity(${item.id})">+</button>
                </div>
                <button class="add-to-cart-btn" onclick="addToCart(${item.id})">
                    <i class="fas fa-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
    
    return div;
}

function filterMenu(category) {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        if (category === 'all' || item.getAttribute('data-category') === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

function increaseQuantity(itemId) {
    const input = document.getElementById(`qty-${itemId}`);
    const currentValue = parseInt(input.value);
    if (currentValue < 10) {
        input.value = currentValue + 1;
    }
}

function decreaseQuantity(itemId) {
    const input = document.getElementById(`qty-${itemId}`);
    const currentValue = parseInt(input.value);
    if (currentValue > 1) {
        input.value = currentValue - 1;
    }
}

// Cart Functions
async function addToCart(itemId) {
    if (!currentUser) {
        showToast('Please login to add items to cart', 'warning');
        toggleAuthModal();
        return;
    }

    const item = menuItems.find(i => i.id === itemId);
    const quantity = parseInt(document.getElementById(`qty-${itemId}`).value);
    
    if (!item) return;
    
    try {
        await api.addToCart({
            menuItemId: itemId,
            quantity: quantity
        });
        
        // Reload cart data
        await loadCartData();
        updateCartDisplay();
        showToast(`${item.name} added to cart`, 'success');
    } catch (error) {
        console.error('Failed to add to cart:', error);
        showToast(error.message || 'Failed to add item to cart', 'error');
    }
}

async function removeFromCart(itemId) {
    try {
        await api.removeFromCart(itemId);
        await loadCartData();
        updateCartDisplay();
        showToast('Item removed from cart', 'success');
    } catch (error) {
        console.error('Failed to remove from cart:', error);
        showToast(error.message || 'Failed to remove item from cart', 'error');
    }
}

async function updateCartQuantity(itemId, newQuantity) {
    try {
        if (newQuantity <= 0) {
            await removeFromCart(itemId);
        } else {
            await api.updateCartItem(itemId, { quantity: newQuantity });
            await loadCartData();
            updateCartDisplay();
        }
    } catch (error) {
        console.error('Failed to update cart quantity:', error);
        showToast(error.message || 'Failed to update cart quantity', 'error');
    }
}

async function clearCart() {
    try {
        await api.clearCart();
        await loadCartData();
        updateCartDisplay();
        showToast('Cart cleared', 'success');
    } catch (error) {
        console.error('Failed to clear cart:', error);
        showToast(error.message || 'Failed to clear cart', 'error');
    }
}

function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('open');
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update cart items
    cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItemDiv = document.createElement('div');
        cartItemDiv.className = 'cart-item';
        cartItemDiv.innerHTML = `
            <div class="cart-item-image">${item.image}</div>
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="10" 
                       onchange="updateCartQuantity(${item.id}, parseInt(this.value))">
                <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
                <button class="remove-item" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItems.appendChild(cartItemDiv);
    });
    
    // Update total
    cartTotal.textContent = total.toFixed(2);
}

async function checkout() {
    if (cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    
    if (!currentUser) {
        showToast('Please login to place an order', 'warning');
        toggleAuthModal();
        return;
    }
    
    try {
        // Prepare order items for API
        const orderItems = cart.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            customizations: item.customizations
        }));

        const response = await api.createOrder({
            items: orderItems,
            estimatedTime: new Date(Date.now() + 20 * 60000).toISOString() // 20 minutes from now
        });

        if (response.success) {
            const order = response.data.order;
            
            // Update user's loyalty points
            currentUser.loyaltyPoints += order.pointsEarned;
            
            // Clear cart
            await clearCart();
            toggleCart();
            
            // Show success message
            showToast(`Order placed successfully! You earned ${order.pointsEarned} loyalty points.`, 'success');
            
            // Update displays
            updateUserDisplay();
            updateLoyaltyDisplay();
            
            // Reload orders
            await loadOrdersData();
            
            // Show tracking modal
            setTimeout(() => {
                showTrackingModal(order.id);
            }, 1000);
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showToast(error.message || 'Failed to place order', 'error');
    }
}

// Order Functions
function loadOrdersData() {
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
        orders = JSON.parse(savedOrders);
    }
}

function saveOrdersData() {
    localStorage.setItem('orders', JSON.stringify(orders));
}

function renderOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    ordersContainer.innerHTML = '';
    
    const userOrders = currentUser ? orders.filter(order => order.userId === currentUser.id) : [];
    
    if (userOrders.length === 0) {
        ordersContainer.innerHTML = '<div class="text-center"><p>No orders found</p></div>';
        return;
    }
    
    userOrders.forEach(order => {
        const orderElement = createOrderElement(order);
        ordersContainer.appendChild(orderElement);
    });
}

function createOrderElement(order) {
    const div = document.createElement('div');
    div.className = 'order-card';
    
    const statusClass = order.status;
    const statusText = order.status.charAt(0).toUpperCase() + order.status.slice(1);
    
    div.innerHTML = `
        <div class="order-header">
            <span class="order-id">Order #${order.id}</span>
            <span class="order-status ${statusClass}">${statusText}</span>
        </div>
        <div class="order-items">
            ${order.items.map(item => `
                <div class="order-item">
                    <span class="order-item-name">${item.name}</span>
                    <span class="order-item-quantity">x${item.quantity}</span>
                    <span class="order-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="order-summary">
            <span class="order-total">Total: $${order.total.toFixed(2)}</span>
            <div class="order-actions">
                ${order.status === 'active' ? `
                    <button class="track-btn" onclick="showTrackingModal(${order.id})">Track Order</button>
                    <button class="cancel-btn" onclick="cancelOrder(${order.id})">Cancel</button>
                ` : ''}
            </div>
        </div>
    `;
    
    return div;
}

function filterOrders(status) {
    const orderCards = document.querySelectorAll('.order-card');
    
    orderCards.forEach(card => {
        const orderStatus = card.querySelector('.order-status').textContent.toLowerCase();
        if (status === 'all' || orderStatus === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function cancelOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order && order.status === 'active') {
        order.status = 'cancelled';
        saveOrdersData();
        renderOrders();
        showToast('Order cancelled', 'success');
    }
}

// Tracking Functions
function showTrackingModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    document.getElementById('trackingOrderId').textContent = order.id;
    
    const estimatedTime = new Date(order.estimatedTime);
    const now = new Date();
    const timeLeft = Math.max(0, Math.ceil((estimatedTime - now) / 60000));
    
    document.getElementById('trackingTime').textContent = `${timeLeft} minutes`;
    
    // Update tracking steps based on order status
    updateTrackingSteps(order);
    
    document.getElementById('trackingModal').classList.add('active');
    
    // Simulate order progress
    if (order.status === 'active') {
        simulateOrderProgress(order);
    }
}

function updateTrackingSteps(order) {
    const steps = {
        preparing: document.getElementById('preparingStep'),
        ready: document.getElementById('readyStep'),
        completed: document.getElementById('completedStep')
    };
    
    // Reset all steps
    Object.values(steps).forEach(step => {
        step.classList.remove('active', 'completed');
    });
    
    // Update based on status
    if (order.status === 'active') {
        steps.preparing.classList.add('active');
    } else if (order.status === 'ready') {
        steps.preparing.classList.add('completed');
        steps.ready.classList.add('active');
    } else if (order.status === 'completed') {
        steps.preparing.classList.add('completed');
        steps.ready.classList.add('completed');
        steps.completed.classList.add('completed');
    }
}

function simulateOrderProgress(order) {
    // Simulate order progression
    setTimeout(() => {
        if (order.status === 'active') {
            order.status = 'ready';
            saveOrdersData();
            updateTrackingSteps(order);
            showToast('Your order is ready for pickup!', 'success');
        }
    }, 10000); // 10 seconds for demo
    
    setTimeout(() => {
        if (order.status === 'ready') {
            order.status = 'completed';
            saveOrdersData();
            updateTrackingSteps(order);
            showToast('Order completed!', 'success');
        }
    }, 20000); // 20 seconds for demo
}

function closeTrackingModal() {
    document.getElementById('trackingModal').classList.remove('active');
}

// Profile Functions
function loadProfileData() {
    if (!currentUser) return;
    
    // Load user data into form
    document.getElementById('fullName').value = currentUser.fullName || '';
    document.getElementById('email').value = currentUser.email || '';
    document.getElementById('phone').value = currentUser.phone || '';
    document.getElementById('studentId').value = currentUser.studentId || '';
    
    // Load dietary preferences
    const preferences = currentUser.dietaryPreferences || {};
    document.querySelector('input[name="vegetarian"]').checked = preferences.vegetarian || false;
    document.querySelector('input[name="vegan"]').checked = preferences.vegan || false;
    document.querySelector('input[name="glutenFree"]').checked = preferences.glutenFree || false;
    document.querySelector('input[name="dairyFree"]').checked = preferences.dairyFree || false;
    
    // Load allergies
    renderAllergies(currentUser.allergies || []);
}

function saveProfile() {
    if (!currentUser) {
        showToast('Please login to save profile', 'warning');
        return;
    }
    
    // Get form data
    const formData = new FormData(document.getElementById('profileForm'));
    
    // Update user data
    currentUser.fullName = formData.get('fullName');
    currentUser.email = formData.get('email');
    currentUser.phone = formData.get('phone');
    currentUser.studentId = formData.get('studentId');
    
    // Update dietary preferences
    currentUser.dietaryPreferences = {
        vegetarian: document.querySelector('input[name="vegetarian"]').checked,
        vegan: document.querySelector('input[name="vegan"]').checked,
        glutenFree: document.querySelector('input[name="glutenFree"]').checked,
        dairyFree: document.querySelector('input[name="dairyFree"]').checked
    };
    
    // Save user data
    saveUserData();
    updateUserDisplay();
    
    showToast('Profile saved successfully', 'success');
}

function addAllergy() {
    const input = document.getElementById('allergyInput');
    const allergy = input.value.trim();
    
    if (allergy && currentUser) {
        if (!currentUser.allergies) {
            currentUser.allergies = [];
        }
        
        if (!currentUser.allergies.includes(allergy)) {
            currentUser.allergies.push(allergy);
            saveUserData();
            renderAllergies(currentUser.allergies);
            input.value = '';
        }
    }
}

function removeAllergy(allergy) {
    if (currentUser && currentUser.allergies) {
        currentUser.allergies = currentUser.allergies.filter(a => a !== allergy);
        saveUserData();
        renderAllergies(currentUser.allergies);
    }
}

function renderAllergies(allergies) {
    const container = document.getElementById('allergyTags');
    container.innerHTML = '';
    
    allergies.forEach(allergy => {
        const tag = document.createElement('div');
        tag.className = 'allergy-tag';
        tag.innerHTML = `
            ${allergy}
            <span class="remove-tag" onclick="removeAllergy('${allergy}')">×</span>
        `;
        container.appendChild(tag);
    });
}

// Loyalty Functions
function updateLoyaltyDisplay() {
    if (!currentUser) return;
    
    const profilePoints = document.getElementById('profilePoints');
    const pointsProgress = document.getElementById('pointsProgress');
    
    profilePoints.textContent = currentUser.loyaltyPoints;
    
    // Calculate progress to next reward (every 100 points)
    const progress = (currentUser.loyaltyPoints % 100) / 100 * 100;
    pointsProgress.style.width = `${progress}%`;
}

// Data Persistence Functions
async function loadUserData() {
    try {
        // Check if we have a token
        const token = localStorage.getItem('authToken');
        if (token && api) {
            api.setToken(token);
            const response = await api.verifyToken();
            if (response.success) {
                currentUser = response.data.user;
            }
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
        // Clear invalid token
        if (api) {
            api.setToken(null);
        }
    }
}

async function loadCartData() {
    if (!currentUser || !api) return;
    
    try {
        const response = await api.getCart();
        if (response.success) {
            cart = response.data.items || [];
        }
    } catch (error) {
        console.error('Failed to load cart data:', error);
        cart = [];
    }
}

async function loadOrdersData() {
    if (!currentUser || !api) return;
    
    try {
        const response = await api.getOrders();
        if (response.success) {
            orders = response.data || [];
        }
    } catch (error) {
        console.error('Failed to load orders data:', error);
        orders = [];
    }
}

// Utility Functions
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.querySelector('.toast-message');
    const toastIcon = document.querySelector('.toast-icon');
    
    toastMessage.textContent = message;
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle'
    };
    
    toastIcon.className = `toast-icon ${icons[type] || icons.success}`;
    toast.className = `toast ${type} show`;
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Real-time Updates (simulated)
function startRealTimeUpdates() {
    // Simulate real-time order updates
    setInterval(() => {
        if (currentUser) {
            const userOrders = orders.filter(order => order.userId === currentUser.id);
            userOrders.forEach(order => {
                if (order.status === 'active') {
                    const now = new Date();
                    const orderTime = new Date(order.createdAt);
                    const timeDiff = now - orderTime;
                    
                    // Update order status based on time
                    if (timeDiff > 15 * 60000 && order.status === 'active') { // 15 minutes
                        order.status = 'ready';
                        saveOrdersData();
                        showToast('Your order is ready for pickup!', 'success');
                    } else if (timeDiff > 25 * 60000 && order.status === 'ready') { // 25 minutes
                        order.status = 'completed';
                        saveOrdersData();
                        showToast('Order completed!', 'success');
                    }
                }
            });
        }
    }, 30000); // Check every 30 seconds
}

// Start real-time updates
startRealTimeUpdates();
