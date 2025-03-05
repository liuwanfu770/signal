import React, { useState } from 'react';
import axios from 'axios';

const Register = () => {
    const [phone, setPhone] = useState('');
    const [captcha, setCaptcha] = useState('');
    const [useVoice, setUseVoice] = useState(false);
    const [verifyCode, setVerifyCode] = useState('');
    const [message, setMessage] = useState('');

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`http://localhost:3000/v1/register/${encodeURIComponent(phone)}`, {
                use_voice: useVoice,
                captcha
            });
            setMessage(`注册成功: ${response.data}`);
        } catch (error) {
            setMessage(`注册失败: ${error.message}`);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`http://localhost:3000/v1/register/${encodeURIComponent(phone)}/verify/${encodeURIComponent(verifyCode)}`);
            setMessage(`验证成功: ${response.data}`);
        } catch (error) {
            setMessage(`验证失败: ${error.message}`);
        }
    };

    return (
        <div>
            <h2>手动注册</h2>
            <form onSubmit={handleRegister}>
                <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="输入手机号"
                />
                <input
                    type="text"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    placeholder="输入Captcha"
                />
                <label>
                    <input
                        type="checkbox"
                        checked={useVoice}
                        onChange={(e) => setUseVoice(e.target.checked)}
                    />
                    使用语音验证码
                </label>
                <button type="submit">发送注册请求</button>
            </form>
            <h2>提交验证码</h2>
            <form onSubmit={handleVerify}>
                <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="输入验证码"
                />
                <button type="submit">提交验证码</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default Register;
