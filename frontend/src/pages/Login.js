import React, { useState } from 'react';
import { post } from '../utils/api';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!username || !password) return setMessage('用户名或密码不能为空');

        setLoading(true);
        try {
            const response = await post('/login', { username, password });

            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
            setMessage('登录成功，正在跳转...');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } catch (error) {
            setMessage(error.response?.data?.error || '登录失败');
        }
        setLoading(false);
    };

    return (
        <div>
            <h2>登录</h2>
            <form onSubmit={handleLogin}>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" />
                <button type="submit" disabled={loading}>{loading ? '登录中...' : '登录'}</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default Login;
