/* page_admin.jsx — administration */
function UsersPage({ shell, go, notify }) {
  const users = window.NXDATA.users;
  const roleTone = { Collaborateur:"grey", Manager:"blue", RH:"green", Admin:"amber" };
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Administration" title="Utilisateurs" desc="Comptes de la plateforme, rôles et provenance." go={go}
        actions={<><button className="btn btn-ghost" onClick={()=>go("ldap")}><Icon.building className="ico" style={{width:18,height:18}}/> Importer (LDAP)</button><button className="btn btn-primary" onClick={()=>notify("Création d'un utilisateur")}><Icon.plus className="ico" style={{width:18,height:18}}/> Ajouter</button></>} />
      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-head" style={{gridTemplateColumns:"2fr 1.1fr 1.2fr .8fr .8fr auto"}}><span>Utilisateur</span><span>Rôle</span><span>Service</span><span>Source</span><span>Statut</span><span></span></div>
        {users.map((u,i)=>(
          <div key={i} className="tbl-row" style={{gridTemplateColumns:"2fr 1.1fr 1.2fr .8fr .8fr auto"}}>
            <div className="row gap-12" style={{alignItems:"center",minWidth:0}}>
              <span className="avatar" style={{background:u.active?"var(--blue)":"var(--ink-3)"}}>{u.in}</span>
              <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:15,whiteSpace:"nowrap"}}>{u.n}</div><div className="small">{u.mail}</div></div>
            </div>
            <span><Badge tone={roleTone[u.role]}>{u.role}</Badge></span>
            <span className="small" style={{fontWeight:600}}>{u.dept}</span>
            <span><Badge tone="grey">{u.src}</Badge></span>
            <span><Badge tone={u.active?"green":"grey"} dot>{u.active?"Actif":"Inactif"}</Badge></span>
            <button className="btn btn-ghost btn-sm" onClick={()=>notify(`Fiche de ${u.n}`)}><Icon.dots style={{width:18,height:18}}/></button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function LdapPage({ shell, go, notify }) {
  const mapping = [["uid","Identifiant"],["mail","Adresse e-mail"],["givenName / sn","Nom & prénom"],["department","Service"],["title","Poste"],["manager","Responsable"]];
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Configuration" title="Annuaire LDAP" desc="Connexion à l'annuaire d'entreprise et synchronisation des comptes." go={go}
        actions={<button className="btn btn-primary" onClick={()=>notify("Synchronisation LDAP lancée — 298 comptes")}><Icon.building className="ico" style={{width:18,height:18}}/> Synchroniser maintenant</button>} />
      <div className="callout green" style={{marginBottom:22,display:"flex",gap:12,alignItems:"center"}}>
        <Icon.check style={{width:20,height:20,color:"var(--green)",flex:"none"}}/>
        <span className="body" style={{color:"var(--ink)"}}><b>Connecté</b> · dernière synchronisation il y a 3 h · 298 comptes synchronisés sur 312.</span>
      </div>
      <div className="grid" style={{gridTemplateColumns:"1.3fr 1fr",alignItems:"start"}}>
        <div className="tile">
          <h2 className="h2" style={{marginBottom:16}}>Paramètres de connexion</h2>
          <div className="section-gap" style={{gap:14}}>
            <Field label="Serveur LDAP" htmlFor="host"><input id="host" className="input" style={{background:"#fff"}} defaultValue="ldaps://ad.nanoxplore.local" /></Field>
            <div className="grid" style={{gridTemplateColumns:"1fr 1fr",gap:14}}>
              <Field label="Port" htmlFor="port"><input id="port" className="input" style={{background:"#fff"}} defaultValue="636" /></Field>
              <Field label="Chiffrement" htmlFor="enc"><input id="enc" className="input" style={{background:"#fff"}} defaultValue="LDAPS / TLS" /></Field>
            </div>
            <Field label="Base DN" htmlFor="dn"><input id="dn" className="input" style={{background:"#fff"}} defaultValue="OU=Users,DC=nanoxplore,DC=local" /></Field>
            <Field label="Compte de service (bind DN)" htmlFor="bind"><input id="bind" className="input" style={{background:"#fff"}} defaultValue="CN=svc-nxrh,OU=Services,DC=nanoxplore,DC=local" /></Field>
            <div className="row gap-12"><button className="btn btn-secondary" onClick={()=>notify("Connexion testée : OK")}>Tester la connexion</button><button className="btn btn-ghost" onClick={()=>notify("Paramètres enregistrés")}>Enregistrer</button></div>
          </div>
        </div>
        <div className="tile">
          <h2 className="h2" style={{marginBottom:6}}>Correspondance des attributs</h2>
          <p className="small" style={{marginBottom:14}}>Attribut LDAP → champ NX-RH.</p>
          <div className="section-gap" style={{gap:0}}>
            {mapping.map((m,i)=>(
              <div key={i} className="row between" style={{padding:"12px 0",borderTop:i?"1px solid var(--line)":"none",alignItems:"center"}}>
                <code style={{fontSize:13,background:"var(--bg-alt)",padding:"3px 8px",borderRadius:5,color:"var(--ink-2)"}}>{m[0]}</code>
                <Icon.arrowR style={{width:16,height:16,color:"var(--ink-3)"}}/>
                <span style={{fontWeight:600,fontSize:14}}>{m[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MailsPage({ shell, go, notify }) {
  const templates = [
    { n:"Ouverture de campagne", d:"Envoyé au lancement", tone:"green", st:"Actif" },
    { n:"Convocation à l'entretien", d:"Proposition de créneau", tone:"green", st:"Actif" },
    { n:"Relance — auto-évaluation", d:"Rappel automatique J-7", tone:"green", st:"Actif" },
    { n:"Compte-rendu disponible", d:"Après signature", tone:"green", st:"Actif" },
    { n:"Clôture de campagne", d:"Bilan final", tone:"amber", st:"Brouillon" },
  ];
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Configuration" title="Modèles d'e-mails" desc="Les e-mails automatiques envoyés par la plateforme." go={go}
        actions={<button className="btn btn-ghost" onClick={()=>notify("E-mail de test envoyé")}><Icon.mail className="ico" style={{width:18,height:18}}/> Envoyer un test</button>} />
      <div className="callout" style={{marginBottom:22,display:"flex",gap:12,alignItems:"center"}}>
        <Icon.mail style={{width:20,height:20,color:"var(--blue)",flex:"none"}}/>
        <span className="body" style={{color:"var(--ink)"}}>SMTP : <b>smtp.nanoxplore.com:587</b> · expéditeur <b>rh-noreply@nanoxplore.com</b> · TLS activé.</span>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-head" style={{gridTemplateColumns:"2.4fr 1fr auto"}}><span>Modèle</span><span>Statut</span><span></span></div>
        {templates.map((t,i)=>(
          <div key={i} className="tbl-row" style={{gridTemplateColumns:"2.4fr 1fr auto"}}>
            <div className="row gap-12" style={{alignItems:"center",minWidth:0}}>
              <span style={{width:40,height:40,borderRadius:8,background:"var(--blue-soft)",display:"grid",placeItems:"center",flex:"none"}}><Icon.mail style={{width:19,height:19,color:"var(--blue)"}}/></span>
              <div style={{minWidth:0}}><div style={{fontWeight:700,fontSize:15}}>{t.n}</div><div className="small">{t.d}</div></div>
            </div>
            <span><Badge tone={t.tone} dot>{t.st}</Badge></span>
            <button className="btn btn-ghost btn-sm" onClick={()=>notify(`Édition : ${t.n}`)}><Icon.edit className="ico" style={{width:16,height:16}}/> Modifier</button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function AuditPage({ shell, go, notify }) {
  const log = [
    ...window.NXDATA.audit,
    ["Suppression d'un brouillon de campagne","Admin","hier"],
    ["Connexion échouée — tentative (paul.mercier)","Sécurité","il y a 2 j"],
    ["Rôle modifié : J. Hoarau → Admin","Admin","il y a 2 j"],
    ["Export RGPD téléchargé","RH","il y a 3 j"],
  ];
  const catTone = { Admin:"blue", RH:"green", "Système":"grey", "Sécurité":"red" };
  return (
    <AppShell {...shell}>
      <PageHead eyebrow="Configuration" title="Journal d'audit" desc="Historique horodaté des actions sensibles sur la plateforme." go={go}
        actions={<button className="btn btn-ghost" onClick={()=>notify("Journal exporté")}><Icon.download className="ico" style={{width:18,height:18}}/> Exporter</button>} />
      <div className="card" style={{overflow:"hidden"}}>
        <div className="tbl-head" style={{gridTemplateColumns:"2.6fr 1fr 1fr"}}><span>Évènement</span><span>Catégorie</span><span>Date</span></div>
        {log.map((a,i)=>(
          <div key={i} className="tbl-row" style={{gridTemplateColumns:"2.6fr 1fr 1fr"}}>
            <div className="row gap-12" style={{alignItems:"center",minWidth:0}}><span style={{width:8,height:8,borderRadius:"50%",background:catTone[a[1]]==="red"?"var(--red)":"var(--blue)",flex:"none"}}></span><span style={{fontSize:14,fontWeight:600}}>{a[0]}</span></div>
            <span><Badge tone={catTone[a[1]]||"grey"}>{a[1]}</Badge></span>
            <span className="small" style={{fontWeight:600}}>{a[2]}</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

Object.assign(window, { UsersPage, LdapPage, MailsPage, AuditPage });
