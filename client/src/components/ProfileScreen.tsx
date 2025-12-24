import React from 'react';

type UserStats = {
  gamesPlayed?: number;
  gamesWon?: number;
  totalScore?: number;
  winRate?: number;
  favoriteElement?: string;
};

type UserProfile = {
  id?: string;
  name?: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  provider?: string;
  createdAt?: string;
  stats?: UserStats;
};

interface ProfileScreenProps {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  onBack: () => void;
}

export function ProfileScreen({
  profile,
  isLoading,
  error,
  onRetry,
  onBack
}: ProfileScreenProps) {
  return (
    <div className="drawify-login-screen" style={{ zIndex: 3000, position: 'fixed', inset: 0 }}>
      <div className="login-background"></div>

      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          margin: '40px auto',
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '28px 32px',
          boxShadow: '0 20px 80px rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(10px)',
          color: '#e2e8f0'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Profile</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onRetry}
              style={{
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              Refresh
            </button>
            <button
              onClick={onBack}
              style={{
                padding: '8px 14px',
                background: '#22c55e',
                color: '#0f172a',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Back
            </button>
          </div>
        </div>

        {isLoading && (
          <div style={{ fontSize: '16px', opacity: 0.85 }}>Loading profile...</div>
        )}

        {error && !isLoading && (
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              color: '#fecdd3',
              marginBottom: '16px'
            }}
          >
            {error}
          </div>
        )}

        {profile && !isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '22px',
                  color: '#cbd5e1'
                }}
              >
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (profile.nickname || profile.name || '?').substring(0, 1).toUpperCase()
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>
                  {profile.nickname || profile.name || 'Player'}
                </div>
                <div style={{ opacity: 0.8, fontSize: '14px' }}>
                  {profile.email || 'No email'} · {profile.provider || 'unknown'}
                </div>
                {profile.createdAt && (
                  <div style={{ opacity: 0.7, fontSize: '13px' }}>
                    Joined: {new Date(profile.createdAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px'
              }}
            >
              <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>Account</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <InfoRow label="Username" value={profile.name} />
                <InfoRow label="Nickname" value={profile.nickname} />
                <InfoRow label="Email" value={profile.email} />
                <InfoRow label="Provider" value={profile.provider} />
              </div>
            </div>

            <div
              style={{
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px'
              }}
            >
              <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>Statistics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <StatBox label="Games played" value={profile.stats?.gamesPlayed ?? 0} />
                <StatBox label="Games won" value={profile.stats?.gamesWon ?? 0} />
                <StatBox
                  label="Win rate"
                  value={
                    profile.stats?.winRate !== undefined
                      ? `${Math.round(profile.stats.winRate * 100)}%`
                      : '0%'
                  }
                />
                <StatBox label="Total score" value={profile.stats?.totalScore ?? 0} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '10px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '10px'
      }}
    >
      <span style={{ opacity: 0.7, fontSize: '12px' }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '14px' }}>{value || '-'}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}
    >
      <div style={{ opacity: 0.7, fontSize: '12px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700 }}>{value}</div>
    </div>
  );
}