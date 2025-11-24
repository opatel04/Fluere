'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSignup } from '@/lib/api/queries/auth';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function SignupPage() {
  const router = useRouter();
  const { mutate: signupMutation, isPending } = useSignup();
  
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: z.infer<typeof signupSchema>) => {
    signupMutation(data, {
      onSuccess: () => {
        router.push('/dashboard');
      },
      onError: (error: any) => {
        form.setError('root', {
          message: error.response?.data?.error?.message || 'Signup failed. Please try again.',
        });
      },
    });
  };

  return (
    <div className="bg-white/90 backdrop-blur-md dark:bg-black border-2 border-slate-300 dark:border-white/10 p-10 rounded-2xl shadow-xl dark:shadow-none w-full">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
            Create account
          </h1>
          <p className="text-slate-600 dark:text-white/50 text-sm">Get started with Fluere today</p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-white/70">Name</label>
            <Input
              {...form.register('name')}
              type="text"
              placeholder="John Doe"
              className="w-full bg-white dark:bg-black border-2 border-slate-300 dark:border-white/10 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/40 focus:border-blue-500 dark:focus:border-white/20 focus:ring-2 focus:ring-blue-100 dark:focus:ring-white/10 rounded-lg h-11 shadow-sm"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 dark:text-red-400 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
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
            {isPending ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-600 dark:text-white/50">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

