import axios from 'axios';
import https from 'https';

const API_BASE = 'https://apis.digital.gob.cl/dpa';

// Agente que ignora certificado expirado de la API del gobierno
const agente = new https.Agent({ rejectUnauthorized: false });

export const getRegiones = async () => {
  const { data } = await axios.get(`${API_BASE}/regiones`, { httpsAgent: agente });
  return data;
};

export const getComunasByRegion = async (codigoRegion: string) => {
  const { data } = await axios.get(`${API_BASE}/regiones/${codigoRegion}/comunas`, { httpsAgent: agente });
  return data;
};