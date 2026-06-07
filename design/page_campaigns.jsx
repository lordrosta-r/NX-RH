/* page_campaigns.jsx — campagnes (liste, détail, analytics) */
function StatusDot({ tone, children }) { return <Badge tone={tone} dot>{children}</Badge>; }

function CampaignsPage({ shell, go, user, role, notify }) {
  const camps = window.NXDATA.campaigns;
  const canManage = role==="rh" || role==="admin";
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Gestion" title="Campagnes d'entretien" desc="Créez et suivez les campagnes d'évaluation de l'entreprise." go={go}
        actions={canManage && <button className="btn btn-primary" onClick={()=>notify("Nouvelle campagne — assistant de création")}><Icon.plus className="ico" style={{width:18,height:18}}/> Nouvelle campagne</button>} />
      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-head" style={{gridTemplateColumns:"2.2fr 1.2fr 1fr 1.4fr auto"}}>
          <span>Campagne</span><span>Période</span><span>Statut</span><span>Avancement</span><span></span>
        </div>
        {camps.map((c,i)=>(
          <div key={c.id} className="tbl-row" style={{gridTemplateColumns:"2.2fr 1.2fr 1fr 1.4fr auto"}}>
            <div className="row gap-12" style={{alignItems:"center",minWidth:0}}>
              <span style={{width:40,height:40,borderRadius:8,background:"var(--blue-soft)",display:"grid",placeItems:"center",flex:"none"}}><Icon.layers style={{width:20,height:20,color:"var(--blue)"}}/></span>
              <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:15}}>{c.name}</div><div className="small">{c.form}</div></div>
            </div>
            <span className="small" style={{fontWeight:600,color:"var(--ink-2)"}}>{c.period}</span>
            <span><StatusDot tone={c.tone}>{c.status}</StatusDot></span>
            <div style={{minWidth:0}}>
              <Bar pct={c.part?Math.round(c.done/c.part*100):0} h={6} />
              <div className="small" style={{marginTop:5}}>{c.done}/{c.part} · {c.part?Math.round(c.done/c.part*100):0}%</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>go("campaign", c.id)}>Ouvrir</button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function CampaignDetailPage({ shell, go, param, role, notify }) {
  const c = window.NXDATA.campaigns.find(x=>x.id===param) || window.NXDATA.campaigns[0];
  const depts = window.NXDATA.depts;
  const toneFor = (p) => p>=75 ? "var(--green)" : p>=55 ? "var(--blue)" : "var(--amber)";
  const pct = c.part?Math.round(c.done/c.part*100):0;
  const canManage = role==="rh" || role==="admin";
  return (
    <AppShell {...shell}>
      <PageHead crumbs={[{label:"Accueil",route:"dashboard"},{label:"Campagnes",route:"campaigns"},{label:c.name}]} eyebrow="Campagne" title={c.name} desc={c.period} go={go}
        actions={<><StatusDot tone={c.tone}>{c.status}</StatusDot>{canManage && <button className="btn btn-secondary" onClick={()=>go("analytics")}><Icon.chart className="ico" style={{width:18,height:18}}/> Analytics</button>}{canManage && <button className="btn btn-ghost" onClick={()=>notify("Édition de la campagne")}><Icon.edit className="ico" style={{width:18,height:18}}/> Modifier</button>}</>} />
      <div className="grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:18}}>
        <StatTile value={c.part} label="Participants" tone="var(--ink)" />
        <StatTile value={c.done} label="Entretiens réalisés" tone="var(--green)" />
        <StatTile value={c.part-c.done} label="Restants" tone="var(--amber)" />
        <StatTile value={pct+"%"} label="Taux de complétion" tone="var(--blue)" />
      </div>
      <div style={{marginBottom:26}}><Bar pct={pct} h={10} /></div>
      <div className="grid" style={{gridTemplateColumns:"1fr 1.5fr",alignItems:"start"}}>
        <div className="tile">
          <h2 className="h2" style={{marginBottom:16}}>Informations</h2>
          <div className="section-gap" style={{gap:0}}>
            {[["Formulaire",c.form],["Période",c.period],["Date de clôture",c.close],["Statut",c.status]].map((r,i)=>(
              <div key={i} className="row between" style={{padding:"13px 0",borderTop:i?"1px solid var(--line)":"none"}}><span className="small" style={{fontWeight:600}}>{r[0]}</span><span style={{fontWeight:600,fontSize:14,textAlign:"right"}}>{r[1]}</span></div>
            ))}
          </div>
        </div>
        <div className="tile">
          <h2 className="h2" style={{marginBottom:16}}>Avancement par service</h2>
          <div className="section-gap" style={{gap:16}}>
            {depts.map(s=>(
              <div key={s.d}>
                <div className="row between" style={{marginBottom:7}}><span style={{fontWeight:600,fontSize:15,whiteSpace:"nowrap"}}>{s.d} <span className="small" style={{fontWeight:500}}>· {s.total} pers.</span></span><b style={{fontSize:14,color:toneFor(s.done)}}>{s.done}%</b></div>
                <Bar pct={s.done} tone={toneFor(s.done)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function AnalyticsPage({ shell, go, notify }) {
  const months = [["Sem. 1",18],["Sem. 2",46],["Sem. 3",98],["Sem. 4",142]];
  const satis = [["Excellente",38],["Bonne",92],["Mitigée",24],["Faible",6]];
  const maxM = 160;
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Pilotage" title="Analytics — Campagne 2026" desc="Statistiques détaillées de la campagne en cours." go={go}
        actions={<button className="btn btn-ghost" onClick={()=>notify("Rapport PDF généré")}><Icon.download className="ico" style={{width:18,height:18}}/> Rapport PDF</button>} />
      <div className="grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginBottom:24}}>
        <StatTile value="68%" label="Complétion" tone="var(--blue)" />
        <StatTile value="3,2 j" label="Délai moyen de réponse" tone="var(--ink)" />
        <StatTile value="2,9 / 4" label="Satisfaction moyenne" tone="var(--green)" />
        <StatTile value="74%" label="Objectifs validés" tone="var(--ink)" />
      </div>
      <div className="grid" style={{gridTemplateColumns:"1.3fr 1fr",alignItems:"start"}}>
        <div className="tile">
          <h2 className="h2" style={{marginBottom:18}}>Progression hebdomadaire</h2>
          <div style={{display:"flex",alignItems:"flex-end",gap:18,height:200,paddingTop:10}}>
            {months.map((m,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8,height:"100%",justifyContent:"flex-end"}}>
                <div style={{fontSize:13,fontWeight:800,color:"var(--blue)"}}>{m[1]}</div>
                <div style={{width:"100%",maxWidth:54,height:(m[1]/maxM*100)+"%",background:"var(--blue)",borderRadius:"8px 8px 0 0",minHeight:8}}></div>
                <div className="small">{m[0]}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="tile">
          <h2 className="h2" style={{marginBottom:18}}>Répartition de la satisfaction</h2>
          <div className="section-gap" style={{gap:14}}>
            {satis.map((s,i)=>{ const tot=160; const tone=["var(--green)","var(--blue)","var(--amber)","var(--red)"][i]; return (
              <div key={i}><div className="row between" style={{marginBottom:6}}><span style={{fontWeight:600,fontSize:14}}>{s[0]}</span><b className="small" style={{color:tone}}>{s[1]}</b></div><Bar pct={s[1]/tot*100} tone={tone} /></div>
            );})}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, { CampaignsPage, CampaignDetailPage, AnalyticsPage });
