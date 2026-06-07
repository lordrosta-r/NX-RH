/* page_evaluation.jsx — parcours d'évaluation complet */
const { useState: useEvalState, useEffect: useEvalEffect } = React;

const SCALE = [{ v:1, lbl:"À développer" },{ v:2, lbl:"En progrès" },{ v:3, lbl:"Maîtrisé" },{ v:4, lbl:"Référent" }];
const FORMATIONS = ["Management & leadership","Outils & logiciels métier","Langues étrangères","Sécurité & qualité","Gestion de projet","Communication"];

function Rating({ value, onChange, options=SCALE }) {
  return (
    <div className="rating">
      {options.map(o=>(
        <button type="button" key={o.v} className={value===o.v?"sel":""} onClick={()=>onChange(o.v)}>
          <span className="lvl">{o.v}</span><span className="lbl">{o.lbl}</span>
        </button>
      ))}
    </div>
  );
}

function StepHead({ icon:I, eyebrow, title, desc }) {
  return (
    <div style={{borderBottom:"1px solid var(--line)",paddingBottom:20}}>
      <div className="row gap-16" style={{alignItems:"flex-start"}}>
        <span style={{width:46,height:46,borderRadius:10,background:"var(--blue-soft)",display:"grid",placeItems:"center",flex:"none"}}><I style={{width:24,height:24,color:"var(--blue)"}}/></span>
        <div><p className="eyebrow">{eyebrow}</p><h2 className="h2" style={{marginTop:4}}>{title}</h2></div>
      </div>
      <p className="body" style={{marginTop:14}}>{desc}</p>
    </div>
  );
}

function EvaluationPage({ shell, data, update, go, onSubmit, steps, user }) {
  const [step, setStep] = useEvalState(0);
  const last = steps.length - 1;
  useEvalEffect(() => { const el=document.querySelector(".content"); if(el) el.scrollTo({top:0,behavior:"smooth"}); }, [step]);

  const addObjectif = () => update({ objectifs: [...data.objectifs, { titre:"", echeance:"", mesure:"" }] });
  const setObjectif = (i, patch) => update({ objectifs: data.objectifs.map((o,idx)=> idx===i ? {...o,...patch} : o) });
  const delObjectif = (i) => update({ objectifs: data.objectifs.filter((_,idx)=>idx!==i) });
  const toggleFormation = (f) => update({ formations: data.formations.includes(f) ? data.formations.filter(x=>x!==f) : [...data.formations, f] });

  return (
    <AppShell {...shell}>
      <PageHead crumbs={[{label:"Accueil",route:"dashboard"},{label:"Évaluation 2026"}]} eyebrow="Évaluation annuelle · Campagne 2026" title="Mon auto-évaluation" go={go}
        actions={<><Badge tone="grey" dot>Brouillon enregistré</Badge><button className="btn btn-ghost btn-sm" onClick={()=>go("dashboard")}>Enregistrer et quitter</button></>} />

      <div className="stepper" style={{marginBottom:24}}>
        <div className="row between"><span className="meta">Étape {step+1} sur {steps.length} — {steps[step].label}</span><span className="small" style={{fontWeight:700}}>{Math.round((step/last)*100)}%</span></div>
        <Bar pct={step/last*100} />
      </div>

      <div className="grid" style={{gridTemplateColumns:"258px 1fr",alignItems:"start",gap:28}}>
        <aside className="card" style={{padding:10,position:"sticky",top:90}}>
          <div className="steps-rail">
            {steps.map((s,i)=>(
              <button key={s.id} className={"step-item " + (i===step?"active":"") + (s.done&&i!==step?" done":"")} onClick={()=>setStep(i)}>
                <span className="num">{s.done && i!==step ? <Icon.check style={{width:14,height:14}}/> : i+1}</span><span className="txt">{s.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <section style={{minWidth:0}}>
          <div className="tile" style={{padding:"30px 34px"}}>
            {step===0 && <StepBilan data={data} update={update} />}
            {step===1 && <StepCompetences data={data} update={update} />}
            {step===2 && <StepObjectifs data={data} addObjectif={addObjectif} setObjectif={setObjectif} delObjectif={delObjectif} toggleFormation={toggleFormation} />}
            {step===3 && <StepCommentaires data={data} update={update} />}
            {step===4 && <StepSignature data={data} update={update} setStep={setStep} user={user} />}
          </div>
          <div className="row between" style={{marginTop:22,gap:12}}>
            <button className="btn btn-ghost btn-lg" onClick={()=>setStep(Math.max(0,step-1))} disabled={step===0}><Icon.arrowL className="ico"/> Précédent</button>
            {step < last
              ? <button className="btn btn-primary btn-lg" onClick={()=>setStep(step+1)}>Étape suivante <Icon.arrowR className="ico"/></button>
              : <button className="btn btn-primary btn-lg" onClick={onSubmit} disabled={!data.signed}><Icon.check className="ico"/> Valider et transmettre</button>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function StepBilan({ data, update }) {
  return (
    <div className="section-gap">
      <StepHead icon={Icon.doc} eyebrow="Étape 1" title="Bilan de l'année" desc="Prenez du recul sur vos 12 derniers mois. Vos réussites comme vos difficultés nourrissent l'échange avec votre manager." />
      <Field label="Vos principales réussites" hint="Projets aboutis, contributions marquantes, progrès réalisés." htmlFor="reussites">
        <textarea id="reussites" className="input" placeholder="Ex. : J'ai piloté la qualification de la nouvelle ligne de production…" value={data.reussites} onChange={(e)=>update({reussites:e.target.value})}></textarea>
      </Field>
      <Field label="Les difficultés rencontrées" hint="Obstacles, points de friction, ce qui pourrait être amélioré." htmlFor="difficultes">
        <textarea id="difficultes" className="input" placeholder="Ex. : La coordination inter-équipes sur le projet X…" value={data.difficultes} onChange={(e)=>update({difficultes:e.target.value})}></textarea>
      </Field>
      <Field label="Votre satisfaction globale sur l'année">
        <Rating value={data.satisfaction} onChange={(v)=>update({satisfaction:v})} options={[{v:1,lbl:"Faible"},{v:2,lbl:"Mitigée"},{v:3,lbl:"Bonne"},{v:4,lbl:"Excellente"}]} />
      </Field>
    </div>
  );
}

function StepCompetences({ data, update }) {
  const set = (id, v) => update({ competences: { ...data.competences, [id]: v } });
  return (
    <div className="section-gap">
      <StepHead icon={Icon.spark} eyebrow="Étape 2" title="Compétences" desc="Auto-évaluez votre niveau sur les compétences clés de votre poste. Votre manager donnera ensuite son appréciation." />
      <div className="section-gap" style={{gap:18}}>
        {window.NXDATA.competences.map(c=>(
          <div key={c.id} style={{paddingBottom:18,borderBottom:"1px solid var(--line)"}}>
            <div style={{marginBottom:10}}><div className="h3" style={{fontSize:16}}>{c.label}</div><p className="small">{c.desc}</p></div>
            <Rating value={data.competences[c.id]} onChange={(v)=>set(c.id,v)} />
          </div>
        ))}
      </div>
      <Field label="Un commentaire sur vos compétences ? (facultatif)" htmlFor="compcom">
        <textarea id="compcom" className="input" style={{minHeight:90}} placeholder="Compétences que vous aimeriez renforcer…" value={data.compCommentaire} onChange={(e)=>update({compCommentaire:e.target.value})}></textarea>
      </Field>
    </div>
  );
}

function StepObjectifs({ data, addObjectif, setObjectif, delObjectif, toggleFormation }) {
  return (
    <div className="section-gap">
      <StepHead icon={Icon.target} eyebrow="Étape 3" title="Objectifs & développement" desc="Proposez vos objectifs pour l'année et les formations qui vous intéressent. Tout sera ajusté avec votre manager." />
      <div className="section-gap" style={{gap:16}}>
        {data.objectifs.map((o,i)=>(
          <div key={i} className="card" style={{padding:"18px 20px",background:"var(--bg-alt)"}}>
            <div className="row between" style={{marginBottom:12}}>
              <span className="badge blue"><span className="dot"></span>Objectif {i+1}</span>
              {data.objectifs.length>1 && <button className="btn btn-tertiary btn-sm" style={{color:"var(--red)"}} onClick={()=>delObjectif(i)}>Supprimer</button>}
            </div>
            <div className="section-gap" style={{gap:14}}>
              <Field label="Intitulé de l'objectif" htmlFor={"obj-t-"+i}><input id={"obj-t-"+i} className="input" style={{background:"#fff"}} placeholder="Ex. : Obtenir la certification qualité ISO 9001" value={o.titre} onChange={(e)=>setObjectif(i,{titre:e.target.value})} /></Field>
              <div className="grid" style={{gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Field label="Échéance" htmlFor={"obj-e-"+i}><input id={"obj-e-"+i} className="input" style={{background:"#fff"}} placeholder="Ex. : T3 2026" value={o.echeance} onChange={(e)=>setObjectif(i,{echeance:e.target.value})} /></Field>
                <Field label="Indicateur de réussite" htmlFor={"obj-m-"+i}><input id={"obj-m-"+i} className="input" style={{background:"#fff"}} placeholder="Ex. : Audit validé" value={o.mesure} onChange={(e)=>setObjectif(i,{mesure:e.target.value})} /></Field>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={addObjectif}>+ Ajouter un objectif</button>
      <Field label="Formations souhaitées" hint="Sélectionnez les thématiques qui vous intéressent.">
        <div className="grid" style={{gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
          {FORMATIONS.map(f=>(
            <label key={f} className={"radio-card " + (data.formations.includes(f)?"sel":"")} style={{alignItems:"center"}}>
              <input type="checkbox" style={{position:"absolute",opacity:0}} checked={data.formations.includes(f)} onChange={()=>toggleFormation(f)} />
              <span style={{width:22,height:22,border:"2px solid",borderColor:data.formations.includes(f)?"var(--blue)":"var(--line-strong)",borderRadius:4,display:"grid",placeItems:"center",flex:"none",background:data.formations.includes(f)?"var(--blue)":"#fff"}}>{data.formations.includes(f) && <Icon.check style={{width:13,height:13,color:"#fff"}}/>}</span>
              <span style={{fontWeight:600,fontSize:15}}>{f}</span>
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}

function StepCommentaires({ data, update }) {
  return (
    <div className="section-gap">
      <StepHead icon={Icon.comment} eyebrow="Étape 4" title="Commentaires & échange" desc="Ajoutez un mot de synthèse à l'attention de votre manager. Cet espace recueillera aussi son retour avant l'entretien." />
      <Field label="Votre message à votre manager" hint="Attentes pour l'entretien, points à aborder, contexte particulier." htmlFor="comcollab">
        <textarea id="comcollab" className="input" placeholder="Ex. : J'aimerais qu'on échange sur mon évolution vers la gestion de projet…" value={data.commentaireCollab} onChange={(e)=>update({commentaireCollab:e.target.value})}></textarea>
      </Field>
      <div className="card" style={{padding:"18px 20px",background:"var(--bg-alt)"}}>
        <div className="row gap-12" style={{alignItems:"center",marginBottom:10}}>
          <span className="avatar" style={{background:"var(--red)"}}>SL</span>
          <div><div style={{fontWeight:700,fontSize:15}}>Sophie Lemaire</div><div className="small">Manager évaluateur</div></div>
        </div>
        <div className="row gap-8" style={{alignItems:"center",color:"var(--ink-3)",fontSize:14,fontStyle:"italic"}}>
          <Icon.clock style={{width:16,height:16}}/> Votre manager n'a pas encore ajouté de commentaire. Il interviendra après réception de votre auto-évaluation.
        </div>
      </div>
    </div>
  );
}

function StepSignature({ data, update, setStep, user }) {
  const compFilled = Object.keys(data.competences).length;
  const Row = ({ label, value, ok=true, edit }) => (
    <div className="row between wrap" style={{padding:"15px 0",borderTop:"1px solid var(--line)",gap:12}}>
      <div style={{flex:1,minWidth:200}}><div className="small" style={{fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",letterSpacing:".04em",fontSize:12}}>{label}</div><div className="body" style={{color:ok?"var(--ink)":"var(--amber)",marginTop:4}}>{value}</div></div>
      <button className="btn btn-tertiary btn-sm" onClick={edit}>Modifier</button>
    </div>
  );
  return (
    <div className="section-gap">
      <StepHead icon={Icon.pen} eyebrow="Étape 5" title="Récapitulatif & signature" desc="Vérifiez vos réponses puis signez pour transmettre votre auto-évaluation à votre manager." />
      <div>
        <Row label="Bilan — réussites" value={data.reussites||"Non renseigné"} ok={!!data.reussites} edit={()=>setStep(0)} />
        <Row label="Satisfaction de l'année" value={data.satisfaction?["Faible","Mitigée","Bonne","Excellente"][data.satisfaction-1]:"Non renseignée"} ok={!!data.satisfaction} edit={()=>setStep(0)} />
        <Row label="Compétences évaluées" value={`${compFilled} / ${window.NXDATA.competences.length}`} ok={compFilled===window.NXDATA.competences.length} edit={()=>setStep(1)} />
        <Row label="Objectifs proposés" value={`${data.objectifs.filter(o=>o.titre).length} objectif(s)`} ok={data.objectifs.some(o=>o.titre)} edit={()=>setStep(2)} />
        <Row label="Formations souhaitées" value={data.formations.length?data.formations.join(", "):"Aucune"} edit={()=>setStep(2)} />
      </div>
      <div className="card" style={{padding:"22px 24px"}}>
        <div className="row between wrap" style={{gap:16,alignItems:"flex-end"}}>
          <div style={{flex:1,minWidth:240}}>
            <div className="eyebrow" style={{marginBottom:8}}>Signature électronique</div>
            <Field label="Tapez votre nom complet pour signer" htmlFor="sign"><input id="sign" className="input" style={{background:"#fff"}} placeholder="Camille Rousseau" value={data.signName} onChange={(e)=>update({signName:e.target.value, signed: e.target.value.trim().length>2})} /></Field>
          </div>
          <div style={{flex:1,minWidth:240}}>
            <div className="small" style={{fontWeight:700,color:"var(--ink-3)",textTransform:"uppercase",fontSize:12,letterSpacing:".04em",marginBottom:8}}>Aperçu</div>
            <div style={{height:64,border:"1px dashed var(--line-strong)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg-alt)"}}>
              <span style={{fontFamily:"'Brush Script MT',cursive",fontSize:30,color:data.signName?"var(--blue)":"var(--ink-3)"}}>{data.signName||"Votre signature"}</span>
            </div>
            <div className="small" style={{marginTop:6}}>Signé le 4 février 2026 · {user.name}</div>
          </div>
        </div>
        <label className="checkbox" style={{marginTop:18}}>
          <input type="checkbox" checked={!!data.signName && data.signed} onChange={(e)=>update({signed:e.target.checked && data.signName.trim().length>2})} />
          <span className="box"><Icon.check /></span>
          <span style={{fontWeight:600}}>Je certifie l'exactitude de mon auto-évaluation et je la transmets à mon manager.</span>
        </label>
      </div>
    </div>
  );
}

window.EvaluationPage = EvaluationPage;
