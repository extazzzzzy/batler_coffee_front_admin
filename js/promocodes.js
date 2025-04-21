const apiUrl = config.API_SERVER;

class PromocodeManager {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.createdAtToken = localStorage.getItem('createdAtToken');
    this.promoModal = new bootstrap.Modal(document.getElementById('promocodeModal'));
    this.imgBase64 = '';
    this.initElements();
    this.initEventListeners();
    this.checkAuth();
  }

  initElements() {
    this.elements = {
      promocodesRow: document.getElementById('promocodes-row'),
      btnAddPromo: document.getElementById('btn-add-promocode'),
      logoutBtn: document.getElementById('btn-logout'),
      promoForm: document.getElementById('promocode-form'),
      imgFileInput: document.getElementById('img-file'),
      btnSavePromo: document.getElementById('btn-save-promocode'),
      modalTitle: document.getElementById('promocodeModalLabel')
    };
  }

  initEventListeners() {
    this.elements.btnAddPromo.addEventListener('click', () => this.openCreateModal());
    this.elements.logoutBtn.addEventListener('click', () => this.logout());
    this.elements.imgFileInput.addEventListener('change', (e) => this.handleImageUpload(e));
    this.elements.btnSavePromo.addEventListener('click', () => this.savePromocode());
  }

  checkAuth() {
    if (!this.token || !this.createdAtToken) {
      window.location.href = '../index.html';
      return;
    }
    this.loadPromocodes();
  }

async logout() {
  const res = await fetch(`${apiUrl}out`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: localStorage.getItem('authToken'), created_at_token: localStorage.getItem('createdAtToken') })
  });
  localStorage.removeItem('authToken');
  localStorage.removeItem('createdAtToken');
  window.location.href = '../index.html';
}

  async fetchWithAuth(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
      this.logout();
    }
    return res;
  }

  async loadPromocodes() {
    try {
      const res = await this.fetchWithAuth(`${apiUrl}fetch_promocodes_admin`);
      const data = await res.json();
      
      if (!data.success || !data.promocodes) {
        console.error('Failed to load promocodes:', data);
        return;
      }

      this.elements.promocodesRow.innerHTML = '';
      data.promocodes.forEach(promo => {
        this.createPromoCard({
          ...promo,
          is_active: promo.is_acitve // Fix server typo
        });
      });
    } catch (error) {
      console.error('Error loading promocodes:', error);
    }
  }

  createPromoCard(promo) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 position-relative';
    
    col.innerHTML = `
      <div class="card h-100 ${!promo.is_active ? 'border-danger' : ''}">
        <div class="card-body">
          <h5 class="card-title">${promo.promocode}</h5>
          <p class="card-text">${promo.description}</p>
          <p class="text-muted">
            Скидка: ${promo.discount}${promo.is_percent ? '%' : '₽'} 
            ${promo.min_total_sum ? `(от ${promo.min_total_sum}₽)` : ''}
          </p>
          ${!promo.is_active ? `<span class="badge bg-danger position-absolute top-0 end-0 m-2">Неактивен</span>` : ''}
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${promo.promocode_id}">Редактировать</button>
            <button class="btn btn-sm btn-outline-danger btn-delete" data-id="${promo.promocode_id}">&times;</button>
          </div>
        </div>
      </div>
    `;
    
    this.elements.promocodesRow.appendChild(col);
    
    col.querySelector('.btn-edit').addEventListener('click', () => this.openEditModal(promo));
    col.querySelector('.btn-delete').addEventListener('click', () => this.confirmDelete(promo.promocode_id));
  }

  openCreateModal() {
    this.elements.modalTitle.textContent = 'Добавить промокод';
    this.elements.promoForm.reset();
    document.getElementById('is_active').checked = true;
    document.getElementById('is_percent').checked = false;
    this.imgBase64 = '';
    this.promoModal.show();
  }

  openEditModal(promo) {
    this.elements.modalTitle.textContent = 'Редактировать промокод';
    this.elements.promoForm.reset();
    
    document.getElementById('promocode_id').value = promo.promocode_id;
    document.getElementById('promocode').value = promo.promocode;
    document.getElementById('description').value = promo.description;
    document.getElementById('is_active').checked = promo.is_active;
    document.getElementById('is_percent').checked = promo.is_percent;
    document.getElementById('discount').value = promo.discount;
    document.getElementById('min_total_sum').value = promo.min_total_sum;
    
    this.imgBase64 = '';
    this.promoModal.show();
  }

  handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        this.imgBase64 = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async savePromocode() {
    const form = this.elements.promoForm;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const isEdit = !!formData.get('promocode_id');
    
    const payload = {
      token: this.token,
      created_at_token: this.createdAtToken,
      promocode: formData.get('promocode'),
      description: formData.get('description'),
      is_active: formData.get('is_active') === 'on',
      is_percent: formData.get('is_percent') === 'on',
      discount: formData.get('discount'),
      min_total_sum: formData.get('min_total_sum')
    };

    if (this.imgBase64) {
      payload.base64_img = this.imgBase64;
    }

    try {
      const endpoint = isEdit ? 'update_promocode' : 'create_promocode';
      if (isEdit) {
        payload.promocode_id = formData.get('promocode_id');
      }

      const res = await this.fetchWithAuth(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      
      if (result.success || result.message?.includes('успешно')) {
        this.promoModal.hide();
        this.loadPromocodes();
      } else {
        console.error('Server error:', result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Request failed:', error);
    }
  }

  async confirmDelete(promocode_id) {
    if (!confirm('Вы уверены, что хотите удалить этот промокод?')) return;
  
    try {
      const res = await this.fetchWithAuth(`${apiUrl}delete_promocode`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.token,
          created_at_token: this.createdAtToken,
          promocode_id
        })
      });
  
      const result = await res.json();
    
      if (result.success || result.message?.toLowerCase().includes('успешно')) {
        this.loadPromocodes();
      } else {
        console.error('Delete failed:', result.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  new PromocodeManager();
});