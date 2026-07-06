// Shared Dark Luxury design-system CSS, injected via <style> by both the public
// site (App.tsx) and the admin dashboard (admin/AdminApp.tsx). Keep both in sync
// by editing this single source of truth rather than duplicating the block.
export const GLOBAL_CSS = `
  html { scroll-behavior: smooth; }

  .nav-link { outline: none; }
  .nav-link:focus-visible { outline: 2px solid #D4AF37; outline-offset: 4px; border-radius: 4px; }

  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
  @keyframes pulse-gold { 0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,0)} 50%{box-shadow:0 0 28px 6px rgba(212,175,55,0.25)} }
  @keyframes pulse-ring { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(2.5);opacity:0} }
  @keyframes drift-a { 0%{transform:translateX(0) translateY(0)} 100%{transform:translateX(-120px) translateY(-30px)} }
  @keyframes drift-b { 0%{transform:translateX(0) translateY(0)} 100%{transform:translateX(90px) translateY(-20px)} }
  @keyframes route-dash { to{stroke-dashoffset:-800} }
  @keyframes fade-in { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fade-in-fast { from{opacity:0} to{opacity:1} }
  @keyframes scale-in { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  @keyframes slide-up { from{opacity:0;transform:translateY(36px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slide-right { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
  @keyframes scroll-bounce { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY(10px);opacity:0.4} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes confetti-fall { 0%{transform:translateY(-40px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
  @keyframes type-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes grain-move { 0%,100%{transform:translate(0,0)} 20%{transform:translate(-2%,-3%)} 40%{transform:translate(3%,2%)} 60%{transform:translate(-1%,4%)} 80%{transform:translate(2%,-2%)} }
  @keyframes map-glow { 0%,100%{filter:drop-shadow(0 0 4px rgba(212,175,55,0.4))} 50%{filter:drop-shadow(0 0 12px rgba(212,175,55,0.8))} }
  @keyframes particle-up { 0%{opacity:0;transform:translateY(0) scale(1)} 30%{opacity:1} 100%{opacity:0;transform:translateY(-120px) scale(0)} }
  @keyframes border-spin { 0%{border-color:rgba(212,175,55,0.2) rgba(212,175,55,0.05) rgba(212,175,55,0.05) rgba(212,175,55,0.05)} 25%{border-color:rgba(212,175,55,0.05) rgba(212,175,55,0.2) rgba(212,175,55,0.05) rgba(212,175,55,0.05)} 50%{border-color:rgba(212,175,55,0.05) rgba(212,175,55,0.05) rgba(212,175,55,0.2) rgba(212,175,55,0.05)} 75%{border-color:rgba(212,175,55,0.05) rgba(212,175,55,0.05) rgba(212,175,55,0.05) rgba(212,175,55,0.2)} }

  .orda-cinzel { font-family:'Cinzel',serif; }
  .orda-cormorant { font-family:'Cormorant Garamond',serif; }
  .orda-inter { font-family:'Inter',sans-serif; }

  .glass { background:rgba(34,38,47,0.65);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.07); }
  .glass-dark { background:rgba(15,17,21,0.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.06); }
  .glass-gold { background:rgba(212,175,55,0.05);backdrop-filter:blur(12px);border:1px solid rgba(212,175,55,0.15); }

  .gold-hover { transition:all 0.25s ease; }
  .gold-hover:hover { box-shadow:0 0 40px rgba(212,175,55,0.2),0 0 80px rgba(212,175,55,0.06);border-color:rgba(212,175,55,0.35)!important; }
  .gold-glow-text { text-shadow:0 0 30px rgba(212,175,55,0.6); }
  .teal-glow { box-shadow:0 0 24px rgba(87,214,209,0.35); }

  .animate-float { animation:float 7s ease-in-out infinite; }
  .animate-pulse-gold { animation:pulse-gold 2.5s ease-in-out infinite; }
  .animate-fade-in { animation:fade-in 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-scale-in { animation:scale-in 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-slide-up { animation:slide-up 0.65s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-slide-right { animation:slide-right 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
  .animate-scroll { animation:scroll-bounce 1.8s ease-in-out infinite; }
  .animate-grain { animation:grain-move 8s steps(1) infinite; }
  .animate-map-glow { animation:map-glow 3s ease-in-out infinite; }
  .animate-border-spin { animation:border-spin 4s linear infinite; }

  .shimmer-text {
    background:linear-gradient(90deg,#D4AF37 0%,#F6F4EC 45%,#D4AF37 55%,#C9962C 100%);
    background-size:200% auto;
    background-clip:text;-webkit-background-clip:text;color:transparent;
    animation:shimmer 4s linear infinite;
  }

  .route-path { stroke-dasharray:10 5;animation:route-dash 18s linear infinite; }
  .route-path-rev { stroke-dasharray:10 5;animation:route-dash 22s linear infinite reverse; }

  .city-dot-pulse { animation:map-glow 3s ease-in-out infinite; }

  .card-hover { transition:transform 0.3s cubic-bezier(0.22,1,0.36,1),box-shadow 0.3s ease; }
  .card-hover:hover { transform:translateY(-6px) scale(1.01); }

  .view-enter { animation:fade-in 0.6s cubic-bezier(0.22,1,0.36,1) forwards; }
  .view-enter-fast { animation:fade-in-fast 0.35s ease forwards; }

  ::-webkit-scrollbar { width:3px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(212,175,55,0.25);border-radius:2px; }

  .ai-bubble { animation:slide-up 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }

  .particle-rise { animation:particle-up linear forwards; }

  .cloud-a { animation:drift-a 60s linear infinite alternate; }
  .cloud-b { animation:drift-b 80s linear infinite alternate; }

  .progress-bar-fill { transition:width 1.2s cubic-bezier(0.22,1,0.36,1); }

  .btn-primary {
    background:linear-gradient(135deg,#D4AF37,#C9962C);
    color:#0F1115;font-family:'Cinzel',serif;font-weight:600;
    border:none;border-radius:12px;padding:14px 32px;
    cursor:pointer;letter-spacing:0.08em;
    transition:all 0.25s cubic-bezier(0.22,1,0.36,1);
    box-shadow:0 4px 24px rgba(212,175,55,0.25);
  }
  .btn-primary:hover { transform:translateY(-2px);box-shadow:0 8px 40px rgba(212,175,55,0.4); }
  .btn-primary:active { transform:translateY(0); }

  .btn-ghost {
    background:transparent;color:#F6F4EC;font-family:'Cinzel',serif;font-weight:600;
    border:1px solid rgba(246,244,236,0.2);border-radius:12px;padding:14px 32px;
    cursor:pointer;letter-spacing:0.08em;
    transition:all 0.25s cubic-bezier(0.22,1,0.36,1);
  }
  .btn-ghost:hover { border-color:rgba(212,175,55,0.5);color:#D4AF37;background:rgba(212,175,55,0.05); }

  .btn-teal {
    background:linear-gradient(135deg,#57D6D1,#3ABAB5);
    color:#0F1115;font-family:'Inter',sans-serif;font-weight:600;
    border:none;border-radius:10px;padding:10px 22px;
    cursor:pointer;letter-spacing:0.04em;
    transition:all 0.2s ease;
    box-shadow:0 4px 20px rgba(87,214,209,0.25);
  }
  .btn-teal:hover { transform:translateY(-2px);box-shadow:0 6px 32px rgba(87,214,209,0.4); }

  .input-field {
    background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
    border-radius:12px;padding:14px 18px;color:#F6F4EC;font-family:'Inter',sans-serif;
    width:100%;outline:none;transition:border-color 0.2s ease;
  }
  .input-field:focus { border-color:rgba(212,175,55,0.4);box-shadow:0 0 0 3px rgba(212,175,55,0.08); }
  .input-field::placeholder { color:#B7BAC3; }

  .badge-gold { background:rgba(212,175,55,0.12);color:#D4AF37;border:1px solid rgba(212,175,55,0.25);border-radius:6px;padding:3px 10px;font-size:11px;font-family:'Cinzel',serif;letter-spacing:0.1em; }
  .badge-teal { background:rgba(87,214,209,0.1);color:#57D6D1;border:1px solid rgba(87,214,209,0.2);border-radius:6px;padding:3px 10px;font-size:11px;font-family:'Inter',sans-serif; }
  .badge-green { background:rgba(111,207,151,0.1);color:#6FCF97;border:1px solid rgba(111,207,151,0.2);border-radius:6px;padding:3px 10px;font-size:11px; }

  .tab-active { border-bottom:2px solid #D4AF37;color:#D4AF37; }
  .tab-inactive { border-bottom:2px solid transparent;color:#B7BAC3; }
  .tab-inactive:hover { color:#F6F4EC;border-bottom-color:rgba(212,175,55,0.3); }

  .quest-card { transition:all 0.3s cubic-bezier(0.22,1,0.36,1); }
  .quest-card:hover { transform:translateX(4px); }

  .tooltip { position:relative; }
  .tooltip:hover::after { content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#22262F;color:#F6F4EC;padding:6px 12px;border-radius:8px;font-size:12px;white-space:nowrap;border:1px solid rgba(255,255,255,0.08);pointer-events:none;z-index:100; }

  .certificate-frame { box-shadow:0 0 60px rgba(212,175,55,0.15),inset 0 0 80px rgba(212,175,55,0.04);border:1px solid rgba(212,175,55,0.25); }

  .map-territory { filter:url(#parchment-filter); }

  .notification-dot { width:8px;height:8px;background:#57D6D1;border-radius:50%;position:absolute;top:-2px;right:-2px;border:2px solid #0F1115; }

  /* FIX: конфетти не анимировалось — класс существовал в JSX, но не был описан в CSS */
  .confetti-piece { animation: confetti-fall linear forwards; }

  /* Admin dashboard sidebar/nav — the rest of the admin UI reuses the shadcn/ui
     primitives in components/ui/*, which already inherit these same tokens via
     the CSS variables in styles/theme.css. */
  .admin-nav-link { transition:all 0.2s ease;border-radius:10px;color:#B7BAC3; }
  .admin-nav-link:hover { background:rgba(255,255,255,0.04);color:#F6F4EC; }
  .admin-nav-link.active { background:rgba(212,175,55,0.1);color:#D4AF37; }
`;
