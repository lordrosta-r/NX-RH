/* screen_login.jsx */
const { useState: useStateL } = React;

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useStateL("");
  const [pwd, setPwd] = useStateL("");
  const [remember, setRemember] = useStateL(false);
  const [loading, setLoading] = useStateL(false);

  const submit = (e) => {
    e.preventDefault();
    setLoading(true);
    const v = email.toLowerCase();
    const role = /admin/.test(v) ? "admin" : /(^|[._-])rh/.test(v) ? "rh" : /manager|resp|chef/.test(v) ? "manager" : "collab";
    setTimeout(() => { setLoading(false); onLogin(role); }, 650);
  };

  return (
    <div className="auth">
      <aside className="auth-aside">
        <div style={{ position: "relative", zIndex: 1 }}>
          <img src="nx-logo.png" alt="NanoXplore" style={{ height: 30, width: "auto", filter: "brightness(0) invert(1)", opacity: .95 }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 26, maxWidth: 460 }}>
          <div>
            <p className="eyebrow" style={{ color: "rgba(255,255,255,.75)" }}>Campagne 2026</p>
            <h1 className="display" style={{ color: "#fff", marginTop: 10 }}>L'entretien annuel, simplifié.</h1>
            <p className="lead" style={{ color: "rgba(255,255,255,.82)", marginTop: 14 }}>
              Préparez et suivez votre entretien professionnel sur un espace unique.
            </p>
          </div>
          <div className="auth-preview">
            <div className="ap-card">
              <div className="ap-head">
                <div className="row gap-8" style={{ minWidth: 0, flex: 1 }}>
                  <img src="nx-logo.png" alt="NanoXplore" style={{ display: "block", height: "25px", width: "92px" }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="ap-title">Entretien 2026</div>
                    <div className="ap-sub">Auto-évaluation</div>
                  </div>
                </div>
                <span className="ap-badge">En cours</span>
              </div>
              <div className="ap-prog">
                <div className="ap-prog-row"><span>Progression</span><b>75%</b></div>
                <div className="ap-track"><i style={{ width: "75%" }}></i></div>
              </div>
              <div className="ap-steps">
                {[["Bilan de l'année", 1], ["Compétences", 1], ["Objectifs 2026", 1], ["Récapitulatif", 0]].map(([l, d], i) => (
                  <div className="ap-step" key={i}>
                    <span className={"ap-check " + (d ? "done" : "todo")}>{d ? <Icon.check style={{ width: 13, height: 13 }} /> : <span>{i + 1}</span>}</span>
                    <span className="ap-step-label" style={{ color: d ? "var(--ink)" : "var(--ink-3)" }}>{l}</span>
                  </div>
                ))}
              </div>
              <div className="ap-foot">
                <div className="ap-avatars">
                  <span className="ap-av" style={{ background: "#1b1b78" }}>CR</span>
                  <span className="ap-av" style={{ background: "#d1001f" }}>SL</span>
                </div>
                <span className="ap-foot-txt">Camille &amp; Sophie · manager</span>
              </div>
            </div>
            <div className="ap-float">
              <span className="ap-float-ic"><Icon.check style={{ width: 14, height: 14 }} /></span>
              <div>
                <div className="ap-float-t">Transmis à votre manager</div>
                <div className="ap-float-d">il y a 2 min</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1, fontSize: 13, color: "rgba(255,255,255,.6)" }}>
          Besoin d'aide ? Contactez votre référent RH · rh-support@nanoxplore.com
        </div>
      </aside>

      <main className="auth-main" id="contenu">
        <div className="auth-card">
          <div style={{ marginBottom: 28 }}>
            <p className="eyebrow">Espace collaborateur</p>
            <h2 className="h1" style={{ marginTop: 8 }}>Connexion</h2>
            <p className="body" style={{ marginTop: 8 }}>Identifiez-vous pour accéder à votre espace NX-RH.</p>
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Field label="Adresse e-mail professionnelle" htmlFor="email">
              <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@nanoxplore.com" autoComplete="username" required />
            </Field>
            <Field label="Mot de passe" htmlFor="pwd">
              <PasswordInput id="pwd" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Votre mot de passe" />
            </Field>
            <div className="row between wrap" style={{ gap: 12 }}>
              <Checkbox id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)}>Se souvenir de moi</Checkbox>
              <a className="link" href="#" onClick={(e) => e.preventDefault()}>Mot de passe oublié&nbsp;?</a>
            </div>
            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
              {loading ? "Connexion…" : <>Se connecter <Icon.arrowR className="ico" /></>}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

window.LoginScreen = LoginScreen;
