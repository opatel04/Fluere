'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLogin } from '@/lib/api/queries/auth';
import { useConnectGmail } from '@/lib/api/queries/oauth';
import { Mail } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const router = useRouter();
  const { mutate: loginMutation, isPending } = useLogin();
  const gmailConnect = useConnectGmail();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    loginMutation(data, {
      onSuccess: () => {
        router.push('/dashboard');
      },
      onError: (error: any) => {
        form.setError('root', {
          message: error.response?.data?.error?.message || 'Login failed. Please try again.',
        });
      },
    });
  };

  const handleGmailLogin = () => {
    gmailConnect.mutate();
  };

  return (
    <div className="bg-white/90 backdrop-blur-md dark:bg-black border-2 border-slate-300 dark:border-white/10 p-10 rounded-2xl shadow-xl dark:shadow-none w-full">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-slate-600 dark:text-white/50 text-sm">Sign in to your account to continue</p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white/70">Email</label>
            <Input
              {...form.register('email')}
              type="email"
              placeholder="you@example.com"
              className="w-full bg-white dark:bg-black border-2 border-slate-300 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:border-blue-500 dark:focus:border-white/20 focus:ring-2 focus:ring-blue-100 dark:focus:ring-white/10 rounded-lg h-11 shadow-sm"
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white/70">Password</label>
            <Input
              {...form.register('password')}
              type="password"
              placeholder="••••••••"
              className="w-full bg-white dark:bg-black border-2 border-slate-300 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:border-blue-500 dark:focus:border-white/20 focus:ring-2 focus:ring-blue-100 dark:focus:ring-white/10 rounded-lg h-11 shadow-sm"
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          {form.formState.errors.root && (
            <p className="text-sm text-red-500 dark:text-red-400 mt-1">
              {form.formState.errors.root.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold h-11 rounded-lg shadow-md disabled:opacity-50"
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300 dark:border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-black px-2 text-slate-500 dark:text-white/50">
              Or continue with
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleGmailLogin}
          disabled={gmailConnect.isPending}
          className="w-full border-2 border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 h-11 rounded-lg"
        >
          <Mail className="mr-2 h-5 w-5" />
          {gmailConnect.isPending ? 'Connecting...' : 'Sign in with Gmail'}
        </Button>

        <p className="text-center text-sm text-slate-600 dark:text-white/50">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

