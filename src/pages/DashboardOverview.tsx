import { useEffect, useState } from 'react';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Dozenten, Teilnehmer, Raeume, Kurse, Anmeldungen } from '@/types/app';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GraduationCap, Users, DoorOpen, BookOpen, ClipboardList, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';

interface Stats {
  dozenten: Dozenten[];
  teilnehmer: Teilnehmer[];
  raeume: Raeume[];
  kurse: Kurse[];
  anmeldungen: Anmeldungen[];
}

function HeroStat({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="stat-card group">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
          {sub && <p className="stat-sub">{sub}</p>}
        </div>
        <div className={`stat-icon ${color}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dozenten, teilnehmer, raeume, kurse, anmeldungen] = await Promise.all([
          LivingAppsService.getDozenten(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getRaeume(),
          LivingAppsService.getKurse(),
          LivingAppsService.getAnmeldungen(),
        ]);
        setStats({ dozenten, teilnehmer, raeume, kurse, anmeldungen });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const today = new Date();

  const activeKurse = stats?.kurse.filter(k => {
    const start = k.fields.startdatum ? parseISO(k.fields.startdatum) : null;
    const end = k.fields.enddatum ? parseISO(k.fields.enddatum) : null;
    if (!start) return false;
    return isBefore(start, today) && (!end || isAfter(end, today));
  }) ?? [];

  const upcomingKurse = stats?.kurse.filter(k => {
    const start = k.fields.startdatum ? parseISO(k.fields.startdatum) : null;
    return start && isAfter(start, today);
  }).sort((a, b) =>
    parseISO(a.fields.startdatum!).getTime() - parseISO(b.fields.startdatum!).getTime()
  ).slice(0, 5) ?? [];

  const bezahltCount = stats?.anmeldungen.filter(a => a.fields.bezahlt).length ?? 0;
  const unbezahltCount = (stats?.anmeldungen.length ?? 0) - bezahltCount;

  const kursAnmeldungen = stats?.kurse.map(k => ({
    name: k.fields.titel ? (k.fields.titel.length > 18 ? k.fields.titel.slice(0, 18) + '…' : k.fields.titel) : 'Unbenannt',
    count: stats.anmeldungen.filter(a => extractRecordId(a.fields.kurs) === k.record_id).length,
  })).sort((a, b) => b.count - a.count).slice(0, 6) ?? [];

  const recentAnmeldungen = [...(stats?.anmeldungen ?? [])]
    .sort((a, b) => {
      const da = a.fields.anmeldedatum ? parseISO(a.fields.anmeldedatum).getTime() : 0;
      const db = b.fields.anmeldedatum ? parseISO(b.fields.anmeldedatum).getTime() : 0;
      return db - da;
    })
    .slice(0, 6);

  const getTeilnehmerName = (url?: string) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    const t = stats?.teilnehmer.find(x => x.record_id === id);
    return t?.fields.name ?? '—';
  };

  const getKursName = (url?: string) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    const k = stats?.kurse.find(x => x.record_id === id);
    return k?.fields.titel ?? '—';
  };

  const chartColors = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#4f46e5', '#7c3aed'];

  return (
    <div className="overview-root">
      {/* Hero */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-badge">
            <GraduationCap size={14} />
            <span>Kursverwaltungssystem</span>
          </div>
          <h1 className="hero-title">Willkommen zurück</h1>
          <p className="hero-subtitle">
            Verwalten Sie Kurse, Dozenten, Teilnehmer und Räume an einem Ort.
          </p>
          <div className="hero-chips">
            <span className="hero-chip">
              <CheckCircle2 size={12} />
              {loading ? '…' : activeKurse.length} aktive Kurse
            </span>
            <span className="hero-chip hero-chip-warn">
              <Clock size={12} />
              {loading ? '…' : unbezahltCount} offene Zahlungen
            </span>
          </div>
        </div>
        <div className="hero-graphic" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <HeroStat icon={BookOpen} label="Kurse gesamt" value={loading ? '…' : stats?.kurse.length ?? 0} sub={`${activeKurse.length} aktiv`} color="icon-indigo" />
        <HeroStat icon={ClipboardList} label="Anmeldungen" value={loading ? '…' : stats?.anmeldungen.length ?? 0} sub={`${bezahltCount} bezahlt`} color="icon-teal" />
        <HeroStat icon={Users} label="Teilnehmer" value={loading ? '…' : stats?.teilnehmer.length ?? 0} color="icon-violet" />
        <HeroStat icon={GraduationCap} label="Dozenten" value={loading ? '…' : stats?.dozenten.length ?? 0} color="icon-amber" />
        <HeroStat icon={DoorOpen} label="Räume" value={loading ? '…' : stats?.raeume.length ?? 0} color="icon-rose" />
      </div>

      {/* Charts + Activity */}
      <div className="bottom-grid">
        <div className="chart-card">
          <div className="section-header">
            <TrendingUp size={16} className="section-icon" />
            <h2 className="section-title">Anmeldungen pro Kurs</h2>
          </div>
          {loading ? (
            <div className="chart-placeholder">Lade Daten…</div>
          ) : kursAnmeldungen.length === 0 ? (
            <div className="chart-placeholder">Noch keine Kurse vorhanden</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={kursAnmeldungen} barSize={28} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: 12 }}
                  labelStyle={{ fontWeight: 600 }}
                  cursor={{ fill: 'oklch(0.46 0.22 264 / 0.06)' }}
                />
                <Bar dataKey="count" name="Anmeldungen" radius={[6, 6, 0, 0]}>
                  {kursAnmeldungen.map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="side-card">
          <div className="section-header">
            <Clock size={16} className="section-icon" />
            <h2 className="section-title">Nächste Kurse</h2>
          </div>
          {loading ? (
            <div className="chart-placeholder">Lade…</div>
          ) : upcomingKurse.length === 0 ? (
            <div className="chart-placeholder">Keine bevorstehenden Kurse</div>
          ) : (
            <ul className="upcoming-list">
              {upcomingKurse.map(k => (
                <li key={k.record_id} className="upcoming-item">
                  <div className="upcoming-dot" />
                  <div className="upcoming-info">
                    <span className="upcoming-title">{k.fields.titel ?? '—'}</span>
                    <span className="upcoming-date">
                      {k.fields.startdatum
                        ? format(parseISO(k.fields.startdatum), 'dd. MMM yyyy', { locale: de })
                        : '—'}
                    </span>
                  </div>
                  {k.fields.preis != null && (
                    <span className="upcoming-price">{k.fields.preis.toLocaleString('de-DE')} €</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Registrations */}
      <div className="recent-card">
        <div className="section-header">
          <ClipboardList size={16} className="section-icon" />
          <h2 className="section-title">Neueste Anmeldungen</h2>
        </div>
        {loading ? (
          <div className="chart-placeholder">Lade…</div>
        ) : recentAnmeldungen.length === 0 ? (
          <div className="chart-placeholder">Noch keine Anmeldungen</div>
        ) : (
          <div className="recent-table-wrap">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Teilnehmer</th>
                  <th>Kurs</th>
                  <th>Datum</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAnmeldungen.map(a => (
                  <tr key={a.record_id}>
                    <td className="font-medium">{getTeilnehmerName(a.fields.teilnehmer)}</td>
                    <td className="recent-muted">{getKursName(a.fields.kurs)}</td>
                    <td className="recent-muted">
                      {a.fields.anmeldedatum
                        ? format(parseISO(a.fields.anmeldedatum), 'dd.MM.yyyy')
                        : '—'}
                    </td>
                    <td>
                      <span className={a.fields.bezahlt ? 'badge-paid' : 'badge-unpaid'}>
                        {a.fields.bezahlt ? 'Bezahlt' : 'Offen'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
