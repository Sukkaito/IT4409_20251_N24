import React from 'react';

type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  nickname: string;
  avatar?: string;
  provider?: string;
  createdAt?: string;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  winRate: string;
};

interface LeaderboardScreenProps {
  entries: LeaderboardEntry[];
  isLoading: boolean;
  error: string;
  onRetry: () => void;
  onBack: () => void;
}

export function LeaderboardScreen({
  entries,
  isLoading,
  error,
  onRetry,
  onBack
}: LeaderboardScreenProps) {
  return (
    <div className="drawify-login-screen" style={{ zIndex: 3000, position: 'fixed', inset: 0 }}>
      <div className="login-background"></div>

      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          margin: '40px auto',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '18px',
          padding: '24px 28px',
          boxShadow: '0 20px 80px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)',
          color: '#e2e8f0'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px'
          }}
        >
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Leaderboard</h2>
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
          <div style={{ fontSize: '16px', opacity: 0.85 }}>Loading leaderboard...</div>
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

        {!isLoading && entries.length === 0 && !error && (
          <div style={{ opacity: 0.8, fontSize: '14px' }}>No leaderboard data yet.</div>
        )}

        {!isLoading && entries.length > 0 && (
          <div
            style={{
              marginTop: '4px',
              maxHeight: '420px',
              overflowY: 'auto',
              borderRadius: '12px',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'rgba(15, 23, 42, 0.7)'
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Player</th>
                  <th style={thStyle}>Games</th>
                  <th style={thStyle}>Wins</th>
                  <th style={thStyle}>Win rate</th>
                  <th style={thStyle}>Total score</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderTop: '1px solid rgba(148, 163, 184, 0.25)',
                      background:
                        entry.rank === 1
                          ? 'linear-gradient(90deg, rgba(250, 204, 21, 0.12), transparent)'
                          : entry.rank === 2
                          ? 'linear-gradient(90deg, rgba(148, 163, 184, 0.12), transparent)'
                          : entry.rank === 3
                          ? 'linear-gradient(90deg, rgba(244, 114, 182, 0.12), transparent)'
                          : 'transparent'
                    }}
                  >
                    <td style={tdStyle}>{entry.rank}</td>
                    <td style={{ ...tdStyle, textAlign: 'left' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '999px',
                            overflow: 'hidden',
                            background: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(148, 163, 184, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 600
                          }}
                        >
                          {entry.avatar ? (
                            <img
                              src={entry.avatar}
                              alt={entry.nickname}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            entry.nickname.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600 }}>{entry.nickname}</span>
                          <span style={{ fontSize: '12px', opacity: 0.7 }}>
                            {entry.provider || 'local'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>{entry.gamesPlayed}</td>
                    <td style={tdStyle}>{entry.gamesWon}</td>
                    <td style={tdStyle}>{entry.winRate}%</td>
                    <td style={tdStyle}>{entry.totalScore}</td>
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

const thStyle: React.CSSProperties = {
  padding: '10px 8px',
  textAlign: 'center',
  fontWeight: 600,
  fontSize: '13px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: '#e5e7eb',
  borderBottom: '1px solid rgba(148, 163, 184, 0.4)',
  position: 'sticky',
  top: 0,
  background: 'rgba(15, 23, 42, 0.98)'
};

const tdStyle: React.CSSProperties = {
  padding: '8px 8px',
  textAlign: 'center',
  fontSize: '13px'
};


