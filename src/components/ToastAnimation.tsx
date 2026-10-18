import { useId } from 'react';

export function ToastAnimation() {
  const slotId = useId();
  return <svg className="scan-toast" viewBox="0 0 160 160" aria-hidden="true" focusable="false">
    <defs><clipPath id={slotId}><rect x="20" y="0" width="120" height="90" /></clipPath></defs>
    <ellipse cx="80" cy="148" rx="58" ry="5" fill="#000" opacity=".12" />
    <g className="scan-toast__steam" fill="none" stroke="#a8c9bd" strokeWidth="3" strokeLinecap="round"><path d="M57 24c-9-9 8-13 0-22" /><path d="M80 20c-9-9 8-13 0-22" /><path d="M103 24c-9-9 8-13 0-22" /></g>
    <rect x="26" y="86" width="108" height="13" rx="6.5" fill="#263c33" />
    <g clipPath={`url(#${slotId})`}><g className="scan-toast__bread">
      <path d="M49 98V62C30 51 43 27 62 31c6-14 31-14 37 0 20-4 31 20 12 31v36q0 6-7 6H56q-7 0-7-6Z" fill="#f6dfb2" stroke="#bb8c53" strokeWidth="4" />
      <path d="M57 94V58c-14-5-6-20 8-17 10-14 21-14 31 0 15-3 22 12 7 17v36Z" fill="#fff0cd" />
      <g className="scan-toast__browning"><path d="M49 98V62C30 51 43 27 62 31c6-14 31-14 37 0 20-4 31 20 12 31v36q0 6-7 6H56q-7 0-7-6Z" fill="#bd793e" stroke="#92542e" strokeWidth="4" /><path d="M57 94V58c-14-5-6-20 8-17 10-14 21-14 31 0 15-3 22 12 7 17v36Z" fill="#eeb86e" /><g fill="#cb8b45"><circle cx="66" cy="58" r="2" /><circle cx="87" cy="48" r="2.5" /><circle cx="95" cy="72" r="2" /><circle cx="71" cy="83" r="2.5" /><circle cx="81" cy="67" r="1.5" /></g></g>
    </g></g>
    <path d="M26 94q0-6 8-6h92q8 0 8 8v36q0 12-12 12H38q-12 0-12-12Z" fill="#83c6af" stroke="#35594b" strokeWidth="3" />
    <path d="M121 90q11 0 11 9v32q0 10-10 11h-7V90Z" fill="#65a78e" />
    <path d="M37 99v18" fill="none" stroke="#bee6d6" strokeWidth="5" strokeLinecap="round" />
    <path className="scan-toast__heat" d="M51 122c-6-7 6-8 0-15m13 15c-6-7 6-8 0-15m13 15c-6-7 6-8 0-15" fill="none" stroke="#f5e4b9" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="103" cy="122" r="10" fill="#f6eee0" stroke="#35594b" strokeWidth="2" /><path d="M103 115v5" stroke="#a47d2b" strokeWidth="2.5" strokeLinecap="round" />
    <g className="scan-toast__lever"><path d="M135 98h8" stroke="#35594b" strokeWidth="4" strokeLinecap="round" /><rect x="139" y="93" width="10" height="9" rx="3" fill="#e6c367" stroke="#766028" strokeWidth="2" /></g>
    <path d="M40 145v4m80-4v4" stroke="#35594b" strokeWidth="8" strokeLinecap="round" />
  </svg>;
}
