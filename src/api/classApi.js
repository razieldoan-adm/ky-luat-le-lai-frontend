import axios from './axios';

const classApi = {
  getAll: () => axios.get('/api/classes'),

  getById: (id) => axios.get(`/api/classes/${id}`),

  add: (data) => axios.post('/api/classes', data),

  update: (id, data) => axios.put(`/api/classes/${id}`, data),

  delete: (id) => axios.delete(`/api/classes/${id}`),
};

export default classApi;
