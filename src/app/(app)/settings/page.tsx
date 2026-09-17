"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Download, KeyRound, LogOut, Mail, Monitor, Moon, Palette, Share, Sun, Timer, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { ALLDAY_REMINDERS, TIMED_REMINDERS } from "@/lib/dates";
import type { UserPrefs } from "@/lib/types";
import { useSession } from "@/store/session";
import { useInstallPrompt, usePush } from "@/hooks/use-pwa";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2024, 0, 1, h)),
}));

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="mb-4 gap-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base [&_svg]:size-4 [&_svg]:text-primary">
          {icon}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="divide-y">{children}</CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const user = useSession((s) => s.user);
  const features = useSession((s) => s.features);
  const updatePrefs = useSession((s) => s.updatePrefs);
  const logout = useSession((s) => s.logout);
  const push = usePush();
  const install = useInstallPrompt();

  const [name, setName] = useState(user?.name ?? "");
  const [sendingTest, setSendingTest] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  if (!user) return <PageHeader title="Settings" />;
  const p = user.prefs;

  const save = async (patch: Partial<UserPrefs> & { name?: string }, message = "Saved") => {
    try {
      await updatePrefs(patch);
      toast.success(message);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const togglePush = async (on: boolean) => {
    try {
      if (on) {
        const mode = await push.enable();
        await updatePrefs({ pushEnabled: true });
        toast.success(mode === "push" ? "Push notifications enabled" : "Browser notifications enabled while the app is open");
      } else {
        await push.disable();
        await updatePrefs({ pushEnabled: false });
        toast("Push notifications turned off");
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sendTest = async () => {
    setSendingTest(true);
    try {
      const res = await api<{ message: string }>("/api/email/test", { method: "POST" });
      toast.success(res.message);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSendingTest(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/auth/change-password", { method: "POST", body: pw });
      setPw({ currentPassword: "", newPassword: "" });
      toast.success("Password updated");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezones: string[] = (() => {
    try {
      return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone");
    } catch {
      return [p.timezone, browserTz];
    }
  })();

  return (
    <>
      <PageHeader title="Settings" />

      <Section icon={<User />} title="Profile">
        <form
          className="flex items-end gap-2 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && name !== user.name) save({ name: name.trim() }, "Name updated");
          }}
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <Button type="submit" variant="secondary" disabled={!name.trim() || name === user.name}>Save</Button>
        </form>
        <Row label="Email" description={user.email}><span /></Row>
      </Section>

      <Section icon={<Palette />} title="Appearance">
        <div className="grid grid-cols-3 gap-2 py-3">
          {([
            { v: "light", label: "Light", icon: Sun },
            { v: "dark", label: "Dark", icon: Moon },
            { v: "system", label: "System", icon: Monitor },
          ] as const).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => save({ theme: o.v }, "Theme updated")}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm transition hover:bg-muted",
                p.theme === o.v && "border-primary bg-primary/5 ring-1 ring-primary"
              )}
            >
              <o.icon className="size-5" />
              {o.label}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={<Bell />} title="Notifications & alerts" description="How TaskFlow nudges you about tasks that aren't done yet.">
        <Row label="Push notifications" description={push.permission === "denied" ? "Blocked in your browser settings" : "Alerts on this device, even when the app is closed"}>
          <Switch
            checked={push.permission === "granted" && (push.subscribed || p.pushEnabled)}
            disabled={push.permission === "unsupported" || push.permission === "denied"}
            onCheckedChange={togglePush}
          />
        </Row>
        {!features.push && (
          <p className="py-2 text-xs text-muted-foreground">
            Server push isn&apos;t configured (VAPID keys), so alerts show while the app is open. Email reminders still work.
          </p>
        )}
        <Row label="Overdue alerts" description="Get alerted when a task passes its due date">
          <Switch checked={p.overdueAlerts} onCheckedChange={(v) => save({ overdueAlerts: v })} />
        </Row>
        <Row label="Default reminder" description="Applied to new tasks with a due date">
          <Select value={p.defaultReminder === null ? "none" : String(p.defaultReminder)} onValueChange={(v) => save({ defaultReminder: v === "none" ? null : Number(v) })}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="none">None</SelectItem>
              {[...new Map([...TIMED_REMINDERS, ...ALLDAY_REMINDERS].map((o) => [o.value, o])).values()].map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.value === 0 ? "At due time" : o.label.replace(" (9 AM)", "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </Section>

      <Section icon={<Mail />} title="Email" description={`Sent to ${user.email}`}>
        {!features.email && (
          <Alert className="my-3">
            <AlertDescription>SMTP isn&apos;t configured on the server yet, so emails can&apos;t be sent. Add SMTP settings to <code>.env.local</code>.</AlertDescription>
          </Alert>
        )}
        <Row label="Email reminders" description="Reminders, overdue alerts and your daily plan by email">
          <Switch checked={p.emailReminders} onCheckedChange={(v) => save({ emailReminders: v })} />
        </Row>
        <Row label="Daily plan" description="A morning summary of today's and overdue tasks">
          <Switch checked={p.dailyDigest} onCheckedChange={(v) => save({ dailyDigest: v })} />
        </Row>
        <Row label="Send daily plan at">
          <Select value={String(p.digestHour)} onValueChange={(v) => save({ digestHour: Number(v) })} disabled={!p.dailyDigest}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              {HOURS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Time zone" description={p.timezone !== browserTz ? `This device is on ${browserTz}` : undefined}>
          <Select value={p.timezone} onValueChange={(v) => save({ timezone: v }, "Time zone updated")}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent align="end" className="max-h-72">
              {[...new Set([p.timezone, ...timezones])].map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
        <div className="py-3">
          <Button variant="outline" size="sm" onClick={sendTest} disabled={sendingTest || !features.email}>
            <Mail /> {sendingTest ? "Sending…" : "Send test email"}
          </Button>
        </div>
      </Section>

      <Section icon={<Timer />} title="Focus timer">
        <Row label="Focus length">
          <Select value={String(p.focusMinutes)} onValueChange={(v) => save({ focusMinutes: Number(v) })}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              {[15, 20, 25, 30, 45, 50, 60, 90].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Break length">
          <Select value={String(p.breakMinutes)} onValueChange={(v) => save({ breakMinutes: Number(v) })}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              {[3, 5, 10, 15, 20, 30].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
            </SelectContent>
          </Select>
        </Row>
      </Section>

      {!install.installed && (
        <Section icon={<Download />} title="Install app" description="Add TaskFlow to your home screen for a full-screen, app-like experience.">
          <div className="py-3">
            {install.canInstall ? (
              <Button onClick={install.install}><Download /> Install TaskFlow</Button>
            ) : install.isIOS ? (
              <p className="text-sm text-muted-foreground">
                On iPhone/iPad: tap <Share className="inline size-4" /> <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Push notifications on iOS require the installed app.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Use your browser menu → “Install app” / “Add to Home screen”.</p>
            )}
          </div>
        </Section>
      )}

      <Section icon={<KeyRound />} title="Security">
        <form onSubmit={changePassword} className="space-y-3 py-3">
          <Input type="password" placeholder="Current password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
          <Input type="password" placeholder="New password (min 8 characters)" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
          <Button type="submit" variant="secondary" size="sm">Change password</Button>
        </form>
      </Section>

      <Button variant="outline" className="mb-6 w-full text-destructive hover:text-destructive" onClick={logout}>
        <LogOut /> Log out
      </Button>
    </>
  );
}
