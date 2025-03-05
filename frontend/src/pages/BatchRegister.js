import React, { useState } from 'react';
import axios from 'axios';

const BatchRegister = () => {
    const [phoneNumbers, setPhoneNumbers] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const numbers = phoneNumbers.split(',').map(num => num.trim());
        try {
            const response = await axios.post('http://localhost:3000/v1/accounts/batch-register', { phone_numbers: numbers });
            setMessage(response.data.message);
        } catch (error) {
            setMessage('注册失败');
        }
    };

    return (
        <div>
            <h2>批量注册账号</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={phoneNumbers}
                    onChange={(e) => setPhoneNumbers(e.target.value)}
                    placeholder="输入手机号，用逗号分隔"
                    style={{ width: '300px', marginRight: '10px' }}
                />
                <button type="submit">注册</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default BatchRegister;
