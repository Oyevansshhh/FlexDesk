import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, Users, Wallet, CalendarCheck, LayoutDashboard, LogOut,
  Plus, Search, Dumbbell, Menu, X, RefreshCw, AlertCircle, CheckCircle2
} from 'lucide-react';
import { supabase } from './supabase';

const money = n => new Intl.NumberFormat('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0}).format(Number(n || 0));
const today = new Date().toISOString().slice(0,10);

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
  const [memberForm, setMemberForm] = useState({full_name:'', phone:'', email:'', plan_id:'', membership_start:today, membership_end:''});
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({data}) => {
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
        const {data, error} = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, gym_name: gymName } }
        });
        if (error) throw error;
        if (!data.session) setNotice('Account created. Check your email to confirm your account, then log in.');
        else setNotice('Account created successfully.');
      } else {
        const {error} = await supabase.auth.signInWithPassword({email, password});
        if (error) throw error;
      }
    } catch (e) { setError(e.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  async function loadData() {
    setBusy(true); setError('');
    try {
      const uid = session.user.id;
      const {data: p, error: pe} = await supabase.from('profiles').select('*').eq('id', uid).single();
      if (pe) throw pe;
      setProfile(p);
      const {data: g, error: ge} = await supabase.from('gyms').select('*').eq('id', p.gym_id).single();
      if (ge) throw ge;
      setGym(g);
      const results = await Promise.all([
        supabase.from('members').select('*').eq('gym_id', p.gym_id).order('created_at', {ascending:false}),
        supabase.from('payments').select('*').eq('gym_id', p.gym_id).order('payment_date', {ascending:false}),
        supabase.from('attendance').select('*').eq('gym_id', p.gym_id).eq('attendance_date', today),
        supabase.from('membership_plans').select('*').eq('gym_id', p.gym_id).order('created_at'),
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
        membership_start: memberForm.membership_start || null,
        membership_end: memberForm.membership_end || null,
        created_by: session.user.id
      };
      const {error} = await supabase.from('members').insert(payload);
      if (error) throw error;
      setShowMember(false);
      setMemberForm({full_name:'', phone:'', email:'', plan_id:'', membership_start:today, membership_end:''});
      setNotice('Member added successfully.');
      await loadData();
    } catch (e) { setError(e.message || 'Could not add member.'); }
    finally { setBusy(false); }
  }

  async function deleteMember(id) {
    if (!window.confirm('Delete this member? Related payment or attendance records may prevent deletion.')) return;
    setBusy(true); setError('');
    const {error} = await supabase.from('members').delete().eq('id', id);
    if (error) setError(error.message);
    else { setNotice('Member deleted.'); await loadData(); }
    setBusy(false);
  }

  async function markAttendance(memberId, status='present') {
    setError(''); setNotice('');
    const {error} = await supabase.from('attendance').upsert(
      {gym_id:profile.gym_id, member_id:memberId, attendance_date:today, status},
      {onConflict:'gym_id,member_id,attendance_date'}
    );
    if (error) setError(error.message);
    else { setNotice('Attendance updated.'); await loadData(); }
  }

  async function signOut() { await supabase.auth.signOut(); setProfile(null); setGym(null); }

  const activeMembers = members.filter(m => m.status === 'active' && (!m.membership_end || m.membership_end >= today)).length;
  const month = today.slice(0,7);
  const monthlyRevenue = payments.filter(p => p.status === 'paid' && (p.payment_date || '').startsWith(month)).reduce((s,p)=>s+Number(p.amount||0),0);
  const filteredMembers = useMemo(() => members.filter(m => `${m.full_name} ${m.phone||''} ${m.email||''}`.toLowerCase().includes(search.toLowerCase())), [members, search]);

  if (!supabase) return <SetupScreen />;
  if (loading) return <div className="center-screen"><div className="loader"/><p>Loading FlexDesk…</p></div>;
  if (!session) return <AuthScreen {...{mode,setMode,email,setEmail,password,setPassword,fullName,setFullName,gymName,setGymName,authSubmit,busy,error,notice}} />;

  const nav = [
    ['Dashboard', LayoutDashboard], ['Members', Users], ['Payments', Wallet], ['Attendance', CalendarCheck], ['Plans', Activity]
  ];
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-mark"><Dumbbell size={21}/></div><div><b>FLEXDESK</b><small>GYM MANAGEMENT</small></div><button className="mobile-close" onClick={()=>setMobileNav(false)}><X/></button></div>
      <div className="gym-chip"><span className="online-dot"/><div><b>{gym?.name || 'Your Gym'}</b><small>{profile?.role || 'gym account'}</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(([label,Icon])=><button key={label} className={`nav-item ${tab===label?'active':''}`} onClick={()=>{setTab(label);setMobileNav(false);}}><Icon size={18}/>{label}</button>)}
      <div className="sidebar-bottom"><div className="help-card"><b>Need a hand?</b><span>Your gym, one simple workspace.</span></div><button className="nav-item logout" onClick={signOut}><LogOut size={18}/> Sign out</button><div className="byline">Made with care <b>by Vansh ✦</b></div></div>
    </aside>
    {mobileNav && <div className="scrim" onClick={()=>setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="menu-btn" onClick={()=>setMobileNav(true)}><Menu/></button><div><span className="eyebrow">WORKSPACE / {tab.toUpperCase()}</span><h1>{tab}</h1></div><div className="top-actions"><span className="today-pill">{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span><button className="icon-btn" onClick={loadData} title="Refresh"><RefreshCw size={17}/></button><div className="avatar">{(profile?.full_name || session.user.email || 'V').slice(0,1).toUpperCase()}</div></div></header>
      {error && <div className="alert error"><AlertCircle size={18}/>{error}<button onClick={()=>setError('')}>×</button></div>}
      {notice && <div className="alert success"><CheckCircle2 size={18}/>{notice}<button onClick={()=>setNotice('')}>×</button></div>}
      {tab==='Dashboard' && <section className="content">
        <div className="welcome-row"><div><p className="muted">OVERVIEW</p><h2>Welcome back, {profile?.full_name || 'there'}.</h2><p className="muted">Here’s what’s happening at {gym?.name || 'your gym'} today.</p></div><button className="primary-btn" onClick={()=>setShowMember(true)}><Plus size={17}/> Add member</button></div>
        <div className="stats-grid">
          <Stat icon={Users} label="Total members" value={members.length} note="All registered members"/>
          <Stat icon={Activity} label="Active members" value={activeMembers} note="Currently active"/>
          <Stat icon={Wallet} label="This month’s revenue" value={money(monthlyRevenue)} note="Recorded paid payments"/>
          <Stat icon={CalendarCheck} label="Today’s attendance" value={attendance.filter(a=>a.status==='present').length} note="Members marked present"/>
        </div>
        <div className="panel"><div className="panel-head"><div><h3>Recent members</h3><p className="muted">Latest people added to your gym</p></div><button className="text-btn" onClick={()=>setTab('Members')}>View all</button></div><MemberTable rows={members.slice(0,5)} onDelete={deleteMember}/></div>
        <div className="bottom-grid"><div className="panel"><h3>Quick actions</h3><div className="quick-actions"><button onClick={()=>setShowMember(true)}><Plus/>Add a member</button><button onClick={()=>setTab('Attendance')}><CalendarCheck/>Mark attendance</button><button onClick={()=>setTab('Payments')}><Wallet/>View payments</button></div></div><div className="panel tip-panel"><div className="tip-icon"><Dumbbell/></div><h3>Built for your gym</h3><p className="muted">Keep member records, membership dates and daily attendance organised in one place.</p></div></div>
      </section>}
      {tab==='Members' && <section className="content"><div className="page-actions"><div><h2>Members</h2><p className="muted">Manage your gym’s member records.</p></div><button className="primary-btn" onClick={()=>setShowMember(true)}><Plus size={17}/> Add member</button></div><div className="panel"><div className="table-toolbar"><div className="searchbox"><Search size={17}/><input placeholder="Search name or phone…" value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="muted">{filteredMembers.length} members</span></div><MemberTable rows={filteredMembers} onDelete={deleteMember}/></div></section>}
      {tab==='Payments' && <section className="content"><div className="page-actions"><div><h2>Payments</h2><p className="muted">Payment records for your gym.</p></div></div><div className="stats-grid"><Stat icon={Wallet} label="Total recorded" value={money(payments.filter(p=>p.status==='paid').reduce((s,p)=>s+Number(p.amount),0))} note="All-time paid payments"/><Stat icon={Activity} label="This month" value={money(monthlyRevenue)} note="Paid this month"/></div><div className="panel"><h3>Payment history</h3>{payments.length===0?<Empty text="No payments recorded yet. Payment entry will be added in the next build step."/>:<div className="table-wrap"><table><thead><tr><th>Date</th><th>Member ID</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>{payments.map(p=><tr key={p.id}><td>{p.payment_date}</td><td className="mono">{p.member_id.slice(0,8)}…</td><td>{money(p.amount)}</td><td>{p.payment_method}</td><td><span className="status">{p.status}</span></td></tr>)}</tbody></table></div>}</div></section>}
      {tab==='Attendance' && <section className="content"><div className="page-actions"><div><h2>Attendance</h2><p className="muted">Mark members present for {new Date().toLocaleDateString('en-IN')}.</p></div></div><div className="panel"><div className="table-wrap"><table><thead><tr><th>Member</th><th>Phone</th><th>Today</th><th>Action</th></tr></thead><tbody>{members.map(m=>{const a=attendance.find(x=>x.member_id===m.id);return <tr key={m.id}><td><b>{m.full_name}</b></td><td>{m.phone||'—'}</td><td><span className={`status ${a?.status==='present'?'green':''}`}>{a?.status||'Not marked'}</span></td><td><button className="small-btn" onClick={()=>markAttendance(m.id,'present')}>Present</button> <button className="small-btn ghost" onClick={()=>markAttendance(m.id,'absent')}>Absent</button></td></tr>})}</tbody></table></div>{members.length===0&&<Empty text="Add members first to take attendance."/>}</div></section>}
      {tab==='Plans' && <section className="content"><div className="page-actions"><div><h2>Membership plans</h2><p className="muted">Plans configured for your gym.</p></div></div><div className="panel">{plans.length===0?<Empty text="No membership plans yet. Plan creation will be enabled in the next build step."/>:<div className="plan-grid">{plans.map(p=><div className="plan-card" key={p.id}><span className="plan-tag">{p.duration_days} DAYS</span><h3>{p.name}</h3><strong>{money(p.price)}</strong></div>)}</div>}</div></section>}
      <footer className="mobile-byline">Made with care <b>by Vansh ✦</b></footer>
    </main>
    {showMember && <div className="modal-backdrop" onClick={()=>setShowMember(false)}><form className="modal" onSubmit={addMember} onClick={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">MEMBER MANAGEMENT</span><h2>Add new member</h2></div><button type="button" className="icon-btn" onClick={()=>setShowMember(false)}><X/></button></div><label>Full name<input required value={memberForm.full_name} onChange={e=>setMemberForm({...memberForm,full_name:e.target.value})} placeholder="Member's full name"/></label><div className="form-grid"><label>Phone<input value={memberForm.phone} onChange={e=>setMemberForm({...memberForm,phone:e.target.value})} placeholder="Phone number"/></label><label>Email<input type="email" value={memberForm.email} onChange={e=>setMemberForm({...memberForm,email:e.target.value})} placeholder="Email (optional)"/></label></div><label>Membership plan<select value={memberForm.plan_id} onChange={e=>setMemberForm({...memberForm,plan_id:e.target.value})}><option value="">No plan selected</option>{plans.map(p=><option key={p.id} value={p.id}>{p.name} — {money(p.price)}</option>)}</select></label><div className="form-grid"><label>Start date<input type="date" value={memberForm.membership_start} onChange={e=>setMemberForm({...memberForm,membership_start:e.target.value})}/></label><label>End date<input type="date" value={memberForm.membership_end} onChange={e=>setMemberForm({...memberForm,membership_end:e.target.value})}/></label></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowMember(false)}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?'Saving…':'Save member'}</button></div></form></div>}
  </div>;
}

function Stat({icon:Icon,label,value,note}) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><div className="stat-icon"><Icon size={19}/></div></div><strong>{value}</strong><small>{note}</small></div>; }
function Empty({text}) { return <div className="empty"><div className="empty-icon"><Activity/></div><p>{text}</p></div>; }
function MemberTable({rows,onDelete}) {
  if (!rows.length) return <Empty text="No members yet. Add your first gym member to get started."/>;
  return <div className="table-wrap"><table><thead><tr><th>Member</th><th>Phone</th><th>Joined</th><th>Membership end</th><th>Status</th><th></th></tr></thead><tbody>{rows.map(m=><tr key={m.id}><td><div className="member-cell"><div className="member-avatar">{m.full_name.slice(0,1).toUpperCase()}</div><b>{m.full_name}</b></div></td><td>{m.phone||'—'}</td><td>{m.join_date||'—'}</td><td>{m.membership_end||'—'}</td><td><span className={`status ${m.status==='active'?'green':''}`}>{m.status}</span></td><td><button className="delete-btn" onClick={()=>onDelete(m.id)}>Delete</button></td></tr>)}</tbody></table></div>;
}
function AuthScreen({mode,setMode,email,setEmail,password,setPassword,fullName,setFullName,gymName,setGymName,authSubmit,busy,error,notice}) {
  return <div className="auth-shell"><div className="auth-art"><div className="auth-brand"><div className="brand-mark"><Dumbbell/></div><b>FLEXDESK</b></div><div className="auth-copy"><span className="eyebrow">THE GYM OWNER'S WORKSPACE</span><h1>Run your gym.<br/><em>Not the paperwork.</em></h1><p>Members, memberships and daily attendance — organised in one place.</p><div className="auth-feature"><span>✦</span> A clearer view of your gym business</div></div><div className="auth-credit">Made with care <b>by Vansh ✦</b></div></div><div className="auth-form-side"><form className="auth-card" onSubmit={authSubmit}><span className="eyebrow">{mode==='login'?'WELCOME BACK':'GET STARTED'}</span><h2>{mode==='login'?'Sign in to FlexDesk':'Create your gym account'}</h2><p className="muted">{mode==='login'?'Enter your details to access your workspace.':'Start managing your gym with FlexDesk.'}</p>{mode==='signup'&&<><label>Your name<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full name"/></label><label>Gym name<input required value={gymName} onChange={e=>setGymName(e.target.value)} placeholder="e.g. Iron House Fitness"/></label></>}<label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required minLength="6" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label>{error&&<div className="form-error">{error}</div>}{notice&&<div className="form-notice">{notice}</div>}<button className="primary-btn full" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}</button><p className="switch-auth">{mode==='login'?"New to FlexDesk?":"Already have an account?"} <button type="button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create account':'Sign in'}</button></p><div className="auth-foot">FLEXDESK <span>•</span> by Vansh</div></form></div></div>;
}
function SetupScreen() { return <div className="center-screen"><div className="auth-card"><div className="brand-mark"><Dumbbell/></div><h2>Connect FlexDesk to Supabase</h2><p className="muted">Create a <code>.env</code> file using the included <code>.env.example</code>, then add your Supabase Project URL and publishable key.</p></div></div>; }
