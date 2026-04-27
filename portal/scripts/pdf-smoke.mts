import fs from 'node:fs';
const { renderAutoQuotePdf } = await import('../src/lib/pdf/render.tsx');
const sample = {
  reference: 'OP-AU-TEST01',
  full_name: 'Jane Doe', first_name: 'Jane', last_name: 'Doe',
  email: 'jane@example.com', phone: '(770) 555-1234',
  street: '123 Main St', city: 'Atlanta', state: 'GA', zip: '30303',
  dob: '1990-04-15', gender: 'Female', marital_status: 'Married',
  products_selected: ['auto'], total_unit_count: 1,
  lead_currently_insured: 'Yes',
  vehicles: [{
    primary: true, year: '2022', make: 'Toyota', model: 'Camry', trim: 'XLE',
    body: 'Sedan', use: 'Commuting', daily_miles: '25', ownership: 'Financed',
    full_coverage: 'Yes', anti_theft: ['Factory alarm','GPS recovery'],
    safety_features: ['ABS','Backup camera'], custom_parts: '',
    garaging_same: 'Yes', vin: '4T1B11HK4JU123456'
  }],
  drivers: [{
    primary: true, first_name: 'Jane', last_name: 'Doe', dob: '1990-04-15',
    gender: 'Female', marital_status: 'Married', relation: 'Self',
    license_state: 'GA', license_number: 'A1234567', license_type: 'Standard',
    age_licensed: '16', education: "Bachelor's", driver_status: 'Active Driver',
    incidents: []
  }],
  has_insurance: 'Yes', current_carrier: 'Progressive',
  time_with_carrier: '3-5 years', current_bi: '100/300', lapse: 'No lapse',
  current_premium: '$185/mo', current_policy_number: 'POL-9876',
  effective_date: '2026-05-01', payment_plan: 'Monthly',
  bi_limits: '100/300', pd_limit: '50', umuim: 'Yes', medpay: '$5k',
  comp_deductible: '$500', coll_deductible: '$500',
  rental: 'Yes', roadside: 'Yes',
  discounts: ['Multi-policy','Good driver'],
  phone_cert: 'Yes', uw_ack: 'Yes', esignature: 'Jane Doe',
};
const buf = await renderAutoQuotePdf(sample);
console.log('PDF bytes:', buf.length, 'header:', buf.slice(0,8).toString());
fs.writeFileSync('/tmp/auto-quote-smoke.pdf', buf);
console.log('written /tmp/auto-quote-smoke.pdf');
