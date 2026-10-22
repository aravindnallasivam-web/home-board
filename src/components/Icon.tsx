const PATHS: Record<string, string> = {
  home: 'M3 11l9-7 9 7M5 10v10h14V10',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  menu: 'M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M18 3c-2 2-3 4.5-3 7.5h3V21',
  alarm: 'M12 6a7 7 0 1 0 0 14a7 7 0 1 0 0-14M12 10v3l2 2M5 4L3 6M19 4l2 2',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  settings:
    'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  edit: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  photo: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 8.5h.01',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
  auto: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 3v18',
  cloud: 'M7 19h10a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5 2A3.5 3.5 0 0 0 7 19z',
  cloudSun:
    'M9 5.5a3.5 3.5 0 1 0 0 7M9 1.5V3M2.5 9H4M4.4 4.4l1 1M13.6 4.4l-1 1M8 20h9a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.3 3.3 0 0 0 8 20z',
  rain: 'M7 15h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.8A3.2 3.2 0 0 0 7 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3',
  storm: 'M7 15h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.8A3.2 3.2 0 0 0 7 15zM13 16l-3 4h4l-2 3',
  fog: 'M4 10h16M6 14h12M8 18h8M7 6h10',
  snow: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
  calendar: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4',
  hourglass: 'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9',
  cart: 'M5 8h14l-1.5 12h-11zM9 8a3 3 0 0 1 6 0',
  note: 'M5 3h14v12l-6 6H5zM13 21v-6h6',
  list: 'M4 12l4 4 8-9M14 19h6',
  clock: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17.5 14v7M14 17.5h7',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 7a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5',
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = '1.5rem',
  stroke = 2,
  fill = 'none',
  className,
}: {
  name: IconName | string;
  size?: string;
  stroke?: number;
  fill?: string;
  className?: string;
}) {
  const d = PATHS[name] ?? PATHS.star;
  const isGrip = name === 'grip';
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={isGrip ? 3.5 : stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: 'none' }}
    >
      <path d={d} />
    </svg>
  );
}
