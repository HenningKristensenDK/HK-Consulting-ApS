const P: Record<string, React.ReactNode> = {
  highlight: (
    <>
      <path d="M14.5 4.5l5 5L11 18H6v-5z" />
      <path d="M4 21h16" strokeWidth="3" stroke="#FFE14D" />
    </>
  ),
  arrow: (
    <>
      <circle cx="6.5" cy="17.5" r="3.5" />
      <path d="M9.5 14.5L19 5M12.5 5H19v6.5" />
    </>
  ),
  pen: <path d="M4 18c3-1 4-6 7-6s2 5 5 5 3-5 4-7" />,
  line: <path d="M5 19L19 5" />,
  undo: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 010 12h-3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
};

export function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </svg>
  );
}
