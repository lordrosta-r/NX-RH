import { useEffect, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import './LoginBackground.css'

// =============================================================================
// LoginBackground — Champ d'étoiles + réseau de nœuds style circuit FPGA
// @tsparticles/react v3 — initParticlesEngine obligatoire avant rendu.
// =============================================================================

const PARTICLES_OPTIONS = {
  background:   { color: { value: 'transparent' } },
  fpsLimit:     60,
  particles: {
    number:  { value: 110, density: { enable: true } },
    color:   { value: ['#ffffff', '#b8000b', '#5b00df', '#e0e0ff'] },
    opacity: {
      value: { min: 0.05, max: 0.75 },
      animation: { enable: true, speed: 0.6, sync: false },
    },
    size: {
      value: { min: 0.8, max: 2.8 },
      animation: { enable: true, speed: 1.2, sync: false },
    },
    links: {
      enable:   true,
      color:    '#b8000b',
      opacity:  0.12,
      distance: 130,
      width:    0.8,
    },
    move: {
      enable:    true,
      speed:     0.35,
      direction: 'none',
      random:    true,
      straight:  false,
      outModes:  { default: 'out' },
    },
    twinkle: {
      particles: { enable: true, frequency: 0.035, opacity: 1 },
    },
  },
  interactivity: {
    events: {
      onHover: { enable: true, mode: 'grab' },
      onClick: { enable: true, mode: 'repulse' },
    },
    modes: {
      grab:    { distance: 160, links: { opacity: 0.40 } },
      repulse: { distance: 120, duration: 0.6 },
    },
  },
  detectRetina: true,
}

export default function LoginBackground() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  return (
    <div className="login-bg" aria-hidden="true">
      {ready && (
        <Particles
          id="nx-bg-particles"
          options={PARTICLES_OPTIONS}
          className="login-bg__canvas"
        />
      )}
    </div>
  )
}
