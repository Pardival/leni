import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size: number, p: P) => ({
  viewBox: "0 0 24 24",
  width: size,
  height: size,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const IconMic = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const IconNotes = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><path d="M5 4h11l3 3v13H5z" /><path d="M8 10h8M8 14h8M8 18h5" /></svg>
);
export const IconExplore = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="8" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.2 7.2l7.4 0.6M7.5 8l3.2 8M16.6 10.2l-3.4 5.8" /></svg>
);
export const IconUser = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></svg>
);
export const IconBack = ({ size = 20, ...p }: P) => <svg {...base(size, p)}><path d="M15 6l-6 6 6 6" /></svg>;
export const IconChevron = ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M9 6l6 6-6 6" /></svg>;
export const IconStar = ({ size = 18, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 17l-5 3 1-5.5L4 10l5.5-.5L12 4l2.5 5.5L20 10l-4 4.5 1 5.5z" /></svg>
);
export const IconMore = ({ size = 18, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
);
export const IconEdit = ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M4 20h4l10-10-4-4L4 16z" /></svg>;
export const IconArchive = ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M4 12v8h16v-8M12 3v13M8 7l4-4 4 4" /></svg>;
export const IconRefresh = ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M21 12a9 9 0 1 1-6.2-8.6M21 3v6h-6" /></svg>;
export const IconTrash = ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M4 7h16M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const IconClose = ({ size = 20, ...p }: P) => <svg {...base(size, p)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const IconKeyboard = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></svg>
);
export const IconCheck = ({ size = 14, ...p }: P) => <svg {...base(size, { strokeWidth: 2.5, ...p })}><path d="M5 12l4 4L19 6" /></svg>;
export const IconFlame = ({ size = 16, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3 .3 1.2 1 2 2 2.5C12 8 11 5 12 3z" /></svg>
);
export const IconSearch = ({ size = 18, ...p }: P) => <svg {...base(size, p)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>;
export const IconMap = ({ size = 16, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const IconCalendar = ({ size = 16, ...p }: P) => (
  <svg {...base(size, p)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const IconPhone = ({ size = 20, ...p }: P) => <svg {...base(size, p)}><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></svg>;
export const IconTag = ({ size = 20, ...p }: P) => <svg {...base(size, p)}><path d="M3 12V4h8l9 9-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></svg>;
export const IconGlobe = ({ size = 20, ...p }: P) => <svg {...base(size, p)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;

/* Types de note */
export const IconIdea = ({ size = 18, ...p }: P) => (
  <svg {...base(size, p)}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5V16h8v-2.5A6 6 0 0 0 12 3z" /></svg>
);
export const IconTask = ({ size = 18, ...p }: P) => <svg {...base(size, { strokeWidth: 2.2, ...p })}><path d="M5 12l4 4L19 6" /></svg>;
export const IconReflection = ({ size = 18, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></svg>
);
export const IconJournal = ({ size = 18, ...p }: P) => (
  <svg {...base(size, p)}><path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z" /><path d="M9 3v18M13 8h3" /></svg>
);
export const IconReference = ({ size = 18, ...p }: P) => (
  <svg {...base(size, p)}><path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1" /><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1" /></svg>
);
export const IconNote = ({ size = 18, ...p }: P) => <svg {...base(size, p)}><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>;

/* Thèmes système */
export const IconHeart = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" /></svg>
);
export const IconBriefcase = ({ size = 20, ...p }: P) => <svg {...base(size, p)}><path d="M4 7h16v13H4zM4 7l2-3h12l2 3M10 12h4" /></svg>;
export const IconPeople = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M15 20c0-2.5 1.5-4.5 4-4.5s3 2 3 4.5" /></svg>
);
export const IconHome = ({ size = 20, ...p }: P) => <svg {...base(size, p)}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
export const IconCoins = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></svg>
);
export const IconSprout = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><path d="M12 21v-8M12 13c-4 0-7-3-7-7 4 0 7 3 7 7zM12 13c4 0 7-3 7-7-4 0-7 3-7 7z" /></svg>
);
export const IconBook = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2zM20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" /></svg>
);
export const IconPaw = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}><circle cx="7" cy="9" r="1.8" /><circle cx="12" cy="6" r="1.8" /><circle cx="17" cy="9" r="1.8" /><path d="M12 11c3 0 5.5 2.5 5.5 5.5A2.5 2.5 0 0 1 15 19c-1 0-2-.5-3-.5s-2 .5-3 .5a2.5 2.5 0 0 1-2.5-2.5C6.5 13.5 9 11 12 11z" /></svg>
);
export const IconFolder = ({ size = 20, ...p }: P) => <svg {...base(size, p)}><path d="M3 6h6l2 2h10v11H3z" /></svg>;
