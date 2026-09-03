export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err);

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    data: null,
    message,
    error: process.env.NODE_ENV === 'production' ? err.name : (err.stack || err.message)
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    message: `API Route Not Found: [${req.method}] ${req.originalUrl}`,
    error: 'RouteNotFound'
  });
};
