import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// 创建 `axios` 实例
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    headers: { 'Content-Type': 'application/json' }
});

// 请求拦截器：自动添加 `Authorization` 头部
api.interceptors.request.use(config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => Promise.reject(error));

// 响应拦截器：处理 `JWT` 过期
api.interceptors.response.use(
    response => response.data,
    async error => {
        if (error.response?.status === 401 && error.response?.data?.error === '认证令牌已过期') {
            console.warn('JWT 令牌过期，尝试刷新...');
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const res = await axios.post(`${API_BASE_URL}/token/refresh`, { refreshToken });

                localStorage.setItem('accessToken', res.data.accessToken);
                return api(error.config); // 重新发起原请求
            } catch (refreshError) {
                console.error('刷新 JWT 失败:', refreshError);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// 封装 GET 请求
export const get = async (url, params = {}) => {
    try {
        return await api.get(url, { params });
    } catch (error) {
        console.error(`API GET 失败: ${url}`, error);
        throw error;
    }
};

// 封装 POST 请求
export const post = async (url, data = {}) => {
    try {
        return await api.post(url, data);
    } catch (error) {
        console.error(`API POST 失败: ${url}`, error);
        throw error;
    }
};

// 封装 DELETE 请求
export const remove = async (url) => {
    try {
        return await api.delete(url);
    } catch (error) {
        console.error(`API DELETE 失败: ${url}`, error);
        throw error;
    }
};

export default api;
