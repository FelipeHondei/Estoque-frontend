(function () {
  const productsEl = document.getElementById("products");

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

  let API_BASE = "http://localhost:8000";
  let isEditing = false;

  // Simulação de dados para demonstração
  let products = [
    {
      id: 1,
      name: "Smartphone Galaxy",
      sku: "SM-001",
      price: 899.99,
      quantity: 15,
      min_quantity: 5,
      initial_quantity: 20,
    },
    {
      id: 2,
      name: "Notebook Dell",
      sku: "NB-002",
      price: 2499.9,
      quantity: 8,
      min_quantity: 3,
      initial_quantity: 10,
    },
    {
      id: 3,
      name: "Mouse Gamer",
      sku: "MG-003",
      price: 129.9,
      quantity: 25,
      min_quantity: 10,
      initial_quantity: 30,
    },
  ];

  // Função para mostrar notificações
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

  // Função para confirmação de exclusão melhorada
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
						</div>
					`;

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
    modalTitle.textContent = "Cadastrar novo produto";
    saveButton.textContent = "Salvar";
    editingIdInput.value = "";
    createForm.reset();
    // Focus no primeiro input
    setTimeout(() => {
      createModal.querySelector('input[name="name"]').focus();
    }, 100);
  }

  function openEditModal(product) {
    createModal.classList.remove("hidden");
    isEditing = true;
    modalTitle.textContent = "Editar produto";
    saveButton.textContent = "Atualizar";
    editingIdInput.value = product.id;

    // Preencher campos
    createForm.querySelector('input[name="name"]').value = product.name;
    createForm.querySelector('input[name="sku"]').value = product.sku;
    createForm.querySelector('input[name="price"]').value = product.price;
    createForm.querySelector('input[name="min_quantity"]').value =
      product.min_quantity;
    createForm.querySelector('input[name="initial_quantity"]').value =
      product.quantity;

    setTimeout(() => {
      createModal.querySelector('input[name="name"]').focus();
    }, 100);
  }

  function closeModal() {
    createModal.classList.add("hidden");
  }

  openCreateModalBtn.addEventListener("click", openModal);
  closeCreateModalBtn.addEventListener("click", closeModal);
  cancelCreateBtn.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", closeModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  createForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(createForm).entries());
    data.price = Number(data.price || 0);
    data.min_quantity = Number(data.min_quantity || 0);
    data.initial_quantity = Number(data.initial_quantity || 0);

    if (isEditing) {
      // Editar produto existente
      const productId = parseInt(editingIdInput.value);
      const productIndex = products.findIndex((p) => p.id === productId);

      if (productIndex > -1) {
        // Manter a quantidade atual, não resetar
        data.quantity = products[productIndex].quantity;
        data.id = productId;
        products[productIndex] = data;
        showNotification("Produto atualizado com sucesso!");
      }
    } else {
      // Criar novo produto
      data.quantity = data.initial_quantity;
      data.id = Date.now(); // ID simples para demonstração
      products.push(data);
      showNotification("Produto criado com sucesso!");
    }

    createForm.reset();
    closeModal();
    loadProducts();
  });

  async function loadProducts() {
    productsEl.innerHTML = '<div class="loading"></div>';

    // Simular delay de carregamento
    setTimeout(() => {
      renderProducts(products);
    }, 500);
  }

  function renderProducts(products) {
    if (!products.length) {
      productsEl.innerHTML =
        '<div style="opacity:.7">Nenhum produto cadastrado</div>';
      return;
    }

    productsEl.innerHTML = "";

    for (const p of products) {
      const el = document.createElement("article");
      el.className = "product-card";
      el.innerHTML = `
						<div class="product-media">${escapeHtml(p.name.charAt(0) || "P")}</div>
						<div class="product-body">
							<div class="product-header">
								<div class="product-info">
									<div class="product-title" title="${escapeHtml(p.name)}">${escapeHtml(
        p.name
      )}</div>
									<div class="product-meta">
										SKU: ${escapeHtml(p.sku)}<br>
										Preço: R$ ${p.price.toFixed(2)}
									</div>
								</div>
								<div class="product-menu">
									<button class="button small" data-act="edit" title="Editar produto">✏️</button>
									<button class="button small danger" data-act="del" title="Excluir produto">🗑️</button>
								</div>
							</div>
							
							<div class="product-actions">
								<div class="qty-section">
									<span class="tag">Estoque: <strong>${p.quantity}</strong></span>
								</div>
								
								<div class="qty-controls">
									<div class="qty-inputs">
										<div class="input-group">
											<label class="input-label">Ajuste de quantidade</label>
											<input type="number" step="1" placeholder="Ex: +5 ou -3" />
										</div>
										<div class="input-group">
											<label class="input-label">Motivo (opcional)</label>
											<input type="text" placeholder="Ex: Reposição, Venda..." />
										</div>
									</div>
									<div class="action-buttons">
										<button class="button success small" data-act="adjust">✓ Ajustar</button>
										<button class="button small" data-act="txs">📊 Histórico</button>
									</div>
								</div>
							</div>
						</div>
					`;

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

          // Simular ajuste
          p.quantity += change;
          if (p.quantity < 0) p.quantity = 0;

          qtyInput.value = "";
          reasonInput.value = "";
          loadProducts();
          showNotification(
            `Estoque ajustado em ${change > 0 ? "+" : ""}${change} unidades`
          );
        }
      );

      el.querySelector('[data-act="edit"]').addEventListener(
        "click",
        async () => {
          openEditModal(p);
        }
      );

      el.querySelector('[data-act="del"]').addEventListener(
        "click",
        async () => {
          const confirmed = await showDeleteConfirmation(p.name);
          if (!confirmed) return;

          // Adicionar animação de remoção
          el.classList.add("removing");

          setTimeout(() => {
            // Remover do array
            const index = products.findIndex((prod) => prod.id === p.id);
            if (index > -1) {
              products.splice(index, 1);
            }
            loadProducts();
            showNotification("Produto excluído com sucesso!");
          }, 500);
        }
      );

      el.querySelector('[data-act="txs"]').addEventListener(
        "click",
        async () => {
          // Simular histórico
          const mockHistory = [
            {
              created_at: new Date().toISOString(),
              type: "Ajuste",
              change: "+5",
              reason: "Reposição de estoque",
            },
            {
              created_at: new Date(Date.now() - 86400000).toISOString(),
              type: "Venda",
              change: "-2",
              reason: "Venda online",
            },
          ];

          const lines = mockHistory
            .map(
              (t) =>
                `${new Date(t.created_at).toLocaleString()} • ${t.type} • ${
                  t.change
                } • ${t.reason || ""}`
            )
            .join("\n");

          alert(lines || "Sem movimentações");
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

  // Carregar produtos iniciais
  loadProducts();
})();
