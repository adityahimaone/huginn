import type { Metadata } from 'next'
import Image from 'next/image'

/**
 * Single-page brand case scaffold. For a design-system specimen, use templates/design-system.html.
 *
 * Copy this into app/design-system/<slug>/page.tsx, replace SLUG and the token
 * block, and adapt the sections to the brief. It is a server component; for an
 * interactive form, extract the form into a small "use client" island and use
 * the project's shadcn/Radix primitives.
 *
 * The inline CSS keeps the template one file. In a real project, move it to a
 * CSS module (or Tailwind utilities) and read the tokens from one source.
 */

const SLUG = '<slug>'

export const metadata: Metadata = {
  title: 'Brand — Case',
  description:
    'A brand kit and design system: the idea, the mark, the tokens, the forms and the audit.',
  alternates: { canonical: `/design-system/${SLUG}` },
}

const TOKENS = [
  ['--paper', '#f3ecdf', 'Page ground'],
  ['--ink', '#191a2e', 'Text and edges'],
  ['--accent', '#3d53d6', 'One loud field'],
  ['--accent-ink', '#fffaf1', 'Text on accent'],
  ['--focus', '#ffd23f', 'Focus ring'],
] as const

export default function CasePage() {
  return (
    <div className="vt-page" id="top">
      <a className="vt-skip" href="#case">
        Skip to the case
      </a>

      <header className="vt-nav">
        <a className="vt-brand" href="#top" aria-label="Brand, back to top">
          <Image
            src={`/brand/${SLUG}/mark.svg`}
            alt=""
            width={34}
            height={34}
          />
          <span>Brand</span>
        </a>
        <nav aria-label="Case contents">
          <a href="#case">Case</a>
          <a href="#forms">Forms</a>
          <a href="#tokens">Tokens</a>
          <a href="#audit">Audit</a>
        </nav>
      </header>

      <main>
        <section className="vt-hero" aria-labelledby="hero-title">
          <div>
            <p className="vt-eyebrow">Case 01 / Brand system</p>
            <h1 id="hero-title">One idea, drawn once.</h1>
            <p className="vt-lead">
              Replace this with the promise in the audience&apos;s words. Keep
              it to one sentence; the page is the proof, not the pitch.
            </p>
            <div className="vt-actions">
              <a className="vt-button" href="#forms">
                Try the controls
              </a>
              <a className="vt-button vt-secondary" href="#tokens">
                Read the tokens
              </a>
            </div>
          </div>
          <figure className="vt-art">
            <Image
              src={`/brand/${SLUG}/${SLUG}-brandkit.png`}
              alt="The brand kit board"
              width={1500}
              height={1125}
            />
            <figcaption>
              Brand kit / rendered from source, not an image model
            </figcaption>
          </figure>
        </section>

        <section className="vt-section" id="case" aria-labelledby="case-title">
          <div className="vt-head">
            <h2 id="case-title">The case</h2>
            <p>One material, one loud field, one idea.</p>
          </div>
          <div className="vt-grid three">
            <article>
              <h3>01 / The idea</h3>
              <p>What the mark means in one sentence, without naming the visual.</p>
            </article>
            <article>
              <h3>02 / The rules</h3>
              <p>Colour by role, type by voice, one loud field at a time.</p>
            </article>
            <article>
              <h3>03 / The proof</h3>
              <p>
                The page, the form, the 16px favicon. A system that cannot ship
                is a moodboard.
              </p>
            </article>
          </div>
        </section>

        <section
          className="vt-section"
          id="forms"
          aria-labelledby="forms-title"
        >
          <div className="vt-head">
            <h2 id="forms-title">Forms</h2>
            <p>
              Labels, hints, errors, focus and disabled. One real form proves the
              system more than twenty cards.
            </p>
          </div>
          <form className="vt-form" action="#" method="post">
            <div className="vt-field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                autoComplete="name"
                placeholder="Your name"
                required
              />
            </div>
            <div className="vt-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@studio.com"
                required
              />
            </div>
            <div className="vt-field">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" defaultValue="design-engineer">
                <option value="design-engineer">Design engineer</option>
                <option value="product-designer">Product designer</option>
                <option value="frontend-engineer">Frontend engineer</option>
              </select>
            </div>
            <div className="vt-field">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows={3}
                placeholder="What are you building?"
              />
            </div>
            <fieldset className="vt-fieldset">
              <legend>Team size</legend>
              <label>
                <input type="radio" name="team" value="1-5" defaultChecked />
                1–5
              </label>
              <label>
                <input type="radio" name="team" value="6-20" />6–20
              </label>
              <label>
                <input type="radio" name="team" value="21+" />21+
              </label>
            </fieldset>
            <label className="vt-check">
              <input type="checkbox" name="updates" defaultChecked />
              Send the field notes
            </label>
            <div className="vt-field">
              <label htmlFor="intensity">Dither intensity</label>
              <input
                id="intensity"
                name="intensity"
                type="range"
                min={0}
                max={100}
                defaultValue={64}
              />
            </div>
            <div className="vt-field">
              <label htmlFor="file">Reference</label>
              <input id="file" name="file" type="file" />
            </div>
            <div className="vt-actions">
              <button className="vt-button" type="submit">
                Send request
              </button>
              <button className="vt-button vt-secondary" type="reset">
                Reset
              </button>
            </div>
          </form>
        </section>

        <section
          className="vt-section"
          id="tokens"
          aria-labelledby="tokens-title"
        >
          <div className="vt-head">
            <h2 id="tokens-title">Tokens</h2>
            <p>Primitive → semantic → component. One source; no raw hex in components.</p>
          </div>
          <table className="vt-table">
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Value</th>
                <th scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              {TOKENS.map(([token, value, role]) => (
                <tr key={token}>
                  <th scope="row">
                    <code>{token}</code>
                  </th>
                  <td>
                    <code>{value}</code>
                  </td>
                  <td>{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="vt-section" id="audit" aria-labelledby="audit-title">
          <div className="vt-head">
            <h2 id="audit-title">Audit</h2>
            <p>
              Resources, contract, engine check and named gaps. A case without
              gaps is a brochure.
            </p>
          </div>
          <ul className="vt-list">
            <li>16/16 resources present; 10 used, 4 substituted, 2 not used.</li>
            <li>12/12 output-contract items shipped.</li>
            <li>One effect, one live shader; reduced motion holds a still frame.</li>
            <li>Gap: no visual regression CI; add one before the next release.</li>
          </ul>
        </section>
      </main>

      <footer className="vt-footer">
        <span>Brand 1.0 · 2026 · Replace with the real author and licence.</span>
      </footer>

      <style>{`
        .vt-page {
          --paper: #f3ecdf;
          --paper-hi: #fffaf1;
          --ink: #191a2e;
          --muted: #5f5b6e;
          --line: rgb(25 26 46 / 0.16);
          --accent: #3d53d6;
          --accent-ink: #fffaf1;
          --focus: #ffd23f;
          --display: 'Your Display', ui-sans-serif, system-ui, sans-serif;
          --reading: 'Your Reading', ui-sans-serif, system-ui, sans-serif;
          --mono: ui-monospace, 'SFMono-Regular', monospace;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--reading);
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
        }
        .vt-page * { box-sizing: border-box; }
        .vt-page a { color: inherit; }
        .vt-page :focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
        .vt-page main, .vt-nav, .vt-footer { width: min(1120px, 100% - 2rem); margin-inline: auto; }
        .vt-skip { position: absolute; top: -80px; left: 1rem; z-index: 10; padding: .6rem .8rem; background: var(--focus); color: var(--ink); }
        .vt-skip:focus { top: 1rem; }
        .vt-nav { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-block: 1rem; border-bottom: 1.5px solid var(--ink); }
        .vt-brand { display: flex; align-items: center; gap: .7rem; text-decoration: none; font-family: var(--display); font-weight: 700; letter-spacing: -.03em; }
        .vt-nav nav { display: flex; gap: 1rem; font-family: var(--mono); font-size: .7rem; letter-spacing: .08em; text-transform: uppercase; }
        .vt-nav nav a { color: var(--muted); text-decoration: none; }
        .vt-nav nav a:hover { color: var(--ink); }
        .vt-hero { display: grid; gap: 2rem; padding-block: clamp(3rem, 8vw, 7rem); }
        @media (min-width: 900px) { .vt-hero { grid-template-columns: 1.1fr .9fr; align-items: center; } }
        .vt-eyebrow { margin: 0 0 .8rem; font-family: var(--mono); font-size: .68rem; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
        .vt-page h1 { margin: 0; font-family: var(--display); font-size: clamp(2.6rem, 6vw, 5.2rem); line-height: .94; letter-spacing: -.055em; text-wrap: balance; }
        .vt-lead { max-width: 56ch; margin: 1rem 0 0; color: var(--muted); font-size: 1.05rem; }
        .vt-actions { display: flex; flex-wrap: wrap; gap: .7rem; margin-top: 1.4rem; }
        .vt-button { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 1rem; border: 1.5px solid var(--ink); border-radius: 999px; background: var(--accent); color: var(--accent-ink); box-shadow: 3px 3px 0 var(--ink); font-family: var(--mono); font-size: .72rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
        .vt-secondary { background: var(--paper-hi); color: var(--ink); }
        .vt-art { margin: 0; border: 1.5px solid var(--ink); border-radius: 20px; background: var(--paper-hi); box-shadow: 9px 11px 0 var(--line); overflow: hidden; }
        .vt-art img { display: block; width: 100%; height: auto; }
        .vt-art figcaption { padding: .7rem .9rem; border-top: 1px solid var(--line); font-family: var(--mono); font-size: .62rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
        .vt-section { padding-block: clamp(3rem, 7vw, 6rem); border-top: 1.5px solid var(--ink); }
        .vt-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .5rem 1rem; margin-bottom: 1.5rem; }
        .vt-page h2 { margin: 0; font-family: var(--display); font-size: clamp(1.7rem, 3.5vw, 2.6rem); line-height: 1; letter-spacing: -.04em; }
        .vt-head p { margin: 0; max-width: 58ch; color: var(--muted); font-size: .95rem; }
        .vt-grid { display: grid; gap: 1rem; }
        @media (min-width: 800px) { .vt-grid.three { grid-template-columns: repeat(3, 1fr); } }
        .vt-grid article { padding: 1.2rem; border: 1px solid var(--line); border-radius: 14px; background: var(--paper-hi); }
        .vt-grid h3 { margin: 0 0 .4rem; font-family: var(--display); font-size: 1.15rem; letter-spacing: -.02em; }
        .vt-grid p { margin: 0; color: var(--muted); font-size: .88rem; }
        .vt-form { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 720px) { .vt-form { grid-template-columns: 1fr; } }
        .vt-field { display: grid; gap: .35rem; }
        .vt-field label, .vt-fieldset legend { font-family: var(--mono); font-size: .66rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
        .vt-field input:not([type='range']):not([type='file']), .vt-field select, .vt-field textarea { width: 100%; min-height: 46px; padding: .7rem .8rem; border: 1px solid var(--line); border-radius: 8px; background: var(--paper-hi); color: var(--ink); font: inherit; }
        .vt-field textarea { min-height: 100px; resize: vertical; }
        .vt-field input:focus-visible, .vt-field select:focus-visible, .vt-field textarea:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 3px rgb(61 83 214 / .2); outline: none; }
        .vt-fieldset { display: flex; flex-wrap: wrap; gap: .8rem; border: 0; padding: 0; margin: 0; }
        .vt-fieldset label, .vt-check { display: flex; align-items: center; gap: .45rem; min-height: 44px; font-size: .88rem; }
        .vt-fieldset input, .vt-check input { width: 18px; height: 18px; accent-color: var(--accent); }
        .vt-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
        .vt-table th, .vt-table td { padding: .6rem .7rem; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
        .vt-table thead th { font-family: var(--mono); font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
        .vt-table code { font-family: var(--mono); font-size: .72rem; }
        .vt-list { margin: 0; padding-left: 1.2rem; color: var(--muted); font-size: .9rem; line-height: 1.6; }
        .vt-footer { padding-block: 2rem; border-top: 1.5px solid var(--ink); font-family: var(--mono); font-size: .62rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
      `}</style>
    </div>
  )
}
