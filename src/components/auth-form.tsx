'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { cfRegister, cfLogin } from '@/lib/cf-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LogIn, UserPlus, ArrowLeft } from 'lucide-react';

export function AuthForm() {
  const { setCurrentView, setUser, loadUserData } = useAppStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const data = await cfLogin(loginForm.email, loginForm.password);
      if (data.error) {
        toast({ title: 'Login Failed', description: data.error, variant: 'destructive' });
      } else {
        setUser({ id: data.id, email: data.email, name: data.name });
        await loadUserData();
        setCurrentView('dashboard');
        toast({ title: 'Welcome back!', description: `Logged in as ${data.name}` });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.name || !registerForm.email || !registerForm.password) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    if (registerForm.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const data = await cfRegister(registerForm.name, registerForm.email, registerForm.password);
      if (data.error) {
        toast({ title: 'Registration Failed', description: data.error, variant: 'destructive' });
      } else {
        setUser({ id: data.id, email: data.email, name: data.name });
        await loadUserData();
        setCurrentView('dashboard');
        toast({ title: 'Welcome!', description: `Account created for ${data.name}` });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-gray-500"
          onClick={() => setCurrentView('landing')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="h-12 w-12 rounded-lg bg-[#1a365d] flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-lg">SSC</span>
            </div>
            <CardTitle className="text-xl text-[#1a365d]">SSC Vocab Pro</CardTitle>
            <p className="text-sm text-gray-500">Register or login to track your progress</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="register">
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Register
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#1a365d] hover:bg-[#1a365d]/90"
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      placeholder="Your Name"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#f97316] hover:bg-[#ea580c]"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-400">
                Registration is required to track progress, mark words, and take tests
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
