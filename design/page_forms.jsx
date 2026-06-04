/* page_forms.jsx — formulaires (liste + constructeur) */
const { useState: useFormState } = React;

function FormsPage({ shell, go, role, notify }) {
  const forms = window.NXDATA.forms;
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Gestion" title="Formulaires d'évaluation" desc="Les trames de questions utilisées par vos campagnes." go={go}
        actions={<button className="btn btn-primary" onClick={()=>go("form","f-new")}><Icon.plus className="ico" style={{width:18,height:18}}/> Nouveau formulaire</button>} />
      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-head" style={{gridTemplateColumns:"2.4fr 1fr 1fr 1fr auto"}}><span>Formulaire</span><span>Sections</span><span>Questions</span><span>Statut</span><span></span></div>
        {forms.map((f,i)=>(
          <div key={f.id} className="tbl-row" style={{gridTemplateColumns:"2.4fr 1fr 1fr 1fr auto"}}>
            <div className="row gap-12" style={{alignItems:"center",minWidth:0}}>
              <span style={{width:40,height:40,borderRadius:8,background:"var(--blue-soft)",display:"grid",placeItems:"center",flex:"none"}}><Icon.doc style={{width:20,height:20,color:"var(--blue)"}}/></span>
              <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:15}}>{f.name}</div><div className="small">Utilisé par {f.used} campagne{f.used>1?"s":""}</div></div>
            </div>
            <span className="small" style={{fontWeight:600}}>{f.sections} sections</span>
            <span className="small" style={{fontWeight:600}}>{f.questions} questions</span>
            <span><Badge tone={f.tone} dot>{f.status}</Badge></span>
            <button className="btn btn-ghost btn-sm" onClick={()=>go("form", f.id)}>Éditer</button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

const QTYPES = [
  { id:"short", label:"Texte court", icon:Icon.edit },
  { id:"long", label:"Texte long", icon:Icon.comment },
  { id:"rating", label:"Note (échelle 1–4)", icon:Icon.spark },
  { id:"single", label:"Choix unique", icon:Icon.target },
  { id:"multi", label:"Choix multiple", icon:Icon.grid },
  { id:"bool", label:"Oui / Non", icon:Icon.check },
];

function FormBuilderPage({ shell, go, param, notify }) {
  const isNew = param==="f-new";
  const [name, setName] = useFormState(isNew ? "Nouveau formulaire" : (window.NXDATA.forms.find(f=>f.id===param)?.name || "Entretien annuel — standard"));
  const [sections, setSections] = useFormState(isNew
    ? [{ title:"Bilan de l'année", qs:[{ label:"Vos principales réussites", type:"long" }] }]
    : [
        { title:"Bilan de l'année", qs:[{label:"Vos principales réussites",type:"long"},{label:"Les difficultés rencontrées",type:"long"},{label:"Satisfaction globale",type:"rating"}] },
        { title:"Compétences", qs:[{label:"Expertise technique",type:"rating"},{label:"Autonomie & initiative",type:"rating"},{label:"Travail en équipe",type:"rating"}] },
        { title:"Objectifs", qs:[{label:"Objectifs proposés pour l'année",type:"long"},{label:"Formations souhaitées",type:"multi"}] },
      ]);

  const addSection = () => setSections(s=>[...s,{title:"Nouvelle section",qs:[]}]);
  const delSection = (si) => setSections(s=>s.filter((_,i)=>i!==si));
  const setSecTitle = (si,v) => setSections(s=>s.map((sec,i)=>i===si?{...sec,title:v}:sec));
  const addQ = (si,type) => setSections(s=>s.map((sec,i)=>i===si?{...sec,qs:[...sec.qs,{label:"Nouvelle question",type}]}:sec));
  const setQ = (si,qi,patch) => setSections(s=>s.map((sec,i)=>i===si?{...sec,qs:sec.qs.map((q,j)=>j===qi?{...q,...patch}:q)}:sec));
  const delQ = (si,qi) => setSections(s=>s.map((sec,i)=>i===si?{...sec,qs:sec.qs.filter((_,j)=>j!==qi)}:sec));
  const totalQ = sections.reduce((n,s)=>n+s.qs.length,0);
  const typeLabel = (t)=>QTYPES.find(x=>x.id===t)?.label||t;

  return (
    <AppShell {...shell}>
      <PageHead crumbs={[{label:"Accueil",route:"dashboard"},{label:"Formulaires",route:"forms"},{label:isNew?"Nouveau":name}]} eyebrow="Constructeur de trame" title="Éditeur de formulaire" go={go}
        actions={<><button className="btn btn-ghost" onClick={()=>notify("Aperçu du formulaire")}><Icon.eye className="ico" style={{width:18,height:18}}/> Aperçu</button><button className="btn btn-primary" onClick={()=>{notify("Formulaire enregistré"); go("forms");}}><Icon.check className="ico" style={{width:18,height:18}}/> Enregistrer</button></>} />
      <div className="grid" style={{gridTemplateColumns:"1fr 290px",alignItems:"start",gap:24}}>
        <div className="section-gap">
          <div className="tile">
            <Field label="Nom du formulaire" htmlFor="fname"><input id="fname" className="input" style={{background:"#fff"}} value={name} onChange={(e)=>setName(e.target.value)} /></Field>
            <div className="row gap-16" style={{marginTop:12}}><span className="small">{sections.length} sections</span><span className="small">·</span><span className="small">{totalQ} questions</span></div>
          </div>
          {sections.map((sec,si)=>(
            <div key={si} className="tile" style={{padding:"20px 22px"}}>
              <div className="row between" style={{marginBottom:14,gap:12}}>
                <div className="row gap-12" style={{flex:1,alignItems:"center"}}>
                  <span className="badge blue"><span className="dot"></span>Section {si+1}</span>
                  <input className="input" style={{background:"var(--bg-alt)",fontWeight:700,maxWidth:340,padding:"9px 12px"}} value={sec.title} onChange={(e)=>setSecTitle(si,e.target.value)} />
                </div>
                <button className="btn btn-tertiary btn-sm" style={{color:"var(--red)"}} onClick={()=>delSection(si)}><Icon.trash style={{width:16,height:16}}/></button>
              </div>
              <div className="section-gap" style={{gap:10}}>
                {sec.qs.map((q,qi)=>(
                  <div key={qi} className="row gap-12" style={{alignItems:"center",padding:"10px 12px",border:"1px solid var(--line)",borderRadius:6}}>
                    <Icon.dots style={{width:18,height:18,color:"var(--ink-3)",flex:"none"}}/>
                    <input className="input" style={{background:"#fff",flex:1,padding:"9px 12px",borderBottom:"1px solid var(--line)"}} value={q.label} onChange={(e)=>setQ(si,qi,{label:e.target.value})} />
                    <select className="input" style={{background:"var(--bg-alt)",width:170,padding:"9px 10px",border:"1px solid var(--line)",borderRadius:6}} value={q.type} onChange={(e)=>setQ(si,qi,{type:e.target.value})}>
                      {QTYPES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <button className="btn btn-tertiary btn-sm" style={{color:"var(--red)",padding:6}} onClick={()=>delQ(si,qi)}><Icon.trash style={{width:15,height:15}}/></button>
                  </div>
                ))}
                {sec.qs.length===0 && <p className="small" style={{padding:"4px 2px"}}>Aucune question — ajoutez-en depuis le panneau de droite.</p>}
              </div>
              <div className="row gap-8 wrap" style={{marginTop:14}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>addQ(si,"short")}><Icon.plus className="ico" style={{width:15,height:15}}/> Ajouter une question</button>
              </div>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={addSection}><Icon.plus className="ico" style={{width:18,height:18}}/> Ajouter une section</button>
        </div>

        <aside className="tile" style={{position:"sticky",top:90}}>
          <p className="eyebrow">Types de question</p>
          <p className="small" style={{margin:"6px 0 14px"}}>Cliquez pour ajouter à la dernière section.</p>
          <div className="section-gap" style={{gap:8}}>
            {QTYPES.map(t=>(
              <button key={t.id} className="row gap-12" style={{width:"100%",textAlign:"left",border:"1px solid var(--line)",borderRadius:6,padding:"11px 12px",background:"#fff",cursor:"pointer"}}
                onClick={()=>addQ(sections.length-1,t.id)}>
                <span style={{width:32,height:32,borderRadius:7,background:"var(--blue-soft)",display:"grid",placeItems:"center",flex:"none"}}><t.icon style={{width:17,height:17,color:"var(--blue)"}}/></span>
                <span style={{fontWeight:600,fontSize:14}}>{t.label}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

Object.assign(window, { FormsPage, FormBuilderPage });
