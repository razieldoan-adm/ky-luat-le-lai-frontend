import axios from './axios';

const violationApi = {
  getAll: () => axios.get('/api/violations'),

  getById: (id) => axios.get(`/api/violations/${id}`),

  add: (data) => axios.post('/api/violations', data),

  update: (id, data) => axios.put(`/api/violations/${id}`, data),

  delete: (id) => axios.delete(`/api/violations/${id}`),
};

export default violationApi;
