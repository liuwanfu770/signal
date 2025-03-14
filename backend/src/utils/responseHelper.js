exports.success = (res, data, message = '请求成功') => {
    res.json({
        success: true,
        message,
        data
    });
};

exports.error = (res, status, errorMessage) => {
    res.status(status).json({
        success: false,
        error: errorMessage
    });
};
