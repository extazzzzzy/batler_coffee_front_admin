const apiUrl = config.API_SERVER;

async function logout() {
  const res = await fetch(`${apiUrl}out`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: localStorage.getItem('authToken'), created_at_token: localStorage.getItem('createdAtToken') })
  });
  localStorage.removeItem('authToken');
  localStorage.removeItem('createdAtToken');
  window.location.href = '../index.html';
}

async function fetchWithAuth(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    logout();
  }
  return res;
}

async function init() {
  const token = localStorage.getItem('authToken');
  const createdAtToken = localStorage.getItem('createdAtToken');

  if (!token || !createdAtToken) {
    window.location.href = '../index.html';
    return;
  }

  document.getElementById('btn-logout').addEventListener('click', logout);

  const res = await fetch(`${apiUrl}check_validate_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, created_at_token: createdAtToken })
  });

  if (res.status !== 200) {
    logout();
    return;
  }
  const productsRow = document.getElementById('products-row');
  const productModal = new bootstrap.Modal(document.getElementById('productModal'));
  const ingredientModal = new bootstrap.Modal(document.getElementById('ingredientModal'));

  let allIngredients = [];
  let currentProduct = null;
  let imgBase64 = '';

  async function loadProducts() {
    const res = await fetchWithAuth(`${apiUrl}fetch_products`);
    const data = await res.json();
    productsRow.innerHTML = '';
    data.products.forEach(p => createProductCard(p));
  }

  function createProductCard(p) {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-md-4 position-relative';
    col.innerHTML = `
      <div class="card h-100 ${!p.is_available ? 'border-danger' : ''}">
        <div class="card-body">
          <h5 class="card-title">${p.name}</h5>
          <p class="card-text">${p.price} ₽</p>
          ${!p.is_available ? `
            <span class="badge bg-danger position-absolute top-0 end-0 m-2">Нет в наличии</span>
          ` : ''}
          <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${p.id}">Редактировать</button>
          <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${p.id}">&times;</button>
        </div>
      </div>
    `;
    productsRow.append(col);
    col.querySelector('.btn-edit').addEventListener('click', () => openEditModal(p));
    col.querySelector('.btn-delete').addEventListener('click', () => deleteProduct(p.id));
  }
  
  async function openEditModal(p) {
    currentProduct = p;
    document.getElementById('productModalLabel').textContent = 'Редактировать продукт';
    document.getElementById('product-form').reset();
    document.getElementById('product_id').value = p.id;
    document.getElementById('name').value = p.name;
    document.getElementById('price').value = p.price;
    document.getElementById('description').value = p.description;
    document.getElementById('composition').value = p.composition;
    document.getElementById('protein').value = p.protein;
    document.getElementById('fats').value = p.fats;
    document.getElementById('carbohydrates').value = p.carbohydrates;
    document.getElementById('weight').value = p.weight;
    document.getElementById('kilocalories').value = p.kilocalories;
    document.getElementById('is_available').checked = p.is_available;
    document.getElementById('btn-add-ingredient').style.display = 'inline-block';
    imgBase64 = '';
    renderIngredients(p.ingredients);
    productModal.show();
  }

  function renderIngredients(ings) {
    const list = document.getElementById('ingredients-list');
    list.innerHTML = '';
    ings.forEach(i => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.textContent = i.name;

      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-outline-danger';
      btn.textContent = 'Удалить';
      btn.type = 'button';

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        await editProductIngredient(currentProduct.id, i.id, 'delete');
      });

      li.append(btn);
      list.append(li);
    });
  }

  document.getElementById('btn-add-ingredient').addEventListener('click', async () => {
    const res = await fetchWithAuth(`${apiUrl}fetch_ingredients`);
    const data = await res.json();
    allIngredients = data.ingredients;
    const select = document.getElementById('ingredient-select');
    select.innerHTML = allIngredients.map(i => `<option value="${i.id}">${i.name}</option>`).join('');
    ingredientModal.show();
  });

  document.getElementById('btn-save-ingredient').addEventListener('click', async () => {
    const ingId = document.getElementById('ingredient-select').value;
    await editProductIngredient(currentProduct.id, ingId, 'create');
    ingredientModal.hide();
  });

  async function editProductIngredient(productId, ingredientId, type) {
    await fetchWithAuth(`${apiUrl}edit_products_ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        created_at_token: createdAtToken,
        product_id: productId,
        ingredient_id: ingredientId,
        type_edit: type
      })
    });

    const updated = (await (await fetchWithAuth(`${apiUrl}fetch_products`)).json()).products.find(x => x.id === currentProduct.id);
    currentProduct = updated;
    renderIngredients(updated.ingredients);
  }

  document.getElementById('img-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => { imgBase64 = reader.result.split(',')[1]; };
    reader.readAsDataURL(file);
  });

  document.getElementById('btn-save-product').addEventListener('click', async () => {
    const form = document.getElementById('product-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const payload = {
      token,
      created_at_token: createdAtToken,
      product_id: Number(formData.get('product_id')),
      is_available: document.getElementById('is_available').checked
    };
    formData.forEach((v, k) => {
      if (k !== 'product_id' && k !== 'is_available' && v) payload[k] = v;
    });
    if (imgBase64) payload.base64_img = imgBase64;
    const url = payload.product_id ? `${apiUrl}update_product` : `${apiUrl}create_product`;
    await fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    productModal.hide();
    await loadProducts();
  });

  document.getElementById('btn-add-product').addEventListener('click', () => {
    currentProduct = null;
    document.getElementById('product-form').reset();
    document.getElementById('product_id').value = '';
    document.getElementById('productModalLabel').textContent = 'Добавить продукт';
    renderIngredients([]);
    imgBase64 = '';
    document.getElementById('is_available').checked = true;
    document.getElementById('btn-add-ingredient').style.display = 'none';
    productModal.show();
  });

  async function deleteProduct(id) {
    if (!confirm('Удалить продукт?')) return;
    await fetchWithAuth(`${apiUrl}delete_product`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        created_at_token: createdAtToken,
        product_id: id
      })
    });
    await loadProducts();
  }

  await loadProducts();
}

init();
