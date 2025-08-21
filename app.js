(function () {
  const productsEl = document.getElementById("products");

  // API base controls
  const apiBaseInput = document.getElementById("apiBaseInput");
  const saveApiBaseBtn = document.getElementById("saveApiBaseBtn");

  // Modal elements
  const openCreateModalBtn = document.getElementById("openCreateModal");
  const createModal = document.getElementById("createModal");
  const closeCreateModalBtn = document.getElementById("closeCreateModal");
  const cancelCreateBtn = document.getElementById("cancelCreate");
  const modalOverlay = document.getElementById("modalOverlay");
  const createForm = document.getElementById("createForm");
  const modalTitle = document.getElementById("modalTitle");
  const saveButton = document.getElementById("saveButton");
  const editingIdInput = document.getElementById("editingId");

  // Sale modal elements
  const openSaleModalBtn = document.getElementById("openSaleModal");
  const saleModal = document.getElementById("saleModal");
  const closeSaleModalBtn = document.getElementById("closeSaleModal");
  const cancelSaleBtn = document.getElementById("cancelSale");
  const saleModalOverlay = document.getElementById("saleModalOverlay");
  const saleForm = document.getElementById("saleForm");
  const saleItemsList = document.getElementById("saleItemsList");
  const addSaleItemBtn = document.getElementById("addSaleItem");
  const saleTotal = document.getElementById("saleTotal");

  let API_BASE = (
    window.API_BASE_URL ||
    localStorage.getItem("apiBaseUrl") ||
    "https://estoque-xpb2.onrender.com"
  ).replace(/\/$/, "");
  if (!localStorage.getItem("apiBaseUrl")) {
    try {
      localStorage.setItem("apiBaseUrl", API_BASE);
    } catch { }
  }
  if (apiBaseInput) apiBaseInput.value = API_BASE;
  if (saveApiBaseBtn) {
    saveApiBaseBtn.addEventListener("click", () => {
      API_BASE = (apiBaseInput.value || "").trim().replace(/\/$/, "");
      if (!API_BASE) return;
      try {
        localStorage.setItem("apiBaseUrl", API_BASE);
      } catch { }
      loadProducts();
      loadFinancialSummary();
    });
  }

  let isEditing = false;
  let products = [];
  let saleItems = [];

  // Notificações
  function showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add("removing");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // Confirmação de exclusão
  function showDeleteConfirmation(productName) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.4)";
      overlay.style.zIndex = "999";
      overlay.style.backdropFilter = "blur(4px)";
      const confirmation = document.createElement("div");
      confirmation.className = "delete-confirmation";
      confirmation.innerHTML = `
				<h4>🗑️ Confirmar exclusão</h4>
				<p>Tem certeza que deseja excluir o produto <strong>"${productName}"</strong>?</p>
				<p style="font-size: 12px;">Esta ação não pode ser desfeita.</p>
				<div class="actions">
					<button class="button" id="cancelDelete">Cancelar</button>
					<button class="button danger" id="confirmDelete">Excluir</button>
				</div>`;
      document.body.appendChild(overlay);
      document.body.appendChild(confirmation);
      document.getElementById("cancelDelete").onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(confirmation);
        resolve(false);
      };
      document.getElementById("confirmDelete").onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(confirmation);
        resolve(true);
      };
      overlay.onclick = () => {
        document.body.removeChild(overlay);
        document.body.removeChild(confirmation);
        resolve(false);
      };
    });
  }

  function openModal() {
    createModal.classList.remove("hidden");
    isEditing = false;
    if (modalTitle) modalTitle.textContent = "Cadastrar novo produto";
    if (saveButton) saveButton.textContent = "Salvar";
    if (editingIdInput) editingIdInput.value = "";
    createForm.reset();
    setTimeout(() => {
      const first = createModal.querySelector('input[name="name"]');
      if (first) first.focus();
    }, 100);
  }

  function openEditModal(product) {
    createModal.classList.remove("hidden");
    isEditing = true;
    if (modalTitle) modalTitle.textContent = "Editar produto";
    if (saveButton) saveButton.textContent = "Atualizar";
    if (editingIdInput) editingIdInput.value = product.id;
    createForm.querySelector('input[name="name"]').value = product.name;
    createForm.querySelector('input[name="sku"]').value = product.sku;
    createForm.querySelector('input[name="price"]').value = product.price;
    createForm.querySelector('input[name="sale_price"]').value =
      product.sale_price;
    createForm.querySelector('input[name="min_quantity"]').value =
      product.min_quantity;
    // Para edição, mostramos a quantidade atual no campo de estoque inicial apenas para referência visual
    const initQty = createForm.querySelector('input[name="initial_quantity"]');
    if (initQty) initQty.value = product.quantity;
    setTimeout(() => {
      const first = createModal.querySelector('input[name="name"]');
      if (first) first.focus();
    }, 100);
  }

  function closeModal() {
    createModal.classList.add("hidden");
  }

  // Sale modal functions
  function openSaleModal() {
    saleModal.classList.remove("hidden");
    saleItems = [];
    renderSaleItems();
    updateSaleTotal();
  }

  function closeSaleModal() {
    saleModal.classList.add("hidden");
    saleItems = [];
    saleForm.reset();
  }

  function addSaleItem() {
    const item = {
      id: Date.now(),
      product_id: null,
      product_name: "",
      quantity: 1,
      unit_cost: 0,
      unit_price: 0,
    };
    saleItems.push(item);
    renderSaleItems();
  }

  function removeSaleItem(itemId) {
    saleItems = saleItems.filter((item) => item.id !== itemId);
    renderSaleItems();
    updateSaleTotal();
  }

  function renderSaleItems() {
    saleItemsList.innerHTML = "";

    if (saleItems.length === 0) {
      saleItemsList.innerHTML =
        '<p style="text-align: center; color: var(--muted); padding: 20px;">Nenhum item adicionado</p>';
      return;
    }

    saleItems.forEach((item, index) => {
      const itemEl = document.createElement("div");
      itemEl.className = "sale-item";
      itemEl.innerHTML = `
				<input type="text" placeholder="Nome do produto" value="${item.product_name}" onchange="updateSaleItem(${item.id}, 'product_name', this.value)" />
				<input type="number" placeholder="Qtd" value="${item.quantity}" min="1" onchange="updateSaleItem(${item.id}, 'quantity', parseInt(this.value) || 1)" />
				<input type="number" placeholder="Custo unit." step="0.01" value="${item.unit_cost}" onchange="updateSaleItem(${item.id}, 'unit_cost', parseFloat(this.value) || 0)" />
				<input type="number" placeholder="Preço unit." step="0.01" value="${item.unit_price}" onchange="updateSaleItem(${item.id}, 'unit_price', parseFloat(this.value) || 0)" />
				<button type="button" class="remove-item" onclick="removeSaleItem(${item.id})">Remover</button>
			`;
      saleItemsList.appendChild(itemEl);
    });
  }

  function updateSaleItem(itemId, field, value) {
    const item = saleItems.find((i) => i.id === itemId);
    if (item) {
      item[field] = value;
      updateSaleTotal();
    }
  }

  function updateSaleTotal() {
    const total = saleItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
    saleTotal.textContent = `R$ ${total.toFixed(2)}`;
  }

  // Event listeners
  openCreateModalBtn.addEventListener("click", openModal);
  closeCreateModalBtn.addEventListener("click", closeModal);
  cancelCreateBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", closeModal);

  openSaleModalBtn.addEventListener("click", openSaleModal);
  closeSaleModalBtn.addEventListener("click", closeSaleModal);
  cancelSaleBtn.addEventListener("click", closeSaleModal);
  if (saleModalOverlay)
    saleModalOverlay.addEventListener("click", closeSaleModal);

  addSaleItemBtn.addEventListener("click", addSaleItem);

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeSaleModal();
    }
  });

  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(createForm).entries());
    const payload = {
      name: data.name,
      sku: data.sku,
      price: Number(data.price || 0),
      sale_price: Number(data.sale_price || 0),
      min_quantity: Number(data.min_quantity || 0),
    };
    try {
      if (isEditing) {
        const productId = parseInt(editingIdInput.value, 10);
        await api(`/products/${productId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        showNotification("Produto atualizado com sucesso!");
      } else {
        const createPayload = {
          ...payload,
          initial_quantity: Number(data.initial_quantity || 0),
        };
        await api("/products", {
          method: "POST",
          body: JSON.stringify(createPayload),
        });
        showNotification("Produto criado com sucesso!");
      }
      createForm.reset();
      closeModal();
      loadProducts();
    } catch (err) {
      showNotification(err.message || "Erro ao salvar produto", "error");
    }
  });

  saleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (saleItems.length === 0) {
      showNotification("Adicione pelo menos um item à venda", "error");
      return;
    }

    const formData = new FormData(saleForm);
    const saleData = {
      customer_name: formData.get("customer_name"),
      payment_method: formData.get("payment_method"),
      notes: formData.get("notes"),
      items: saleItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        unit_price: item.unit_price,
      })),
    };

    try {
      await api("/sales", { method: "POST", body: JSON.stringify(saleData) });
      showNotification("Venda realizada com sucesso!");
      closeSaleModal();
      loadProducts();
      loadFinancialSummary();
    } catch (err) {
      showNotification(err.message || "Erro ao finalizar venda", "error");
    }
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

  async function loadProducts() {
    productsEl.innerHTML = '<div style="opacity:.7">Carregando...</div>';
    try {
      products = await api("/products");
      renderProducts(products);
    } catch (e) {
      productsEl.innerHTML = `<div style="opacity:.7">${e.message}</div>`;
    }
  }

  async function loadFinancialSummary() {
    try {
      const summary = await api("/financial/summary?days=30");
      document.getElementById(
        "totalSales"
      ).textContent = `R$ ${summary.total_sales.toFixed(2)}`;
      document.getElementById(
        "totalCosts"
      ).textContent = `R$ ${summary.total_costs.toFixed(2)}`;
      document.getElementById(
        "totalProfit"
      ).textContent = `R$ ${summary.total_profit.toFixed(2)}`;
      document.getElementById("totalSalesCount").textContent =
        summary.total_sales_count;
    } catch (e) {
      console.error("Erro ao carregar resumo financeiro:", e);
    }
  }

  function renderProducts(list) {
    if (!list || !list.length) {
      productsEl.innerHTML =
        '<div style="opacity:.7">Nenhum produto cadastrado</div>';
      return;
    }
    productsEl.innerHTML = "";
    for (const p of list) {
      const el = document.createElement("article");
      el.className = "product-card";
      el.innerHTML = `
				<div class="product-media">${escapeHtml((p.name || "P").charAt(0))}</div>
				<div class="product-body">
					<div class="product-title">${escapeHtml(p.name)}</div>
					<div class="product-meta">• SKU ${escapeHtml(p.sku)} </div>
          <div class="product-meta">• Custo: R$ ${Number(p.price).toFixed(2)} </div>
          <div class="product-meta">• Venda: R$ ${Number(p.sale_price).toFixed(2)}</div>
					<div class="product-actions">
						<span class="tag">Qtd: <strong>${p.quantity}</strong></span>
						<div class="qty-actions">
							<input type="number" step="1" placeholder="Quantidade" />
							<input type="text" placeholder="Motivo (opcional)" />
							<button class="button" data-act="adjust">Ajustar</button>
							<button class="button" data-act="txs">Histórico</button>
							<button class="button danger" data-act="del">Excluir</button>
						</div>
					</div>
				</div>`;
      const inputs = el.querySelectorAll("input");
      const qtyInput = inputs[0];
      const reasonInput = inputs[1];
      el.querySelector('[data-act="adjust"]').addEventListener(
        "click",
        async () => {
          const change = parseInt(qtyInput.value, 10);
          if (Number.isNaN(change) || change === 0) {
            showNotification("Informe uma quantidade diferente de 0", "error");
            return;
          }
          try {
            await api(`/products/${p.id}/adjust-stock`, {
              method: "POST",
              body: JSON.stringify({
                change,
                reason: reasonInput.value || null,
              }),
            });
            loadProducts();
            showNotification(
              `Estoque ajustado em ${change > 0 ? "+" : ""}${change} unidades`
            );
          } catch (e) {
            showNotification(e.message, "error");
          }
        }
      );
      el.querySelector('[data-act="del"]').addEventListener(
        "click",
        async () => {
          const confirmed = await showDeleteConfirmation(p.name);
          if (!confirmed) return;
          try {
            await api(`/products/${p.id}`, { method: "DELETE" });
            loadProducts();
            showNotification("Produto excluído com sucesso!");
          } catch (e) {
            showNotification(e.message, "error");
          }
        }
      );
      el.querySelector('[data-act="txs"]').addEventListener(
        "click",
        async () => {
          try {
            const txs = await api(`/products/${p.id}/transactions`);
            const lines = (txs || [])
              .map(
                (t) =>
                  `${new Date(t.created_at).toLocaleString()} • ${t.type} • ${t.change
                  } • ${t.reason || ""}`
              )
              .join("\n");
            alert(lines || "Sem movimentações");
          } catch (e) {
            alert(e.message);
          }
        }
      );
      productsEl.appendChild(el);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(
      /[&<>"]+/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }

  // Global functions for sale items
  window.updateSaleItem = updateSaleItem;
  window.removeSaleItem = removeSaleItem;

  // Carregar dados iniciais
  loadProducts();
  loadFinancialSummary();
})();
