import { motion } from 'framer-motion'
import { EASE, SectionHeading } from './Section'
import ProductShowcase from './ProductShowcase'
import EnergyFlow from './EnergyFlow'

/** parked pending a call on whether the exploded model earns its place here */
const SHOW_PRODUCT_SHOWCASE = false

/**
 * The stack is a chain, so it's drawn as one. The layer copy used to sit in a
 * band beneath the diagram, which made the reader hold two objects at once —
 * a shape up top and a glossary below it, joined only by matching titles. It
 * now lives inside the nodes, so there is a single thing to read.
 */
export default function Technology() {
  return (
    <section id="technology" className="relative w-full bg-paper py-16 md:py-32">
      <div className="shell">
        <SectionHeading
          eyebrow="Technology"
          title={
            <>
              Deep-tech,
              <br />
              <span className="text-teal-brand">layer by layer.</span>
            </>
          }
          intro="Modular architecture that combines solar, storage and smart-grid, communicated clearly, because complexity kills sales."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-14 md:mt-20"
        >
          <EnergyFlow />
        </motion.div>

        {/* Hidden, not deleted. The exploded model duplicates the hero, which
            already lets you take the unit apart, and it says nothing about the
            architecture this section is explaining. Flip to true to bring it
            back while the call is still open. */}
        {SHOW_PRODUCT_SHOWCASE && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: EASE }}
            className="mx-auto mt-20 max-w-2xl"
          >
            <ProductShowcase />
          </motion.div>
        )}
      </div>
    </section>
  )
}
