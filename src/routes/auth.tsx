import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sessionQ } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { PageSkeleton, Pill, SectionHeader } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { loginUserFn, registerUserFn, logoutUserFn, setDemoUserFn } from "@/lib/api.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In & Registration — Vinayaka Chavithi Festival" },
      { name: "description", content: "Sign in or register for the village Vinayaka Chavithi festival platform." },
      { property: "og:title", content: "Sign In — Vinayaka Chavithi" },
      { property: "og:description", content: "User authentication and registration for village devotees and committee members." },
    ],
  }),
  component: Page,
});

function Page() {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery(sessionQ());
  const nav = useNavigate();
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  // Sign in form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign up form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [village, setVillage] = useState("Chinnagollapalli");
  const [prefLang, setPrefLang] = useState<"en" | "te">(lang);

  if (!data) return <PageSkeleton />;

  const current = data?.viewer?.user ?? null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setBusy(true);
    try {
      const res = await loginUserFn({
        data: {
          identifier: identifier.trim(),
          password,
        },
      });

      // Persist session to both localStorage and cookie so it survives cold starts and Worker environment limitations
      if (res?.user?.id && typeof window !== "undefined") {
        try { window.localStorage.setItem("vvc_demo_uid", res.user.id); } catch {}
        document.cookie = `vvc_demo_uid=${res.user.id}; path=/; max-age=31536000; SameSite=Lax`;
      }
      try {
        if (res?.user?.id) await setDemoUserFn({ data: { userId: res.user.id } });
      } catch {}

      await qc.invalidateQueries();
      const displayName = res?.user?.name || identifier.trim();
      const isAdmin = res?.user?.role === "ADMIN";
      const isYouth = Boolean(res?.user?.isYouth || res?.user?.phone === "9000000002");

      toast.success(
        lang === "te"
          ? `స్వాగతం ${displayName}! విజయవంతంగా లాగిన్ అయ్యారు.`
          : `Welcome ${displayName}! Signed in successfully.`
      );

      // Navigate directly to the user's RESPECTIVE dashboard
      const targetUrl = isAdmin ? "/admin" : isYouth ? "/youth" : "/dashboard";
      window.location.href = targetUrl;
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("USER_NOT_FOUND")) {
        toast.error(
          lang === "te"
            ? "వినియోగదారు కనుగొనబడలేదు. ఫోన్ నంబర్ సరిచూసుకోండి లేదా కొత్తగా నమోదు చేసుకోండి."
            : "User not found. Please check mobile number or register a new account."
        );
      } else if (msg.includes("INVALID_PASSWORD")) {
        toast.error(
          lang === "te"
            ? "తప్పుడు పాస్‌వర్డ్. దయచేసి సరైన పాస్‌వర్డ్ నమోదు చేయండి."
            : "Incorrect password. Please try again."
        );
      } else {
        toast.error(msg || (lang === "te" ? "లాగిన్ విఫలమైంది" : "Sign in failed"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (!name.trim()) {
      toast.error(lang === "te" ? "దయచేసి మీ పేరును నమోదు చేయండి" : "Please enter your name");
      return;
    }
    if (cleanPhone.length !== 10) {
      toast.error(
        lang === "te"
          ? "దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి"
          : "Please enter a valid 10-digit mobile number"
      );
      return;
    }
    if (regPassword.length < 4) {
      toast.error(
        lang === "te"
          ? "పాస్‌వర్డ్ కనీసం 4 అక్షరాలు ఉండాలి"
          : "Password must be at least 4 characters"
      );
      return;
    }

    setBusy(true);
    try {
      const res = await registerUserFn({
        data: {
          name: name.trim(),
          phone: cleanPhone,
          password: regPassword,
          village: village.trim() || "Chinnagollapalli",
          preferredLanguage: prefLang,
        },
      });

      // Persist session to both localStorage and cookie
      if (res?.user?.id && typeof window !== "undefined") {
        try { window.localStorage.setItem("vvc_demo_uid", res.user.id); } catch {}
        document.cookie = `vvc_demo_uid=${res.user.id}; path=/; max-age=31536000; SameSite=Lax`;
      }
      try {
        if (res?.user?.id) await setDemoUserFn({ data: { userId: res.user.id } });
      } catch {}

      await qc.invalidateQueries();
      const displayName = res?.user?.name || name.trim();
      toast.success(
        lang === "te"
          ? `నమోదు విజయవంతమైంది! స్వాగతం ${displayName}.`
          : `Registration successful! Welcome ${displayName}.`
      );

      // Navigate new registered user to Member Dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("PHONE_ALREADY_EXISTS")) {
        toast.error(
          lang === "te"
            ? "ఈ ఫోన్ నంబర్ ఇప్పటికే నమోదు చేయబడింది. దయచేసి లాగిన్ అవ్వండి."
            : "This mobile number is already registered. Please sign in."
        );
        setMode("signin");
        setIdentifier(cleanPhone);
      } else {
        toast.error(msg || (lang === "te" ? "రిజిస్ట్రేషన్ విఫలమైంది" : "Registration failed"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      // Clear session from both localStorage and cookie
      if (typeof window !== "undefined") {
        try { window.localStorage.removeItem("vvc_demo_uid"); } catch {}
        document.cookie = `vvc_demo_uid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
      try { await logoutUserFn(); } catch {}
      try { await setDemoUserFn({ data: { userId: null } }); } catch {}
      await qc.invalidateQueries();
      toast.success(lang === "te" ? "లాగౌట్ అయ్యారు" : "Signed out successfully");
      // Force full page reload to ensure session is cleared
      window.location.href = "/";
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <SectionHeader
        title={lang === "te" ? "ఖాతా ప్రవేశం & నమోదు" : "Sign In & Registration"}
        sub={
          lang === "te"
            ? "గ్రామ వినాయక చవితి వేదికలోకి ప్రవేశించండి లేదా కొత్త ఖాతా సృష్టించండి."
            : "Sign in to access your account or register as a new village devotee."
        }
      />

      {/* If currently signed in, show status banner */}
      {current && (
        <div className="rounded-xl border bg-primary/5 border-primary/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {lang === "te" ? "ప్రస్తుతం లాగిన్ అయి ఉన్నారు:" : "Currently signed in as:"}
              </p>
              <h4 className="font-bold text-base flex items-center gap-2 mt-0.5">
                <span>{current.name}</span>
                <Pill tone={current.role === "ADMIN" ? "primary" : data?.viewer?.canSeeYouth ? "youth" : "muted"}>
                  {current.role === "ADMIN"
                    ? (lang === "te" ? "నిర్వాహకులు" : "Admin")
                    : data.viewer.canSeeYouth
                    ? (lang === "te" ? "యువత సభ్యులు" : "Youth Member")
                    : (lang === "te" ? "భక్తులు" : "Devotee")}
                </Pill>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">{current.phone}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={handleLogout}
              className="text-xs font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              {lang === "te" ? "లాగౌట్" : "Sign Out"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {current.role === "ADMIN" && (
              <Button
                size="sm"
                className="flex-1 font-semibold"
                onClick={() => { window.location.href = "/admin"; }}
              >
                {lang === "te" ? "అడ్మిన్ డాష్‌బోర్డ్" : "Admin Dashboard"}
              </Button>
            )}
            {data.viewer.canSeeYouth && (
              <Button
                variant={current.role === "ADMIN" ? "outline" : "default"}
                size="sm"
                className="flex-1 font-semibold"
                onClick={() => { window.location.href = "/youth"; }}
              >
                {lang === "te" ? "యువత డాష్‌బోర్డ్" : "Youth Dashboard"}
              </Button>
            )}
            <Button
              variant={current.role === "ADMIN" || data.viewer.canSeeYouth ? "outline" : "default"}
              size="sm"
              className="flex-1 font-semibold"
              onClick={() => { window.location.href = "/dashboard"; }}
            >
              {lang === "te" ? "నా డాష్‌బోర్డ్" : "My Dashboard"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full font-medium text-xs text-muted-foreground"
              onClick={() => { window.location.href = "/"; }}
            >
              {lang === "te" ? "హోమ్‌పేజీకి కొనసాగండి" : "Continue to Home"}
            </Button>
          </div>
        </div>
      )}

      {/* Sign In / Sign Up Mode Switcher */}
      <div className="flex rounded-lg border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={cn(
            "flex-1 py-2 text-sm font-semibold rounded-md transition-all text-center",
            mode === "signin"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {lang === "te" ? "లాగిన్" : "Sign In"}
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={cn(
            "flex-1 py-2 text-sm font-semibold rounded-md transition-all text-center",
            mode === "signup"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {lang === "te" ? "కొత్త నమోదు" : "New Registration"}
        </button>
      </div>

      {/* SIGN IN FORM */}
      {mode === "signin" && (
        <form onSubmit={handleSignIn} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold">
              {lang === "te" ? "ఖాతాలోకి ప్రవేశించండి" : "Sign In"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "te"
                ? "మీ నమోదిత మొబైల్ నంబర్ మరియు పాస్‌వర్డ్‌తో లాగిన్ అవ్వండి."
                : "Enter your registered mobile number and password to log in."}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te" ? "మొబైల్ నంబర్ లేదా ఖాతా పేరు" : "Mobile Number / Username"}
            </label>
            <Input
              type="text"
              required
              placeholder={lang === "te" ? "ఉదా: 9876543210" : "e.g. 9876543210"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="h-10"
              autoComplete="username"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold">
                {lang === "te" ? "పాస్‌వర్డ్" : "Password"}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-primary hover:underline"
              >
                {showPassword
                  ? (lang === "te" ? "దాచు" : "Hide")
                  : (lang === "te" ? "చూపించు" : "Show")}
              </button>
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10"
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" disabled={busy} className="w-full h-11 font-semibold text-sm">
            {busy
              ? (lang === "te" ? "లాగిన్ అవుతోంది..." : "Signing in...")
              : (lang === "te" ? "లాగిన్ అవ్వండి" : "Sign In")}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            {lang === "te" ? "ఖాతా లేదా? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="text-primary font-semibold hover:underline"
            >
              {lang === "te" ? "ఇక్కడ నమోదు చేసుకోండి" : "Register here"}
            </button>
          </p>
        </form>
      )}

      {/* SIGN UP FORM */}
      {mode === "signup" && (
        <form onSubmit={handleSignUp} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold">
              {lang === "te" ? "కొత్త ఖాతా నమోదు" : "Register New Account"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "te"
                ? "మీ వివరాలు నమోదు చేసుకొని ఉత్సవ వేదికలో భాగస్వామ్యం అవ్వండి."
                : "Create your account to view festival records, participate in auctions, and engage."}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te" ? "పూర్తి పేరు" : "Full Name"}
            </label>
            <Input
              type="text"
              required
              placeholder={lang === "te" ? "ఉదా: రమేష్ కుమార్" : "e.g. Ramesh Kumar"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te" ? "మొబైల్ నంబర్ (10 అంకెలు)" : "Mobile Number (10 digits)"}
            </label>
            <Input
              type="tel"
              required
              maxLength={10}
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="h-10"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              {lang === "te" ? "పాస్‌వర్డ్ సృష్టించండి (కనీసం 4 అక్షరాలు)" : "Create Password (min 4 characters)"}
            </label>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              className="h-10"
              autoComplete="new-password"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "గ్రామం" : "Village"}
              </label>
              <Input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="h-10"
                placeholder="Chinnagollapalli"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">
                {lang === "te" ? "భాష" : "Preferred Language"}
              </label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={prefLang}
                onChange={(e) => setPrefLang(e.target.value as "en" | "te")}
              >
                <option value="en">English</option>
                <option value="te">తెలుగు</option>
              </select>
            </div>
          </div>

          <Button type="submit" disabled={busy} className="w-full h-11 font-semibold text-sm">
            {busy
              ? (lang === "te" ? "నమోదు చేస్తోంది..." : "Registering...")
              : (lang === "te" ? "నమోదు చేసుకొని లాగిన్ అవ్వండి" : "Create Account & Sign In")}
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            {lang === "te" ? "ఇప్పటికే ఖాతా ఉందా? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="text-primary font-semibold hover:underline"
            >
              {lang === "te" ? "ఇక్కడ లాగిన్ అవ్వండి" : "Sign in here"}
            </button>
          </p>
        </form>
      )}

      {/* CONFIDENTIALITY AND SECURITY NOTICE */}
      <div className="rounded-xl border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        <p>
          {lang === "te"
            ? "🔒 మీ లాగిన్ సమాచారం మరియు పాస్‌వర్డ్ పూర్తిగా గోప్యంగా మరియు సురక్షితంగా భద్రపరచబడతాయి."
            : "🔒 Your login credentials and passwords are encrypted and strictly confidential."}
        </p>
      </div>
    </div>
  );
}
