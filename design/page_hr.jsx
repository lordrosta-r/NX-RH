/* page_hr.jsx — signalements RH & mobilité interne */
const { useState: useHrState } = React;

function HrFlagsPage({ shell, go, notify }) {
  const flags = window.NXDATA.hrflags;
  const stTone = { "À traiter":"amber", "En cours":"blue", "Traité":"green" };
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Suivi RH" title="Signalements RH" desc="Les points d'attention remontés par les managers lors des entretiens." go={go}
        actions={<button className="btn btn-ghost" onClick={()=>notify("Export des signalements")}><Icon.download className="ico" style={{width:18,height:18}}/> Exporter</button>} />
      <div className="grid" style={{gridTemplateColumns:"repeat(3,1fr)",marginBottom:24}}>
        <StatTile value="2" label="À traiter" tone="var(--amber)" />
        <StatTile value="1" label="En cours" tone="var(--blue)" />
        <StatTile value="1" label="Risque de départ élevé" tone="var(--red)" />
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-head" style={{gridTemplateColumns:"1.5fr 1.6fr 1fr 1fr auto"}}><span>Collaborateur</span><span>Type</span><span>Niveau</span><span>Statut</span><span></span></div>
        {flags.map((f,i)=>(
          <div key={f.id} className="tbl-row" style={{gridTemplateColumns:"1.5fr 1.6fr 1fr 1fr auto"}}>
            <div className="row gap-12" style={{alignItems:"center",minWidth:0}}>
              <span className="avatar" style={{background:f.tone==="red"?"var(--red)":"var(--blue)"}}>{f.who.split(" ").map(x=>x[0]).join("")}</span>
              <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:15,whiteSpace:"nowrap"}}>{f.who}</div><div className="small">Signalé par {f.from} · {f.date}</div></div>
            </div>
            <span style={{fontWeight:600,fontSize:14}}>{f.type}</span>
            <span><Badge tone={f.tone} dot>{f.level}</Badge></span>
            <span><Badge tone={stTone[f.st]}>{f.st}</Badge></span>
            <button className="btn btn-ghost btn-sm" onClick={()=>notify(`Dossier de ${f.who} ouvert`)}>Traiter</button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function MobilityPage({ shell, go, role, user, notify }) {
  const requests = window.NXDATA.mobility;
  const isCollab = role==="collab";
  const [wish, setWish] = useHrState("");
  const [type, setType] = useHrState("");
  const [when, setWhen] = useHrState("");
  const choices = [
    { v:"poste", t:"Évoluer sur mon poste actuel", d:"Plus de responsabilités, même métier" },
    { v:"metier", t:"Changer de métier / fonction", d:"Nouvelle filière professionnelle" },
    { v:"geo", t:"Mobilité géographique", d:"Changer de site" },
  ];

  if (isCollab) {
    return (
      <AppShell {...shell}>
        <PageHead eyebrow="Carrière" title="Mobilité interne" desc="Exprimez vos souhaits d'évolution. Ils seront partagés avec les RH en toute confidentialité." go={go} />
        <div className="grid" style={{gridTemplateColumns:"1.6fr 1fr",alignItems:"start"}}>
          <div className="tile" style={{padding:"26px 30px"}}>
            <div className="section-gap">
              <Field label="Quel type de mobilité vous intéresse ?">
                <div className="section-gap" style={{gap:10}}>
                  {choices.map(c=>(
                    <label key={c.v} className={"radio-card "+(type===c.v?"sel":"")}>
                      <input type="radio" name="mob" style={{position:"absolute",opacity:0}} checked={type===c.v} onChange={()=>setType(c.v)} />
                      <span className="dot"></span>
                      <span style={{display:"flex",flexDirection:"column",gap:3}}><span style={{fontWeight:700,fontSize:15}}>{c.t}</span><span className="small">{c.d}</span></span>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Décrivez votre projet" htmlFor="wish"><textarea id="wish" className="input" placeholder="Ex. : J'aimerais évoluer vers un poste de chef d'équipe d'ici 12 mois…" value={wish} onChange={(e)=>setWish(e.target.value)}></textarea></Field>
              <Field label="Horizon de temps" htmlFor="when"><input id="when" className="input" placeholder="Ex. : 6 à 12 mois" value={when} onChange={(e)=>setWhen(e.target.value)} /></Field>
              <div><button className="btn btn-primary btn-lg" onClick={()=>notify("Souhait de mobilité transmis aux RH")}>Transmettre mon souhait <Icon.arrowR className="ico"/></button></div>
            </div>
          </div>
          <div className="callout"><div className="row gap-12" style={{alignItems:"flex-start"}}><Icon.shield style={{width:22,height:22,color:"var(--blue)",flex:"none",marginTop:2}}/><div><div className="h3" style={{fontSize:16}}>Confidentiel</div><p className="small" style={{marginTop:4,color:"var(--ink-2)"}}>Vos souhaits ne sont visibles que par l'équipe RH. Votre manager n'y a pas accès sans votre accord.</p></div></div></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Suivi RH" title="Souhaits de mobilité" desc="Les demandes de mobilité exprimées par les collaborateurs." go={go} />
      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-head" style={{gridTemplateColumns:"1.4fr 2fr 1.1fr 1fr auto"}}><span>Collaborateur</span><span>Souhait</span><span>Destination</span><span>Horizon</span><span></span></div>
        {requests.map((r,i)=>(
          <div key={i} className="tbl-row" style={{gridTemplateColumns:"1.4fr 2fr 1.1fr 1fr auto"}}>
            <div className="row gap-12" style={{alignItems:"center",minWidth:0}}>
              <span className="avatar" style={{background:"var(--blue)"}}>{r.who.split(" ").map(x=>x[0]).join("")}</span>
              <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:15,whiteSpace:"nowrap"}}>{r.who}</div><div className="small">{r.j}</div></div>
            </div>
            <span style={{fontSize:14,color:"var(--ink-2)"}}>{r.wish}</span>
            <span className="small" style={{fontWeight:600}}>{r.site}</span>
            <span className="small" style={{fontWeight:600}}>{r.when}</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>notify(`Échange planifié avec ${r.who}`)}>Suivre</button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

Object.assign(window, { HrFlagsPage, MobilityPage });
