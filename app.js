let API_BASE = "https://estoque-xpb2.onrender.com";
let products = [];
let sales = [];
let currentSection = 'dashboard';

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    loadDashboardData();
    loadProducts();
    updateProductSelect();
});

async function api(path, init) {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init && init.headers ? init.headers : {}),
        },
    });
    if (!res.ok) {
        let detail = "Erro de requisição";
        try {
            const j = await res.json();
            detail = j.detail || JSON.stringify(j);
        } catch { }
        throw new Error(detail);
    }
    if (res.status === 204) return null;
    return res.json();
}

// Navegação
function showSection(section) {
    // Atualizar nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });

    // Mostrar seção
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.add('hidden');
    });
    document.getElementById(section + '-section').classList.remove('hidden');

    currentSection = section;

    // Carregar dados da seção se necessário
    if (section === 'products') {
        loadProducts();
    } else if (section === 'dashboard') {
        loadDashboardData();
    } else if (section === 'sales') {
        loadSales(); // ADICIONAR ESTA LINHA
    }
}

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Dashboard
async function loadDashboardData() {
    try {
        const summary = await api('/financial/summary?days=30');

        document.getElementById('total-sales').textContent = formatCurrency(summary.total_sales);
        document.getElementById('total-costs').textContent = formatCurrency(summary.total_costs);
        document.getElementById('profit').textContent = formatCurrency(summary.total_profit);
        document.getElementById('sales-count').textContent = summary.total_sales_count;

    } catch (err) {
        // Fallback para cálculo local se API falhar
        const totalSales = sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        const totalCosts = sales.reduce((sum, sale) => {
            return sum + sale.items.reduce((itemSum, item) => itemSum + (item.total_cost || 0), 0);
        }, 0);
        const profit = totalSales - totalCosts;

        document.getElementById('total-sales').textContent = formatCurrency(totalSales);
        document.getElementById('total-costs').textContent = formatCurrency(totalCosts);
        document.getElementById('profit').textContent = formatCurrency(profit);
        document.getElementById('sales-count').textContent = sales.length;
    }

    loadStockAlerts();
}

async function loadSales() {
    try {
        sales = await api('/sales');
    } catch (err) {
        showNotification('Erro ao carregar vendas: ' + err.message, 'error');
        sales = [];
    }
    renderSales();
}

function renderSales() {
    const salesList = document.getElementById('sales-list');

    if (sales.length === 0) {
        salesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <h3>Nenhuma venda registrada</h3>
                <p>Comece registrando sua primeira venda.</p>
                <button class="btn btn-primary" onclick="openModal('sale')">Nova Venda</button>
            </div>
        `;
        return;
    }

    salesList.innerHTML = sales.map(sale => {
        const saleDate = new Date(sale.sale_date).toLocaleDateString('pt-BR');
        const saleTime = new Date(sale.sale_date).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="sale-card" style="background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow-sm);">
                <div class="sale-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text);">
                            Venda #${sale.id}
                        </h3>
                        <p style="margin: 4px 0 0 0; color: var(--text-muted); font-size: 14px;">
                            ${sale.customer_name} • ${saleDate} às ${saleTime}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 20px; font-weight: 800; color: var(--success);">
                            ${formatCurrency(sale.total_amount)}
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">
                            ${getPaymentMethodText(sale.payment_method)}
                        </div>
                    </div>
                </div>
                
                <div class="sale-items" style="background: var(--border-light); border-radius: var(--radius); padding: 12px;">
                    <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">
                        Itens (${sale.items.length})
                    </h4>
                    ${sale.items.map(item => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
                            <div>
                                <span style="font-weight: 600;">${item.product_name}</span>
                                <span style="color: var(--text-muted); font-size: 14px;"> x${item.quantity}</span>
                            </div>
                            <div style="font-weight: 600;">
                                ${formatCurrency(item.total_price)}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="sale-actions" style="display: flex; gap: 8px; margin-top: 16px;">
                    <button class="btn btn-secondary" onclick="viewSaleDetails(${sale.id})" style="font-size: 12px; padding: 8px 12px;">
                        👁️ Ver Detalhes
                    </button>
                    <button class="btn btn-secondary" onclick="deleteSale(${sale.id})" style="background: var(--danger); color: white; font-size: 12px; padding: 8px 12px;">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getPaymentMethodText(method) {
    const methods = {
        'dinheiro': '💵 Dinheiro',
        'cartao': '💳 Cartão',
        'pix': '📱 PIX',
        'transferencia': '🏦 Transferência'
    };
    return methods[method] || method;
}

function viewSaleDetails(saleId) {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    alert(`Detalhes da Venda #${sale.id}\n\n` +
        `Cliente: ${sale.customer_name}\n` +
        `Data: ${new Date(sale.sale_date).toLocaleString('pt-BR')}\n` +
        `Total: ${formatCurrency(sale.total_amount)}\n` +
        `Pagamento: ${getPaymentMethodText(sale.payment_method)}\n\n` +
        `Itens:\n${sale.items.map(item =>
            `- ${item.product_name} x${item.quantity} = ${formatCurrency(item.total_price)}`
        ).join('\n')}`);
}

async function deleteSale(saleId) {
    if (!confirm('Tem certeza que deseja excluir esta venda?')) return;

    try {
        await api(`/sales/${saleId}`, { method: 'DELETE' });
        showNotification('Venda excluída com sucesso!', 'success');
        loadSales();
        loadProducts(); // Recarregar produtos para atualizar estoque
        loadDashboardData();
    } catch (err) {
        showNotification('Erro ao excluir venda: ' + err.message, 'error');
    }
}

function loadStockAlerts() {
    const lowStockProducts = products.filter(p => p.quantity <= p.min_quantity);
    const alertsContainer = document.getElementById('stock-alerts');

    if (lowStockProducts.length === 0) {
        alertsContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✅</div>
                        <h3>Tudo em ordem!</h3>
                        <p>Nenhum alerta de estoque no momento.</p>
                    </div>
                `;
        return;
    }

    alertsContainer.innerHTML = lowStockProducts.map(product => `
                <div class="flex items-center justify-between" style="padding: 12px; border: 1px solid var(--warning); background: #fefce8; border-radius: var(--radius); margin-bottom: 8px;">
                    <div>
                        <strong>${product.name}</strong>
                        <br><small>Estoque atual: ${product.quantity} | Mínimo: ${product.min_quantity}</small>
                    </div>
                    <span style="background: var(--warning); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                        ${product.quantity === 0 ? 'SEM ESTOQUE' : 'ESTOQUE BAIXO'}
                    </span>
                </div>
            `).join('');
}

// Produtos
async function loadProducts() {
    try {
        products = await api('/products');
    } catch (err) {
        showNotification('Erro ao carregar produtos: ' + err.message, 'error');
        products = [];
    }
    const grid = document.getElementById('products-grid');
    if (products.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📦</div>
                <h3>Nenhum produto cadastrado</h3>
                <p>Comece adicionando seu primeiro produto ao estoque.</p>
                <button class="btn btn-primary" onclick="openModal('product')">Adicionar Produto</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = products.map(product => {
        const stockLevel = product.quantity <= 0 ? 'critical' :
            product.quantity <= product.min_quantity ? 'low' : 'high';

        const stockText = product.quantity <= 0 ? 'SEM ESTOQUE' :
            product.quantity <= product.min_quantity ? 'ESTOQUE BAIXO' :
                `${product.quantity} UNIDADES`;

        return `
                <div class="product-card">
                    <div class="product-header">
                        <div class="product-avatar">${product.name.charAt(0)}</div>
                        <div class="product-name">${product.name}</div>
                        <div class="product-sku">SKU: ${product.sku}</div>
                    </div>
                    <div class="product-body">
                        <div class="stock-badge ${stockLevel}">${stockText}</div>
                        <div class="product-info">
                            <div class="info-item">
                                <div class="info-label">Compra</div>
                                <div class="info-value">${Number(product.price).toFixed(2)}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Venda</div>
                                <div class="info-value">${Number(product.sale_price).toFixed(2)}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Compra</div>
                                <div class="info-value">${product.purchase_date ? new Date(product.purchase_date).toLocaleDateString('pt-BR') : 'Não informada'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Vencimento</div>
                                <div class="info-value">${product.expiry_date ? new Date(product.expiry_date).toLocaleDateString('pt-BR') : 'Não informada'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Margem</div>
                                <div class="info-value">${((product.sale_price - product.price) / product.price * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                        <div class="product-actions">
                            <button class="btn btn-primary" onclick="adjustStock(${product.id})">📊 Ajustar</button>
                            <button class="btn btn-secondary" onclick="editProduct(${product.id})">✏️ Editar</button>
                            <button class="btn btn-secondary" onclick="deleteProduct(${product.id})" style="background: var(--danger); color: white;">🗑️ Excluir</button>
                        </div>
                    </div>
                </div>
            `;
    }).join('');
}

function searchProducts(term) {
    const searchClear = document.querySelector('.search-clear');
    if (term) {
        searchClear.classList.add('visible');
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(term.toLowerCase()) ||
            p.sku.toLowerCase().includes(term.toLowerCase())
        );
        renderProductsGrid(filtered); // Chama a função para renderizar o grid filtrado
    } else {
        searchClear.classList.remove('visible');
        loadProducts(); // Recarrega todos os produtos
    }
}

// Nova função para renderizar o grid de produtos filtrados
function renderProductsGrid(list) {
    const grid = document.getElementById('products-grid');
    if (list.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📦</div>
                <h3>Nenhum produto encontrado</h3>
                <p>Tente outro termo de pesquisa.</p>
            </div>
        `;
        return;
    }
    grid.innerHTML = list.map(product => {
        const stockLevel = product.quantity <= 0 ? 'critical' :
            product.quantity <= product.min_quantity ? 'low' : 'high';

        const stockText = product.quantity <= 0 ? 'SEM ESTOQUE' :
            product.quantity <= product.min_quantity ? 'ESTOQUE BAIXO' :
                `${product.quantity} UNIDADES`;

        return `
            <div class="product-card">
                <div class="product-header">
                    <div class="product-avatar">${product.name.charAt(0)}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-sku">SKU: ${product.sku}</div>
                </div>
                <div class="product-body">
                    <div class="stock-badge ${stockLevel}">${stockText}</div>
                    <div class="product-info">
                        <div class="info-item">
                            <div class="info-label">Compra</div>
                            <div class="info-value">${Number(product.price).toFixed(2)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Venda</div>
                            <div class="info-value">${Number(product.sale_price).toFixed(2)}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Compra</div>
                            <div class="info-value">${product.purchase_date ? new Date(product.purchase_date).toLocaleDateString('pt-BR') : 'Não informada'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Vencimento</div>
                            <div class="info-value">${product.expiry_date ? new Date(product.expiry_date).toLocaleDateString('pt-BR') : 'Não informada'}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Margem</div>
                            <div class="info-value">${((product.sale_price - product.price) / product.price * 100).toFixed(1)}%</div>
                        </div>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary" onclick="adjustStock(${product.id})">📊 Ajustar</button>
                        <button class="btn btn-secondary" onclick="editProduct(${product.id})">✏️ Editar</button>
                        <button class="btn btn-secondary" onclick="deleteProduct(${product.id})" style="background: var(--danger); color: white;">🗑️ Excluir</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function clearSearch() {
    document.getElementById('product-search').value = '';
    document.querySelector('.search-clear').classList.remove('visible');
    loadProducts();
}

// Modais
function openModal(type) {
    document.getElementById(type + '-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(type) {
    document.getElementById(type + '-modal').classList.remove('show');
    document.body.style.overflow = '';

    // Limpar formulários de forma mais específica
    const form = document.getElementById(type + '-form');
    if (form) {
        form.reset();
        // Para o modal de edição, também limpar campos hidden
        if (type === 'edit-product') {
            const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
            hiddenInputs.forEach(input => input.value = '');
        }
    }
}

async function updateProduct(event) {
    event.preventDefault();
    const loading = document.getElementById('edit-product-loading');
    loading.classList.remove('hidden');

    const formData = new FormData(event.target);
    const id = formData.get('id');
    const product = {
        name: formData.get('name'),
        sku: formData.get('sku'),
        price: parseFloat(formData.get('price')),
        sale_price: parseFloat(formData.get('sale_price')),
        quantity: parseInt(formData.get('quantity')) || 0, // Garantir que seja um número
        min_quantity: parseInt(formData.get('min_quantity')) || 0, // Garantir que seja um número
        purchase_date: formData.get('purchase_date') || null,
        expiry_date: formData.get('expiry_date') || null
    };

    try {
        await api(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(product)
        });
        showNotification('Produto atualizado com sucesso!', 'success');
        closeModal('edit-product');
        loadProducts();
        updateProductSelect();
        if (currentSection === 'dashboard') {
            loadDashboardData();
        }
    } catch (err) {
        showNotification('Erro ao atualizar produto: ' + err.message, 'error');
    } finally {
        loading.classList.add('hidden');
    }
}

async function saveProduct(event) {
    event.preventDefault();
    const loading = document.getElementById('product-loading');
    loading.classList.remove('hidden');

    const formData = new FormData(event.target);
    const product = {
        name: formData.get('name'),
        sku: formData.get('sku'),
        price: parseFloat(formData.get('price')),
        sale_price: parseFloat(formData.get('sale_price')),
        quantity: parseInt(formData.get('quantity')) || 0, // Garantir que seja um número
        min_quantity: parseInt(formData.get('min_quantity')) || 0, // Garantir que seja um número
        purchase_date: formData.get('purchase_date') || null,
        expiry_date: formData.get('expiry_date') || null
    };

    try {
        await api('/products', {
            method: 'POST',
            body: JSON.stringify(product)
        });
        showNotification('Produto adicionado com sucesso!', 'success');
        closeModal('product');
        loadProducts();
        updateProductSelect();
        loading.classList.add('hidden');
        if (currentSection === 'dashboard') {
            loadDashboardData();
        }
    } catch (err) {
        showNotification('Erro ao salvar produto: ' + err.message, 'error');
        loading.classList.add('hidden');
    }
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const form = document.getElementById('edit-product-form');
    form.id.value = product.id;
    form.name.value = product.name;
    form.sku.value = product.sku;
    form.price.value = product.price;
    form.sale_price.value = product.sale_price;
    form.quantity.value = product.quantity;
    form.min_quantity.value = product.min_quantity;
    form.purchase_date.value = product.purchase_date ? product.purchase_date.split('T')[0] : '';
    form.expiry_date.value = product.expiry_date ? product.expiry_date.split('T')[0] : '';

    openModal('edit-product');
}

async function deleteProduct(id) {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        try {
            await api(`/products/${id}`, { method: 'DELETE' });
            showNotification('Produto excluído com sucesso!', 'success');
            loadProducts();
            updateProductSelect();
            if (currentSection === 'dashboard') {
                loadDashboardData();
            }
        } catch (err) {
            showNotification('Erro ao excluir produto: ' + err.message, 'error');
        }
    }
}

function adjustStock(id) {
    const adjustment = prompt('Ajustar estoque (use + ou - para aumentar/diminuir):');
    if (!adjustment) return;

    const change = parseInt(adjustment);
    if (isNaN(change)) {
        showNotification('Valor inválido!', 'error');
        return;
    }

    const product = products.find(p => p.id === id);
    if (product) {
        product.quantity += change;
        if (product.quantity < 0) product.quantity = 0;

        loadProducts();
        showNotification(`Estoque ajustado em ${change > 0 ? '+' : ''}${change} unidades`, 'success');

        if (currentSection === 'dashboard') {
            loadDashboardData();
        }
    }
}

// Vendas
function updateProductSelect() {
    const selects = document.querySelectorAll('select[name="product"]');
    const options = products.map(p => `
            <option value="${p.id}" data-price="${p.sale_price}">
                ${p.name} - ${formatCurrency(p.sale_price)}
            </option>
        `).join('');

    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione um produto</option>' + options;
    });
}

function addSaleItem() {
    const container = document.getElementById('sale-items');
    const itemDiv = container.querySelector('.sale-item').cloneNode(true);

    // Limpar valores
    itemDiv.querySelectorAll('input, select').forEach(input => {
        if (input.name === 'quantity') {
            input.value = '1';
        } else {
            input.value = '';
        }
    });

    container.appendChild(itemDiv);
    updateProductSelect();
}

function removeItem(button) {
    const items = document.querySelectorAll('.sale-item');
    if (items.length > 1) {
        button.parentElement.remove();
        updateTotal();
    }
}

function updateItemPrice(select) {
    const option = select.selectedOptions[0];
    const price = option.dataset.price || '0';
    const priceInput = select.parentElement.parentElement.querySelector('input[name="unit_price"]');
    priceInput.value = price;
    updateTotal();
}

function updateTotal() {
    const items = document.querySelectorAll('.sale-item');
    let total = 0;

    items.forEach(item => {
        const quantity = parseFloat(item.querySelector('input[name="quantity"]').value) || 0;
        const price = parseFloat(item.querySelector('input[name="unit_price"]').value) || 0;
        total += quantity * price;
    });

    document.getElementById('sale-total').textContent = formatCurrency(total);
}


async function saveSale(event) {
    event.preventDefault();
    const loading = document.getElementById('sale-loading');
    loading.classList.remove('hidden');

    const formData = new FormData(event.target);

    // 1. PRIMEIRO: Coletar itens da venda
    const items = [];
    const saleItems = document.querySelectorAll('.sale-item');

    saleItems.forEach(item => {
        const productId = item.querySelector('select[name="product"]').value;
        const quantity = parseInt(item.querySelector('input[name="quantity"]').value);
        const unitPrice = parseFloat(item.querySelector('input[name="unit_price"]').value);

        if (productId && quantity > 0 && unitPrice > 0) {
            const product = products.find(p => p.id == productId);
            items.push({
                product_id: parseInt(productId),
                product_name: product?.name || 'Produto não encontrado',
                quantity: quantity,
                unit_cost: product?.price || 0, // Preço de custo do produto
                unit_price: unitPrice
            });
        }
    });

    if (items.length === 0) {
        showNotification('Adicione pelo menos um item válido!', 'error');
        loading.classList.add('hidden');
        return;
    }

    const sale = {
        customer_name: formData.get('customer') || 'Cliente não informado',
        payment_method: formData.get('payment') || 'dinheiro',
        payment_status: 'paid',
        notes: null,
        items: items
    };

    try {
        const result = await api('/sales', {
            method: 'POST',
            body: JSON.stringify(sale)
        });

        showNotification('Venda realizada com sucesso!', 'success');
        closeModal('sale');

        // Recarregar dados
        await loadProducts();
        updateProductSelect();
        loadDashboardData();
        loadSales();

    } catch (err) {
        showNotification('Erro ao salvar venda: ' + err.message, 'error');
    } finally {
        loading.classList.add('hidden');
    }


    // Simular delay da API
    setTimeout(() => {
        // Atualizar estoque
        items.forEach(item => {
            const product = products.find(p => p.id == item.product_id);
            if (product) {
                product.quantity -= item.quantity;
                if (product.quantity < 0) product.quantity = 0;
            }
        });

        sales.push(sale);
        closeModal('sale');
        showNotification('Venda realizada com sucesso!', 'success');
        loading.classList.add('hidden');

        // Atualizar dados
        loadProducts();
        loadDashboardData();
    }, 1000);
}

// Utilidades
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function updatePeriod(days) {
    // Implementar filtro por período
    showNotification(`Período alterado para ${days} dias`, 'info');
}

function exportData() {
    showNotification('Exportação iniciada...', 'info');
    // Implementar exportação
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    container.appendChild(notification);

    // Mostrar notificação
    setTimeout(() => notification.classList.add('show'), 100);

    // Remover após 4 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => container.removeChild(notification), 300);
    }, 4000);
}

// Fechar modais clicando fora
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        const modalId = e.target.id.replace('-modal', '');
        closeModal(modalId);
    }
});

// Fechar sidebar em mobile ao clicar fora
document.addEventListener('click', function (e) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.sidebar-toggle');

    if (window.innerWidth <= 1024 &&
        !sidebar.contains(e.target) &&
        !toggle.contains(e.target) &&
        sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
});