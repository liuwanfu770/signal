import React, { useState, useEffect } from 'react';
import { post } from '../utils/api';

const Register = () => {
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!/^\+?\d{10,15}$/.test(phone)) return setMessage('请输入正确的手机号');

        setLoading(true);
        try {
            const response = await post('/register', { phone });
            setMessage(`注册成功: ${response.message}`);
        } catch (error) {
            setMessage(error.response?.data?.error || '注册失败');
        }
        setLoading(false);
    };

    return (
        <div>
            <h2>注册</h2>
            <form onSubmit={handleRegister}>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="手机号" />
                <button type="submit" disabled={loading}>{loading ? '注册中...' : '注册'}</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default Register;
