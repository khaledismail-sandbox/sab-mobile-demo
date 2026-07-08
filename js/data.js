/* SAB Mobile demo — static demo data (beneficiaries, banks, rails, rates, offers).
   All content is fictional but authentic to KSA retail banking. */
(function () {
  'use strict';

  var BANKS = [
    { code: 'RJHI', name: 'Al Rajhi Bank' },
    { code: 'SNB',  name: 'Saudi National Bank' },
    { code: 'RIBL', name: 'Riyad Bank' },
    { code: 'INMA', name: 'Alinma Bank' },
    { code: 'BSF',  name: 'Banque Saudi Fransi' },
    { code: 'ANB',  name: 'Arab National Bank' },
    { code: 'ALBI', name: 'Bank Albilad' },
    { code: 'SAB',  name: 'SAB' }
  ];

  // rail: which transfer type this beneficiary defaults to
  var BENEFICIARIES = [
    { id: 'BEN_0042', name: 'Mohammed Al-Otaibi',  bank: 'Al Rajhi Bank',        iban: 'SA44 8000 0000 6080 1016 7519', rail: 'local_sarie',        initials: 'MO', favourite: true  },
    { id: 'BEN_0007', name: 'Sara Al-Qahtani',     bank: 'Saudi National Bank',  iban: 'SA03 1000 0011 2233 4455 6677', rail: 'local_sarie',        initials: 'SQ', favourite: true  },
    { id: 'BEN_0018', name: 'Abdullah Al-Harbi',   bank: 'Riyad Bank',           iban: 'SA71 2000 0002 4681 3579 0246', rail: 'local_sarie',        initials: 'AH', favourite: false },
    { id: 'BEN_0023', name: 'Noura Al-Shammari',   bank: 'Alinma Bank',          iban: 'SA29 0500 0068 2018 4412 9903', rail: 'local_sarie',        initials: 'NS', favourite: false },
    { id: 'BEN_0031', name: 'Fahad Al-Dossari',    bank: 'Banque Saudi Fransi',  iban: 'SA85 5500 0000 7301 2245 8810', rail: 'local_sarie',        initials: 'FD', favourite: false },
    { id: 'BEN_0056', name: 'Aisha Al-Zahrani',    bank: 'Bank Albilad',         iban: 'SA60 1500 0999 1044 7283 3021', rail: 'local_sarie',        initials: 'AZ', favourite: false },
    { id: 'BEN_0064', name: 'Khalid Al-Mutairi',   bank: 'Arab National Bank',   iban: 'SA12 3000 0108 4460 9917 5502', rail: 'local_sarie',        initials: 'KM', favourite: false },
    { id: 'BEN_0071', name: 'Reema Al-Ghamdi',     bank: 'SAB',                  iban: 'SA36 4500 0000 1180 3355 2247', rail: 'own_account',        initials: 'RG', favourite: false },
    { id: 'BEN_0088', name: 'Arjun Mehta',         bank: 'HDFC Bank · India',    iban: 'IN·· HDFC 0000 4471 92·· ····', rail: 'international_swift', initials: 'AM', favourite: false },
    { id: 'BEN_0093', name: 'Bilal Ahmed',         bank: 'HBL · Pakistan',       iban: 'PK·· HABB 0012 3456 78·· ····', rail: 'international_swift', initials: 'BA', favourite: false },
    { id: 'BEN_0099', name: 'Youssef El-Sayed',    bank: 'CIB · Egypt',          iban: 'EG·· CIBE 0100 0044 92·· ····', rail: 'international_swift', initials: 'YE', favourite: false }
  ];

  var TRANSFER_TYPES = [
    { key: 'local_sarie',         label: 'Local transfer (SARIE)',      desc: 'To any bank in Saudi Arabia',        fee: 25 },
    { key: 'international_swift', label: 'International (SWIFT)',       desc: 'Send money worldwide',               fee: 75 },
    { key: 'own_account',         label: 'Between my accounts',         desc: 'Instant, within SAB',                fee: 25 },
    { key: 'sadad_bill',          label: 'SADAD bill payment',          desc: 'Utilities, telecom & government',    fee: 35 },
    { key: 'mobile_wallet',       label: 'Mobile wallet',               desc: 'stc pay, urpay & more',              fee: 45 }
  ];

  var ACCOUNTS = [
    { name: 'Current Account',   number: '•••• 4501', iban: 'SA03 4500 0000 1180 2216 4501', balance: 84250.75, currency: 'SAR' },
    { name: 'Savings Account',   number: '•••• 7738', iban: 'SA88 4500 0000 1180 9931 7738', balance: 152300.00, currency: 'SAR' },
    { name: 'USD Account',       number: '•••• 2210', iban: 'SA51 4500 0000 1180 4407 2210', balance: 12480.20, currency: 'USD' }
  ];

  // Rates: SAR per 1 unit of foreign currency (USD pegged at 3.75)
  var FX_RATES = [
    { pair: 'USD', flag: '🇺🇸', name: 'US Dollar',       sarPerUnit: 3.7500, margin: 1.2 },
    { pair: 'EUR', flag: '🇪🇺', name: 'Euro',            sarPerUnit: 4.0630, margin: 1.8 },
    { pair: 'INR', flag: '🇮🇳', name: 'Indian Rupee',    sarPerUnit: 0.0427, margin: 2.5 },
    { pair: 'PKR', flag: '🇵🇰', name: 'Pakistani Rupee', sarPerUnit: 0.0135, margin: 3.4 }
  ];

  var FX_OFFER = {
    offer_type: 'reduced_fx_margin',
    offer_pct: 1.5,
    saving_amount_sar: 56.25,
    title: 'Send more home this month',
    body: '1.5% off our FX margin on international transfers to India, Pakistan and Egypt. Save up to SAR 56.25 per transfer — no code needed.',
    cta: 'View offer'
  };

  // Fee-waiver promo codes accepted on the transfer details form
  var WAIVER_CODES = ['SABFREE', 'AWWAL0'];

  var SADAD_BILLERS = ['Saudi Electricity Company', 'National Water Company', 'stc', 'Mobily', 'Zain'];

  var CARDS = [
    { name: 'SAB Premier Credit Card', number: '5412 75•• •••• 8804', type: 'Visa Signature', due: 3240.50, limit: 50000 },
    { name: 'SAB mada Debit Card',     number: '4680 19•• •••• 2231', type: 'mada · Apple Pay', due: 0, limit: null }
  ];

  window.SABData = {
    BANKS: BANKS,
    BENEFICIARIES: BENEFICIARIES,
    TRANSFER_TYPES: TRANSFER_TYPES,
    ACCOUNTS: ACCOUNTS,
    FX_RATES: FX_RATES,
    FX_OFFER: FX_OFFER,
    WAIVER_CODES: WAIVER_CODES,
    SADAD_BILLERS: SADAD_BILLERS,
    CARDS: CARDS
  };
})();
