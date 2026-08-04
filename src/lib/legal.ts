/**
 * The legal pages, reproduced from teask.asia at the client's request:
 * Terms & Conditions (/tnc), Acceptable Use Policy, Privacy Policy.
 *
 * Copy is carried over as published. Do not rewrite or "improve" this text:
 * it is the client's own legal wording and any change needs their approval.
 */

export type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'dl'; rows: Array<[string, string]> }

export interface LegalDoc {
  slug: string
  title: string
  description: string
  blocks: Block[]
}

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: 'terms-and-conditions',
    title: 'Terms and Conditions',
    description:
      'The terms governing your access to and use of the Teask website, including payments, billing, pricing, refunds and company information.',
    blocks: [
      {
        kind: 'p',
        text: 'These Terms & Conditions ("Terms") govern your access to and use of this website operated by Tenaga Alam Sekitar Kita (M) Sdn. Bhd. ("TEASK", "we", "us", or "our").',
      },
      {
        kind: 'p',
        text: 'By accessing or using this website, you agree to be bound by these Terms. If you do not agree, please discontinue use.',
      },
      { kind: 'h3', text: '1. Website Use' },
      {
        kind: 'p',
        text: 'You agree to use this website only for lawful purposes and in compliance with all applicable laws and regulations. You must not misuse, disrupt, or attempt unauthorized access to the website or its systems.',
      },
      { kind: 'h3', text: '2. Intellectual Property' },
      {
        kind: 'p',
        text: 'All content on this website, including text, graphics, logos, images, videos, designs, and software, is owned by or licensed to TEASK unless otherwise stated. Unauthorized use is prohibited.',
      },
      { kind: 'h3', text: '3. Information Accuracy' },
      {
        kind: 'p',
        text: 'Content on this website is provided for general information only. TEASK makes no representations or warranties regarding accuracy, completeness, or reliability.',
      },
      { kind: 'h3', text: '4. Third-Party Links' },
      {
        kind: 'p',
        text: 'This website may contain links to third-party websites. TEASK is not responsible for their content, policies, or practices.',
      },
      { kind: 'h3', text: '5. Limitation of Liability' },
      {
        kind: 'p',
        text: 'To the fullest extent permitted by law, TEASK shall not be liable for any loss or damage arising from use of or reliance on this website.',
      },
      { kind: 'h3', text: '6. Changes' },
      { kind: 'p', text: 'TEASK may update these Terms at any time. Continued use constitutes acceptance.' },
      { kind: 'h3', text: '7. Governing Law' },
      { kind: 'p', text: 'These Terms are governed by the laws of Malaysia.' },
      { kind: 'h3', text: '8. Contact' },
      { kind: 'p', text: 'For questions, contact: kiu@teask.asia' },

      { kind: 'h2', text: 'Payments & Billing Policy' },
      { kind: 'h3', text: 'Current Payment Model' },
      { kind: 'p', text: 'TEASK currently operates on a B2B-only basis.' },
      { kind: 'p', text: 'Payments are accepted via:' },
      { kind: 'ul', items: ['Invoice-based billing', 'Bank transfer or manually agreed methods'] },
      { kind: 'p', text: 'No online or automated payment gateway is active on this website.' },
      { kind: 'h3', text: 'Future Services' },
      {
        kind: 'p',
        text: 'TEASK plans to introduce B2C services and third-party payment gateways (including Xendit) in the future, subject to approval.',
      },
      { kind: 'p', text: 'Until officially launched:' },
      { kind: 'ul', items: ['No consumer payments are accepted', 'No online checkout exists'] },
      { kind: 'h3', text: 'Payment Responsibility' },
      {
        kind: 'p',
        text: 'Clients are responsible for verifying official payment details. TEASK is not liable for payments sent to unauthorized accounts.',
      },
      { kind: 'h3', text: 'Currency & Taxes' },
      {
        kind: 'p',
        text: "Payments are generally in MYR unless otherwise agreed. Applicable taxes and bank charges are the client's responsibility.",
      },

      { kind: 'h2', text: 'Refund & Cancellation Policy' },
      { kind: 'h3', text: 'Nature of Payments' },
      {
        kind: 'p',
        text: 'Payments may include service fees, project deposits, pilot programs, or customized engineering work.',
      },
      { kind: 'h3', text: 'Refund Policy' },
      { kind: 'p', text: 'Unless stated otherwise in writing:' },
      {
        kind: 'ul',
        items: [
          'All payments are non-refundable once work has commenced',
          'Deposits are non-refundable due to upfront costs',
        ],
      },
      { kind: 'h3', text: 'Exceptional Refunds' },
      {
        kind: 'p',
        text: "Refunds may be granted at TEASK's sole discretion in cases of payment error or non-delivery solely attributable to TEASK.",
      },
      { kind: 'h3', text: 'Cancellations' },
      { kind: 'p', text: 'Upon cancellation, work completed and costs incurred remain payable.' },
      { kind: 'h3', text: 'Third-Party Costs' },
      { kind: 'p', text: 'Third-party fees paid on behalf of clients are non-refundable.' },

      { kind: 'h2', text: 'Payments, Billing & Pricing Policy' },
      {
        kind: 'p',
        text: 'This Payments, Billing & Pricing Policy applies to all services and energy usage provided by Tenaga Alam Sekitar Kita (M) Sdn. Bhd. ("TEASK", "we", "us", or "our").',
      },
      { kind: 'h3', text: '1. Business Model' },
      {
        kind: 'p',
        text: 'TEASK currently operates on a Business-to-Business (B2B) basis. Business-to-Consumer (B2C) services may be introduced in the future and will be governed by updated terms when officially launched.',
      },
      { kind: 'h3', text: '2. Pay-As-You-Go Energy Pricing' },
      { kind: 'p', text: 'Energy usage is charged on a pay-as-you-go basis.' },
      { kind: 'p', text: 'Standard Energy Rate: RM 1.00 per kilowatt-hour (kWh)' },
      {
        kind: 'p',
        text: 'Energy consumption is measured using system monitoring and metering records. Charges are calculated based on actual recorded usage.',
      },
      { kind: 'h3', text: '3. Company Code & Discounted Pricing' },
      {
        kind: 'p',
        text: 'TEASK may offer discounted rates to approved corporate clients, partners, or program participants through company-specific discount codes.',
      },
      {
        kind: 'ul',
        items: [
          'Discount eligibility is determined solely by TEASK',
          'Discount rates may vary by company, program, location, or agreement',
          'Company codes are non-transferable and may be revoked if misused',
          'Discounted rates will be confirmed in writing or reflected in billing statements',
        ],
      },
      {
        kind: 'p',
        text: 'TEASK reserves the right to modify or discontinue discount programs at any time.',
      },
      { kind: 'h3', text: '4. Billing Method' },
      { kind: 'p', text: 'At present:' },
      {
        kind: 'ul',
        items: [
          'Billing is conducted via invoice-based or manually agreed payment methods',
          'No automated online payment gateway is active on this website',
          'Payment instructions will be issued directly by TEASK through official correspondence',
        ],
      },
      {
        kind: 'p',
        text: 'Future billing systems, including third-party payment gateways, may be introduced subject to approval and regulatory requirements.',
      },
      { kind: 'h3', text: '5. Payment Responsibility' },
      { kind: 'p', text: 'Clients are responsible for:' },
      {
        kind: 'ul',
        items: [
          'Verifying official payment details before making payment',
          'Ensuring payments are made to accounts formally confirmed by TEASK',
        ],
      },
      {
        kind: 'p',
        text: 'TEASK shall not be liable for payments made to unauthorized or incorrect accounts not officially issued by TEASK.',
      },
      { kind: 'h3', text: '6. Currency & Charges' },
      {
        kind: 'ul',
        items: [
          'Prices are denominated in Malaysian Ringgit (MYR) unless otherwise agreed',
          'Clients are responsible for applicable taxes, duties, and bank charges unless contractually stated otherwise',
        ],
      },
      { kind: 'h3', text: '7. Pricing Changes' },
      { kind: 'p', text: 'TEASK reserves the right to:' },
      {
        kind: 'ul',
        items: [
          'Adjust pricing rates',
          'Introduce tiered, consumer, or location-based pricing',
          'Modify billing structures or discount schemes',
        ],
      },
      { kind: 'p', text: 'Any material changes will be communicated prior to implementation.' },
      { kind: 'h3', text: '8. Availability & Usage Conditions' },
      {
        kind: 'p',
        text: 'Energy availability, pricing applicability, and discount eligibility may vary based on:',
      },
      {
        kind: 'ul',
        items: [
          'System capacity',
          'Location and site conditions',
          'Regulatory or grid constraints',
          'Operational considerations',
        ],
      },
      { kind: 'p', text: 'No guarantee is made regarding uninterrupted availability.' },
      { kind: 'h3', text: '9. Contact' },
      {
        kind: 'p',
        text: 'For billing, pricing, or payment inquiries, please contact: khong@teask.asia',
      },

      { kind: 'h2', text: 'Company Information' },
      {
        kind: 'dl',
        rows: [
          ['Company Name', 'Tenaga Alam Sekitar Kita (M) Sdn. Bhd.'],
          ['Company Registration Number (SSM)', '202201044811 (1490508-V)'],
          ['Date of Incorporation', '8 December 2022'],
          ['Legal Status', 'Private company limited by shares, incorporated under the Companies Act 2016'],
          ['Country of Incorporation', 'Malaysia'],
          ['Place of Incorporation', 'Kuala Lumpur, Malaysia'],
          [
            'Registered Office Address',
            '10-2, Grove 1 @ Grove Square, Jalan TTDI Grove 1/2, 43000 Kajang, Selangor',
          ],
          ['Official Contact Email', 'Khong@teask.asia'],
        ],
      },
    ],
  },

  {
    slug: 'acceptable-use-policy',
    title: 'Acceptable Use Policy',
    description:
      'How this website may and may not be used, together with the disclaimers that apply to the information published on it.',
    blocks: [
      { kind: 'h3', text: 'Permitted Use' },
      {
        kind: 'p',
        text: 'You may use this website for lawful business, informational, or educational purposes.',
      },
      { kind: 'h3', text: 'Prohibited Use' },
      { kind: 'p', text: 'You must not:' },
      {
        kind: 'ul',
        items: [
          'Engage in illegal or fraudulent activity',
          'Upload malware or harmful code',
          'Disrupt systems or security',
          'Impersonate TEASK or its representatives',
          'Scrape data or misuse information',
        ],
      },
      { kind: 'h3', text: 'Enforcement' },
      { kind: 'p', text: 'TEASK reserves the right to restrict or terminate access for violations.' },

      { kind: 'h2', text: 'Disclaimer' },
      { kind: 'h3', text: 'Informational Use Only' },
      {
        kind: 'p',
        text: 'All information on this website is provided for general informational purposes only and does not constitute engineering, financial, legal, or investment advice.',
      },
      { kind: 'h3', text: 'No Performance Guarantee' },
      {
        kind: 'p',
        text: 'Energy output, system performance, efficiency, and sustainability outcomes are indicative only and may vary due to site, environmental, regulatory, and operational factors.',
      },
      { kind: 'h3', text: 'Forward-Looking Statements' },
      {
        kind: 'p',
        text: 'Statements regarding future products, services, or plans are forward-looking and subject to risks and uncertainties.',
      },
      { kind: 'h3', text: 'No Offer or Solicitation' },
      {
        kind: 'p',
        text: 'Nothing on this website constitutes an offer to sell or a solicitation to invest in securities or financial instruments.',
      },
      { kind: 'h3', text: 'Limitation of Liability' },
      {
        kind: 'p',
        text: 'TEASK shall not be liable for any loss arising from use of or reliance on this website.',
      },
    ],
  },

  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    description:
      'How Tenaga Alam Sekitar Kita (M) Sdn. Bhd. collects, uses and protects personal data under the Personal Data Protection Act 2010 (Malaysia).',
    blocks: [
      {
        kind: 'p',
        text: 'This Privacy Policy describes how Tenaga Alam Sekitar Kita (M) Sdn. Bhd. collects, uses, and protects personal data in accordance with the Personal Data Protection Act 2010 (Malaysia).',
      },
      { kind: 'h3', text: 'Information Collected' },
      {
        kind: 'ul',
        items: [
          'Name, email, phone number',
          'Company and role',
          'Billing and payment information',
          'IP address and website usage data',
        ],
      },
      { kind: 'h3', text: 'Purpose of Collection' },
      {
        kind: 'ul',
        items: [
          'Provide services and respond to inquiries',
          'Process payments and invoices',
          'Improve website functionality',
          'Legal and regulatory compliance',
        ],
      },
      { kind: 'h3', text: 'Disclosure' },
      {
        kind: 'p',
        text: 'Personal data is not sold. It may be shared only with service providers, payment processors, or authorities where required by law.',
      },
      { kind: 'h3', text: 'Data Security' },
      {
        kind: 'p',
        text: 'Reasonable safeguards are used to protect personal data, though absolute security cannot be guaranteed.',
      },
      { kind: 'h3', text: 'Data Retention' },
      { kind: 'p', text: 'Data is retained only as long as necessary for business or legal purposes.' },
      { kind: 'h3', text: 'User Rights' },
      {
        kind: 'p',
        text: 'You may request access, correction, or withdrawal of consent where applicable.',
      },
      { kind: 'h3', text: 'Cookies' },
      { kind: 'p', text: 'This website may use cookies for functionality and analytics.' },
      { kind: 'h3', text: 'Contact' },
      { kind: 'p', text: 'Privacy inquiries: kiu@teask.asia' },
    ],
  },
]

export const getLegalDoc = (slug: string) => LEGAL_DOCS.find((d) => d.slug === slug)
