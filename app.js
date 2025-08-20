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
	
	let API_BASE = (window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || "http://127.0.0.1:8000").replace(/\/$/, "");
	if (apiBaseInput) apiBaseInput.value = API_BASE;
	if (saveApiBaseBtn) {
		saveApiBaseBtn.addEventListener("click", () => {
			API_BASE = (apiBaseInput.value || "").trim().replace(/\/$/, "");
			if (!API_BASE) return;
			localStorage.setItem("apiBaseUrl", API_BASE);
			loadProducts();
		});
	}
	
	let isEditing = false;
	let products = [];
	
	// Notificações
	function showNotification(message, type = "success") {
		const notification = document.createElement("div");
		notification.className = `notification ${type}`;
		notification.textContent = message;
		document.body.appendChild(notification);
		setTimeout(() => {
			notification.classList.add("removing");
			setTimeout(() => { document.body.removeChild(notification); }, 300);
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
			document.getElementById("cancelDelete").onclick = () => { document.body.removeChild(overlay); document.body.removeChild(confirmation); resolve(false); };
			document.getElementById("confirmDelete").onclick = () => { document.body.removeChild(overlay); document.body.removeChild(confirmation); resolve(true); };
			overlay.onclick = () => { document.body.removeChild(overlay); document.body.removeChild(confirmation); resolve(false); };
		});
	}
	
	function openModal() {
		createModal.classList.remove("hidden");
		isEditing = false;
		if (modalTitle) modalTitle.textContent = "Cadastrar novo produto";
		if (saveButton) saveButton.textContent = "Salvar";
		if (editingIdInput) editingIdInput.value = "";
		createForm.reset();
		setTimeout(() => { const first = createModal.querySelector('input[name="name"]'); if (first) first.focus(); }, 100);
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
		createForm.querySelector('input[name="min_quantity"]').value = product.min_quantity;
		// Para edição, mostramos a quantidade atual no campo de estoque inicial apenas para referência visual
		const initQty = createForm.querySelector('input[name="initial_quantity"]');
		if (initQty) initQty.value = product.quantity;
		setTimeout(() => { const first = createModal.querySelector('input[name="name"]'); if (first) first.focus(); }, 100);
	}
	
	function closeModal() { createModal.classList.add("hidden"); }
	openCreateModalBtn.addEventListener("click", openModal);
	closeCreateModalBtn.addEventListener("click", closeModal);
	cancelCreateBtn.addEventListener("click", closeModal);
	modalOverlay.addEventListener("click", closeModal);
	window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
	
	createForm.addEventListener("submit", async (e) => {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(createForm).entries());
		const payload = {
			name: data.name,
			sku: data.sku,
			price: Number(data.price || 0),
			min_quantity: Number(data.min_quantity || 0)
		};
		try {
			if (isEditing) {
				const productId = parseInt(editingIdInput.value, 10);
				await api(`/products/${productId}`, { method: "PUT", body: JSON.stringify(payload) });
				showNotification("Produto atualizado com sucesso!");
			} else {
				const createPayload = { ...payload, initial_quantity: Number(data.initial_quantity || 0) };
				await api("/products", { method: "POST", body: JSON.stringify(createPayload) });
				showNotification("Produto criado com sucesso!");
			}
			createForm.reset();
			closeModal();
			loadProducts();
		} catch (err) {
			showNotification(err.message || "Erro ao salvar produto", "error");
		}
	});
	
	async function api(path, init) {
		const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init && init.headers ? init.headers : {}) } });
		if (!res.ok) {
			let detail = 'Erro de requisição';
			try { const j = await res.json(); detail = j.detail || JSON.stringify(j); } catch {}
			throw new Error(detail);
		}
		if (res.status === 204) return null;
		return res.json();
	}
	
	async function loadProducts() {
		productsEl.innerHTML = '<div class="loading"></div>';
		try {
			products = await api('/products');
			renderProducts(products);
		} catch (e) {
			productsEl.innerHTML = `<div style="opacity:.7">${e.message}</div>`;
		}
	}
	
	function renderProducts(list) {
		if (!list || !list.length) {
			productsEl.innerHTML = '<div style="opacity:.7">Nenhum produto cadastrado</div>';
			return;
		}
		productsEl.innerHTML = "";
		for (const p of list) {
			const el = document.createElement("article");
			el.className = "product-card";
			el.innerHTML = `
				<div class="product-media">${escapeHtml((p.name || 'P').charAt(0))}</div>
				<div class="product-body">
					<div class="product-header">
						<div class="product-info">
							<div class="product-title" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
							<div class="product-meta">SKU: ${escapeHtml(p.sku)}<br>Preço: R$ ${Number(p.price).toFixed(2)}</div>
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
				</div>`;
			const inputs = el.querySelectorAll("input");
			const qtyInput = inputs[0];
			const reasonInput = inputs[1];
			el.querySelector('[data-act="adjust"]').addEventListener("click", async () => {
				const change = parseInt(qtyInput.value, 10);
				if (Number.isNaN(change) || change === 0) { showNotification("Informe uma quantidade diferente de 0", "error"); return; }
				try {
					await api(`/products/${p.id}/adjust-stock`, { method: 'POST', body: JSON.stringify({ change, reason: reasonInput.value || null }) });
					loadProducts();
					showNotification(`Estoque ajustado em ${change > 0 ? "+" : ""}${change} unidades`);
				} catch (e) { showNotification(e.message, "error"); }
			});
			el.querySelector('[data-act="edit"]').addEventListener("click", () => openEditModal(p));
			el.querySelector('[data-act="del"]').addEventListener("click", async () => {
				const confirmed = await showDeleteConfirmation(p.name);
				if (!confirmed) return;
				try { await api(`/products/${p.id}`, { method: 'DELETE' }); loadProducts(); showNotification("Produto excluído com sucesso!"); } catch (e) { showNotification(e.message, "error"); }
			});
			el.querySelector('[data-act="txs"]').addEventListener("click", async () => {
				try {
					const txs = await api(`/products/${p.id}/transactions`);
					const lines = (txs || []).map(t => `${new Date(t.created_at).toLocaleString()} • ${t.type} • ${t.change} • ${t.reason || ''}`).join("\n");
					alert(lines || 'Sem movimentações');
				} catch (e) { alert(e.message); }
			});
			productsEl.appendChild(el);
		}
	}
	
	function escapeHtml(s) { return String(s).replace(/[&<>"]+/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
	
	// Carregar produtos iniciais
	loadProducts();
})();
  