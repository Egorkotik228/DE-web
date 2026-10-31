import React from 'react';

interface TechIconProps {
  slug: string;
  className?: string;
  size?: number;
}

export const TechIcon: React.FC<TechIconProps> = ({ slug, className = 'w-5 h-5', size = 20 }) => {
  switch (slug) {
    case 'intro':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case 'sql':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
      );
    case 'python':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C6.48 2 6 4 6 6v2h6v1H4c-2 0-3 1-3 3.5S2 16 4 16h2v-2c0-1.5 1-2.5 2.5-2.5h7c1.5 0 2.5-1 2.5-2.5V6c0-2-2-4-6-4z" />
          <path d="M12 22c5.52 0 6-2 6-4v-2h-6v-1h8c2 0 3-1 3-3.5S22 8 20 8h-2v2c0 1.5-1 2.5-2.5 2.5h-7c-1.5 0-2.5 1-2.5 2.5V18c0 2 2 4 6 4z" />
        </svg>
      );
    case 'pandas':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
        </svg>
      );
    case 'postgresql':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10c0-4.4 3.6-8 8-8s8 3.6 8 8c0 3.3-2 6.2-5 7.4V22l-3-2-3 2v-4.6c-3-1.2-5-4.1-5-7.4z" />
          <circle cx="9" cy="9" r="1" fill="#60A5FA" />
          <circle cx="15" cy="9" r="1" fill="#60A5FA" />
        </svg>
      );
    case 'dwh':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'data-vault':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="12" cy="12" r="4" />
          <line x1="12" y1="8" x2="12" y2="10" />
          <line x1="12" y1="14" x2="12" y2="16" />
          <line x1="8" y1="12" x2="10" y2="12" />
          <line x1="14" y1="12" x2="16" y2="12" />
        </svg>
      );
    case 'linux-git':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#FB923C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="6" y1="3" x2="6" y2="15" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 9a9 9 0 0 1-9 9" />
        </svg>
      );
    case 'docker':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14h16c.8 0 1.5-.5 1.8-1.2.8-1.9.4-4.8-2.8-5.8-1-.3-2 .1-2.5.5C15.5 6 13.5 5 11 5c-3 0-5.5 1.5-6.5 4H4c-1.5 0-2 1-2 2s.5 3 2 3z" />
          <rect x="4" y="9" width="2" height="2" />
          <rect x="7" y="9" width="2" height="2" />
          <rect x="10" y="9" width="2" height="2" />
          <rect x="7" y="6" width="2" height="2" />
        </svg>
      );
    case 'airflow':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
        </svg>
      );
    case 'dbt':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 12 12 22 22 12" />
          <line x1="12" y1="6" x2="12" y2="18" />
          <line x1="6" y1="12" x2="18" y2="12" />
        </svg>
      );
    case 'formats-s3':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case 'hadoop':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12c0-2 2-4 4-4s4 2 4 4-2 4-4 4" />
          <circle cx="12" cy="12" r="1" fill="#EAB308" />
        </svg>
      );
    case 'spark':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.5-3.2.7 1.5 1.5 2.7 3 3.2z" />
        </svg>
      );
    case 'clickhouse':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="8" width="3" height="8" fill="#FBBF24" />
          <rect x="7" y="5" width="3" height="14" fill="#FBBF24" />
          <rect x="12" y="2" width="3" height="20" fill="#FBBF24" />
          <rect x="17" y="6" width="3" height="12" fill="#FBBF24" />
        </svg>
      );
    case 'kafka':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      );
    case 'system-design':
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="6" height="6" rx="1" />
          <rect x="16" y="3" width="6" height="6" rx="1" />
          <rect x="9" y="15" width="6" height="6" rx="1" />
          <path d="M5 9v3a2 2 0 0 0 2 2h5" />
          <path d="M19 9v3a2 2 0 0 1-2 2h-5" />
          <line x1="12" y1="14" x2="12" y2="15" />
        </svg>
      );
  }
};
