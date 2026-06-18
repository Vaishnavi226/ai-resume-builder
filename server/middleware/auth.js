const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_ultra_secure_jwt_secret_key_987654321_abcdef');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error('JWT Auth Error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired authorization token' });
  }
};
