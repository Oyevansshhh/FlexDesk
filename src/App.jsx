
import React from 'react';
import './App.css';
import {
  Activity,
  Users,
  Wallet,
  CalendarCheck,
  Dumbbell
} from 'lucide-react';

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Dumbbell size={22} />
          </div>
          <div>
            <b>FLEXDESK</b>
            <small>GYM MANAGEMENT</small>
          </div>
        </div>

        <div className="gym-chip">
          <span className="online-dot" />
          <div>
            <b>My Fitness Club</b>
            <small>Gym Dashboard</small>
          </div>
        </div>

        <p className="nav-label">MAIN MENU</p>
        <button className="nav-item active">
          <Activity size={18} /> Dashboard
        </button>
        <button className="nav-item">
          <Users size={18} /> Members
        </button>
        <button className="nav-item">
          <Wallet size={18} /> Payments
        </button>
        <button className="nav-item">
          <CalendarCheck size={18} /> Attendance
        </button>

        <div className="sidebar-bottom">
          <p className="byline">POWERED BY <b>FLEXDESK</b></p>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">OVERVIEW</p>
            <h1>Dashboard</h1>
          </div>
          <div className="top-actions">
            <span className="today-pill">Gym Management</span>
            <div className="avatar">F</div>
          </div>
        </header>

        <section className="content">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">WELCOME BACK</p>
              <h2>Welcome to FLEXDESK 👋</h2>
              <p className="muted">
                Your gym management dashboard
              </p>
            </div>
          </div>

          <div className="stats-grid">
            <Stat icon={<Users />} label="Total Members" value="--" />
            <Stat icon={<Wallet />} label="Total Revenue" value="₹--" />
            <Stat icon={<CalendarCheck />} label="Attendance" value="--" />
            <Stat icon={<Activity />} label="Active Plans" value="--" />
          </div>

          <div className="panel">
            <h3>Welcome to your gym workspace</h3>
            <p className="muted">
              Manage your gym members, membership plans,
              payments and attendance from one place.
            </p>
            <div className="quick-actions">
              <button> <Users size={16} /> Members</button>
              <button> <Wallet size={16} /> Payments</button>
              <button> <CalendarCheck size={16} /> Attendance</button>
            </div>
          </div>

          <div className="panel tip-panel">
            <div className="tip-icon">
              <Dumbbell size={20} />
            </div>
            <h3>Train smarter. Manage better.</h3>
            <p className="muted">
              FLEXDESK — Your gym, your control.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      <small>Gym overview</small>
    </div>
  );
}

export default App;

