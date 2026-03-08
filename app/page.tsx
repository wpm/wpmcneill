function Ornament() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#C4B5A6" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 9.5 Q14 5 12 2 Q10 5 12 9.5" />
      <path d="M14.5 12 Q19 14 22 12 Q19 10 14.5 12" />
      <path d="M12 14.5 Q14 19 12 22 Q10 19 12 14.5" />
      <path d="M9.5 12 Q5 14 2 12 Q5 10 9.5 12" />
      <path d="M13.8 10.2 Q17 7 19 4.5 Q16 7.5 13.8 10.2" />
      <path d="M10.2 10.2 Q7 7 5 4.5 Q8 7.5 10.2 10.2" />
      <path d="M13.8 13.8 Q17 17 19 19.5 Q16 16.5 13.8 13.8" />
      <path d="M10.2 13.8 Q7 17 5 19.5 Q8 16.5 10.2 13.8" />
    </svg>
  )
}

export default function Home() {
  return (
    <main>
      <div className="ornament">
        <Ornament />
      </div>
      <h1>W.P. McNeill</h1>
      <p className="tagline">Big picture, dirty hands.</p>

      <p>
        I build natural language systems. Linguistics and philosophy inform how I think
        about them—meaning, context, what these models are doing when they appear to understand.
      </p>

      <p>
        I've spent my career in AI startups, building systems that have to work in the
        real world. I care about clean code, clear thinking, and understanding the problem
        before solving it.
      </p>

      <p>
        <strong><a href="https://wpmcneill.substack.com/">Corner Cases</a></strong> is my
        Substack on AI and language, co-written with Claude—an experiment in collaboration
        and a place to work through questions that don't fit elsewhere.
      </p>

      <p>
        Category theory and the Lean theorem prover are ongoing interests. Formal foundations
        matter, and they're underexplored in how we think about language and computation.
      </p>

      <div className="links">
        <a href="https://wpmcneill.substack.com/">Corner Cases</a>
        <a href="https://github.com/wpm">GitHub</a>
        <a href="https://www.linkedin.com/in/williammcneill/">LinkedIn</a>
        <a href="mailto:billmcn@gmail.com">Email</a>
        <a href="/faq">FAQ</a>
      </div>
    </main>
  )
}
