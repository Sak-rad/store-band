'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from '../../../navigation';
import { api } from '../../../shared/lib/api';
import { useAuthStore } from '../../../shared/store/auth.store';
import styles from './AuthForm.module.scss';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/login', data);
      setAuth(res.data.user, res.data.accessToken);
      router.push('/listings');
    } catch (err: any) {
      setError('root', { message: err.response?.data?.message || t('errors.invalidCredentials') });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className={styles.form__field}>
        <label htmlFor="email">{t('email')}</label>
        <input id="email" type="email" autoComplete="email" {...register('email')} />
        {errors.email && <span className={styles.form__error}>{errors.email.message}</span>}
      </div>

      <div className={styles.form__field}>
        <label htmlFor="password">{t('password')}</label>
        <input id="password" type="password" autoComplete="current-password" {...register('password')} />
        {errors.password && <span className={styles.form__error}>{errors.password.message}</span>}
      </div>

      {errors.root && <p className={styles['form__root-error']}>{errors.root.message}</p>}

      <button type="submit" className={styles.form__btn} disabled={isSubmitting}>
        {isSubmitting ? t('loading') : t('loginBtn')}
      </button>
    </form>
  );
}
