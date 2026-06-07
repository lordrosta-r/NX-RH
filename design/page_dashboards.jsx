/* page_dashboards.jsx — 4 tableaux de bord selon le rôle */

function EvalCard({ progress, go }) {
  const pct = progress.pct;
  return (
    <div className="tile" style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"22px 24px",borderBottom:"1px solid var(--line)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
        <div>
          <p className="eyebrow">Évaluation annuelle</p>
          <h2 className="h2" style={{marginTop:6}}>Campagne 2026</h2>
          <p className="small" style={{marginTop:4}}>Manager évaluateur · Sophie Lemaire</p>
        </div>
        <Badge tone={pct===0?"grey":pct>=100?"green":"blue"} dot>{pct===0?"À démarrer":pct>=100?"Prêt à signer":"En cours"}</Badge>
      </div>
      <div style={{padding:"20px 24px"}}>
        <div className="row between" style={{marginBottom:8}}>
          <span className="eyebrow" style={{textTransform:"none",letterSpacing:0,fontSize:14}}>{pct>=100?"Toutes les étapes sont complètes":`Progression · ${pct}%`}</span>
          <span className="small" style={{fontWeight:700,whiteSpace:"nowrap"}}>{progress.doneSteps}/{progress.totalSteps} étapes</span>
        </div>
        <Bar pct={pct} />
        <div className="grid" style={{gridTemplateColumns:"repeat(2,1fr)",gap:10,margin:"18px 0 20px"}}>
          {progress.steps.map((s,i)=>(
            <div key={i} className="row gap-12" style={{padding:"10px 12px",border:"1px solid var(--line)",borderRadius:6}}>
              <span style={{width:24,height:24,borderRadius:"50%",flex:"none",display:"grid",placeItems:"center",background:s.done?"var(--green)":"#fff",border:s.done?"none":"2px solid var(--line)",color:"#fff"}}>
                {s.done ? <Icon.check style={{width:13,height:13}}/> : <span style={{fontSize:12,fontWeight:800,color:"var(--ink-3)"}}>{i+1}</span>}
              </span>
              <span style={{fontSize:14,fontWeight:600,color:s.done?"var(--ink)":"var(--ink-2)"}}>{s.label}</span>
            </div>
          ))}
        </div>
        <div className="row gap-12 wrap">
          <button className="btn btn-primary btn-lg" onClick={()=>go("evaluation")}>{pct===0?"Démarrer mon évaluation":pct>=100?"Relire et signer":"Continuer"} <Icon.arrowR className="ico"/></button>
          <button className="btn btn-ghost btn-lg" onClick={()=>go("evaluation")}>Aperçu</button>
        </div>
      </div>
    </div>
  );
}

function QuickLinks({ items }) {
  return (
    <div className="tile">
      <p className="eyebrow">Accès rapides</p>
      <div className="section-gap" style={{marginTop:14,gap:10}}>
        {items.map((q,i)=>(
          <button key={i} onClick={q.go||(()=>{})} className="row gap-12" style={{textAlign:"left",background:"transparent",border:"1px solid var(--line)",borderRadius:6,padding:"12px 14px",cursor:"pointer",width:"100%"}}>
            <span style={{width:36,height:36,borderRadius:8,background:"var(--blue-soft)",display:"grid",placeItems:"center",flex:"none"}}><q.icon style={{width:19,height:19,color:"var(--blue)"}}/></span>
            <span style={{flex:1}}><span style={{display:"block",fontWeight:700,fontSize:15}}>{q.t}</span><span style={{display:"block",fontSize:13,color:"var(--ink-3)"}}>{q.d}</span></span>
            <Icon.chevR style={{width:18,height:18,color:"var(--ink-3)"}}/>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- COLLABORATEUR ---------- */
function DashboardCollab({ shell, go, user, progress, notify }) {
  const history = [
    { year:"2025", date:"14 février 2025", manager:"Sophie Lemaire" },
    { year:"2024", date:"9 février 2024", manager:"Sophie Lemaire" },
    { year:"2023", date:"21 février 2023", manager:"Marc Diallo" },
  ];
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Espace collaborateur" title={`Bonjour ${user.first}`} desc="Voici l'état de vos entretiens professionnels." go={go}
        actions={<Badge tone="amber" dot>Campagne 2026 ouverte</Badge>} />
      <div className="callout amber" style={{marginBottom:24,display:"flex",gap:16,alignItems:"center"}}>
        <Icon.calendar style={{width:24,height:24,flex:"none",color:"var(--amber)"}}/>
        <div className="row between wrap" style={{flex:1,gap:12,alignItems:"center"}}>
          <div>
            <div className="h3">Votre évaluation 2026 est à compléter avant le 28 février</div>
            <p className="body" style={{marginTop:4,color:"var(--ink-2)"}}>Finalisez votre auto-évaluation avant l'échange avec votre manager.</p>
          </div>
          <span className="small" style={{fontWeight:700,color:"var(--amber)",whiteSpace:"nowrap"}}>J-{progress.daysLeft}</span>
        </div>
      </div>
      <div className="grid" style={{gridTemplateColumns:"1.6fr 1fr"}}>
        <EvalCard progress={progress} go={go} />
        <div className="section-gap">
          <QuickLinks items={[
            { icon:Icon.target, t:"Mes objectifs", d:"3 objectifs en cours", go:()=>go("evaluation") },
            { icon:Icon.compass, t:"Mobilité interne", d:"Exprimer un souhait", go:()=>go("mobility") },
            { icon:Icon.doc, t:"Mes comptes-rendus", d:"3 entretiens archivés", go:()=>notify("Historique des comptes-rendus") },
          ]} />
          <div className="callout">
            <div className="row gap-12" style={{alignItems:"flex-start"}}>
              <Icon.spark style={{width:22,height:22,color:"var(--blue)",flex:"none",marginTop:2}}/>
              <div>
                <div className="h3" style={{fontSize:16}}>Bien préparer son entretien</div>
                <p className="small" style={{marginTop:4,color:"var(--ink-2)"}}>Conseils pour faire le bilan et formuler vos objectifs.</p>
                <a className="link small" href="#" onClick={(e)=>e.preventDefault()} style={{marginTop:8,display:"inline-block"}}>Lire le guide →</a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{marginTop:34}}>
        <h2 className="h2" style={{marginBottom:14}}>Mes entretiens passés</h2>
        <div className="card" style={{overflow:"hidden"}}>
          {history.map((h,i)=>(
            <div key={h.year} className="row between wrap" style={{padding:"18px 22px",gap:14,borderTop:i?"1px solid var(--line)":"none"}}>
              <div className="row gap-16" style={{alignItems:"center"}}>
                <span style={{width:44,height:44,borderRadius:8,background:"var(--bg-alt)",display:"grid",placeItems:"center",flex:"none"}}><Icon.doc style={{width:20,height:20,color:"var(--ink-2)"}}/></span>
                <div><div style={{fontWeight:700,fontSize:16}}>Entretien annuel {h.year}</div><div className="small">Réalisé le {h.date} · avec {h.manager}</div></div>
              </div>
              <div className="row gap-16"><Badge tone="green" dot>Signé</Badge><button className="btn btn-ghost btn-sm" onClick={()=>notify(`Compte-rendu ${h.year}`)}>Consulter</button></div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

/* ---------- MANAGER ---------- */
function DashboardManager({ shell, go, user, progress, notify }) {
  const team = window.NXDATA.team;
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Espace manager" title={`Bonjour ${user.first}`} desc="Pilotez les entretiens de votre équipe et le vôtre." go={go}
        actions={<Badge tone="amber" dot>Campagne 2026 · J-{progress.daysLeft}</Badge>} />
      <div className="grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:24}}>
        <StatTile value="1" label="À évaluer" tone="var(--amber)" />
        <StatTile value="2" label="En cours côté collaborateur" tone="var(--blue)" />
        <StatTile value="1" label="À démarrer" tone="var(--ink-3)" />
        <StatTile value="1" label="Entretiens finalisés" tone="var(--green)" />
      </div>
      <div className="grid" style={{gridTemplateColumns:"1.6fr 1fr",alignItems:"start"}}>
        <div className="tile" style={{padding:0,overflow:"hidden"}}>
          <div className="row between" style={{padding:"20px 24px",borderBottom:"1px solid var(--line)"}}>
            <h2 className="h2">Entretiens de l'équipe</h2>
            <button className="btn btn-ghost btn-sm" onClick={()=>go("team")}>Voir tout <Icon.arrowR className="ico" style={{width:15,height:15}}/></button>
          </div>
          {team.slice(0,4).map((t,i)=>(
            <div key={t.n} className="row between wrap" style={{padding:"15px 24px",gap:14,borderTop:i?"1px solid var(--line)":"none"}}>
              <div className="row gap-12" style={{alignItems:"center"}}>
                <span className="avatar" style={{background:t.tone==="green"?"var(--green)":"var(--blue)"}}>{t.in}</span>
                <div><div style={{fontWeight:700,fontSize:15,whiteSpace:"nowrap"}}>{t.n}</div><div className="small">{t.j}</div></div>
              </div>
              <div className="row gap-12" style={{alignItems:"center"}}>
                <Badge tone={t.tone} dot>{t.st}</Badge>
                <button className={"btn btn-sm " + (t.primary?"btn-primary":"btn-ghost")} onClick={()=>t.primary?go("team"):notify(`Relance envoyée à ${t.n}`)}>{t.primary?"Évaluer":"Relancer"}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="section-gap">
          <EvalCard progress={progress} go={go} />
        </div>
      </div>
    </AppShell>
  );
}

/* ---------- RH ---------- */
function DashboardRH({ shell, go, user, notify }) {
  const depts = window.NXDATA.depts;
  const toneFor = (p) => p>=75 ? "var(--green)" : p>=55 ? "var(--blue)" : "var(--amber)";
  const kpis = [["68%","Taux de complétion","var(--blue)"],["142","Entretiens réalisés / 210","var(--ink)"],["18","En retard","var(--amber)"],["28 fév.","Clôture de la campagne","var(--ink)"]];
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Espace RH" title="Pilotage — Campagne 2026" desc="Vue d'ensemble de l'avancement des entretiens annuels." go={go}
        actions={<><button className="btn btn-ghost" onClick={()=>notify("Export CSV généré")}><Icon.download className="ico" style={{width:18,height:18}}/> Exporter</button><button className="btn btn-primary" onClick={()=>notify("Relance envoyée à 18 collaborateurs")}><Icon.bell className="ico" style={{width:18,height:18}}/> Relancer les retardataires</button></>} />
      <div className="grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:18}}>{kpis.map((k,i)=><StatTile key={i} value={k[0]} label={k[1]} tone={k[2]} />)}</div>
      <div style={{marginBottom:28}}><Bar pct={68} h={10} /></div>
      <div className="grid" style={{gridTemplateColumns:"1.5fr 1fr",alignItems:"start"}}>
        <div className="card" style={{padding:"24px 26px"}}>
          <h2 className="h2" style={{marginBottom:6}}>Avancement par service</h2>
          <p className="small" style={{marginBottom:20}}>Part des entretiens réalisés sur chaque service.</p>
          <div className="section-gap" style={{gap:18}}>
            {depts.map(s=>(
              <div key={s.d}>
                <div className="row between" style={{marginBottom:7}}>
                  <span style={{fontWeight:600,fontSize:15,whiteSpace:"nowrap"}}>{s.d} <span className="small" style={{fontWeight:500}}>· {s.total} pers.</span></span>
                  <b style={{fontSize:14,color:toneFor(s.done)}}>{s.done}%</b>
                </div>
                <Bar pct={s.done} tone={toneFor(s.done)} />
              </div>
            ))}
          </div>
        </div>
        <div className="section-gap">
          <div className="callout"><div className="row gap-12" style={{alignItems:"flex-start"}}><Icon.clock style={{width:22,height:22,color:"var(--blue)",flex:"none",marginTop:2}}/><div><div className="h3" style={{fontSize:16}}>Plus que 24 jours</div><p className="small" style={{marginTop:4,color:"var(--ink-2)"}}>68 entretiens restent à finaliser avant la clôture du 28 février.</p></div></div></div>
          <div className="tile">
            <p className="eyebrow">Activité récente</p>
            <div className="section-gap" style={{marginTop:14,gap:14}}>
              {[["Sophie Lemaire a validé l'entretien de Yanis Cherif","il y a 1 h","var(--green)"],["12 auto-évaluations transmises aujourd'hui","il y a 3 h","var(--blue)"],["Relance automatique envoyée (R&D)","hier","var(--amber)"]].map((a,i)=>(
                <div key={i} className="row gap-12" style={{alignItems:"flex-start"}}><span style={{width:9,height:9,borderRadius:"50%",background:a[2],marginTop:6,flex:"none"}}></span><div style={{display:"flex",flexDirection:"column",gap:2,minWidth:0}}><div style={{fontSize:14,fontWeight:600,lineHeight:1.4}}>{a[0]}</div><div className="small">{a[1]}</div></div></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ---------- ADMIN ---------- */
function DashboardAdmin({ shell, go, user, notify }) {
  const services = [["API NX-RH","Opérationnel","green"],["Base MongoDB","Opérationnel","green"],["Annuaire LDAP","Synchronisé · il y a 3 h","green"],["Serveur SMTP","Opérationnel","green"]];
  const audit = window.NXDATA.audit;
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Administration" title="Tableau de bord" desc="État de la plateforme et activité système." go={go}
        actions={<button className="btn btn-secondary" onClick={()=>go("ldap")}><Icon.building className="ico" style={{width:18,height:18}}/> Synchroniser LDAP</button>} />
      <div className="grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:24}}>
        <StatTile value="312" label="Utilisateurs actifs" tone="var(--blue)" />
        <StatTile value="298" label="Comptes LDAP synchronisés" tone="var(--ink)" />
        <StatTile value="1 240" label="E-mails envoyés (30 j)" tone="var(--ink)" />
        <StatTile value="0" label="Incident en cours" tone="var(--green)" />
      </div>
      <div className="grid" style={{gridTemplateColumns:"1fr 1.4fr",alignItems:"start"}}>
        <div className="tile">
          <h2 className="h2" style={{marginBottom:16}}>État des services</h2>
          <div className="section-gap" style={{gap:12}}>
            {services.map((s,i)=>(
              <div key={i} className="row between" style={{padding:"12px 14px",border:"1px solid var(--line)",borderRadius:6}}>
                <span style={{fontWeight:600,fontSize:15}}>{s[0]}</span>
                <Badge tone={s[2]} dot>{s[1]}</Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="tile" style={{padding:0,overflow:"hidden"}}>
          <div className="row between" style={{padding:"20px 24px",borderBottom:"1px solid var(--line)"}}>
            <h2 className="h2">Journal d'audit</h2>
            <button className="btn btn-ghost btn-sm" onClick={()=>go("audit")}>Voir tout</button>
          </div>
          {audit.map((a,i)=>(
            <div key={i} className="row between wrap" style={{padding:"13px 24px",gap:10,borderTop:i?"1px solid var(--line)":"none"}}>
              <div className="row gap-12" style={{alignItems:"center"}}><span style={{width:8,height:8,borderRadius:"50%",background:"var(--blue)",flex:"none"}}></span><span style={{fontSize:14,fontWeight:600}}>{a[0]}</span></div>
              <div className="row gap-12"><Badge tone="grey">{a[1]}</Badge><span className="small">{a[2]}</span></div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

/* ---------- MANAGER : équipe (page complète) ---------- */
function TeamPage({ shell, go, notify }) {
  const team = window.NXDATA.team;
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Espace manager" title="Évaluations de l'équipe" desc={`Suivez et menez les entretiens de vos ${team.length} collaborateurs.`} go={go}
        actions={<Badge tone="amber" dot>Campagne 2026 · échéance 28 fév.</Badge>} />
      <div className="callout amber" style={{marginBottom:24,display:"flex",gap:14,alignItems:"center"}}>
        <Icon.bell style={{width:22,height:22,color:"var(--amber)",flex:"none"}}/>
        <span className="h3" style={{fontSize:16}}>1 auto-évaluation en attente de votre appréciation</span>
      </div>
      <div className="grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:28}}>
        <StatTile value="1" label="À évaluer" tone="var(--amber)" />
        <StatTile value="2" label="En cours côté collaborateur" tone="var(--blue)" />
        <StatTile value="1" label="À démarrer" tone="var(--ink-3)" />
        <StatTile value="1" label="Entretiens finalisés" tone="var(--green)" />
      </div>
      <h2 className="h2" style={{marginBottom:14}}>Collaborateurs</h2>
      <div className="card" style={{overflow:"hidden"}}>
        {team.map((t,i)=>(
          <div key={t.n} className="row between wrap" style={{padding:"18px 22px",gap:16,borderTop:i?"1px solid var(--line)":"none"}}>
            <div className="row gap-16" style={{alignItems:"center",minWidth:240,flexShrink:0}}>
              <span className="avatar lg" style={{background:t.tone==="green"?"var(--green)":"var(--blue)"}}>{t.in}</span>
              <div><div style={{fontWeight:700,fontSize:16,whiteSpace:"nowrap"}}>{t.n}</div><div className="small">{t.j}</div></div>
            </div>
            <div className="row gap-24 wrap" style={{alignItems:"center"}}>
              <div style={{width:140}}><Bar pct={t.pct} h={6} /><div className="small" style={{marginTop:5}}>{t.pct}% complété</div></div>
              <Badge tone={t.tone} dot>{t.st}</Badge>
              <button className={"btn btn-sm " + (t.primary?"btn-primary":"btn-ghost")} onClick={()=>notify(t.primary?`Ouverture de l'évaluation de ${t.n}…`:`Relance envoyée à ${t.n}`)}>{t.action}{t.primary && <Icon.arrowR className="ico" style={{width:16,height:16}}/>}</button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

Object.assign(window, { DashboardCollab, DashboardManager, DashboardRH, DashboardAdmin, TeamPage });
