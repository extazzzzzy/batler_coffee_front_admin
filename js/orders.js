const apiUrl = config.API_SERVER;

class OrderManager {
  constructor() {
    this.token = localStorage.getItem('authToken');
    this.createdAtToken = localStorage.getItem('createdAtToken');
    this.checkAuth();
    this.initElements();
    this.initEventListeners();
    this.loadOrders();
    this.startAutoRefresh();
  }

  initElements() {
    this.elements = {
      ordersTable: document.getElementById('orders-table-body'),
      logoutBtn: document.getElementById('btn-logout'),
      todayOnlyFilter: document.getElementById('today-only'),
      hideCompletedFilter: document.getElementById('hide-completed')
    };
  }

  initEventListeners() {
    this.elements.logoutBtn.addEventListener('click', () => this.logout());
    this.elements.todayOnlyFilter.addEventListener('change', () => this.loadOrders());
    this.elements.hideCompletedFilter.addEventListener('change', () => this.loadOrders());
  }

  checkAuth() {
    if (!this.token || !this.createdAtToken) {
      window.location.href = '../index.html';
    }
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
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json'
      },
      body: options.body ? JSON.stringify(options.body) : null
    });

    if (res.status === 401) {
      this.logout();
    }
    return res;
  }

  async loadOrders() {
    try {
      const res = await this.fetchWithAuth(`${apiUrl}fetch_orders`, {
        method: 'POST',
        body: {
          token: this.token,
          created_at_token: this.createdAtToken
        }
      });

      const data = await res.json();

      if (data.success && data.orders) {
        this.displayOrders(data.orders);
      } else {
        console.error('Failed to load orders:', data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  displayOrders(orders) {
    const todayOnly = this.elements.todayOnlyFilter.checked;
    const hideCompleted = this.elements.hideCompletedFilter.checked;
    const today = new Date().toISOString().split('T')[0];

    this.elements.ordersTable.innerHTML = '';

    orders.forEach(order => {
      const orderDate = order.created_at.split('T')[0];
      if (todayOnly && orderDate !== today) return;
      if (hideCompleted && ['Завершён', 'Отменён'].includes(order.status)) return;

      const row = document.createElement('tr');
      row.className = this.getStatusClass(order.status);
      row.innerHTML = `
        <td>${order.order_id}</td>
        <td>
          <input type="datetime-local" class="form-control form-control-sm" 
                 value="${this.formatDateTime(order.created_at)}" disabled>
        </td>
        <td>${order.user_name}</td>
        <td>${order.user_phone}</td>
        <td>
            <input type="text" class="form-control form-control-sm ready-for" value="${order.ready_for}">
        </td>
        <td>
          <textarea class="form-control form-control-sm description" rows="1" style="width: 250px">${order.description}</textarea>
        </td>
        <td>
          <input type="number" class="form-control form-control-sm total-sum" value="${order.total_sum}">
        </td>
        <td>
          <select class="form-select form-select-sm status">
            <option ${order.status === 'Новый' ? 'selected' : ''}>Новый</option>
            <option ${order.status === 'Готовится' ? 'selected' : ''}>Готовится</option>
            <option ${order.status === 'Готов к выдаче' ? 'selected' : ''}>Готов к выдаче</option>
            <option ${order.status === 'Завершён' ? 'selected' : ''}>Завершён</option>
            <option ${order.status === 'Отменён' ? 'selected' : ''}>Отменён</option>
          </select>
        </td>
        <td>
          <button class="btn btn-sm btn-primary btn-save" data-id="${order.order_id}">Сохранить</button>
        </td>
      `;

      this.elements.ordersTable.appendChild(row);

      // Автоподгон textarea
      const textarea = row.querySelector('.description');
      this.autoResizeTextarea(textarea);
      textarea.addEventListener('input', () => this.autoResizeTextarea(textarea));

      // Кнопка сохранить
      row.querySelector('.btn-save').addEventListener('click', () => this.saveOrder(row, order.order_id));
    });
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  getStatusClass(status) {
    switch (status) {
      case 'Новый': return 'status-new';
      case 'Готовится': return 'status-preparing';
      case 'Готов к выдаче': return 'status-ready';
      case 'Завершён':
      case 'Отменён': return 'status-completed';
      default: return '';
    }
  }

  formatDateTime(datetime) {
    const date = new Date(datetime);
    const pad = num => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  async saveOrder(row, orderId) {
    try {
      const updatedData = {
        token: this.token,
        created_at_token: this.createdAtToken,
        order_id: orderId,
        ready_for: row.querySelector('.ready-for').value,
        description: row.querySelector('.description').value,
        total_sum: row.querySelector('.total-sum').value,
        status: row.querySelector('.status').value,
        created_at: row.querySelector('input[type="datetime-local"]').value + ':00'
      };

      const res = await this.fetchWithAuth(`${apiUrl}update_order`, {
        method: 'POST',
        body: updatedData
      });

      const result = await res.json();

      if (result.success || result.message?.includes('успешно')) {
        this.showSaveSuccess(row);
        this.loadOrders();
      } else {
        console.error('Save failed:', result.message);
      }
    } catch (error) {
      console.error('Error saving order:', error);
    }
  }

  showSaveSuccess(row) {
    const btn = row.querySelector('.btn-save');
    btn.textContent = '✓ Сохранено';
    btn.classList.add('btn-success');
    btn.classList.remove('btn-primary');

    setTimeout(() => {
      btn.textContent = 'Сохранить';
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-success');
    }, 2000);
  }

  startAutoRefresh() {
    setInterval(() => {
      this.loadOrders();
    }, 30000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OrderManager();
});
