import axios, { type AxiosError } from 'axios'
import { toast } from '../hooks/useToast'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status

    if (status === 401) {
      // Éviter la boucle infinie si on est déjà sur /login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }

    if (status === 403) {
      toast.error("Accès refusé", "Vous n'avez pas accès à cette ressource.")
    } else if (status === 404) {
      toast.error("Introuvable", "La ressource demandée est introuvable.")
    } else if (status === 500) {
      toast.error("Erreur serveur", "Une erreur est survenue, veuillez réessayer.")
    } else if (!error.response) {
      toast.error("Connexion impossible", "Vérifiez votre connexion réseau.")
    }

    return Promise.reject(error)
  }
)

export default client
