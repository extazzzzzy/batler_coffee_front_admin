const apiUrl = config.API_SERVER;
const token = localStorage.getItem('authToken');
const createdAtToken = localStorage.getItem('createdAtToken');
if (!token || !createdAtToken) {
  window.location.href = '../index.html';
}

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
    await logout();
  }
  return res;
}

const list = document.getElementById('ingredients-list');

async function loadIngredients() {
  const res = await fetchWithAuth(`${apiUrl}fetch_ingredients`);
  const data = await res.json();
  list.innerHTML = '';
  data.ingredients.forEach(ingredient => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex align-items-center justify-content-between';

    li.innerHTML = `
      <div class="d-flex flex-wrap gap-2 align-items-center w-100">
        <input type="text" class="form-control form-control-sm w-25" value="${ingredient.name}" data-id="${ingredient.id}" data-type="name">
        <input type="number" class="form-control form-control-sm w-25" value="${ingredient.price}" data-id="${ingredient.id}" data-type="price">
        <button class="btn btn-sm btn-success btn-save" data-id="${ingredient.id}">Сохранить</button>
        <button class="btn btn-sm btn-danger btn-delete" data-id="${ingredient.id}">Удалить</button>
      </div>
    `;
    list.append(li);
  });

  document.querySelectorAll('.btn-save').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const nameInput = document.querySelector(`input[data-id="${id}"][data-type="name"]`);
      const priceInput = document.querySelector(`input[data-id="${id}"][data-type="price"]`);

      await fetchWithAuth(`${apiUrl}update_ingredient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          created_at_token: createdAtToken,
          ingredient_id: Number(id),
          name: nameInput.value,
          price: priceInput.value
        })
      });

      await loadIngredients();
    });
  });

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (!confirm('Удалить ингредиент?')) return;

      await fetchWithAuth(`${apiUrl}delete_ingredient`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          created_at_token: createdAtToken,
          ingredient_id: Number(id)
        })
      });

      await loadIngredients();
    });
  });
}

document.getElementById('new-ingredient-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('new-name').value;
  const price = document.getElementById('new-price').value;

  await fetchWithAuth(`${apiUrl}create_ingredient`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, created_at_token: createdAtToken, name, price })
  });

  e.target.reset();
  await loadIngredients();
});

loadIngredients();
document.getElementById('btn-logout')?.addEventListener('click', logout);