import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    timeout: 120000, // 2 minutes timeout to handle scraping process
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

export default axiosInstance;