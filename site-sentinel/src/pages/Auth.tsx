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
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const confirmed = params.get("confirmed") === "1";
    const recovery = params.get("type") === "recovery" || window.location.pathname === "/reset";

    if (confirmed) {
      toast({
        title: "Account confirmed",
        description: "Your account is ready. Please log in with your credentials.",
      });
      supabase.auth.signOut();
      params.delete("confirmed");
      const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }

    if (recovery) {
      return;
    }

    const redirectIfAuthed = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session && !confirmed) {
        navigate("/app", { replace: true });
      }
    };

    redirectIfAuthed();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !confirmed && !recovery) {
        navigate("/app", { replace: true });
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, [navigate, toast]);

  useEffect(() => {
    if (window.location.pathname === "/reset") {
      setIsRecovery(true);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("type") === "recovery") {
      setIsRecovery(true);
    }
  }, []);

  const handleRecoverySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Make sure both fields match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Log in again with your new password.",
      });
      await supabase.auth.signOut();
      setIsRecovery(false);
      setNewPassword("");
      setConfirmPassword("");
      navigate("/", { replace: true });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: error instanceof Error ? error.message : "Unable to update password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          emailRedirectTo: `${window.location.origin}/?confirmed=1`,
        },
      });

      if (error) throw error;

      toast({
        title: "Account created",
        description: "Check your email to confirm your account, then log in.",
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
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail.trim(), {
        redirectTo: `${window.location.origin}/reset`,
      });
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
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-12 h-64 w-64 rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute right-[-140px] top-32 h-80 w-80 rounded-full bg-secondary/40 blur-3xl" />
        <div className="absolute bottom-[-140px] left-1/3 h-72 w-72 rounded-full bg-muted/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12">
        <section className="flex w-full items-center justify-center">
          <Card className="w-full max-w-md border-border/60 bg-card/70 shadow-xl backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Site Sentinel
              </span>
              <CardTitle className="text-2xl text-foreground" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                {isRecovery ? "Set a new password" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isRecovery
                  ? "Choose a new password to finish your reset."
                  : "Sign in or create a new account to keep monitoring."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRecovery ? (
                <form onSubmit={handleRecoverySubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-password" className="text-foreground">New password</Label>
                    <Input
                      id="reset-password"
                      type="password"
                      placeholder="Enter a new password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                      className="border-border/60 bg-card/40 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-password-confirm" className="text-foreground">Confirm password</Label>
                    <Input
                      id="reset-password-confirm"
                      type="password"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                      className="border-border/60 bg-card/40 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Update password"}
                  </Button>
                </form>
              ) : (
              <Tabs defaultValue="login" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-card/40 text-muted-foreground">
                  <TabsTrigger value="login" className="data-[state=active]:bg-card/70 data-[state=active]:text-foreground">
                    Log in
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="data-[state=active]:bg-card/70 data-[state=active]:text-foreground">
                    Sign up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-5">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-foreground">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@agency.com"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      autoComplete="email"
                      required
                      className="border-border/60 bg-card/40 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-foreground">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                      className="border-border/60 bg-card/40 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <button
                      type="button"
                      className="font-semibold text-foreground hover:text-foreground"
                      onClick={handlePasswordReset}
                      disabled={isLoading}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Log in"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    By continuing you agree to the Site Sentinel terms.
                  </p>
                </form>
              </TabsContent>

                <TabsContent value="signup" className="space-y-5">
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-foreground">Full name</Label>
                    <Input
                      id="signup-name"
                      placeholder="Alex Morgan"
                      value={signupName}
                      onChange={(event) => setSignupName(event.target.value)}
                      autoComplete="name"
                      required
                      className="border-border/60 bg-card/40 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground">Work email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="alex@studio.com"
                      value={signupEmail}
                      onChange={(event) => setSignupEmail(event.target.value)}
                      autoComplete="email"
                      required
                      className="border-border/60 bg-card/40 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground">Create password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a secure password"
                      value={signupPassword}
                      onChange={(event) => setSignupPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                      className="border-border/60 bg-card/40 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create account"}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account? Switch to Log in above.
                  </p>
                </form>
                </TabsContent>
              </Tabs>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Auth;
