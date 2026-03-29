import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { authClient } from '@/lib/auth-client';

export function useAuthViewModel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'login') {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        setError(error.message ?? t('auth.errorLogin'));
      } else {
        navigate('/');
      }
    } else {
      const { error } = await authClient.signUp.email({ email, password, name });
      if (error) {
        setError(error.message ?? t('auth.errorRegister'));
      } else {
        navigate('/');
      }
    }

    setLoading(false);
  }

  function toggleMode() {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  }

  return { mode, email, setEmail, password, setPassword, name, setName, error, loading, handleSubmit, toggleMode };
}
