const token = localStorage.getItem('authToken');
const createdAtToken = localStorage.getItem('createdAtToken');

if (token && createdAtToken) {
  window.location.href = 'html/menu.html';
}

document.getElementById('authForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const login = document.getElementById('login').value;
    const secretKey = document.getElementById('secretKey').value;
    const messageElement = document.getElementById('message');
    
    try {
        const apiUrl = config.API_SERVER;
        
        const response = await fetch(`${apiUrl}signin_admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                login: login,
                secret_key: secretKey
            })
        });
        
        const data = await response.json();
        
        if (response.status == 200) {
            messageElement.textContent = 'Авторизация пройдена успешно!';
            messageElement.style.color = 'green';

            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('createdAtToken', data.created_at_token);

            window.location.href = 'html/orders.html';
        }
        else {
            messageElement.textContent = data.detail || 'Ошибка авторизации';
            messageElement.style.color = 'red';
        }
    } 
    catch (error) {
        console.error('Ошибка:', error);
        messageElement.textContent = 'Произошла ошибка при подключении к серверу';
        messageElement.style.color = 'red';
    }
});