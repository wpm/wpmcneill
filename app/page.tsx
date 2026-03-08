import { Ornament } from '@/components/Ornament'
import { Links } from '@/components/Links'

export default function Home() {
  return (
    <main>
      <Ornament />
      <h1>W.P. McNeill</h1>
      <p className="tagline">Big picture, dirty hands.</p>

      <p>
        I build natural language systems. Linguistics and philosophy inform how I think about them—meaning, context, what
        these models are doing when they appear to understand.
      </p>

      <p>
        I've spent my career in AI startups, building systems that have to work in the real world. I care about clean
        code, clear thinking, and understanding the problem before solving it.
      </p>

      <p>
        <strong>
          <a href="https://wpmcneill.substack.com/">Corner Cases</a>
        </strong>{' '}
        is my Substack on AI and language, co-written with Claude—an experiment in collaboration and a place to work
        through questions that don't fit elsewhere.
      </p>

      <p>
        Category theory and the Lean theorem prover are ongoing interests. Formal foundations matter, and they're
        underexplored in how we think about language and computation.
      </p>

      <Links />
    </main>
  )
}
