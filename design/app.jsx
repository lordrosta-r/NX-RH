/* app.jsx — racine NX-RH : état, rôles, routage */
const { useState: useS, useEffect: useE } = React;

const USERS = {
  collab:  { first:"Camille", name:"Camille Rousseau", role:"Ingénieure procédés", initials:"CR" },
  manager: { first:"Sophie",  name:"Sophie Lemaire",   role:"Responsable production", initials:"SL" },
  rh:      { first:"Karim",   name:"Karim Benali",     role:"Chargé de mission RH", initials:"KB" },
  admin:   { first:"Julie",   name:"Julie Hoarau",     role:"Administratrice SI", initials:"JH" },
};

const DEFAULT_DATA = {
  reussites:"", difficultes:"", satisfaction:0,
  competences:{}, compCommentaire:"",
  objectifs:[{ titre:"", echeance:"", mesure:"" }],
  formations:[], commentaireCollab:"",
  signName:"", signed:false,
};

const STEP_LABELS = [
  { id:"bilan", label:"Bilan de l'année" },
  { id:"competences", label:"Compétences" },
  { id:"objectifs", label:"Objectifs & dév." },
  { id:"commentaires", label:"Commentaires" },
  { id:"signature", label:"Signature" },
];

function isDone(i, d) {
  if (i===0) return !!(d.reussites && d.satisfaction);
  if (i===1) return Object.keys(d.competences).length >= window.NXDATA.competences.length;
  if (i===2) return d.objectifs.some(o=>o.titre);
  if (i===3) return !!d.commentaireCollab;
  if (i===4) return !!d.signed;
  return false;
}

function App() {
  const [route, setRoute] = useS("login");
  const [param, setParam] = useS(null);
  const [role, setRole] = useS("collab");
  const [data, setData] = useS(() => {
    try { const s = localStorage.getItem("nxrh_data"); return s ? { ...DEFAULT_DATA, ...JSON.parse(s) } : DEFAULT_DATA; }
    catch { return DEFAULT_DATA; }
  });
  const [toast, setToast] = useS(null);

  useE(() => { localStorage.setItem("nxrh_data", JSON.stringify(data)); }, [data]);
  useE(() => { if (!toast) return; const t = setTimeout(()=>setToast(null), 2600); return ()=>clearTimeout(t); }, [toast]);

  const update = (patch) => setData(d => ({ ...d, ...patch }));
  const notify = (msg) => setToast(msg);
  const go = (r, p=null) => {
    if (r === "logout") { setRole("collab"); setRoute("login"); setParam(null); return; }
    setRoute(r); setParam(p);
  };
  const login = (r="collab") => { setRole(r); setRoute("dashboard"); setParam(null); };

  const steps = STEP_LABELS.map((s,i)=>({ ...s, done: isDone(i, data) }));
  const doneSteps = steps.filter(s=>s.done).length;
  const progress = { pct: Math.round((doneSteps/steps.length)*100), doneSteps, totalSteps: steps.length, daysLeft: 24, steps: steps.map(s=>({ label:s.label, done:s.done })) };
  const submit = () => { setRoute("evaluation-confirm"); setToast("Auto-évaluation signée et transmise"); };

  const user = USERS[role];
  const shell = { role, route, go, user, onLogout:()=>go("logout"), notify };

  function render() {
    if (route === "login") return <LoginScreen onLogin={login} />;
    const dash = { collab:DashboardCollab, manager:DashboardManager, rh:DashboardRH, admin:DashboardAdmin };
    switch (route) {
      case "dashboard": { const D = dash[role]; return <D shell={shell} go={go} user={user} role={role} progress={progress} notify={notify} />; }
      case "evaluation": return <EvaluationPage shell={shell} data={data} update={update} go={go} onSubmit={submit} steps={steps} user={user} />;
      case "evaluation-confirm": return <ConfirmationPage shell={shell} go={go} user={user} data={data} />;
      case "team": return <TeamPage shell={shell} go={go} notify={notify} />;
      case "campaigns": return <CampaignsPage shell={shell} go={go} user={user} role={role} notify={notify} />;
      case "campaign": return <CampaignDetailPage shell={shell} go={go} param={param} role={role} notify={notify} />;
      case "analytics": return <AnalyticsPage shell={shell} go={go} notify={notify} />;
      case "forms": return <FormsPage shell={shell} go={go} role={role} notify={notify} />;
      case "form": return <FormBuilderPage shell={shell} go={go} param={param} notify={notify} />;
      case "hrflags": return <HrFlagsPage shell={shell} go={go} notify={notify} />;
      case "mobility": return <MobilityPage shell={shell} go={go} role={role} user={user} notify={notify} />;
      case "users": return <UsersPage shell={shell} go={go} notify={notify} />;
      case "ldap": return <LdapPage shell={shell} go={go} notify={notify} />;
      case "mails": return <MailsPage shell={shell} go={go} notify={notify} />;
      case "audit": return <AuditPage shell={shell} go={go} notify={notify} />;
      default: { const D = dash[role]; return <D shell={shell} go={go} user={user} role={role} progress={progress} notify={notify} />; }
    }
  }

  return (
    <React.Fragment>
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      {render()}
      {toast && <Toast>{toast}</Toast>}
    </React.Fragment>
  );
}

function ConfirmationPage({ shell, go, user, data }) {
  const nbObj = data.objectifs.filter(o=>o.titre).length;
  return (
    <AppShell {...shell}>
      <div style={{maxWidth:760,margin:"0 auto"}}>
        <div className="tile" style={{padding:"48px 44px",textAlign:"center",marginTop:8}}>
          <div style={{width:76,height:76,borderRadius:"50%",background:"var(--green-soft)",display:"grid",placeItems:"center",margin:"0 auto 22px"}}><Icon.check style={{width:40,height:40,color:"var(--green)"}}/></div>
          <p className="eyebrow" style={{color:"var(--green)"}}>Signé et transmis le 4 février 2026</p>
          <h1 className="h1" style={{marginTop:10}}>Votre auto-évaluation est envoyée</h1>
          <p className="lead" style={{marginTop:12,maxWidth:520,marginLeft:"auto",marginRight:"auto"}}>Merci {user.first}. Votre manager <b>Sophie Lemaire</b> va compléter son appréciation. Vous serez notifié·e dès qu'un créneau d'entretien sera proposé.</p>
          <div className="grid" style={{gridTemplateColumns:"repeat(3,1fr)",gap:14,marginTop:34,textAlign:"left"}}>
            {[["4/4","Compétences évaluées"],[nbObj||"—","Objectifs proposés"],[data.formations.length||"—","Formations souhaitées"]].map((s,i)=>(
              <div key={i} className="card" style={{padding:"18px 20px",background:"var(--bg-alt)"}}><div style={{fontSize:30,fontWeight:800,color:"var(--blue)"}}>{s[0]}</div><div className="small" style={{marginTop:2}}>{s[1]}</div></div>
            ))}
          </div>
          <div className="callout" style={{textAlign:"left",marginTop:28,display:"flex",gap:14,alignItems:"flex-start"}}>
            <Icon.clock style={{width:22,height:22,color:"var(--blue)",flex:"none",marginTop:2}}/>
            <div><div className="h3" style={{fontSize:16}}>Et ensuite ?</div><p className="small" style={{marginTop:4,color:"var(--ink-2)"}}>L'entretien doit se tenir avant le 28 février. Vous pourrez relire et co-signer le compte-rendu final depuis votre tableau de bord.</p></div>
          </div>
          <div className="row gap-12" style={{justifyContent:"center",marginTop:30}}>
            <button className="btn btn-primary btn-lg" onClick={()=>go("dashboard")}>Retour au tableau de bord</button>
            <button className="btn btn-ghost btn-lg" onClick={()=>go("evaluation")}>Relire mes réponses</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
