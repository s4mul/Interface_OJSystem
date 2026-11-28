function parseId(value) {
    const text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    const id = Number(text);
    return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(id) && id <= 4294967295 ? id : null;
}

function sendError(res, error, message) {
    if ([400, 403, 404, 409].includes(error.status)) return res.status(error.status).json({ error: error.message });
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'The name or relationship already exists.' });
    console.error(message, error);
    return res.status(500).json({ error: message });
}

module.exports = { parseId, sendError };
