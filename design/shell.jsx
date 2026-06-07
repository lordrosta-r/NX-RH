/* shell.jsx — topbar minimaliste : logo | switch perspective | user chip + subnav sous-jacente */
const { useState: useShState } = React;

const NAV = {
  collab:  [{ id:"dashboard", label:"Tableau de bord" },{ id:"evaluation", label:"Mon évaluation" },{ id:"mobility", label:"Mobilité" }],
  manager_me:   [{ id:"dashboard", label:"Tableau de bord" },{ id:"evaluation", label:"Mon évaluation" },{ id:"mobility", label:"Mobilité" }],
  manager_team: [{ id:"team", label:"Mon équipe" },{ id:"campaigns", label:"Campagnes" }],
  rh_me:    [{ id:"dashboard", label:"Tableau de bord" },{ id:"mobility", label:"Mobilité" }],
  rh_rh:    [{ id:"dashboard", label:"Pilotage" },{ id:"campaigns", label:"Campagnes" },{ id:"analytics", label:"Analytics" },{ id:"forms", label:"Formulaires" },{ id:"hrflags", label:"Signalements RH" },{ id:"mobility", label:"Mobilité" }],
  admin_me:  [{ id:"dashboard", label:"Tableau de bord" }],
  admin_adm: [{ id:"dashboard", label:"Tableau de bord" },{ id:"users", label:"Utilisateurs" },{ id:"ldap", label:"Annuaire LDAP" },{ id:"mails", label:"E-mails" },{ id:"audit", label:"Journal d'audit" }],
};

const PERSPECTIVES = {
  collab:  null,
  manager: [{ id:"me", label:"Mon espace" },{ id:"team", label:"Mon équipe" }],
  rh:      [{ id:"me", label:"Mon espace" },{ id:"rh", label:"Pilotage RH" }],
  admin:   [{ id:"me", label:"Mon espace" },{ id:"adm", label:"Administration" }],
};

const ROUTE_ALIAS = { "campaign":"campaigns","form":"forms","evaluation-confirm":"evaluation","hrflag":"hrflags" };
const ROLE_LABEL  = { collab:"Collaborateur", manager:"Manager", rh:"Ressources Humaines", admin:"Administrateur" };
const ROLE_TONE   = { collab:"grey", manager:"blue", rh:"green", admin:"amber" };

function AppHeader({ role, route, go, user, onLogout }) {
  const [open, setOpen] = useShState(false);
  const [bell, setBell] = useShState(false);
  const [persp, setPersp] = useShState(() => role==="collab" ? null : "me");
  const pers = PERSPECTIVES[role];
  const active = ROUTE_ALIAS[route] || route;

  // Déduire la perspective depuis la route active
  const teamRoutes = ["team","campaigns","analytics","forms","hrflags","users","ldap","mails","audit"];
  const currentPersp = !pers ? null : (teamRoutes.includes(active) ? pers[1].id : (persp || "me"));

  const navKey = role==="collab" ? "collab" : `${role}_${currentPersp}`;
  const links = NAV[navKey] || NAV.collab;

  const switchTo = (pid) => {
    setPersp(pid);
    const defaultRoute = { me:"dashboard", team:"team", rh:"dashboard", adm:"dashboard", admin:"dashboard" }[pid] || "dashboard";
    go(defaultRoute);
  };

  const notifs = [
    ["Nouvelle campagne « Entretiens 2026 » ouverte","il y a 2 h","var(--blue)"],
    ["Votre manager a proposé un créneau","hier","var(--green)"],
    ["Rappel : auto-évaluation à finaliser","il y a 2 j","var(--amber)"],
  ];

  return (
    <header className="app-header">
      <div className="topbar-main">
        <div className="inner">
          {/* Logo */}
          <a className="nx-logo-wrap" href="#" onClick={e=>{e.preventDefault(); go("dashboard");}}>
            <img src="nx-logo.png" alt="NanoXplore" style={{height:26,width:"auto"}}/>
          </a>

          {/* Centre : switch de perspective OU badge campagne */}
          <div className="topbar-center">
            {pers ? (
              <div className="perspective-switch" role="tablist" aria-label="Changer d'espace">
                {pers.map(p=>(
                  <button key={p.id} role="tab" aria-selected={currentPersp===p.id} className={currentPersp===p.id?"on":""}
                    onClick={()=>switchTo(p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="topbar-campaign">
                <span className="topbar-campaign-dot"></span>
                <span className="topbar-campaign-label">Campagne 2026</span>
                <span className="topbar-campaign-sep">·</span>
                <span className="topbar-campaign-sub">J−24 pour finaliser</span>
              </div>
            )}
          </div>

          {/* Droite : cloche + user */}
          <div className="header-right">
            <div style={{position:"relative"}}>
              <button className="icon-btn" onClick={()=>setBell(b=>!b)} aria-label="Notifications">
                <Icon.bell style={{width:20,height:20}}/>
                <span className="icon-badge">3</span>
              </button>
              {bell && (
                <div className="menu-pop" style={{width:320,right:0}}>
                  <div className="menu-head">Notifications</div>
                  {notifs.map((n,i)=>(
                    <div key={i} className="notif-row">
                      <span style={{width:8,height:8,borderRadius:"50%",background:n[2],marginTop:6,flex:"none"}}></span>
                      <div><div style={{fontSize:13.5,fontWeight:600,lineHeight:1.4}}>{n[0]}</div><div className="small">{n[1]}</div></div>
                    </div>
                  ))}
                  <button className="menu-foot" onClick={()=>setBell(false)}>Tout marquer comme lu</button>
                </div>
              )}
            </div>
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
                <div className="menu-pop" style={{width:240,right:0}}>
                  <div style={{padding:"8px 10px 10px"}}>
                    <Badge tone={ROLE_TONE[role]} dot>{ROLE_LABEL[role]}</Badge>
                  </div>
                  <hr className="divider-h" style={{margin:"2px 8px 6px"}}/>
                  <button className="menu-item" onClick={()=>setOpen(false)}><Icon.user style={{width:18,height:18}}/>Mon profil</button>
                  <button className="menu-item" onClick={()=>{setOpen(false); go("organigramme");}}>
                    <Icon.org style={{width:18,height:18}}/>Organigramme
                  </button>
                  <hr className="divider-h" style={{margin:"6px 8px"}}/>
                  <button className="menu-item danger" onClick={()=>{setOpen(false); onLogout();}}>
                    <Icon.logout style={{width:18,height:18}}/>Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sous-nav */}
      <nav className="subnav" aria-label="Navigation">
        <div className="inner" style={{height:"auto",paddingTop:0,paddingBottom:0}}>
          {links.map(l=>(
            <a key={l.id} href="#" className={active===l.id?"active":""}
               onClick={e=>{e.preventDefault(); go(l.id);}}>
              {l.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}

function AppShell({ role, route, go, user, onLogout, notify, children }) {
  return (
    <div style={{minHeight:"100vh",background:"var(--bg-alt)"}}>
      <AppHeader role={role} route={route} go={go} user={user} onLogout={onLogout} notify={notify} />
      <main className="page" id="contenu">{children}</main>
      <AppFooter />
    </div>
  );
}

function PageHead({ eyebrow, title, desc, crumbs, go, actions }) {
  return (
    <div className="page-head">
      {crumbs && <div style={{marginBottom:16}}><Breadcrumb items={crumbs.map(c=>({label:c.label, go:c.route?(()=>go(c.route)):null}))} /></div>}
      <div className="row between wrap" style={{gap:16,alignItems:"flex-end"}}>
        <div style={{flex:"1 1 360px",minWidth:0}}>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="h1" style={{marginTop:eyebrow?8:0}}>{title}</h1>
          {desc && <p className="body" style={{marginTop:6}}>{desc}</p>}
        </div>
        {actions && <div className="row gap-12 wrap">{actions}</div>}
      </div>
    </div>
  );
}

function StatTile({ value, label, tone, sub }) {
  return (
    <div className="card" style={{padding:"18px 20px"}}>
      <div style={{fontSize:30,fontWeight:800,color:tone||"var(--ink)",lineHeight:1}}>{value}</div>
      <div className="small" style={{marginTop:6}}>{label}</div>
      {sub && <div className="small" style={{marginTop:4,color:tone||"var(--blue)",fontWeight:700}}>{sub}</div>}
    </div>
  );
}

function Bar({ pct, tone, h=8 }) {
  return (
    <div className="track" style={{height:h,background:"var(--bg-alt-2)",borderRadius:999,overflow:"hidden"}}>
      <i style={{display:"block",height:"100%",width:pct+"%",background:tone||"var(--blue)",borderRadius:999}}></i>
    </div>
  );
}

Object.assign(window, { AppShell, AppHeader, PageHead, StatTile, Bar, NAV, ROLE_LABEL });