const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Standard fetch helper with error handling & JSON formatting
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const res = await fetch(url, config);
    const result = await res.json();
    return result;
  } catch (err) {
    console.warn(`[API Client] Network request to ${url} failed:`, err.message);
    return {
      success: false,
      data: null,
      message: 'Failed to connect to backend server. Is it running on port 5000?',
      error: err.message
    };
  }
}

export const DriverAPI = {
  getDrivers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/drivers${query ? `?${query}` : ''}`);
  },
  getStats: () => request('/drivers/stats'),
  getAvailable: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/drivers/available${query ? `?${query}` : ''}`);
  },
  getById: (id) => request(`/drivers/${id}`),
  create: (driverData) => request('/drivers', {
    method: 'POST',
    body: JSON.stringify(driverData)
  }),
  approve: (id) => request(`/drivers/${id}/approve`, {
    method: 'PUT'
  }),
  reject: (id, reason = '') => request(`/drivers/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason })
  })
};

export const RequestAPI = {
  getRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/requests${query ? `?${query}` : ''}`);
  },
  getPending: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/requests/pending${query ? `?${query}` : ''}`);
  },
  getStats: () => request('/requests/stats'),
  getById: (id) => request(`/requests/${id}`),
  create: (requestData) => request('/requests', {
    method: 'POST',
    body: JSON.stringify(requestData)
  }),
  update: (id, updateData) => request(`/requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  }),
  toggleVisibility: (id, visibility) => request(`/requests/${id}/visibility`, {
    method: 'PUT',
    body: JSON.stringify({ visibility })
  }),
  getDriverRequests: (id) => request(`/requests/${id}/driver-requests`)
};

export const AssignmentAPI = {
  create: (assignmentData) => request('/assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData)
  }),
  getAssignments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/assignments${query ? `?${query}` : ''}`);
  }
};
