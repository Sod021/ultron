import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  useEffect(() => {
    const redirectIfAuthed = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate("/app", { replace: true });
      }
    };

    redirectIfAuthed();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/app", { replace: true });
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) throw error;

      toast({ title: "Welcome back", description: "You are signed in." });
      navigate("/app", { replace: true });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Unable to sign in.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: {
          data: {
            full_name: signupName.trim(),
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Account created",
        description: "Check your email to confirm your account.",
      });
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Unable to create account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!loginEmail.trim()) {
      toast({
        title: "Enter your email",
        description: "Type your email address to reset your password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim());
      if (error) throw error;

      toast({
        title: "Reset email sent",
        description: "Check your inbox for password reset instructions.",
      });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Unable to send reset email.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(1200px_600px_at_10%_-10%,_#f7d9b0,_transparent),radial-gradient(900px_600px_at_90%_10%,_#c2e7f0,_transparent),linear-gradient(180deg,_#f8f5ef,_#e9eef2)] text-slate-900">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-[#f4b86e] blur-3xl" />
        <div className="absolute right-[-120px] top-32 h-80 w-80 rounded-full bg-[#7cc7d9] blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-72 w-72 rounded-full bg-[#f3d6a2] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-8">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-400/30 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Site Sentinel
            </span>
            <h1
              className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl"
              style={{ fontFamily: '"Fraunces", "Times New Roman", serif' }}
            >
              Keep every client site on watch without the daily chaos.
            </h1>
            <p className="max-w-xl text-base text-slate-700 sm:text-lg">
              Track uptime, log issues, and ship clean reports. All in one workspace that remembers every
              check you have ever run.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Smart CSV intake", value: "Upload once, stay synced." },
              { label: "Daily check history", value: "See every pass and fix." },
              { label: "Fast reports", value: "Export problem lists in seconds." },
              { label: "Team-friendly", value: "Ready for shared access." },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                <p className="text-sm text-slate-600">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Secure Supabase auth
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Your data stays yours
            </div>
          </div>
        </section>

        <section className="flex w-full items-center justify-center">
          <Card className="w-full max-w-md border-white/70 bg-white/80 shadow-xl backdrop-blur">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl text-slate-900" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                Welcome 
              </CardTitle>
              <CardDescription className="text-slate-600">
                Sign in or create a new account to keep monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 text-slate-700">
                  <TabsTrigger value="login" className="data-[state=active]:colour:#35546e">
                    Log in
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:colour:#35546e">
                    Sign up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-5">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@agency.com"
                        value={loginEmail}
                        onChange={(event) => setLoginEmail(event.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <button
                        type="button"
                        className="font-semibold text-slate-700 hover:text-slate-900"
                        onClick={handlePasswordReset}
                        disabled={isLoading}
                      >
                        Forgot password?
                      </button>
                      <Link to="/app" className="font-semibold text-slate-700 hover:text-slate-900">
                        Back to dashboard
                      </Link>
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-slate-900 text-white hover:bg-slate-800"
                      disabled={isLoading}
                    >
                      {isLoading ? "Signing in..." : "Log in"}
                    </Button>
                    <p className="text-center text-xs text-slate-500">
                      By continuing you agree to the Site Sentinel terms.
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-5">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full name</Label>
                      <Input
                        id="signup-name"
                        placeholder="Alex Morgan"
                        value={signupName}
                        onChange={(event) => setSignupName(event.target.value)}
                        autoComplete="name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Work email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="alex@studio.com"
                        value={signupEmail}
                        onChange={(event) => setSignupEmail(event.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Create password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Create a secure password"
                        value={signupPassword}
                        onChange={(event) => setSignupPassword(event.target.value)}
                        autoComplete="new-password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-slate-900 text-white hover:bg-slate-800"
                      disabled={isLoading}
                    >
                      {isLoading ? "Creating..." : "Create account"}
                    </Button>
                    <p className="text-center text-xs text-slate-500">
                      Already have an account? Switch to Log in above.
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Auth;
