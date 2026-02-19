import { useEffect, useState } from 'react';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Kurse, Anmeldungen, Dozenten, Teilnehmer, Raeume } from '@/types/app';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { BookOpen, Users, GraduationCap, DoorOpen, ClipboardList, TrendingUp, Euro, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Stats {
  kurse: Kurse[];
  anmeldungen: Anmeldungen[];
  dozenten: Dozenten[];
  teilnehmer: Teilnehmer[];
  raeume: Raeume[];
}

const STATUS_COLORS: Record<string, string> = {
  geplant: 'oklch(0.72 0.18 55)',
  aktiv: 'oklch(0.62 0.18 160)',
  abgeschlossen: 'oklch(0.52 0.22 268)',
  abgesagt: 'oklch(0.577 0.245 27.325)',
};

const STATUS_LABELS: Record<string, string> = {
  geplant: 'Geplant',
  aktiv: 'Aktiv',
  abgeschlossen: 'Abgeschlossen',
  abgesagt: 'Abgesagt',
};

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      LivingAppsService.getKurse(),
      LivingAppsService.getAnmeldungen(),
      LivingAppsService.getDozenten(),
      LivingAppsService.getTeilnehmer(),
      LivingAppsService.getRaeume(),
    ]).then(([kurse, anmeldungen, dozenten, teilnehmer, raeume]) => {
      setStats({ kurse, anmeldungen, dozenten, teilnehmer, raeume });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const aktiveKurse = stats?.kurse.filter(k => k.fields.status === 'aktiv').length ?? 0;
  const bezahltCount = stats?.anmeldungen.filter(a => a.fields.bezahlt).length ?? 0;
  const unbezahltCount = (stats?.anmeldungen.length ?? 0) - bezahltCount;
  const gesamtUmsatz = stats?.kurse.reduce((sum, k) => {
    const kursAnmeldungen = stats.anmeldungen.filter(a => {
      const match = a.fields.kurs?.match(/([a-f0-9]{24})$/i);
      return match?.[1] === k.record_id;
    });
    return sum + (k.fields.preis ?? 0) * (kursAnmeldungen.filter(a => a.fields.bezahlt).length);
  }, 0) ?? 0;

  const statusData = ['geplant', 'aktiv', 'abgeschlossen', 'abgesagt'].map(s => ({
    name: STATUS_LABELS[s],
    value: stats?.kurse.filter(k => k.fields.status === s).length ?? 0,
    color: STATUS_COLORS[s],
  })).filter(d => d.value > 0);

  const kursAnmeldungenData = (stats?.kurse ?? [])
    .map(k => {
      const count = stats?.anmeldungen.filter(a => {
        const match = a.fields.kurs?.match(/([a-f0-9]{24})$/i);
        return match?.[1] === k.record_id;
      }).length ?? 0;
      return { name: k.fields.titel ?? 'Unbekannt', anmeldungen: count };
    })
    .sort((a, b) => b.anmeldungen - a.anmeldungen)
    .slice(0, 6);

  const today = new Date();
  const upcomingKurse = (stats?.kurse ?? [])
    .filter(k => k.fields.startdatum && new Date(k.fields.startdatum) >= today)
    .sort((a, b) => new Date(a.fields.startdatum!).getTime() - new Date(b.fields.startdatum!).getTime())
    .slice(0, 4);

  const statItems = [
    { label: 'Kurse gesamt', value: stats?.kurse.length ?? 0, icon: BookOpen, color: 'oklch(0.52 0.22 268)', sub: `${aktiveKurse} aktiv` },
    { label: 'Anmeldungen', value: stats?.anmeldungen.length ?? 0, icon: ClipboardList, color: 'oklch(0.62 0.18 160)', sub: `${bezahltCount} bezahlt` },
    { label: 'Teilnehmer', value: stats?.teilnehmer.length ?? 0, icon: Users, color: 'oklch(0.6 0.2 320)', sub: 'registriert' },
    { label: 'Dozenten', value: stats?.dozenten.length ?? 0, icon: GraduationCap, color: 'oklch(0.52 0.22 268)', sub: 'verfügbar' },
    { label: 'Räume', value: stats?.raeume.length ?? 0, icon: DoorOpen, color: 'oklch(0.72 0.18 55)', sub: 'eingerichtet' },
    { label: 'Ausstehend', value: unbezahltCount, icon: TrendingUp, color: 'oklch(0.65 0.2 30)', sub: 'unbezahlt' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div
        className="relative rounded-2xl overflow-hidden p-8 text-white"
        style={{ background: 'var(--gradient-hero)', boxShadow: 'var(--shadow-hero)' }}
      >
        <div className="relative z-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Willkommen zurück
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight mb-1">KursVerwaltung</h1>
          <p className="text-base font-light" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Ihr Bildungsmanagement auf einen Blick
          </p>
          {!loading && (
            <div className="mt-6 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} style={{ color: 'rgba(255,255,255,0.8)' }} />
                <span className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {aktiveKurse} aktive Kurse
                </span>
              </div>
              <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.2)' }} />
              <div className="flex items-center gap-2">
                <Euro size={18} style={{ color: 'rgba(255,255,255,0.8)' }} />
                <span className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {gesamtUmsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })} Umsatz
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="absolute -right-4 -bottom-8 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="absolute right-32 top-4 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statItems.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl p-5 flex flex-col gap-3 border"
              style={{
                background: 'var(--card)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `color-mix(in oklch, ${item.color} 15%, transparent)`, color: item.color }}
              >
                <Icon size={18} />
              </div>
              <div>
                <div className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--foreground)' }}>
                  {loading ? <span style={{ color: 'var(--muted-foreground)' }}>–</span> : item.value}
                </div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--foreground)' }}>{item.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{item.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 rounded-xl border p-6"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--foreground)' }}>Anmeldungen je Kurs</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--muted-foreground)' }}>Top Kurse nach Anmeldungen</p>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>Laden…</div>
          ) : kursAnmeldungenData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>Noch keine Daten</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={kursAnmeldungenData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.012 260)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'oklch(0.52 0.04 265)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'oklch(0.52 0.04 265)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid oklch(0.9 0.012 260)', borderRadius: '0.75rem', fontSize: 12 }} labelStyle={{ fontWeight: 700 }} />
                <Bar dataKey="anmeldungen" radius={[6, 6, 0, 0]} name="Anmeldungen">
                  {kursAnmeldungenData.map((_, i) => (
                    <Cell key={i} fill={`oklch(${0.42 + i * 0.05} 0.18 ${268 - i * 10})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--foreground)' }}>Kurs-Status</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>Verteilung nach Status</p>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>Laden…</div>
          ) : statusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>Noch keine Kurse</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid oklch(0.9 0.012 260)', borderRadius: '0.75rem', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Payment + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-xl border p-6"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--foreground)' }}>Zahlungsstatus</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--muted-foreground)' }}>Bezahlt vs. Ausstehend</p>
          <div className="space-y-4">
            {[
              { label: 'Bezahlt', count: bezahltCount, total: stats?.anmeldungen.length ?? 0, color: 'oklch(0.62 0.18 160)' },
              { label: 'Ausstehend', count: unbezahltCount, total: stats?.anmeldungen.length ?? 0, color: 'oklch(0.65 0.2 30)' },
            ].map(item => {
              const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium" style={{ color: 'var(--foreground)' }}>{item.label}</span>
                    <span style={{ color: 'var(--muted-foreground)' }}>{item.count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--muted)' }}>
                    <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: item.color }} />
                  </div>
                </div>
              );
            })}
            <div
              className="mt-4 pt-4 flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: 'var(--gradient-stat)' }}
            >
              <div>
                <div className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>Gesamtumsatz (bezahlt)</div>
                <div className="text-xl font-extrabold mt-0.5" style={{ color: 'var(--primary)' }}>
                  {loading ? '–' : gesamtUmsatz.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </div>
              </div>
              <Euro size={28} style={{ color: 'var(--primary)', opacity: 0.3 }} />
            </div>
          </div>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--foreground)' }}>Nächste Kurse</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--muted-foreground)' }}>Bald startende Veranstaltungen</p>
          {loading ? (
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Laden…</div>
          ) : upcomingKurse.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Keine geplanten Kurse</div>
          ) : (
            <div className="space-y-3">
              {upcomingKurse.map(kurs => {
                const anmeldungenCount = stats?.anmeldungen.filter(a => {
                  const match = a.fields.kurs?.match(/([a-f0-9]{24})$/i);
                  return match?.[1] === kurs.record_id;
                }).length ?? 0;
                const statusColor = STATUS_COLORS[kurs.fields.status ?? 'geplant'];
                return (
                  <div
                    key={kurs.record_id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>
                        {kurs.fields.titel ?? '–'}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                        {kurs.fields.startdatum
                          ? format(parseISO(kurs.fields.startdatum), 'dd. MMM yyyy', { locale: de })
                          : 'Kein Datum'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                        {anmeldungenCount}/{kurs.fields.max_teilnehmer ?? '∞'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Plätze</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
