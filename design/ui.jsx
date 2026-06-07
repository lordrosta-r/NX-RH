/* ui.jsx — primitives partagées NX-RH */
const { useState } = React;

/* ---------- Icônes (lignes simples) ---------- */
const Icon = {
  eye: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>),
  eyeOff: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3l18 18"/><path d="M10.6 10.6a3 3 0 0 0 4.2 4.2"/><path d="M9.9 4.6A9.7 9.7 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.3 4M6.3 6.3A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 3.7-.7"/></svg>),
  check: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12.5 10 17.5 19.5 6.5"/></svg>),
  arrowR: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>),
  arrowL: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>),
  chevR: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>),
  chevD: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6"/></svg>),
  lock: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>),
  shield: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3Z"/><path d="M9 12l2 2 4-4"/></svg>),
  doc: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>),
  clock: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>),
  target: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>),
  spark: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></svg>),
  grow: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17l6-6 4 4 7-7"/><path d="M14 7h6v6"/></svg>),
  book: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg>),
  user: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>),
  bell: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/></svg>),
  logout: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 17l5-5-5-5M20 12H9M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/></svg>),
  calendar: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>),
  org: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2"/></svg>),
  search: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>),
  grid: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>),
  users: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 20c0-2.2-.8-3.6-2-4.6"/></svg>),
  building: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="3" width="12" height="18" rx="1.5"/><path d="M16 8h4v13H4M8 7h0M12 7h0M8 11h0M12 11h0M8 15h0M12 15h0"/></svg>),
  mail: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>),
  gear: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>),
  flag: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>),
  compass: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>),
  chart: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/></svg>),
  layers: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></svg>),
  plus: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>),
  edit: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>),
  trash: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>),
  filter: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 5h18l-7 8v6l-4-2v-4z"/></svg>),
  download: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/></svg>),
  menu: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 6h16M4 12h16M4 18h16"/></svg>),
  pen: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 21s4-1 6-3l9-9-3-3-9 9c-2 2-3 6-3 6Z"/><path d="M14 6l3 3"/></svg>),
  comment: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z"/></svg>),
  dots: (p) => (<svg viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>),
};

function Logo({ small }) {
  return (
    <a className="nx-logo" href="#" onClick={(e)=>e.preventDefault()} aria-label="NanoXplore NX-RH, accueil">
      <span className="nx-mark" style={small ? {fontSize:22} : null}><span className="n">N</span><span className="x">X</span></span>
      <span className="nx-words"><b>NanoXplore</b><span>NX-RH · Entretiens</span></span>
    </a>
  );
}

/* ---------- Champs ---------- */
function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="field">
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {hint && <span className="hint">{hint}</span>}
      {children}
    </div>
  );
}

function PasswordInput({ id, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input id={id} className="input has-icon" type={show ? "text" : "password"} value={value}
        placeholder={placeholder} onChange={onChange} autoComplete="current-password" />
      <button type="button" className="input-icon-btn" onClick={()=>setShow(s=>!s)} aria-label={show?"Masquer le mot de passe":"Afficher le mot de passe"}>
        {show ? <Icon.eyeOff className="ico" style={{width:18,height:18}}/> : <Icon.eye className="ico" style={{width:18,height:18}}/>}
        <span>{show ? "Masquer" : "Afficher"}</span>
      </button>
    </div>
  );
}

function Checkbox({ checked, onChange, children, id }) {
  return (
    <label className="checkbox" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} />
      <span className="box"><Icon.check /></span>
      <span>{children}</span>
    </label>
  );
}

function Badge({ tone="grey", dot, children }) {
  return <span className={"badge " + tone}>{dot && <span className="dot"></span>}{children}</span>;
}

/* ---------- En-tête applicatif ---------- */
function AppHeader({ go, onLogout, user, role="collab", perspective="collab", setPerspective }) {
  const [open, setOpen] = useState(false);
  const persOptions = ({
    collab:  [{ id:"collab", label:"Mon espace", target:"dashboard" }],
    manager: [{ id:"collab", label:"Mon espace", target:"dashboard" }, { id:"manager", label:"Mon équipe", target:"equipe" }],
    rh:      [{ id:"collab", label:"Mon espace", target:"dashboard" }, { id:"rh", label:"Pilotage RH", target:"pilotage" }],
    admin:   [{ id:"collab", label:"Mon espace", target:"dashboard" }, { id:"admin", label:"Administration", target:"admin" }],
  })[role] || [];
  const roleLabel = { collab:"Collaborateur", manager:"Manager", rh:"RH", admin:"Admin" }[role];
  return (
    <header className="app-header">
      <div className="inner">
        <div className="header-service">
          <Logo />
        </div>
        {persOptions.length > 1 && (
          <div className="perspective-switch" role="tablist" aria-label="Changer d'espace">
            {persOptions.map(o => (
              <button key={o.id} role="tab" aria-selected={perspective===o.id} className={perspective===o.id?"on":""}
                onClick={()=>{ setPerspective && setPerspective(o.id); go(o.target); }}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        <div style={{position:"relative",display:"flex",alignItems:"center",gap:10}}>
          <button className="header-link" onClick={()=>go("organigramme")} title="Organigramme de l'entreprise">
            <Icon.org style={{width:18,height:18}}/>
            <span className="header-link-tx">Organigramme</span>
          </button>
          <div style={{position:"relative"}}>
          <button className="user-chip" onClick={()=>setOpen(o=>!o)} aria-expanded={open}>
            <span className="avatar">{user.initials}</span>
            <span style={{display:"flex",flexDirection:"column",lineHeight:1.15,textAlign:"left"}}>
              <b style={{fontSize:14}}>{user.name}</b>
              <span style={{fontSize:12,color:"var(--ink-3)"}}>{user.role}</span>
            </span>
            <Icon.chevD style={{width:16,height:16,color:"var(--ink-3)"}}/>
          </button>
          {open && (
            <div className="card" style={{position:"absolute",right:0,top:"calc(100% + 8px)",width:240,padding:8,boxShadow:"var(--shadow-lg)",zIndex:50}}>
              <div style={{padding:"8px 10px 10px"}}>
                <Badge tone="blue" dot>Connecté en {roleLabel}</Badge>
              </div>
              <hr className="divider-h" style={{margin:"2px 8px 6px"}}/>
              <button className="step-item" onClick={()=>setOpen(false)}><Icon.user style={{width:18,height:18}}/><span className="txt">Mon profil</span></button>
              <button className="step-item" onClick={()=>setOpen(false)}><Icon.bell style={{width:18,height:18}}/><span className="txt">Notifications</span></button>
              <hr className="divider-h" style={{margin:"6px 8px"}}/>
              <button className="step-item" onClick={()=>{setOpen(false); onLogout();}} style={{color:"var(--red)"}}><Icon.logout style={{width:18,height:18}}/><span className="txt" style={{color:"var(--red)"}}>Se déconnecter</span></button>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}

function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Fil d'Ariane">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i>0 && <span className="sep">/</span>}
          {it.go ? <a href="#" onClick={(e)=>{e.preventDefault(); it.go();}}>{it.label}</a> : <span className="cur">{it.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

function AppFooter() {
  const links = ["Mentions légales","Données personnelles","Accessibilité : partiellement conforme","Gestion des cookies","Contact RH","Plan du site"];
  return (
    <footer className="app-footer">
      <div className="inner">
        <div className="footer-cols">
          <div style={{maxWidth:340,display:"flex",flexDirection:"column",gap:12}}>
            <Logo />
            <p className="small">Plateforme interne de gestion des entretiens annuels. Réservée aux collaborateurs NanoXplore.</p>
          </div>
          <div className="footer-links" style={{maxWidth:520}}>
            {links.map(l => <a key={l} href="#" onClick={(e)=>e.preventDefault()}>{l}</a>)}
          </div>
        </div>
        <div className="footer-bottom">
          <span className="small">© 2026 NanoXplore — NX-RH · Tous droits réservés</span>
          <span className="small">Version 2.4 · Support : rh-support@nanoxplore.com</span>
        </div>
      </div>
    </footer>
  );
}

function Toast({ children }) {
  return <div className="toast"><Icon.check className="ico"/><span>{children}</span></div>;
}

Object.assign(window, { Icon, Logo, Field, PasswordInput, Checkbox, Badge, Breadcrumb, AppFooter, Toast });
