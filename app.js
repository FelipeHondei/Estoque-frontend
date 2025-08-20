(function () {
	const apiBaseInput = document.getElementById('apiBaseInput');
	const saveApiBaseBtn = document.getElementById('saveApiBaseBtn');
	const productsEl = document.getElementById('products');

	// Modal elements
	const openCreateModalBtn = document.getElementById('openCreateModal');
	const createModal = document.getElementById('createModal');
	const closeCreateModalBtn = document.getElementById('closeCreateModal');
	const cancelCreateBtn = document.getElementById('cancelCreate');
	const modalOverlay = document.getElementById('modalOverlay');
	const createForm = document.getElementById('createForm');

	let API_BASE = (window.API_BASE_URL || localStorage.getItem('apiBaseUrl') || 'http://localhost:8000').replace(/\/$/, '');
	apiBaseInput.value = API_BASE;

	saveApiBaseBtn.addEventListener('click', () => {
		API_BASE = apiBaseInput.value.trim().replace(/\/$/, '');
		localStorage.setItem('apiBaseUrl', API_BASE);
		loadProducts();
	});

	function openModal() { createModal.classList.remove('hidden'); }
	function closeModal() { createModal.classList.add('hidden'); }
	openCreateModalBtn.addEventListener('click', openModal);
	closeCreateModalBtn.addEventListener('click', closeModal);
	cancelCreateBtn.addEventListener('click', closeModal);
	modalOverlay.addEventListener('click', closeModal);
	window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

	createForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const data = Object.fromEntries(new FormData(createForm).entries());
		data.price = Number(data.price || 0);
		data.min_quantity = Number(data.min_quantity || 0);
		data.initial_quantity = Number(data.initial_quantity || 0);
		await api('/products', { method: 'POST', body: JSON.stringify(data) });
		createForm.reset();
		closeModal();
		loadProducts();
	});

	async function api(path, init) {
		const res = await fetch(`${API_BASE}${path}`, {
			...init,
			headers: { 'Content-Type': 'application/json', ...(init && init.headers ? init.headers : {}) },
		});
		if (!res.ok) {
			let detail = 'Erro de requisição';
			try { const j = await res.json(); detail = j.detail || JSON.stringify(j); } catch {}
			throw new Error(detail);
		}
		if (res.status === 204) return null;
		return res.json();
	}

	async function loadProducts() {
		productsEl.innerHTML = '<div style="opacity:.7">Carregando...</div>';
		try {
			const products = await api('/products');
			renderProducts(products);
		} catch (e) {
			productsEl.innerHTML = `<div>${e.message}</div>`;
		}
	}

	function renderProducts(products) {
		if (!products.length) {
			productsEl.innerHTML = '<div style="opacity:.7">Nenhum produto cadastrado</div>';
			return;
		}
		productsEl.innerHTML = '';
		for (const p of products) {
			const el = document.createElement('article');
			el.className = 'product-card';
			el.innerHTML = `
				<div class="product-media">${escapeHtml(p.name.charAt(0) || 'P')}</div>
				<div class="product-body">
					<div class="product-title">${escapeHtml(p.name)}</div>
					<div class="product-meta">SKU ${escapeHtml(p.sku)}</div>
					<div class="product-actions">
						<span class="tag">Qtd: <strong>${p.quantity}</strong></span>
						<div class="qty-actions">
							<input type="number" step="1" placeholder="±quantidade" />
							<input type="text" placeholder="Motivo (opcional)" />
							<button class="button" data-act="adjust">Ajustar</button>
							<button class="button" data-act="txs">Histórico</button>
							<button class="button danger" data-act="del">Excluir</button>
						</div>
					</div>
				</div>
			`;
			const inputs = el.querySelectorAll('input');
			const qtyInput = inputs[0];
			const reasonInput = inputs[1];
			el.querySelector('[data-act="adjust"]').addEventListener('click', async () => {
				const change = parseInt(qtyInput.value, 10);
				if (Number.isNaN(change) || change === 0) return alert('Informe uma quantidade diferente de 0');
				try {
					await api(`/products/${p.id}/adjust-stock`, { method: 'POST', body: JSON.stringify({ change, reason: reasonInput.value || null }) });
					loadProducts();
				} catch (e) { alert(e.message); }
			});
			el.querySelector('[data-act="del"]').addEventListener('click', async () => {
				if (!confirm('Excluir produto?')) return;
				await api(`/products/${p.id}`, { method: 'DELETE' });
				loadProducts();
			});
			el.querySelector('[data-act="txs"]').addEventListener('click', async () => {
				try {
					const txs = await api(`/products/${p.id}/transactions`);
					const lines = txs.map(t => `${new Date(t.created_at).toLocaleString()} • ${t.type} • ${t.change} • ${t.reason || ''}`).join('\n');
					alert(lines || 'Sem movimentações');
				} catch (e) { alert(e.message); }
			});
			productsEl.appendChild(el);
		}
	}

	function escapeHtml(s) {
		return String(s).replace(/[&<>"]+/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
	}

	loadProducts();
})();
