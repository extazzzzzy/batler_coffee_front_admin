const apiUrl = config.API_SERVER;
const token = localStorage.getItem('authToken');
const createdAtToken = localStorage.getItem('createdAtToken');

if (!token || !createdAtToken) {
  window.location.href = '../index.html';
}

async function fetchWithAuth(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    logout();
  }
  return res;
}

async function logout() {
  try {
    await fetch(`${apiUrl}out`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, created_at_token: createdAtToken })
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('authToken');
    localStorage.removeItem('createdAtToken');
    window.location.href = '../index.html';
  }
}

async function loadAdmins() {
  try {
    const res = await fetchWithAuth(`${apiUrl}fetch_administrators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, created_at_token: createdAtToken })
    });
    
    const data = await res.json();
    const adminsContainer = document.getElementById('admins-container');
    adminsContainer.innerHTML = '';

    // Обновляем заголовок с текущим логином
    const titleElement = document.getElementById('current-admin-title');
    if (data.current_login_admin) {
      titleElement.textContent = `Администраторы (Текущий сеанс: ${data.current_login_admin})`;
    } else {
      titleElement.textContent = 'Администраторы';
    }

    if (data.success && data.administrators) {
      data.administrators.forEach(admin => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        
        // Добавляем пометку для текущего администратора
        const isCurrent = admin.login === data.current_login_admin;
        const currentBadge = isCurrent 
          ? '<span class="badge bg-primary position-absolute top-0 end-0 m-2">Вы</span>' 
          : '';
        
        col.innerHTML = `
          <div class="card h-100 ${isCurrent ? 'border-primary' : ''}">
            <div class="card-body position-relative">
              ${currentBadge}
              <h5 class="card-title">${admin.name}</h5>
              <p class="card-text">Логин: ${admin.login}</p>
              ${!isCurrent ? `
                <button class="btn btn-sm btn-danger btn-delete" data-login="${admin.login}">Удалить</button>
              ` : ''}
            </div>
          </div>
        `;
        adminsContainer.appendChild(col);
        
        if (!isCurrent) {
          col.querySelector('.btn-delete').addEventListener('click', () => deleteAdmin(admin.login));
        }
      });
    }
  } catch (error) {
    console.error('Error loading admins:', error);
  }
}

async function deleteAdmin(login) {
  if (!confirm(`Вы уверены, что хотите удалить администратора ${login}?`)) return;
  
  try {
    await fetchWithAuth(`${apiUrl}delete_administrator`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token, 
        created_at_token: createdAtToken,
        login 
      })
    });
    await loadAdmins();
  } catch (error) {
    console.error('Error deleting admin:', error);
  }
}

async function createAdmin() {
  const name = document.getElementById('name').value;
  const login = document.getElementById('login').value;
  const secretKey = document.getElementById('secret-key').value;

  try {
    await fetchWithAuth(`${apiUrl}signup_admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        created_at_token: createdAtToken,
        name,
        login,
        secret_key: secretKey
      })
    });
    
    document.getElementById('admin-form').reset();
    bootstrap.Modal.getInstance(document.getElementById('adminModal')).hide();
    await loadAdmins();
  } catch (error) {
    console.error('Error creating admin:', error);
    alert('Ошибка при создании администратора');
  }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  const adminModal = new bootstrap.Modal(document.getElementById('adminModal'));
  
  document.getElementById('btn-add-admin').addEventListener('click', () => {
    document.getElementById('admin-form').reset();
    adminModal.show();
  });
  
  document.getElementById('btn-save-admin').addEventListener('click', createAdmin);
  document.getElementById('btn-logout').addEventListener('click', logout);
  
  loadAdmins();
});