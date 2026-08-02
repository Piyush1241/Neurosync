import {api} from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileAgent } from './MobileAgentService';

export const loginUser = async (email: string, password: string) => {
  const response = await api.post('/api/v1/login', {email, password});
  const data = response.data;

  // Save token + email so user stays logged in after restart
  if (data.token || data.access_token) {
    const token = data.token || data.access_token;
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_email', email);
    // Attach token to all future requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    mobileAgent.start();
  }

  return data;
};

export const registerUser = async (email: string, password: string) => {
  const response = await api.post('/api/v1/register', {email, password});
  return response.data;
};

export const restoreSession = async (): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      mobileAgent.start();
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem('auth_token');
  await AsyncStorage.removeItem('auth_email');
  delete api.defaults.headers.common['Authorization'];
  mobileAgent.stop();
};