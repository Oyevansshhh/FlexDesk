import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, Users, Wallet, CalendarCheck, LayoutDashboard, LogOut, Plus,
  Search, Dumbbell, Menu, X, RefreshCw, AlertCircle, CheckCircle2,
  Bell, TrendingUp, CalendarDays, ArrowUpRight, UserRound, Clock3
} from 'lucide-react';
import { supabase } from './supabase';

const today = new Date().toISOString().slice(0, 10);
const money = n => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
}).format(Number(n || 0));
const shortMoney = n => Number(n || 0) >= 1000
  ? `₹${(Number(n) / 1000).toFixed(Number(n) % 1000 ? 1 : 0)}K`
  : money(n);
const initials = name => (name || 'M').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const prettyDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gymName, setGymName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [profile, setProfile] = useState(null);
  const [gym, setGym] = useState(null);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [plans, setPlans] = useState([]);
  const [tab, setTab] = useState('Dashboard');
  const [search, setSearch] = useState('');
  const [showMember, setShowMember] = useState(false);
  const [memberForm, setMemberForm] = useState({
    full_name: '', phone: '', email: '', plan_id: '',
    membership_start: today, membership_end: ''
  });
  const [mobileNav, setMobileNav] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', price: '', duration_days: '30' });

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session?.user) loadData(); }, [session]);

  async function authSubmit(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: fullName, gym_name: gymName } }
        });
        if (error) throw error;
        setNotice(!data.session
          ? 'Account created. Check your email to confirm your account, then log in.'
          : 'Account created successfully.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) { setError(e.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  async function loadData() {
    if (!session?.user) return;
    setBusy(true); setError('');
    try {
      const uid = session.user.id;
      const { data: p, error: pe } = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (pe) throw pe;
      setProfile(p);
      const { data: g, error: ge } = await supabase.from('gyms').select('*').eq('id', p.gym_id).single();
      if (ge) throw ge;
      setGym(g);
      const results = await Promise.all([
        supabase.from('members').select('*').eq('gym_id', p.gym_id).order('created_at', { ascending: false }),
        supabase.from('payments').select('*').eq('gym_id', p.gym_id).order('payment_date', { ascending: false }),
        supabase.from('attendance').select('*').eq('gym_id', p.gym_id).eq('attendance_date', today),
        supabase.from('membership_plans').select('*').eq('gym_id', p.gym_id).order('created_at')
      ]);
      const firstError = results.find(r => r.error)?.error;
      if (firstError) throw firstError;
      setMembers(results[0].data || []);
      setPayments(results[1].data || []);
      setAttendance(results[2].data || []);
      setPlans(results[3].data || []);
    } catch (e) { setError(e.message || 'Could not load gym data.'); }
    finally { setBusy(false); }
  }

  async function savePlan(e) {
    e.preventDefault(); setError(''); setNotice('');
    if (!profile?.gym_id) return setError('Gym profile is not ready.');
    if (!planForm.name.trim() || Number(planForm.price) <= 0 || Number(planForm.duration_days) <= 0)
      return setError('Please enter valid plan details.');
    setBusy(true);
    try {
      const payload = {
        name: planForm.name.trim(), price: Number(planForm.price),
        duration_days: Number(planForm.duration_days)
      };
      const result = editingPlan
        ? await supabase.from('membership_plans').update(payload).eq('id', editingPlan.id).eq('gym_id', profile.gym_id)
        : await supabase.from('membership_plans').insert({ ...payload, gym_id: profile.gym_id });
      if (result.error) throw result.error;
      setShowPlan(false); setEditingPlan(null);
      setPlanForm({ name: '', price: '', duration_days: '30' });
      setNotice(editingPlan ? 'Plan updated successfully.' : 'Plan added successfully.');
      await loadData();
    } catch (e) { setError(e.message || 'Could not save plan.'); }
    finally { setBusy(false); }
  }

  async function deletePlan(plan) {
    if (!window.confirm(`Delete ${plan.name}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const { error } = await supabase.from('membership_plans').delete()
        .eq('id', plan.id).eq('gym_id', profile.gym_id);
      if (error) throw error;
      setNotice('Plan deleted successfully.'); await loadData();
    } catch (e) { setError(e.message || 'Could not delete plan.'); }
    finally { setBusy(false); }
  }

  async function addMember(e) {
    e.preventDefault(); setError(''); setNotice('');
    if (!profile?.gym_id) return setError('Gym profile is not ready. Refresh and try again.');
    setBusy(true);
    try {
      const payload = {
        gym_id: profile.gym_id,
        full_name: memberForm.full_name.trim(),
        phone: memberForm.phone.trim() || null,
        email: memberForm.email.trim() || null,
        plan_id: memberForm.plan_id || null,
        plan_price: plans.find(p => p.id === memberForm.plan_id)?.price ?? null,
        membership_start: memberForm.membership_start || null,
        membership_end: memberForm.membership_end || null,
        created_by: session.user.id
      };
      const { error } = await supabase.from('members').insert(payload);
      if (error) throw error;
      setShowMember(false);
      setMemberForm({ full_name: '', phone: '', email: '', plan_id: '', membership_start: today, membership_end: '' });
      setNotice('Member added successfully.'); await loadData();
    } catch (e) { setError(e.message || 'Could not add member.'); }
    finally { setBusy(false); }
  }

  async function deleteMember(id) {
    if (!window.confirm('Delete this member? Related payment or attendance records may prevent deletion.')) return;
    setBusy(true); setError('');
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) setError(error.message);
    else { setNotice('Member deleted.'); await loadData(); }
    setBusy(false);
  }

  async function markAttendance(memberId, status = 'present') {
    setError(''); setNotice('');
    const { error } = await supabase.from('attendance').upsert(
      { gym_id: profile.gym_id, member_id: memberId, attendance_date: today, status },
      { onConflict: 'gym_id,member_id,attendance_date' }
    );
    if (error) setError(error.message);
    else { setNotice('Attendance updated.'); await loadData(); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null); setGym(null);
  }

  const activeMembers = members.filter(m =>
    m.status === 'active' && (!m.membership_end || m.membership_end >= today)
  ).length;
  const month = today.slice(0, 7);
  const monthlyRevenue = payments
    .filter(p => p.status === 'paid' && (p.payment_date || '').startsWith(month))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const presentToday = attendance.filter(a => a.status === 'present').length;
  const filteredMembers = useMemo(() => members.filter(m =>
    `${m.full_name} ${m.phone || ''} ${m.email || ''}`.toLowerCase().includes(search.toLowerCase())
  ), [members, search]);

  const revenueMonths = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - index));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const value = payments.filter(p => p.status === 'paid' && (p.payment_date || '').startsWith(key))
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      return { key, label: d.toLocaleDateString('en-IN', { month: 'short' }), value };
    });
  }, [payments]);
  const maxRevenue = Math.max(1, ...revenueMonths.map(m => m.value));

  if (!supabase) return <SetupScreen />;
  if (loading) return <div className="center-screen"><div className="loader" /><p>Loading FlexDesk…</p></div>;
  if (!session) return <AuthScreen {...{
    mode, setMode, email, setEmail, password, setPassword, fullName, setFullName,
    gymName, setGymName, authSubmit, busy, error, notice
  }} />;

  const nav = [
    ['Dashboard', LayoutDashboard], ['Members', Users], ['Payments', Wallet],
    ['Attendance', CalendarCheck], ['Plans', Activity]
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Dumbbell size={25} /></div>
          <div><b>FLEXDESK</b><small>GYM MANAGEMENT</small></div>
          <button className="mobile-close" onClick={() => setMobileNav(false)}><X /></button>
        </div>
        <div className="gym-chip"><span className="online-dot" /><div><b>{gym?.name || 'Your Gym'}</b><small>{profile?.role || 'gym account'}</small></div></div>
        <div className="nav-label">WORKSPACE</div>
        {nav.map(([label, Icon]) => (
          <button key={label} className={`nav-item ${tab === label ? 'active' : ''}`}
            onClick={() => { setTab(label); setMobileNav(false); }}>
            <Icon size={19} />{label}
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-dumbbell"><Dumbbell size={42} /></div>
            <b>Need a hand?</b><span>Your gym, one simple workspace.</span>
          </div>
          <button className="nav-item logout" onClick={signOut}><LogOut size={18} /> Sign out</button>
          <div className="byline">Made with care by <b>Vansh ✨</b></div>
        </div>
      </aside>
      {mobileNav && <div className="scrim" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <button className="menu-btn" onClick={() => setMobileNav(true)}><Menu /></button>
            <div><span className="eyebrow">FLEXDESK / WORKSPACE</span><h1>{tab}</h1></div>
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={loadData} title="Refresh data"><RefreshCw size={17} /></button>
            <button className="icon-btn notification-btn" title="Notifications"><Bell size={18} /><i /></button>
            <div className="avatar">{initials(profile?.full_name || session.user.email || 'V').slice(0, 1)}</div>
          </div>
        </header>

        {error && <div className="alert error"><AlertCircle size={18} />{error}<button onClick={() => setError('')}>×</button></div>}
        {notice && <div className="alert success"><CheckCircle2 size={18} />{notice}<button onClick={() => setNotice('')}>×</button></div>}

        {showMember && (
          <section className="content">
            <div className="panel form-panel">
              <div className="page-actions"><div><span className="eyebrow">MEMBER MANAGEMENT</span><h2>Add New Member</h2></div>
                <button className="icon-btn" type="button" onClick={() => setShowMember(false)}><X /></button></div>
              <form className="data-form" onSubmit={addMember}>
                <label>Full Name<input required placeholder="Member name" value={memberForm.full_name}
                  onChange={e => setMemberForm({ ...memberForm, full_name: e.target.value })} /></label>
                <label>Phone<input placeholder="Phone number" value={memberForm.phone}
                  onChange={e => setMemberForm({ ...memberForm, phone: e.target.value })} /></label>
                <label>Email<input type="email" placeholder="Email address" value={memberForm.email}
                  onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} /></label>
                <label>Membership Plan<select value={memberForm.plan_id}
                  onChange={e => setMemberForm({ ...memberForm, plan_id: e.target.value })}>
                  <option value="">Select Plan</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name} - {money(p.price)}</option>)}
                </select></label>
                <label>Membership Start<input type="date" value={memberForm.membership_start}
                  onChange={e => setMemberForm({ ...memberForm, membership_start: e.target.value })} /></label>
                <label>Membership End<input type="date" value={memberForm.membership_end}
                  onChange={e => setMemberForm({ ...memberForm, membership_end: e.target.value })} /></label>
                <div className="form-actions"><button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Member'}</button>
                  <button className="secondary-btn" type="button" onClick={() => setShowMember(false)}>Cancel</button></div>
              </form>
            </div>
          </section>
        )}

        {tab === 'Dashboard' && !showMember && (
          <section className="content dashboard-content">
            <div className="hero-banner">
              <div className="hero-text"><span className="eyebrow">YOUR FITNESS BUSINESS, IN FOCUS</span>
                <h2>Welcome back, {profile?.full_name || 'Vansh'}!</h2>
                <p>Here's what's happening at {gym?.name || 'your gym'} today.</p></div>
              <div className="hero-date"><CalendarDays size={15} />{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              <div className="hero-art"><Dumbbell /></div>
            </div>

            <div className="stats-grid">
              <Stat icon={Users} tone="purple" label="Total Members" value={members.length} note="All registered members" />
              <Stat icon={Activity} tone="green" label="Active Members" value={activeMembers} note="Currently active" />
              <Stat icon={Wallet} tone="orange" label="This Month's Revenue" value={money(monthlyRevenue)} note="Paid payments this month" />
              <Stat icon={CalendarCheck} tone="blue" label="Today's Attendance" value={presentToday} note="Members marked present" />
            </div>

            <div className="middle-grid">
              <div className="panel recent-panel">
                <div className="panel-head"><div><span className="eyebrow">YOUR COMMUNITY</span><h3>Recent Members</h3></div>
                  <button className="text-btn" onClick={() => setTab('Members')}>View all <ArrowUpRight size={15} /></button></div>
                <MemberTable rows={members.slice(0, 5)} onDelete={deleteMember} compact />
              </div>
              <div className="feature-card">
                <div className="feature-glow" /><div className="feature-icon"><Dumbbell size={47} /></div>
                <span className="eyebrow">MADE FOR GYM OWNERS</span><h3>Built for your gym</h3>
                <p>Track members, manage plans and grow your fitness business.</p>
                <button onClick={() => setShowMember(true)}>Add Member <Plus size={16} /></button>
              </div>
            </div>

            <div className="bottom-grid">
              <div className="panel quick-panel"><div className="panel-head"><div><span className="eyebrow">SHORTCUTS</span><h3>Quick Actions</h3></div></div>
                <div className="quick-actions">
                  <button className="quick-purple" onClick={() => setShowMember(true)}><Users /><span>Add a Member</span><Plus size={15} /></button>
                  <button className="quick-blue" onClick={() => setTab('Attendance')}><CalendarCheck /><span>Mark Attendance</span><ArrowUpRight size={15} /></button>
                  <button className="quick-green" onClick={() => setTab('Payments')}><Wallet /><span>View Payments</span><ArrowUpRight size={15} /></button>
                </div>
              </div>
              <div className="panel chart-panel"><div className="panel-head"><div><span className="eyebrow">REVENUE OVERVIEW</span><h3>Your Gym at a Glance</h3></div>
                  <span className="chart-tooltip">{shortMoney(monthlyRevenue)} <small>This Month</small></span></div>
                <div className="chart-area">
                  <div className="chart-bars">{revenueMonths.map(m => <div className="chart-column" key={m.key}>
                    <div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(m.value ? 8 : 3, (m.value / maxRevenue) * 100)}%` }} /></div>
                    <span>{m.label}</span></div>)}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'Members' && !showMember && <section className="content">
          <div className="page-actions"><div><span className="eyebrow">YOUR COMMUNITY</span><h2>Members</h2><p className="muted">Manage your gym's member records.</p></div>
            <button className="primary-btn" onClick={() => setShowMember(true)}><Plus size={17} /> Add member</button></div>
          <div className="panel"><div className="table-toolbar"><div className="searchbox"><Search size={17} />
            <input placeholder="Search name or phone…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <span className="muted">{filteredMembers.length} members</span></div>
            <MemberTable rows={filteredMembers} onDelete={deleteMember} /></div>
        </section>}

        {tab === 'Payments' && <section className="content">
          <div className="page-actions"><div><span className="eyebrow">TRANSACTIONS</span><h2>Payments</h2><p className="muted">Payment records for your gym.</p></div></div>
          <div className="stats-grid"><Stat icon={Wallet} tone="purple" label="Total Recorded" value={money(payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0))} note="All-time paid payments" />
            <Stat icon={TrendingUp} tone="green" label="This Month" value={money(monthlyRevenue)} note="Paid this month" /></div>
          <div className="panel"><div className="panel-head"><h3>Payment History</h3></div>
            {payments.length === 0 ? <Empty text="No payments recorded yet. Payment entry will be added in the next build step." /> :
              <div className="table-wrap"><table><thead><tr><th>Date</th><th>Member ID</th><th>Amount</th><t
