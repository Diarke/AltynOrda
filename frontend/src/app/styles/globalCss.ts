// Shared "Golden Horde Parchment" design-system CSS, injected via <style> by both
// the public site (App.tsx) and the admin dashboard (admin/AdminApp.tsx). Keep
// both in sync by editing this single source of truth rather than duplicating
// the block. Class names are kept stable across the dark->parchment redesign so
// call sites in App.tsx/admin didn't need to change, only what each class means.
export const GLOBAL_CSS = `
  html { scroll-behavior: smooth; }

  /* Every interactive element (buttons, links, cards, city/artifact markers,
     nav/sidebar items) should clearly read as clickable. */
  button:not(:disabled), [role="button"]:not([aria-disabled="true"]), a[href], select, .city-marker,
  .card-hover, .gold-hover, .quest-card, .nav-link, .tab-active, .tab-inactive,
  .admin-nav-link { cursor: pointer; }
  button:disabled, [aria-disabled="true"] { cursor: not-allowed; }

  .nav-link { outline: none; }
  .nav-link:focus-visible { outline: 2px solid #B8892B; outline-offset: 4px; border-radius: 4px; }

  @keyframes fade-in { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fade-in-fast { from{opacity:0} to{opacity:1} }
  @keyframes scale-in { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
  @keyframes slide-up { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slide-right { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes scroll-bounce { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY(8px);opacity:0.5} }
  @keyframes confetti-fall { 0%{transform:translateY(-40px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
  @keyframes type-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes drift-a { 0%{transform:translateX(0) translateY(0)} 100%{transform:translateX(-80px) translateY(-16px)} }
  @keyframes drift-b { 0%{transform:translateX(0) translateY(0)} 100%{transform:translateX(60px) translateY(-12px)} }
  @keyframes seal-glow { 0%,100%{box-shadow:0 0 0 0 rgba(184,137,43,0)} 50%{box-shadow:0 0 16px 2px rgba(184,137,43,0.28)} }
  @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }

  .orda-cinzel { font-family:'Cinzel',serif; }
  .orda-cormorant { font-family:'Cormorant Garamond',serif; }
  .orda-inter { font-family:'Inter',sans-serif; }

  /* Parchment surfaces — opaque paper panels, no blur/glassmorphism. */
  .glass, .glass-dark, .glass-gold, .parchment-panel {
    background:#F3E9D2;
    border:1px solid rgba(59,42,19,0.22);
    box-shadow:0 2px 10px rgba(59,42,19,0.12);
  }
  .glass-dark { background:#EADFC0; border-color:rgba(59,42,19,0.28); }

  .gold-hover { transition:box-shadow 0.2s ease, border-color 0.2s ease; }
  .gold-hover:hover { box-shadow:0 3px 14px rgba(59,42,19,0.16); border-color:rgba(184,137,43,0.45)!important; }
  .gold-glow-text { color:#B8892B; }
  .teal-glow { box-shadow:0 2px 10px rgba(107,140,163,0.3); }
  .teal-hover:not(:disabled) { transition:box-shadow 0.2s ease, transform 0.2s ease; }
  .teal-hover:not(:disabled):hover { box-shadow:0 3px 14px rgba(107,140,163,0.35); transform:translateY(-1px); }

  .animate-float { animation:float 7s ease-in-out infinite; }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  .animate-pulse-gold { animation:seal-glow 3s ease-in-out infinite; }
  .animate-fade-in { animation:fade-in 0.6s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-scale-in { animation:scale-in 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-slide-up { animation:slide-up 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-slide-right { animation:slide-right 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-scroll { animation:scroll-bounce 1.8s ease-in-out infinite; }
  .animate-grain { animation:none; }
  .animate-map-glow { animation:none; }
  .animate-border-spin { animation:none; border-color:rgba(184,137,43,0.3)!important; }

  .shimmer-text {
    color:#8C6239;
    background:none;
  }

  /* Static, hand-drawn caravan route lines — no flowing dash animation. */
  .route-path, .route-path-rev { stroke-dasharray:6 6; }

  .city-dot-pulse { animation:none; }

  .card-hover { transition:transform 0.25s cubic-bezier(0.22,1,0.36,1),box-shadow 0.25s ease; }
  .card-hover:hover { transform:translateY(-4px); box-shadow:0 8px 20px rgba(59,42,19,0.16); }

  .view-enter { animation:fade-in 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
  .view-enter-fast { animation:fade-in-fast 0.3s ease forwards; }

  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(140,98,57,0.35);border-radius:3px; }

  .ai-bubble { animation:slide-up 0.3s cubic-bezier(0.22,1,0.36,1) forwards; }

  .particle-rise { animation:none; display:none; }

  .cloud-a { animation:drift-a 60s linear infinite alternate; }
  .cloud-b { animation:drift-b 80s linear infinite alternate; }

  .progress-bar-fill { transition:width 1s cubic-bezier(0.22,1,0.36,1); }

  /* Buttons — carved bronze/gold plate, parchment seal aesthetic. */
  .btn-primary {
    background:linear-gradient(180deg,#C9A24A,#B8892B 55%,#8C6239);
    color:#2E2013;font-family:'Cinzel',serif;font-weight:600;
    border:1px solid rgba(59,42,19,0.35);border-radius:6px;padding:14px 32px;
    cursor:pointer;letter-spacing:0.06em;
    transition:transform 0.15s ease, box-shadow 0.15s ease;
    box-shadow:0 3px 0 rgba(59,42,19,0.35), 0 6px 14px rgba(59,42,19,0.22), inset 0 1px 0 rgba(255,251,235,0.4);
  }
  .btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 0 rgba(59,42,19,0.35), 0 8px 18px rgba(59,42,19,0.26), inset 0 1px 0 rgba(255,251,235,0.45); }
  .btn-primary:active { transform:translateY(1px); box-shadow:0 1px 0 rgba(59,42,19,0.35), 0 2px 6px rgba(59,42,19,0.2); }

  .btn-ghost {
    background:rgba(243,233,210,0.6);color:#2E2013;font-family:'Cinzel',serif;font-weight:600;
    border:1px solid rgba(59,42,19,0.35);border-radius:6px;padding:14px 32px;
    cursor:pointer;letter-spacing:0.06em;
    transition:all 0.2s ease;
  }
  .btn-ghost:hover { border-color:#B8892B;color:#8C6239;background:rgba(184,137,43,0.08); }

  .btn-teal {
    background:linear-gradient(180deg,#82A5B8,#6B8CA3 55%,#4F7086);
    color:#F3E9D2;font-family:'Inter',sans-serif;font-weight:600;
    border:1px solid rgba(59,42,19,0.3);border-radius:6px;padding:10px 22px;
    cursor:pointer;letter-spacing:0.02em;
    transition:transform 0.15s ease, box-shadow 0.15s ease;
    box-shadow:0 2px 0 rgba(59,42,19,0.3), 0 4px 10px rgba(59,42,19,0.18);
  }
  .btn-teal:hover { transform:translateY(-1px); box-shadow:0 3px 0 rgba(59,42,19,0.3), 0 6px 14px rgba(59,42,19,0.2); }

  .input-field {
    background:#F6EFDC;border:1px solid rgba(59,42,19,0.25);
    border-radius:6px;padding:14px 18px;color:#2E2013;font-family:'Inter',sans-serif;
    width:100%;outline:none;transition:border-color 0.2s ease;
  }
  .input-field:focus { border-color:rgba(184,137,43,0.6);box-shadow:0 0 0 3px rgba(184,137,43,0.12); }
  .input-field::placeholder { color:#8A7C63; }

  .badge-gold { background:rgba(184,137,43,0.14);color:#8C6239;border:1px solid rgba(184,137,43,0.4);border-radius:4px;padding:3px 10px;font-size:11px;font-family:'Cinzel',serif;letter-spacing:0.08em; }
  .badge-teal { background:rgba(107,140,163,0.14);color:#4F7086;border:1px solid rgba(107,140,163,0.35);border-radius:4px;padding:3px 10px;font-size:11px;font-family:'Inter',sans-serif; }
  .badge-green { background:rgba(124,139,90,0.14);color:#5E6B45;border:1px solid rgba(124,139,90,0.35);border-radius:4px;padding:3px 10px;font-size:11px; }

  .tab-active { border-bottom:2px solid #B8892B;color:#8C6239; }
  .tab-inactive { border-bottom:2px solid transparent;color:#5C4E38; }
  .tab-inactive:hover { color:#2E2013;border-bottom-color:rgba(184,137,43,0.4); }

  .quest-card { transition:transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s ease; }
  .quest-card:hover { transform:translateX(3px); box-shadow:0 4px 12px rgba(59,42,19,0.14); }

  .tooltip { position:relative; }
  .tooltip:hover::after { content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#2E2013;color:#F3E9D2;padding:6px 12px;border-radius:6px;font-size:12px;white-space:nowrap;border:1px solid rgba(59,42,19,0.4);pointer-events:none;z-index:100; }

  .certificate-frame { border:2px solid rgba(184,137,43,0.5);box-shadow:0 0 0 6px rgba(184,137,43,0.08), inset 0 0 0 1px rgba(59,42,19,0.15); }

  .map-territory { filter:none; }

  .notification-dot { width:8px;height:8px;background:#A23E2E;border-radius:50%;position:absolute;top:-2px;right:-2px;border:2px solid #EDE1C4; }

  .confetti-piece { animation: confetti-fall linear forwards; }

  /* Admin dashboard sidebar/nav — the rest of the admin UI reuses the shadcn/ui
     primitives in components/ui/*, which already inherit these same tokens via
     the CSS variables in styles/theme.css. */
  .admin-nav-link { transition:all 0.15s ease;border-radius:6px;color:#5C4E38; }
  .admin-nav-link:hover { background:rgba(59,42,19,0.06);color:#2E2013; }
  .admin-nav-link.active { background:rgba(184,137,43,0.14);color:#8C6239; }

  /* Paper-fiber texture utility, reusable on any panel/section (no raster assets). */
  .paper-texture {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3CfeColorMatrix type='matrix' values='0 0 0 0 0.24  0 0 0 0 0.16  0 0 0 0 0.08  0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
`;
